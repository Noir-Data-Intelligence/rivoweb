/** Secções partilhadas pelo painel pessoal e pelo dashboard executivo. */
import { Megaphone, Pin } from "lucide-react";
import { useId } from "react";
import { useSearchParams } from "react-router";
import { dinheiro } from "@/lib/money/money";
import { formatarDataHora } from "@/lib/format/data";
import { formatarInteiro, formatarMoeda, formatarPercentagem } from "@/lib/format/numero";
import { janelaDe, lerPeriodo, mesCurto, NOME_PERIODO, PERIODOS, type Periodo } from "@/lib/format/periodo";
import { Card, CardTitle } from "@/ui/Card";
import { ChartCard, type Ponto, type Serie, type Slot } from "@/ui/ChartCard";
import { Select } from "@/ui/Controlos";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { EmptyState } from "@/ui/Layout";
import { Tabela } from "@/ui/Tabela";
import type { KpisFinancas, KpisPessoas, KpisVendas, MeuPainel, VisaoExecutiva } from "./api";
import { conclusaoAdmissoes, conclusaoEquipas, conclusaoGanhas, conclusaoPipeline, conclusaoReceitaDespesa, mesesDaJanela } from "./conclusoes";

/** Cor fixa por entidade (§4.5): não se escolhe no ecrã. */
export const SLOT: Readonly<Record<string, Slot>> = {
  receita: 1,
  despesa: 2,
  admissoes: 3,
  equipa: 1,
  pipeline: 4,
  ganhas: 3,
};

type Valor = number | string;
const num = (v: Valor) => Number(dinheiro(v).toString());
const moeda = (v: Valor, m: string) => formatarMoeda(dinheiro(v), m);
const pontoMoeda = (v: Valor, m: string): Ponto => ({ valor: num(v), texto: moeda(v, m) });
const pontoContagem = (n: number): Ponto => ({ valor: n, texto: formatarInteiro(n) });
const inteiro = (v: Valor) => Number(v);
/** «1 inactivo», «3 inactivos». */
const contar = (v: Valor, um: string, varios: string) => `${formatarInteiro(inteiro(v))} ${inteiro(v) === 1 ? um : varios}`;

/** Período no URL (`?periodo=`): o «voltar» do browser e uma ligação partilhada mostram o mesmo. */
export function usePeriodo() {
  const [params, setParams] = useSearchParams();
  const periodo = lerPeriodo(params.get("periodo"));
  const mudar = (p: Periodo) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      n.set("periodo", p);
      return n;
    });
  return { periodo, janela: janelaDe(periodo), mudar };
}

