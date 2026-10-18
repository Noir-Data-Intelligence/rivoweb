/**
 * Cobranças (§5.12, F11): as facturas vencidas, com «Registar acção» em cada
 * uma, e o histórico das acções de cobrança (as mais recentes primeiro). A
 * vista fica no URL.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { useEscolhasComerciais } from "@/features/crm";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { dataHoraLocalDeInstante, formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { dinheiro, paraApi } from "@/lib/money/money";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { accaoParaApi, errosAccao, TIPOS_ACCAO, useAccoesPagina, useRegistarAccao, useVencidas, type AccaoCobranca, type CamposAccao, type TipoAccao, type Vencida } from "../api";

const temErros = (e: Record<string, string | undefined>) => Object.values(e).some(Boolean);

function RegistarAccao({ vencidas, inicial, rotulo }: { vencidas: readonly Vencida[]; inicial?: Vencida; rotulo: string }) {
  const vazio = (): CamposAccao => ({ cliente: inicial?.customerId ?? "", factura: inicial?.invoiceId ?? "", tipo: "Call", notas: "", quando: dataHoraLocalDeInstante(new Date()), valorPrometido: "", dataPrometida: "", proximo: "", responsavel: "" });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarAccao();
  const escolhas = useEscolhasComerciais(aberto);
  const idForm = useId();
  const erros = errosAccao(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(vazio());
    else {
      setTentou(false);
      registar.reset();
    }
  };
  const campo = (k: keyof CamposAccao) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const facturas = vencidas.filter((f) => f.customerId === v.cliente);
  const factura = vencidas.find((f) => f.invoiceId === v.factura);
  return (
    <>
      {inicial ? (
        <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)} aria-label={`Registar acção sobre ${inicial.number}`}>
          Registar acção
        </Button>
      ) : (
        <Button onClick={() => fechar(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Registar acção
        </Button>
      )}
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={rotulo} rotuloConfirmar="Registar" aCarregar={registar.isPending} erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined} formulario={idForm} largo>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || registar.isPending) return;
            registar.mutate(accaoParaApi(v), { onSuccess: () => fechar(false) });
          }}
        >
          {inicial ? null : (
            <>
              <Field rotulo="Cliente" erro={tentou ? erros.cliente : undefined}>
                {({ id, descricao, invalido }) => (
                  <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.cliente} onChange={(e) => setV((x) => ({ ...x, cliente: e.target.value, factura: "" }))}>
                    <option value="">Escolha…</option>
                    {(escolhas.data?.customers ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field rotulo="Factura vencida (opcional)">
                {({ id, descricao }) => (
                  <Select id={id} aria-describedby={descricao} value={v.factura} onChange={campo("factura")}>
                    <option value="">{facturas.length === 0 ? "Nenhuma vencida" : "Nenhuma em particular"}</option>
                    {facturas.map((f) => (
                      <option key={f.invoiceId} value={f.invoiceId}>
                        {f.number} · {moeda(f.outstanding, f.currency)} em aberto
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </>
          )}
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value as TipoAccao }))}>
                {Object.entries(TIPOS_ACCAO).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Quando" erro={tentou ? erros.quando : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="datetime-local" aria-describedby={descricao} invalido={invalido} value={v.quando} onChange={campo("quando")} />}
          </Field>
          <Field rotulo="O que foi feito ou combinado" erro={tentou ? erros.notas : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={campo("notas")} />}
          </Field>
          <Field rotulo={`Valor prometido${factura ? ` em ${factura.currency}` : ""}${v.tipo === "PaymentPromise" ? "" : " (opcional)"}`} erro={tentou ? erros.valorPrometido : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.valorPrometido} onChange={campo("valorPrometido")} />}
          </Field>
          <Field rotulo={`Data prometida${v.tipo === "PaymentPromise" ? "" : " (opcional)"}`} erro={tentou ? erros.dataPrometida : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.dataPrometida} onChange={campo("dataPrometida")} />}
          </Field>
          <Field rotulo="Próximo contacto (opcional)" erro={tentou ? erros.proximo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.proximo} onChange={campo("proximo")} />}
          </Field>
          <Field rotulo="Responsável (opcional)">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.responsavel} onChange={campo("responsavel")}>
                <option value="">Ninguém</option>
                {(escolhas.data?.employees ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Vencidas({ vencidas, aCarregar, erro, escreve }: { vencidas: readonly Vencida[]; aCarregar: boolean; erro: unknown; escreve: boolean }) {
  const linhas = [...vencidas].sort((a, b) => Number(b.daysOverdue) - Number(a.daysOverdue));
  const colunas: Coluna<Vencida>[] = [
    {
      id: "factura",
      cabecalho: "Factura",
      celula: (f) => (
        <span className="flex flex-col">
          <Link to={`/facturas/${f.invoiceId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {f.number}
          </Link>
          <span className="truncate text-xs text-muted-foreground">{f.customerName}</span>
        </span>
      ),
    },
    { id: "venc", cabecalho: "Venceu a", esconderAte: "md", celula: (f) => formatarData(f.dueDate) },
    { id: "dias", cabecalho: "Atraso", celula: (f) => <Badge tom={Number(f.daysOverdue) > 60 ? "erro" : "aviso"}>{String(f.daysOverdue)} dias</Badge> },
    { id: "aberto", cabecalho: "Em aberto", alinhar: "direita", celula: (f) => moeda(f.outstanding, f.currency) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (f: Vencida) => <RegistarAccao vencidas={vencidas} inicial={f} rotulo={`Acção · ${f.number} · ${f.customerName}`} /> }] : []),
  ];
  return <Tabela rotulo="Facturas vencidas" colunas={colunas} linhas={linhas} chave={(f) => f.invoiceId} aCarregar={aCarregar} erro={erro ? <ErrorPanel erro={erro} /> : undefined} vazio="Nenhuma factura vencida." />;
}

function Accoes({ vencidas }: { vencidas: readonly Vencida[] }) {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useAccoesPagina({ pagina, tamanho });
  const { pode } = useUtilizador();
  const factura = (a: AccaoCobranca) =>
    a.salesInvoiceId === null ? null : pode("finance.invoices.read") ? (
      <Link to={`/facturas/${a.salesInvoiceId}`} className="underline-offset-4 hover:underline">
        {a.invoiceNumber ?? "Abrir a factura"}
      </Link>
    ) : (
      (a.invoiceNumber ?? null)
    );
  const moedaDe = (id: string | null) => vencidas.find((x) => x.invoiceId === id)?.currency ?? null;
  const prometido = (a: AccaoCobranca) => {
    if (a.promisedAmount === null) return null;
    const m = moedaDe(a.salesInvoiceId);
    const v = m ? moeda(a.promisedAmount, m) : formatarNumeroDecimal(paraApi(dinheiro(a.promisedAmount)), 2);
    return `${v}${a.promisedDate ? ` até ${formatarData(a.promisedDate)}` : ""}`;
  };
  const colunas: Coluna<AccaoCobranca>[] = [
    {
      id: "tipo",
      cabecalho: "Acção",
      className: "max-w-[22rem]",
      celula: (a) => (
        <span className="flex flex-col">
          <span className="font-medium">{TIPOS_ACCAO[a.kind as TipoAccao] ?? a.kind}</span>
          <span className="whitespace-pre-line break-words text-xs text-muted-foreground">{a.notes}</span>
          {a.ownerName ? <span className="text-xs text-muted-foreground">Responsável: {a.ownerName}</span> : null}
        </span>
      ),
    },
    {
      id: "cliente",
      cabecalho: "Cliente",
      esconderAte: "md",
      className: "max-w-[14rem]",
      celula: (a) => (
        <span className="flex flex-col">
          <span className="truncate">{a.customerName ?? "—"}</span>
          {a.salesInvoiceId ? <span className="text-xs">{factura(a)}</span> : null}
        </span>
      ),
    },
    { id: "quando", cabecalho: "Quando", esconderAte: "sm", celula: (a) => formatarDataHora(a.occurredAt) },
    { id: "promessa", cabecalho: "Promessa", esconderAte: "lg", celula: (a) => prometido(a) ?? "—" },
    { id: "proximo", cabecalho: "Próximo contacto", celula: (a) => (a.nextFollowUpOn ? formatarData(a.nextFollowUpOn) : "—") },
  ];
  return (
    <Tabela
      rotulo="Acções de cobrança"
      colunas={colunas}
      linhas={lista.data?.items}
      chave={(a) => a.actionId}
      aCarregar={lista.isPending}
      erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
      vazio="Ainda não há acções de cobrança."
      rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
    />
  );
}

const VISTAS: readonly Vista<"vencidas" | "accoes">[] = [
  { valor: "vencidas", texto: "Facturas vencidas" },
  { valor: "accoes", texto: "Acções" },
];

export default function Cobrancas() {
  const { pode } = useUtilizador();
  const leFacturas = pode("finance.invoices.read");
  const vencidas = useVencidas(leFacturas);
  const vista = useVista(VISTAS);
  const escreve = pode("commercial.collections.write");
  const lista = vencidas.data ?? [];
  return (
    <>
      <PageHeader
        titulo="Cobranças"
        descricao="As facturas vencidas e o que se fez para as cobrar: chamadas, e-mails, cartas, visitas, promessas de pagamento."
        accao={escreve ? <RegistarAccao vencidas={lista} rotulo="Registar acção de cobrança" /> : undefined}
      />
      <Vistas rotulo="Cobranças" vistas={VISTAS} actual={vista} />
      {vista === "accoes" ? <Accoes vencidas={lista} /> : <Vencidas vencidas={lista} aCarregar={leFacturas && vencidas.isPending} erro={vencidas.error} escreve={escreve} />}
    </>
  );
}
