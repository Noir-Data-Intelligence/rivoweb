/**
 * Analytics (§5.14, F13): num período (por omissão, do início do ano a hoje)
 * e numa moeda, ambos no URL, três separadores: tendências (receita e
 * despesa por mês, frota e inventário), RH e vendas. Só se pede o separador
 * aberto.
 */
import { useId } from "react";
import { useSearchParams } from "react-router";
import { ESTADOS_LEAD } from "@/features/crm";
import { GraficoReceitaDespesa, SeccaoPessoas, SeccaoVendas, type KpisPessoas, type KpisVendas } from "@/features/dashboard";
import { moeda } from "@/features/facturacao";
import { hojeIso } from "@/lib/format/data";
import { formatarInteiro, formatarNumeroDecimal, formatarPercentagem } from "@/lib/format/numero";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { FiltroJanela, useJanelaUrl } from "@/ui/JanelaDatas";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useAnalyticsRh, useAnalyticsVendas, useTendencias, type Tendencias } from "../api";

const MOEDAS = ["AOA", "USD", "EUR"] as const;
type Separador = "tendencias" | "rh" | "vendas";
const VISTAS: readonly Vista<Separador>[] = [
  { valor: "tendencias", texto: "Tendências" },
  { valor: "rh", texto: "Recursos humanos" },
  { valor: "vendas", texto: "Vendas" },
];
const inteiro = (v: number | string) => formatarInteiro(Number(v));

function SeccaoTendencias({ t, janela }: { t: Tendencias; janela: { from: string; to: string } }) {
  return (
    <div className="flex flex-col gap-8">
      <GraficoReceitaDespesa receitaMensal={t.monthlyRevenue} despesaMensal={t.monthlyExpenses} janela={janela} moedaKpis={t.currency} />
      <section aria-labelledby="sec-frota" className="flex flex-col gap-4">
        <h2 id="sec-frota" className="text-md font-semibold text-foreground">
          Frota no período
        </h2>
        <GrelhaKpis>
          <Kpi rotulo="Despesas da frota" valor={moeda(t.fleetPeriodExpenses)} detalhe="Combustível, portagens e estacionamento, em AOA." />
          <Kpi rotulo="Quilómetros percorridos" valor={`${formatarNumeroDecimal(String(t.fleetPeriodDistanceKm), 0)} km`} />
          <Kpi rotulo="Custo de manutenção" valor={moeda(t.fleetPeriodMaintenanceCost)} />
        </GrelhaKpis>
      </section>
      <section aria-labelledby="sec-inventario" className="flex flex-col gap-4">
        <h2 id="sec-inventario" className="text-md font-semibold text-foreground">
          Inventário
        </h2>
        <GrelhaKpis>
          <Kpi rotulo="Valor do stock hoje" valor={moeda(t.inventoryCurrentValue)} />
          <Kpi rotulo="Valorização no período" valor={moeda(t.inventoryPeriodValuation)} detalhe="Valor dos movimentos de stock entre as datas." />
        </GrelhaKpis>
      </section>
    </div>
  );
}

function MaisRh({ h }: { h: KpisPessoas }) {
  return (
    <section aria-labelledby="sec-rh-mais" className="flex flex-col gap-4">
      <h2 id="sec-rh-mais" className="text-md font-semibold text-foreground">
        Assiduidade, férias e formação
      </h2>
      <GrelhaKpis>
        <Kpi rotulo="Atrasos no período" valor={inteiro(h.lateArrivalsInPeriod)} />
        <Kpi rotulo="Dias de férias aprovados" valor={inteiro(h.approvedLeaveDaysInPeriod)} />
        <Kpi rotulo="Horas de formação concluídas" valor={`${formatarNumeroDecimal(String(h.trainingHoursCompleted), 1)} h`} />
        <Kpi rotulo="Contratos em vigor" valor={inteiro(h.activeContracts)} />
      </GrelhaKpis>
    </section>
  );
}

function MaisVendas({ v }: { v: KpisVendas }) {
  const leads = Object.entries(v.leadsByStatus).map(([estado, n]) => ({ estado, n: Number(n) }));
  return (
    <section aria-labelledby="sec-leads" className="flex flex-col gap-4">
      <h2 id="sec-leads" className="text-md font-semibold text-foreground">
        Leads e actividades
      </h2>
      <GrelhaKpis>
        <Kpi rotulo="Conversão de leads" valor={formatarPercentagem(String(v.leadConversionRate), 1)} />
        <Kpi rotulo="Actividades em atraso" valor={inteiro(v.overdueActivities)} />
      </GrelhaKpis>
      <Tabela
        rotulo="Leads por estado"
        colunas={[
          { id: "estado", cabecalho: "Estado", celula: (l) => ESTADOS_LEAD[l.estado] ?? l.estado },
          { id: "n", cabecalho: "Leads", alinhar: "direita", celula: (l) => formatarInteiro(l.n) },
        ]}
        linhas={leads}
        chave={(l) => l.estado}
        vazio="Sem leads no período."
      />
    </section>
  );
}

export default function Analytics() {
  const hoje = hojeIso();
  const { de, ate, mudar } = useJanelaUrl({ de: `${hoje.slice(0, 4)}-01-01`, ate: hoje });
  const [params, setParams] = useSearchParams();
  const idMoeda = useId();
  const moedaSel = MOEDAS.find((x) => x === params.get("moeda")) ?? "AOA";
  const vista = useVista(VISTAS);
  const erroJanela = de > ate ? "O fim não pode ser antes do início." : undefined;
  const ok = !erroJanela;
  const tendencias = useTendencias({ de, ate, moeda: moedaSel }, ok && vista === "tendencias");
  const rh = useAnalyticsRh({ de, ate }, ok && vista === "rh");
  const vendas = useAnalyticsVendas({ de, ate, moeda: moedaSel }, ok && vista === "vendas");
  const janela = { from: de, to: ate };
  const escolherMoeda = (x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x === "AOA") n.delete("moeda");
    else n.set("moeda", x);
    setParams(n, { replace: true });
  };
  const q = vista === "rh" ? rh : vista === "vendas" ? vendas : tendencias;
  return (
    <>
      <PageHeader titulo="Analytics" descricao="A evolução do período: finanças, frota e inventário, pessoas e vendas." />
      <div className="flex flex-wrap items-start gap-4">
        <FiltroJanela de={de} ate={ate} mudar={mudar} erro={erroJanela} />
        {vista !== "rh" ? (
          <div className="mb-4 flex flex-col gap-1.5 sm:w-40">
            <label htmlFor={idMoeda} className="text-sm font-medium text-foreground">
              Moeda
            </label>
            <Select id={idMoeda} value={moedaSel} onChange={(e) => escolherMoeda(e.target.value)}>
              {MOEDAS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
      <Vistas rotulo="Analytics" vistas={VISTAS} actual={vista} />
      {!ok ? null : q.isPending ? (
        <Skeleton className="h-64" />
      ) : q.error ? (
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} />
      ) : (
        <div aria-busy={q.isFetching || undefined}>
          {vista === "rh" && rh.data ? (
            <div className="flex flex-col gap-8">
              <SeccaoPessoas h={rh.data} janela={janela} />
              <MaisRh h={rh.data} />
            </div>
          ) : vista === "vendas" && vendas.data ? (
            <div className="flex flex-col gap-8">
              <SeccaoVendas v={vendas.data} janela={janela} moedaKpis={moedaSel} />
              <MaisVendas v={vendas.data} />
            </div>
          ) : tendencias.data ? (
            <SeccaoTendencias t={tendencias.data} janela={janela} />
          ) : null}
        </div>
      )}
    </>
  );
}
