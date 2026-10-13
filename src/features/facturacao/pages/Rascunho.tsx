/**
 * Rascunho de factura (FT, FR, ND) → emissão (§5.4). O rascunho não tem número
 * nem efeito fiscal; emitir cria o documento, que não se apaga. Os totais aqui
 * são pré-visualização (§2.6); o IVA só se calcula aqui para quem lê as taxas.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import Big from "big.js";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { z } from "zod/mini";
import { useClientesActivos } from "@/features/clientes";
import { useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { hojeIso } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useEliminarRascunho, useEmitirRascunho, useFacturas, useGuardarRascunho, usePautas, useRascunho, useSeries, type PautaImposto, type PedidoRascunho, type Rascunho } from "../api";
import { calcularTotais, liquidoDaLinha } from "../calculos";
import { AVISO_DEFINITIVO, MEIOS, moeda, NOME_TIPO } from "../comum";

const quantidade = z.string().check(z.refine((v) => (lerDecimalDigitado(v, 4)?.gt(0) ?? false), "Quantidade maior que zero, até 4 casas."));
const preco = z.string().check(z.refine((v) => (lerDinheiroDigitado(v, 2)?.gte(0) ?? false), "Preço válido, até 2 casas (por exemplo 1 250,00)."));

const esquema = z
  .object({
    customerId: z.string(),
    documentType: z.enum(["FT", "FR", "ND"]),
    series: z.string(),
    currency: z.enum(["AOA", "USD", "EUR"]),
    dueDate: z.string(),
    paymentTerms: texto({ max: 200 }),
    withholdingRate: z.string(),
    paymentMethod: z.string(),
    referencedInvoiceId: z.string(),
    notes: z.string().check(z.maxLength(1000, "No máximo 1000 caracteres.")),
    lines: z
      .array(z.object({ description: texto({ max: 200, obrigatorio: "Escreva a descrição." }), quantity: quantidade, unitPrice: preco, taxCode: z.string().check(z.minLength(1, "Escolha o imposto.")) }))
      .check(z.minLength(1, "Uma factura tem pelo menos uma linha.")),
  })
  .check(
    z.refine((d) => d.dueDate === "" || IsoDate.safeParse(d.dueDate).success, { path: ["dueDate"], error: "Data inválida." }),
    z.refine((d) => d.withholdingRate.trim() === "" || ((lerDecimalDigitado(d.withholdingRate, 2)?.gte(0) ?? false) && (lerDecimalDigitado(d.withholdingRate, 2)?.lte(100) ?? false)), {
      path: ["withholdingRate"],
      error: "Percentagem de 0 a 100, até 2 casas.",
    }),
    z.refine((d) => d.documentType !== "FR" || d.paymentMethod !== "", { path: ["paymentMethod"], error: "Uma factura-recibo é paga no acto: indique o meio." }),
    z.refine((d) => d.documentType !== "ND" || d.referencedInvoiceId !== "", { path: ["referencedInvoiceId"], error: "Escolha a factura a que a nota de débito acrescenta." }),
    z.refine((d) => d.documentType !== "ND" || d.customerId !== "", { path: ["customerId"], error: "Uma nota de débito é sempre a um cliente registado." }),
  );
type Dados = z.infer<typeof esquema>;

const linhaVazia = { description: "", quantity: "1", unitPrice: "", taxCode: "NOR" };

function paraForm(r: Rascunho | undefined): Dados {
  return {
    customerId: r?.customerId ?? "",
    documentType: (r?.documentType as Dados["documentType"] | undefined) ?? "FT",
    series: r?.series ?? "",
    currency: (["AOA", "USD", "EUR"].includes(r?.currency ?? "") ? r?.currency : "AOA") as Dados["currency"],
    dueDate: r?.dueDate ?? "",
    paymentTerms: r?.paymentTerms ?? "",
    withholdingRate: r?.withholdingRate !== null && r?.withholdingRate !== undefined ? String(r.withholdingRate).replace(".", ",") : "",
    paymentMethod: r?.paymentMethod ?? "",
    referencedInvoiceId: r?.referencedInvoiceId ?? "",
    notes: r?.notes ?? "",
    lines: r?.lines.length
      ? r.lines.map((l) => ({ description: l.description, quantity: String(l.quantity).replace(".", ","), unitPrice: String(l.unitPrice).replace(".", ","), taxCode: l.taxCode }))
      : [linhaVazia],
  };
}

function paraPedido(d: Dados): PedidoRascunho {
  const vazio = (v: string) => (v.trim() === "" ? null : v.trim());
  const ret = lerDecimalDigitado(d.withholdingRate, 2);
  return {
    customerId: vazio(d.customerId),
    documentType: d.documentType,
    series: vazio(d.series),
    currency: d.currency,
    dueDate: d.documentType === "FR" ? null : vazio(d.dueDate),
    paymentTerms: vazio(d.paymentTerms),
    withholdingRate: ret && ret.gt(0) ? decimalParaApi(ret) : null,
    paymentMethod: d.documentType === "FR" ? vazio(d.paymentMethod) : null,
    referencedInvoiceId: d.documentType === "ND" ? vazio(d.referencedInvoiceId) : null,
    notes: vazio(d.notes),
    lines: d.lines.map((l) => ({
      description: l.description,
      quantity: decimalParaApi(lerDecimalDigitado(l.quantity, 4) ?? new Big(0)),
      unitPrice: paraApi(lerDinheiroDigitado(l.unitPrice, 2) ?? (new Big(0) as never)),
      taxCode: l.taxCode.trim().toUpperCase(),
    })),
  };
}

/** Taxa de IVA em vigor hoje para um código, a partir das pautas (só quem as lê). */
export function taxaEmVigor(pautas: readonly PautaImposto[] | undefined, codigo: string, hoje: string): Big | null {
  const p = pautas?.find((x) => x.code.toUpperCase() === codigo.toUpperCase() && (x.kind === 0 || String(x.kind) === "ValueAdded"));
  const v = p?.versions.find((x) => x.effectiveFrom <= hoje && (x.effectiveTo === null || x.effectiveTo >= hoje));
  return v ? new Big(String(v.percentage)) : null;
}

