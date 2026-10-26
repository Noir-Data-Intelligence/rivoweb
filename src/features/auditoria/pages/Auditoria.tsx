/**
 * Auditoria (§5.14, F13; período e páginas desde o #122): os registos da
 * trilha de um período (no URL; os últimos 7 dias por omissão), filtrados por
 * tipo e id da entidade e paginados, com o gráfico dos eventos por dia por
 * cima. Só consulta: a trilha não se escreve nem corrige no front. Quem fez
 * aparece pelo e-mail da conta, para quem lê as contas.
 */
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { useUtilizadores } from "@/features/administracao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { formatarInteiro } from "@/lib/format/numero";
import { Button } from "@/ui/Button";
import { ChartCard } from "@/ui/ChartCard";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { FiltroJanela, useJanelaUrl } from "@/ui/JanelaDatas";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAuditoriaPeriodo, useEventosPorDia, type EventosDoDia, type RegistoAuditoria } from "../api";
import { diasAntes, erroPeriodo } from "../regras";

/** Tipos de entidade que os módulos registam hoje, para sugerir no filtro (pode escrever-se outro). */
const TIPOS = [
  "approval.policy",
  "approval.request",
  "commercial.customer",
  "documents.document",
  "finance.bank_account",
  "finance.credit_note",
  "finance.document_series",
  "finance.journal_entry",
  "finance.ledger_account",
  "finance.payment_request",
  "finance.purchase_invoice",
  "finance.receipt",
  "finance.sales_invoice",
  "fleet.vehicle",
  "hr.employee",
  "hr.employment_contract",
  "hr.leave_request",
  "identity.user",
  "inventory.item",
  "inventory.movement",
  "payroll.run",
  "procurement.purchase_order",
  "procurement.supplier",
  "projects.project",
  "projects.task",
] as const;

/** Eventos por dia, com o mesmo período da lista; o título diz o total e o dia com mais. */
function EventosPorDia({ dias }: { dias: readonly EventosDoDia[] }) {
  const contagem = (d: EventosDoDia) => Number(d.count);
  const total = dias.reduce((s, d) => s + contagem(d), 0);
  const pico = dias.reduce<EventosDoDia | null>((m, d) => (m === null || contagem(d) > contagem(m) ? d : m), null);
  const titulo =
    total === 0 || !pico
      ? "Sem eventos no período"
      : `${formatarInteiro(total)} ${total === 1 ? "evento" : "eventos"} no período; o dia com mais foi ${formatarData(pico.date)} (${formatarInteiro(contagem(pico))})`;
  return (
    <ChartCard
      titulo={titulo}
      descricao="Eventos de auditoria por dia (UTC)"
      tipo={dias.length > 62 ? "linhas" : "barras"}
      categorias={dias.map((d) => formatarData(d.date))}
      series={[{ id: "eventos", nome: "Eventos", slot: 1, pontos: dias.map((d) => ({ valor: contagem(d), texto: formatarInteiro(contagem(d)) })) }]}
      ficheiroCsv={`eventos-por-dia-${dias[0]?.date ?? ""}-${dias.at(-1)?.date ?? ""}`}
      rotuloCategoria="Dia"
    />
  );
}

