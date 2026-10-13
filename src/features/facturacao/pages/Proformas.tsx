/**
 * Pró-formas (§5.4): não lançam nem geram dívida. Converter emite uma factura
 * (FT/FR) pelo caminho normal, à taxa em vigor na data da factura.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import Big from "big.js";
import { ArrowLeft, FileCheck, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod/mini";
import { useClientesActivos } from "@/features/clientes";
import { useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { formatarData, hojeIso } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { Dialog, DialogContent } from "@/ui/Dialog";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { cn } from "@/ui/cn";
import { useAnularProforma, useConverterProforma, useEmitirProforma, usePautas, useProformas, type ProForma } from "../api";
import { calcularTotais } from "../calculos";
import { AVISO_DEFINITIVO, EstadoDocumento, MEIOS, moeda } from "../comum";
import { taxaEmVigor } from "./Rascunho";

function Converter({ p }: { p: ProForma }) {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const converter = useConverterProforma();
  const [tipo, setTipo] = useState<"FT" | "FR">("FT");
  const [meio, setMeio] = useState("");
  const [venc, setVenc] = useState("");
  const [data, setData] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const id = useId();
  const ok = IsoDate.safeParse(data).success && (tipo === "FT" || meio !== "") && (venc === "" || IsoDate.safeParse(venc).success);
  const confirmar = () => {
    setTentou(true);
    if (!ok || converter.isPending) return;
    converter.mutate(
      {
        proformaId: p.proformaId,
        corpo: { series: null, issuedOn: data, documentType: tipo, dueDate: tipo === "FT" && venc ? venc : null, paymentTerms: null, withholdingRate: null, paymentMethod: tipo === "FR" ? meio : null },
      },
      { onSuccess: (r) => void navegar(`/facturas/${r.id}`) },
    );
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        <FileCheck strokeWidth={1.75} aria-hidden />
        Converter
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) converter.reset();
        }}
        titulo={`Converter ${p.number} em factura?`}
        descricao={`O IVA calcula-se à taxa em vigor na data da factura. ${AVISO_DEFINITIVO}`}
        rotuloConfirmar="Emitir factura"
        aCarregar={converter.isPending}
        erro={converter.error ? <ErrorPanel erro={converter.error} /> : undefined}
        aoConfirmar={confirmar}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-t`} className="text-sm font-medium text-foreground">
              Tipo
            </label>
            <Select id={`${id}-t`} value={tipo} onChange={(e) => setTipo(e.target.value as "FT" | "FR")}>
              <option value="FT">FT · Factura</option>
              <option value="FR">FR · Factura-recibo</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-d`} className="text-sm font-medium text-foreground">
              Data da factura
            </label>
            <Input id={`${id}-d`} type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          {tipo === "FR" ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-m`} className="text-sm font-medium text-foreground">
                Meio de pagamento
              </label>
              <Select id={`${id}-m`} value={meio} onChange={(e) => setMeio(e.target.value)} aria-invalid={tentou && meio === "" ? true : undefined}>
                <option value="">Escolha…</option>
                {Object.entries(MEIOS).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
              {tentou && meio === "" ? <p className="text-xs text-danger" role="alert">Escolha o meio.</p> : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-v`} className="text-sm font-medium text-foreground">
                Vencimento (opcional)
              </label>
              <Input id={`${id}-v`} type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
            </div>
          )}
        </div>
      </Confirmar>
    </>
  );
}

function AnularProforma({ p }: { p: ProForma }) {
  const [aberto, setAberto] = useState(false);
  const anular = useAnularProforma();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        Anular
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) anular.reset();
        }}
        titulo={`Anular ${p.number}?`}
        descricao="A pró-forma deixa de poder ser convertida. Fica no registo."
        rotuloConfirmar="Anular pró-forma"
        variante="destructive"
        aCarregar={anular.isPending}
        erro={anular.error ? <ErrorPanel erro={anular.error} /> : undefined}
        aoConfirmar={() => (anular.isPending ? undefined : anular.mutate(p.proformaId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Detalhe({ p, aoFechar }: { p: ProForma; aoFechar: () => void }) {
  return (
    <Dialog open onOpenChange={(a) => (a ? undefined : aoFechar())}>
      <DialogContent titulo={`Pró-forma ${p.number}`} descricao={`${p.customerName} · ${formatarData(p.issuedOn)}${p.validUntil ? ` · válida até ${formatarData(p.validUntil)}` : ""}`} className="max-w-xl">
        <ul className="divide-y divide-border text-sm">
          {p.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>
                {l.description} <span className="text-muted-foreground">× {String(l.quantity).replace(".", ",")} · {l.taxCode}</span>
              </span>
              <span className="tabular-nums">{moeda(l.net ?? 0, p.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-3 grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Líquido</dt>
          <dd className="text-right tabular-nums">{moeda(p.netTotal, p.currency)}</dd>
          <dt className="text-muted-foreground">IVA</dt>
          <dd className="text-right tabular-nums">{moeda(p.taxTotal, p.currency)}</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="text-right font-semibold tabular-nums">{moeda(p.grossTotal, p.currency)}</dd>
        </dl>
        {p.convertedInvoiceId ? (
          <p className="mt-3 text-sm">
            Convertida em{" "}
            <Link to={`/facturas/${p.convertedInvoiceId}`} className="underline">
              {p.convertedInvoiceNumber}
            </Link>
            .
          </p>
        ) : null}
        {p.notes ? <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{p.notes}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

export function ListaProformas() {
  const [params] = useSearchParams();
  const estado = (["Open", "Converted", "Cancelled"] as const).find((e) => e === params.get("estado")) ?? null;
  const proformas = useProformas(estado);
  const { pode } = useUtilizador();
  const podeEscrever = pode("finance.invoices.write");
  const [ver, setVer] = useState<ProForma | null>(null);
  const sep = (a: boolean) =>
    cn("inline-flex h-9 items-center border-b-2 px-3 text-base pointer-coarse:h-11", a ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground");
  const colunas: Coluna<ProForma>[] = [
    {
      id: "numero",
      cabecalho: "Número",
      ordenar: (p) => p.number,
      celula: (p) => (
        <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setVer(p)}>
          {p.number}
        </button>
      ),
    },
    { id: "data", cabecalho: "Data", esconderAte: "sm", ordenar: (p) => p.issuedOn, celula: (p) => formatarData(p.issuedOn) },
    { id: "cliente", cabecalho: "Cliente", esconderAte: "md", ordenar: (p) => p.customerName, celula: (p) => p.customerName, className: "max-w-[14rem] truncate" },
    { id: "total", cabecalho: "Total", alinhar: "direita", ordenar: (p) => Number(p.grossTotal), celula: (p) => moeda(p.grossTotal, p.currency) },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoDocumento estado={p.status} /> },
    ...(podeEscrever
      ? [
          {
            id: "accoes",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (p: ProForma) =>
              p.status === "Open" ? (
                <span className="inline-flex gap-1">
                  <Converter p={p} />
                  <AnularProforma p={p} />
                </span>
              ) : null,
          },
        ]
      : []),
  ];
  return (
    <>
      <PageHeader
        titulo="Pró-formas"
        descricao="Propostas de preço. Não lançam nem geram dívida."
        accao={
          podeEscrever ? (
            <Button asChild>
              <Link to="/proformas/nova">
                <Plus strokeWidth={1.75} aria-hidden />
                Nova pró-forma
              </Link>
            </Button>
          ) : undefined
        }
      />
      <nav aria-label="Estado das pró-formas" className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {([
          [null, "Todas"],
          ["Open", "Em aberto"],
          ["Converted", "Convertidas"],
          ["Cancelled", "Anuladas"],
        ] as const).map(([e, n]) => (
          <Link key={n} to={e ? `/proformas?estado=${e}` : "/proformas"} className={sep(estado === e)} aria-current={estado === e ? "page" : undefined}>
            {n}
          </Link>
        ))}
      </nav>
      <Tabela
        rotulo="Pró-formas"
        colunas={colunas}
        linhas={proformas.data}
        chave={(p) => p.proformaId}
        aCarregar={proformas.isPending}
        erro={proformas.error ? <ErrorPanel erro={proformas.error} tentarDeNovo={() => void proformas.refetch()} /> : undefined}
        vazio={estado ? "Nenhuma pró-forma neste estado." : "Ainda não há pró-formas."}
        ordenavel
      />
      {ver ? <Detalhe p={ver} aoFechar={() => setVer(null)} /> : null}
    </>
  );
}

const esquema = z
  .object({
    customerId: z.string(),
    customerName: texto({ max: 200 }),
    validUntil: z.string(),
    currency: z.enum(["AOA", "USD", "EUR"]),
    notes: z.string().check(z.maxLength(1000)),
    lines: z
      .array(
        z.object({
          description: texto({ max: 200, obrigatorio: "Escreva a descrição." }),
          quantity: z.string().check(z.refine((v) => (lerDecimalDigitado(v, 4)?.gt(0) ?? false), "Maior que zero.")),
          unitPrice: z.string().check(z.refine((v) => (lerDinheiroDigitado(v, 2)?.gte(0) ?? false), "Preço inválido.")),
          taxCode: z.string().check(z.minLength(1)),
        }),
      )
      .check(z.minLength(1, "Pelo menos uma linha.")),
  })
  .check(
    z.refine((d) => d.customerId !== "" || normalizarTexto(d.customerName) !== "", { path: ["customerName"], error: "Escolha um cliente ou escreva o destinatário." }),
    z.refine((d) => d.validUntil === "" || IsoDate.safeParse(d.validUntil).success, { path: ["validUntil"], error: "Data inválida." }),
  );
type Dados = z.infer<typeof esquema>;

export function NovaProforma() {
  const navegar = useNavigate();
  const { pode } = useUtilizador();
  const leTaxas = pode("fiscal.rates.read");
  const clientes = useClientesActivos();
  const pautas = usePautas(leTaxas);
  const emitir = useEmitirProforma();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: { customerId: "", customerName: "", validUntil: "", currency: "AOA", notes: "", lines: [{ description: "", quantity: "1", unitPrice: "", taxCode: "NOR" }] },
  });
  const linhas = useFieldArray({ control: form.control, name: "lines" });
  const v = useWatch({ control: form.control }) as Dados;
  const hoje = hojeIso();
  const codigos = leTaxas ? (pautas.data ?? []).filter((p) => (p.kind === 0 || String(p.kind) === "ValueAdded") && !p.requiresExemptionCode).map((p) => p.code) : ["NOR"];
  const calc = (v.lines ?? [])
    .map((l) => {
      const q = lerDecimalDigitado(l.quantity ?? "", 4);
      const pr = lerDinheiroDigitado(l.unitPrice ?? "", 2);
      return q && pr ? { quantidade: q, preco: pr as Big, taxa: leTaxas ? taxaEmVigor(pautas.data, l.taxCode ?? "", hoje) : null } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const totais = calcularTotais(calc, null);
  const submeter = form.handleSubmit((d) => {
    if (emitir.isPending) return;
    setSoltas([]);
    emitir.mutate(
      {
        customerId: d.customerId || null,
        customerName: d.customerId ? null : normalizarTexto(d.customerName),
        series: null,
        issuedOn: null,
        validUntil: d.validUntil || null,
        currency: d.currency,
        notes: normalizarTexto(d.notes, true) || null,
        lines: d.lines.map((l) => ({
          description: l.description,
          quantity: decimalParaApi(lerDecimalDigitado(l.quantity, 4) ?? new Big(0)),
          unitPrice: paraApi(lerDinheiroDigitado(l.unitPrice, 2) ?? (new Big(0) as never)),
          taxCode: l.taxCode,
        })),
      },
      { onSuccess: () => void navegar("/proformas"), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["customerId", "customerName", "validUntil", "currency", "notes"])) },
    );
  });
  return (
    <>
      <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
        <Link to="/proformas">
          <ArrowLeft strokeWidth={1.75} aria-hidden />
          Pró-formas
        </Link>
      </Button>
      <PageHeader titulo="Nova pró-forma" descricao="Uma proposta de preço: não lança nem gera dívida." />
      <form noValidate onSubmit={submeter} className="flex flex-col gap-6">
        {soltas.length > 0 ? (
          <Alert tom="erro" titulo="Não foi possível emitir.">
            {soltas.join(" ")}
          </Alert>
        ) : emitir.error && !(eApiError(emitir.error) && emitir.error.status === 400) ? (
          <ErrorPanel erro={emitir.error} />
        ) : null}
        <Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field rotulo="Cliente" erro={form.formState.errors.customerId?.message}>
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("customerId")}>
                  <option value="">Destinatário sem registo</option>
                  {(clientes.data?.items ?? []).map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {v.customerId === "" ? (
              <Field rotulo="Destinatário" erro={form.formState.errors.customerName?.message}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={200} aria-describedby={descricao} invalido={invalido} {...form.register("customerName")} />}
              </Field>
            ) : null}
            <Field rotulo="Válida até" erro={form.formState.errors.validUntil?.message} ajuda="Opcional.">
              {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} {...form.register("validUntil")} />}
            </Field>
            <Field rotulo="Moeda">
              {({ id }) => (
                <Select id={id} {...form.register("currency")}>
                  <option value="AOA">AOA · Kwanza</option>
                  <option value="USD">USD · Dólar</option>
                  <option value="EUR">EUR · Euro</option>
                </Select>
              )}
            </Field>
          </div>
        </Card>
        <Card>
          <CardTitle>Linhas</CardTitle>
          <div className="mt-3 flex flex-col gap-3">
            {linhas.fields.map((f, i) => {
              const e = form.formState.errors.lines?.[i];
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
                  <Field rotulo="Imposto" className="sm:col-span-2">
                    {({ id }) => (
                      <Select id={id} {...form.register(`lines.${i}.taxCode`)}>
                        {codigos.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <div className="flex items-end sm:col-span-1">
                    <Button variante="ghost" tamanho="icone" aria-label={`Remover linha ${i + 1}`} disabled={linhas.fields.length === 1} onClick={() => linhas.remove(i)}>
                      <Trash2 strokeWidth={1.75} aria-hidden />
                    </Button>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <Button variante="secondary" className="mt-3" onClick={() => linhas.append({ description: "", quantity: "1", unitPrice: "", taxCode: "NOR" })}>
            <Plus strokeWidth={1.75} aria-hidden />
            Linha
          </Button>
          <p className="mt-4 text-right text-sm">
            Líquido <span className="tabular-nums">{moeda(totais.liquido.toFixed(2), v.currency ?? "AOA")}</span>
            {totais.total ? (
              <>
                {" "}· Total <span className="font-semibold tabular-nums">{moeda(totais.total.toFixed(2), v.currency ?? "AOA")}</span>
              </>
            ) : (
              " · IVA calculado ao emitir"
            )}
          </p>
        </Card>
        <Card>
          <Field rotulo="Notas" ajuda="Saem na pró-forma.">
            {({ id, descricao }) => <Textarea id={id} maxLength={1000} aria-describedby={descricao} {...form.register("notes")} />}
          </Field>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" aCarregar={emitir.isPending}>
            Emitir pró-forma
          </Button>
        </div>
      </form>
    </>
  );
}