function Editor({ rascunho }: { rascunho: Rascunho | undefined }) {
  const navegar = useNavigate();
  const { pode } = useUtilizador();
  const leTaxas = pode("fiscal.rates.read");
  const clientes = useClientesActivos();
  const series = useSeries();
  const pautas = usePautas(leTaxas);
  const guardar = useGuardarRascunho();
  const emitir = useEmitirRascunho();
  const eliminar = useEliminarRascunho();
  const [draftId, setDraftId] = useState<string | null>(rascunho?.draftId ?? null);
  const [confirmarEmissao, setConfirmarEmissao] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [dataEmissao, setDataEmissao] = useState(hojeIso());
  const [soltas, setSoltas] = useState<string[]>([]);
  const idData = useId();
  const form = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: paraForm(rascunho) });
  const linhas = useFieldArray({ control: form.control, name: "lines" });
  const v = useWatch({ control: form.control }) as Dados;
  const hoje = hojeIso();

  const facturasDoCliente = useFacturas({ pagina: 1, tamanho: 100, customerId: v.customerId || null, from: null, to: null }, v.documentType === "ND" && Boolean(v.customerId));
  const referenciaveis = (v.documentType === "ND" && v.customerId ? (facturasDoCliente.data?.items ?? []) : []).filter(
    (f) => f.status === "Normal" && ["FT", "FR"].includes(f.documentType ?? "FT"),
  );

  useEffect(() => {
    if (rascunho) form.reset(paraForm(rascunho));
  }, [rascunho, form]);

  const codigosIva = leTaxas
    ? (pautas.data ?? []).filter((p) => (p.kind === 0 || String(p.kind) === "ValueAdded") && !p.requiresExemptionCode).map((p) => p.code)
    : ["NOR"];

  const calc = (v.lines ?? []).map((l) => {
    const q = lerDecimalDigitado(l.quantity ?? "", 4);
    const p = lerDinheiroDigitado(l.unitPrice ?? "", 2);
    return q && p ? { quantidade: q, preco: p as Big, taxa: leTaxas ? taxaEmVigor(pautas.data, l.taxCode ?? "", hoje) : null } : null;
  });
  const validas = calc.filter((c): c is NonNullable<typeof c> => c !== null);
  const retencao = lerDecimalDigitado(v.withholdingRate ?? "", 2);
  const totais = calcularTotais(validas, retencao);
  const m = v.currency ?? "AOA";
  // Quem não lê as taxas (Sales) vê a previsão do servidor do rascunho guardado
  // (B16), enquanto o ecrã não tiver alterações por guardar.
  const doServidor =
    !leTaxas && rascunho && !form.formState.isDirty && rascunho.taxTotal !== null && rascunho.taxTotal !== undefined
      ? { imposto: rascunho.taxTotal, aPagar: rascunho.amountPayable ?? null, data: rascunho.taxEstimatedOn ?? null }
      : null;
  const textoImposto = totais.imposto ? moeda(totais.imposto.toFixed(2), m) : doServidor ? moeda(doServidor.imposto, m) : leTaxas ? "Sem taxa em vigor" : "Ao guardar";
  const textoAPagar = totais.aPagar ? moeda(totais.aPagar.toFixed(2), m) : doServidor?.aPagar !== null && doServidor?.aPagar !== undefined ? moeda(doServidor.aPagar, m) : textoImposto;

  const aoErrar = (e: unknown) =>
    setSoltas(aplicarErrosDoServidor(e, form.setError, ["customerId", "documentType", "series", "currency", "dueDate", "paymentTerms", "withholdingRate", "paymentMethod", "referencedInvoiceId", "notes"]));

  const gravar = (d: Dados, depois?: (id: string) => void) => {
    if (guardar.isPending) return;
    setSoltas([]);
    guardar.mutate(
      { draftId, corpo: paraPedido(d) },
      {
        onSuccess: (id) => {
          setDraftId(id);
          form.reset(d);
          if (!rascunho && !depois) void navegar(`/facturas/rascunhos/${id}`, { replace: true });
          depois?.(id);
        },
        onError: aoErrar,
      },
    );
  };

  const emitirAgora = () => {
    if (!draftId || emitir.isPending || !IsoDate.safeParse(dataEmissao).success) return;
    emitir.mutate(
      { draftId, issuedOn: dataEmissao },
      {
        onSuccess: (r) => {
          setConfirmarEmissao(false);
          void navegar(`/facturas/${r.id}`);
        },
      },
    );
  };

  const erroTopo =
    soltas.length > 0 ? (
      <Alert tom="erro" titulo="Não foi possível guardar.">
        {soltas.join(" ")}
      </Alert>
    ) : guardar.error && !(eApiError(guardar.error) && guardar.error.status === 400) ? (
      <ErrorPanel erro={guardar.error} />
    ) : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit((d) => gravar(d))}
    >
      {erroTopo}
      <Card>
        <CardTitle>Documento</CardTitle>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field rotulo="Cliente" erro={form.formState.errors.customerId?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("customerId")}>
                <option value="">Consumidor final</option>
                {(clientes.data?.items ?? []).map((c) => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.name} · NIF {c.taxId}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Tipo" erro={form.formState.errors.documentType?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("documentType")}>
                {(["FT", "FR", "ND"] as const).map((t) => (
                  <option key={t} value={t}>
                    {t} · {NOME_TIPO[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Série" erro={form.formState.errors.series?.message} ajuda="Sem escolha, usa a série por omissão do tipo.">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("series")}>
                <option value="">Série por omissão</option>
                {(series.data ?? [])
                  .filter((s) => s.type === v.documentType && s.isActive)
                  .map((s) => (
                    <option key={s.seriesId} value={s.code}>
                      {s.type} {s.code} (próximo n.º {String(s.nextSequence)})
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Moeda" erro={form.formState.errors.currency?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("currency")}>
                <option value="AOA">AOA · Kwanza</option>
                <option value="USD">USD · Dólar</option>
                <option value="EUR">EUR · Euro</option>
              </Select>
            )}
          </Field>
          {v.documentType === "FR" ? (
            <Field rotulo="Meio de pagamento" erro={form.formState.errors.paymentMethod?.message}>
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("paymentMethod")}>
                  <option value="">Escolha…</option>
                  {Object.entries(MEIOS).map(([k, n]) => (
                    <option key={k} value={k}>
                      {n}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <Field rotulo="Vencimento" erro={form.formState.errors.dueDate?.message} ajuda="Opcional. Sem data, vence no dia da emissão.">
              {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} {...form.register("dueDate")} />}
            </Field>
          )}
          {v.documentType === "ND" ? (
            <Field rotulo="Factura referenciada" erro={form.formState.errors.referencedInvoiceId?.message} ajuda="Uma factura em vigor do mesmo cliente.">
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} disabled={!v.customerId} {...form.register("referencedInvoiceId")}>
                  <option value="">{v.customerId ? "Escolha…" : "Escolha primeiro o cliente"}</option>
                  {referenciaveis.map((f) => (
                    <option key={f.invoiceId} value={f.invoiceId}>
                      {f.number} · {moeda(f.grossTotal, f.currency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field rotulo="Condições de pagamento" erro={form.formState.errors.paymentTerms?.message} ajuda="Opcional (por exemplo «30 dias»).">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} aria-describedby={descricao} invalido={invalido} {...form.register("paymentTerms")} />}
          </Field>
          <Field rotulo="Retenção na fonte (%)" erro={form.formState.errors.withholdingRate?.message} ajuda="Opcional. Calculada sobre o valor líquido.">
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" maxLength={6} className="max-w-32" aria-describedby={descricao} invalido={invalido} {...form.register("withholdingRate")} />}
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Linhas</CardTitle>
        {form.formState.errors.lines?.root?.message || form.formState.errors.lines?.message ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {form.formState.errors.lines?.root?.message ?? form.formState.errors.lines?.message}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col gap-4">
          {linhas.fields.map((f, i) => {
            const e = form.formState.errors.lines?.[i];
            const c = calc[i];
            return (
              <fieldset key={f.id} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-12">
                <legend className="sr-only">Linha {i + 1}</legend>
                <Field rotulo="Descrição" erro={e?.description?.message} className="sm:col-span-5">
                  {({ id, descricao, invalido }) => <Input id={id} maxLength={200} aria-describedby={descricao} invalido={invalido} {...form.register(`lines.${i}.description`)} />}
                </Field>
                <Field rotulo="Qtd." erro={e?.quantity?.message} className="sm:col-span-2">
                  {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" aria-describedby={descricao} invalido={invalido} {...form.register(`lines.${i}.quantity`)} />}
                </Field>
                <Field rotulo="Preço unitário" erro={e?.unitPrice?.message} className="sm:col-span-2">
                  {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" aria-describedby={descricao} invalido={invalido} {...form.register(`lines.${i}.unitPrice`)} />}
                </Field>
                <Field rotulo="Imposto" erro={e?.taxCode?.message} className="sm:col-span-2">
                  {({ id, descricao, invalido }) => (
                    <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register(`lines.${i}.taxCode`)}>
                      {codigosIva.map((cod) => (
                        <option key={cod} value={cod}>
                          {cod}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <div className="flex items-end justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
                  <span className="text-sm tabular-nums text-muted-foreground sm:hidden">{c ? moeda(liquidoDaLinha(c).toFixed(2), m) : "—"}</span>
                  <Button variante="ghost" tamanho="icone" aria-label={`Remover linha ${i + 1}`} disabled={linhas.fields.length === 1} onClick={() => linhas.remove(i)}>
                    <Trash2 strokeWidth={1.75} aria-hidden />
                  </Button>
                </div>
              </fieldset>
            );
          })}
        </div>
        <Button variante="secondary" className="mt-3" onClick={() => linhas.append(linhaVazia)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Linha
        </Button>
        <dl className="ml-auto mt-4 grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm" aria-label="Totais previstos">
          <dt className="text-muted-foreground">Líquido</dt>
          <dd className="text-right tabular-nums">{moeda(totais.liquido.toFixed(2), m)}</dd>
          <dt className="text-muted-foreground">IVA</dt>
          <dd className="text-right tabular-nums">{textoImposto}</dd>
          {totais.retencao.gt(0) ? (
            <>
              <dt className="text-muted-foreground">Retenção</dt>
              <dd className="text-right tabular-nums">−{moeda(totais.retencao.toFixed(2), m)}</dd>
            </>
          ) : null}
          <dt className="font-semibold text-foreground">A pagar</dt>
          <dd className="text-right font-semibold tabular-nums">{textoAPagar}</dd>
        </dl>
        <p className="mt-2 text-right text-xs text-muted-foreground">
          {totais.imposto || doServidor
            ? "Previsão com as taxas em vigor hoje. O valor que conta é o do documento emitido, à taxa da data da factura."
            : leTaxas
              ? "Há linhas sem taxa em vigor: a emissão será recusada."
              : "Guarde o rascunho para ver o IVA previsto pelo servidor."}
        </p>
      </Card>

      <Card>
        <Field rotulo="Notas" erro={form.formState.errors.notes?.message} ajuda="Internas: não saem no documento.">
          {({ id, descricao, invalido }) => <Textarea id={id} maxLength={1000} aria-describedby={descricao} invalido={invalido} {...form.register("notes")} />}
        </Field>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div>
          {draftId ? (
            <Button variante="ghost" onClick={() => setConfirmarEliminar(true)}>
              <Trash2 strokeWidth={1.75} aria-hidden />
              Eliminar rascunho
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="submit" variante="secondary" aCarregar={guardar.isPending && !confirmarEmissao}>
            Guardar rascunho
          </Button>
          <Button
            aCarregar={guardar.isPending && confirmarEmissao}
            onClick={form.handleSubmit((d) => {
              // Grava primeiro o que está no ecrã: emite-se exactamente isso.
              if (form.formState.isDirty || !draftId) gravar(d, () => setConfirmarEmissao(true));
              else setConfirmarEmissao(true);
            })}
          >
            Emitir…
          </Button>
        </div>
      </div>

      <Confirmar
        aberto={confirmarEmissao && !guardar.isPending}
        aoMudar={(a) => {
          setConfirmarEmissao(a);
          if (!a) emitir.reset();
        }}
        titulo={`Emitir ${NOME_TIPO[v.documentType] ?? "documento"}?`}
        descricao={AVISO_DEFINITIVO}
        rotuloConfirmar="Emitir documento"
        aCarregar={emitir.isPending}
        erro={emitir.error ? <ErrorPanel erro={emitir.error} /> : undefined}
        aoConfirmar={emitirAgora}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idData} className="text-sm font-medium text-foreground">
            Data do documento
          </label>
          <Input id={idData} type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} className="max-w-48" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {v.customerId ? (clientes.data?.items.find((c) => c.customerId === v.customerId)?.name ?? "Cliente") : "Consumidor final"} ·{" "}
          {totais.aPagar || doServidor?.aPagar ? `a pagar ${textoAPagar}` : `líquido ${moeda(totais.liquido.toFixed(2), m)} + IVA`}
        </p>
      </Confirmar>

      <Confirmar
        aberto={confirmarEliminar}
        aoMudar={setConfirmarEliminar}
        titulo="Eliminar o rascunho?"
        descricao="O rascunho não tem número nem efeito fiscal; desaparece da lista."
        rotuloConfirmar="Eliminar"
        variante="destructive"
        aCarregar={eliminar.isPending}
        erro={eliminar.error ? <ErrorPanel erro={eliminar.error} /> : undefined}
        aoConfirmar={() => (draftId && !eliminar.isPending ? eliminar.mutate(draftId, { onSuccess: () => void navegar("/facturas?vista=rascunhos") }) : undefined)}
      />
    </form>
  );
}

export default function RascunhoPagina() {
  const { draftId } = useParams();
  const rascunho = useRascunho(draftId ?? null);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/facturas?vista=rascunhos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Rascunhos
      </Link>
    </Button>
  );
  if (draftId && rascunho.isPending) return <CarregandoPagina />;
  if (draftId && rascunho.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={rascunho.error} tentarDeNovo={() => void rascunho.refetch()} />
      </>
    );
  }
  if (rascunho.data?.issuedInvoiceId) {
    return (
      <>
        {voltar}
        <Alert tom="info" titulo="Este rascunho já foi emitido.">
          <Link to={`/facturas/${rascunho.data.issuedInvoiceId}`} className="underline">
            Ver o documento emitido
          </Link>
        </Alert>
      </>
    );
  }
  return (
    <>
      {voltar}
      <PageHeader titulo={draftId ? "Rascunho de factura" : "Nova factura"} descricao="Sem número nem efeito fiscal até ser emitida." />
      <Editor rascunho={rascunho.data} />
    </>
  );
}