export default function Auditoria() {
  const [params, setParams] = useSearchParams();
  const tipo = params.get("tipo")?.trim() || null;
  const id = params.get("id")?.trim() || null;
  const hoje = hojeIso();
  const { de, ate } = useJanelaUrl({ de: diasAntes(hoje, 6), ate: hoje });
  const { pagina, tamanho, mudar: mudarPagina } = usePaginacaoUrl();
  const erroJanela = erroPeriodo(de, ate);
  const lista = useAuditoriaPeriodo({ tipo, id, de, ate, pagina, tamanho }, !erroJanela);
  const porDia = useEventosPorDia(de, ate, !erroJanela);
  const { pode } = useUtilizador();
  const contas = useUtilizadores(pode("identity.users.read"));
  const [v, setV] = useState({ tipo: tipo ?? "", id: id ?? "" });
  const ids = { tipo: useId(), id: useId(), lista: useId() };
  // Do URL actual (as navegações vão em transição); mudar um filtro volta à primeira página.
  const aplicar = (f: { tipo: string; id: string }) => {
    const n = new URLSearchParams(window.location.search);
    for (const [k, x] of [["tipo", f.tipo], ["id", f.id]] as const) {
      if (x.trim()) n.set(k, x.trim());
      else n.delete(k);
    }
    n.delete("pagina");
    setParams(n);
  };
  const mudarJanela = (k: "de" | "ate", x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x) n.set(k, x);
    else n.delete(k);
    n.delete("pagina");
    setParams(n, { replace: true });
  };
  const quem = (r: RegistoAuditoria) => (r.actorId ? (contas.data?.find((u) => u.userId === r.actorId)?.email ?? "—") : "Sistema");
  const colunas: Coluna<RegistoAuditoria>[] = [
    { id: "quando", cabecalho: "Quando", celula: (r) => formatarDataHora(r.occurredAt) },
    { id: "accao", cabecalho: "Acção", className: "max-w-[14rem]", celula: (r) => <code className="break-all text-xs">{r.action}</code> },
    {
      id: "entidade",
      cabecalho: "Entidade",
      esconderAte: "sm",
      className: "max-w-[16rem]",
      celula: (r) => (
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <code className="break-all text-xs">{r.entityType}</code>
          <button
            type="button"
            className="break-all text-left font-mono text-xs text-muted-foreground underline-offset-4 hover:underline"
            aria-label={`Ver só os registos de ${r.entityType} ${r.entityId}`}
            onClick={() => {
              const f = { tipo: r.entityType, id: r.entityId };
              setV(f);
              aplicar(f);
            }}
          >
            {r.entityId}
          </button>
        </span>
      ),
    },
    { id: "quem", cabecalho: "Quem", esconderAte: "md", className: "max-w-[14rem] truncate", celula: quem },
    { id: "ip", cabecalho: "IP", esconderAte: "lg", celula: (r) => r.ipAddress ?? "—" },
    { id: "corr", cabecalho: "Correlação", esconderAte: "lg", className: "max-w-[10rem]", celula: (r) => (r.correlationId ? <code className="break-all text-xs">{r.correlationId}</code> : "—") },
  ];
  return (
    <>
      <PageHeader titulo="Auditoria" descricao="Quem fez o quê e quando, no período escolhido: os registos mais recentes, primeiro. Só consulta." />
      <FiltroJanela de={de} ate={ate} mudar={mudarJanela} erro={erroJanela} />
      <form
        className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,16rem)_minmax(0,20rem)_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar(v);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.tipo} className="text-sm font-medium text-foreground">
            Tipo de entidade
          </label>
          <Input id={ids.tipo} list={ids.lista} autoComplete="off" maxLength={100} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value }))} />
          <datalist id={ids.lista}>
            {TIPOS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.id} className="text-sm font-medium text-foreground">
            Id da entidade
          </label>
          <Input id={ids.id} autoComplete="off" maxLength={100} className="font-mono" value={v.id} onChange={(e) => setV((x) => ({ ...x, id: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          {tipo || id ? (
            <Button
              type="button"
              variante="ghost"
              onClick={() => {
                const f = { tipo: "", id: "" };
                setV(f);
                aplicar(f);
              }}
            >
              Limpar
            </Button>
          ) : null}
        </div>
      </form>
      {erroJanela ? null : (
        <div className="mb-6" aria-busy={porDia.isFetching || undefined}>
          {porDia.isPending ? <Skeleton className="h-64" /> : porDia.error ? <ErrorPanel erro={porDia.error} tentarDeNovo={() => void porDia.refetch()} /> : <EventosPorDia dias={porDia.data} />}
        </div>
      )}
      <Tabela
        rotulo="Registos de auditoria"
        colunas={colunas}
        linhas={erroJanela ? [] : lista.data?.items}
        chave={(r) => r.id}
        aCarregar={!erroJanela && lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={erroJanela ? "Corrija o período." : tipo || id ? "Nenhum registo com estes filtros no período." : "Nenhum registo no período."}
        rodape={!erroJanela && lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudarPagina} /> : undefined}
      />
    </>
  );
}