export function SeletorPeriodo({ periodo, aoMudar }: { periodo: Periodo; aoMudar: (p: Periodo) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        Período
      </label>
      <Select id={id} value={periodo} onChange={(e) => aoMudar(e.target.value as Periodo)} className="w-44">
        {PERIODOS.map((p) => (
          <option key={p} value={p}>
            {NOME_PERIODO[p]}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function Anuncios({ anuncios }: { anuncios: MeuPainel["announcements"] }) {
  const ordenados = [...anuncios].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
  return (
    <Card>
      <CardTitle>Anúncios</CardTitle>
      {ordenados.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Não há anúncios em vigor.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {ordenados.map((a) => (
            <li key={a.announcementId} className="py-3">
              <p className="flex items-center gap-2 font-medium text-foreground">
                {a.pinned ? <Pin className="size-4 text-muted-foreground" strokeWidth={1.75} aria-label="Fixado" /> : <Megaphone className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />}
                {a.title}
              </p>
              {/* Texto simples: o corpo nunca é interpretado como HTML (S10). */}
              <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatarDataHora(a.publishedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function serieMensal(meses: readonly { year: Valor; month: Valor; amount: Valor }[], janela: { from: string; to: string }, m: string) {
  const todos = mesesDaJanela(janela.from, janela.to);
  const porChave = new Map(meses.map((x) => [`${inteiro(x.year)}-${String(inteiro(x.month)).padStart(2, "0")}`, x.amount]));
  return todos.map((t) => ({ ...t, valor: porChave.get(t.chave) ?? 0, moeda: m }));
}

export function SeccaoFinancas({
  f,
  janela,
  moedaKpis,
  titulo = "Finanças",
  comKpis = true,
}: {
  f: KpisFinancas;
  janela: { from: string; to: string };
  moedaKpis: string;
  titulo?: string;
  /** No dashboard executivo os números já estão no topo: só o gráfico. */
  comKpis?: boolean;
}) {
  const receita = serieMensal(f.monthlyRevenue, janela, moedaKpis);
  const despesa = serieMensal(f.monthlyExpenses, janela, moedaKpis);
  const categorias = receita.map((r) => mesCurto(r.ano, r.mes));
  const series: Serie[] = [
    { id: "receita", nome: "Receita", slot: SLOT.receita as Slot, pontos: receita.map((r) => pontoMoeda(r.valor, moedaKpis)) },
    { id: "despesa", nome: "Despesa", slot: SLOT.despesa as Slot, pontos: despesa.map((d) => pontoMoeda(d.valor, moedaKpis)) },
  ];
  const conclusao = conclusaoReceitaDespesa(receita.map((r, i) => ({ ano: r.ano, mes: r.mes, receita: dinheiro(r.valor), despesa: dinheiro(despesa[i]?.valor ?? 0) })));
  return (
    <section aria-labelledby="sec-financas" className="flex flex-col gap-4">
      <h2 id="sec-financas" className="text-md font-semibold text-foreground">
        {titulo}
      </h2>
      {comKpis ? (
      <GrelhaKpis>
        <Kpi rotulo="Receita" valor={moeda(f.revenue, moedaKpis)} />
        <Kpi rotulo="Despesa" valor={moeda(f.expenses, moedaKpis)} />
        <Kpi rotulo="Resultado" valor={moeda(f.profit, moedaKpis)} />
        <Kpi rotulo="A receber" valor={moeda(f.receivables, moedaKpis)} detalhe={`A pagar: ${moeda(f.payables, moedaKpis)}`} />
      </GrelhaKpis>
      ) : null}
      <ChartCard titulo={conclusao} descricao="Receita e despesa por mês" tipo="barras" categorias={categorias} series={series} ficheiroCsv={`receita-despesa-${janela.from}-${janela.to}`} rotuloCategoria="Mês" />
    </section>
  );
}

export function TopClientes({ clientes, moedaKpis }: { clientes: VisaoExecutiva["topCustomers"]; moedaKpis: string }) {
  return (
    <section aria-labelledby="sec-clientes" className="flex flex-col gap-3">
      <h2 id="sec-clientes" className="text-md font-semibold text-foreground">
        Clientes que mais facturaram
      </h2>
      <Tabela
        rotulo="Clientes que mais facturaram"
        colunas={[
          { id: "cliente", cabecalho: "Cliente", celula: (c) => c.customerName },
          { id: "valor", cabecalho: "Facturação líquida", alinhar: "direita", celula: (c) => moeda(c.netRevenue, moedaKpis) },
        ]}
        linhas={clientes}
        chave={(c) => c.customerId}
        vazio="Ainda não há facturação neste período."
      />
    </section>
  );
}

export function SeccaoPessoas({ h, janela }: { h: KpisPessoas; janela: { from: string; to: string } }) {
  const meses = mesesDaJanela(janela.from, janela.to);
  const porMes = new Map(h.monthlyHires.map((m) => [m.month, inteiro(m.count)]));
  const admissoes = meses.map((m) => ({ month: m.chave, count: porMes.get(m.chave) ?? 0 }));
  const deps = h.byDepartment.map((d) => ({ department: d.department, count: inteiro(d.count) })).sort((a, b) => b.count - a.count);
  const topDeps = deps.slice(0, 8);
  return (
    <section aria-labelledby="sec-pessoas" className="flex flex-col gap-4">
      <h2 id="sec-pessoas" className="text-md font-semibold text-foreground">
        Pessoas
      </h2>
      <GrelhaKpis>
        <Kpi rotulo="Colaboradores activos" valor={formatarInteiro(inteiro(h.activeHeadcount))} detalhe={contar(h.inactiveHeadcount, "inactivo", "inactivos")} />
        <Kpi rotulo="Admissões no período" valor={formatarInteiro(inteiro(h.hiresInPeriod))} />
        <Kpi rotulo="Ausências no período" valor={formatarInteiro(inteiro(h.absencesInPeriod))} detalhe={contar(h.unjustifiedAbsences, "injustificada", "injustificadas")} />
        <Kpi rotulo="Pedidos de férias por decidir" valor={formatarInteiro(inteiro(h.pendingLeaveRequests))} detalhe={contar(h.openTickets, "pedido de RH em aberto", "pedidos de RH em aberto")} />
      </GrelhaKpis>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          titulo={conclusaoAdmissoes(admissoes)}
          descricao="Admissões por mês"
          tipo="barras"
          categorias={meses.map((m) => mesCurto(m.ano, m.mes))}
          series={[{ id: "admissoes", nome: "Admissões", slot: SLOT.admissoes as Slot, pontos: admissoes.map((a) => pontoContagem(a.count)) }]}
          ficheiroCsv={`admissoes-${janela.from}-${janela.to}`}
          rotuloCategoria="Mês"
        />
        <ChartCard
          titulo={conclusaoEquipas(deps)}
          descricao={deps.length > topDeps.length ? `Colaboradores activos nos ${topDeps.length} maiores departamentos` : "Colaboradores activos por departamento"}
          tipo="barras"
          categorias={topDeps.map((d) => d.department)}
          series={[{ id: "equipa", nome: "Colaboradores", slot: SLOT.equipa as Slot, pontos: topDeps.map((d) => pontoContagem(d.count)) }]}
          ficheiroCsv="colaboradores-por-departamento"
          rotuloCategoria="Departamento"
        />
      </div>
    </section>
  );
}

const ETAPAS: Readonly<Record<string, string>> = {
  Prospecting: "Prospecção",
  Qualification: "Qualificação",
  Proposal: "Proposta",
  Negotiation: "Negociação",
  Won: "Ganha",
  Lost: "Perdida",
};
const nomeEtapa = (s: string) => ETAPAS[s] ?? s;

export function SeccaoVendas({ v, janela, moedaKpis }: { v: KpisVendas; janela: { from: string; to: string }; moedaKpis: string }) {
  const etapas = v.pipeline.map((e) => ({ stage: e.stage, count: inteiro(e.count), totalValue: dinheiro(e.totalValue), bruto: e.totalValue }));
  const meses = mesesDaJanela(janela.from, janela.to);
  const porMes = new Map(v.monthlyWon.map((m) => [m.month, inteiro(m.count)]));
  const ganhas = meses.map((m) => ({ month: m.chave, count: porMes.get(m.chave) ?? 0 }));
  return (
    <section aria-labelledby="sec-vendas" className="flex flex-col gap-4">
      <h2 id="sec-vendas" className="text-md font-semibold text-foreground">
        Vendas
      </h2>
      <GrelhaKpis>
        <Kpi rotulo="Oportunidades em aberto" valor={formatarInteiro(inteiro(v.openOpportunities))} />
        <Kpi rotulo="Valor em pipeline" valor={moeda(v.pipelineValue, moedaKpis)} detalhe={`Ponderado: ${moeda(v.weightedPipelineValue, moedaKpis)}`} />
        <Kpi rotulo="Taxa de sucesso" valor={formatarPercentagem(String(v.winRate), 1)} detalhe={`${contar(v.won, "ganha", "ganhas")}, ${contar(v.lost, "perdida", "perdidas")}`} />
        <Kpi rotulo="Valor ganho" valor={moeda(v.wonValue, moedaKpis)} detalhe={contar(v.contractsExpiringIn30Days, "contrato termina em 30 dias", "contratos terminam em 30 dias")} />
      </GrelhaKpis>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          titulo={conclusaoPipeline(etapas, nomeEtapa)}
          descricao="Valor em aberto por etapa"
          tipo="barras"
          categorias={etapas.map((e) => nomeEtapa(e.stage))}
          series={[{ id: "pipeline", nome: "Valor", slot: SLOT.pipeline as Slot, pontos: etapas.map((e) => pontoMoeda(e.bruto, moedaKpis)) }]}
          ficheiroCsv="pipeline-por-etapa"
          rotuloCategoria="Etapa"
        />
        <ChartCard
          titulo={conclusaoGanhas(ganhas)}
          descricao="Oportunidades ganhas por mês"
          tipo="barras"
          categorias={meses.map((m) => mesCurto(m.ano, m.mes))}
          series={[{ id: "ganhas", nome: "Ganhas", slot: SLOT.ganhas as Slot, pontos: ganhas.map((g) => pontoContagem(g.count)) }]}
          ficheiroCsv={`ganhas-${janela.from}-${janela.to}`}
          rotuloCategoria="Mês"
        />
      </div>
    </section>
  );
}

export function SemSeccoes() {
  return (
    <Card>
      <EmptyState frase="O seu perfil não tem indicadores de gestão. As notificações e os anúncios aparecem acima." />
    </Card>
  );
}

