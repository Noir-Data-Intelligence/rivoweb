/**
 * Relatório comercial (§5.12, F11): o funil aberto por etapa e a previsão por
 * mês de fecho (hoje), e no período escolhido as oportunidades ganhas e
 * perdidas, a taxa de ganho, o funil de leads e o desempenho por responsável.
 * Uma moeda de cada vez; período e moeda no URL.
 */
import { useId } from "react";
import { useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { hojeIso } from "@/lib/format/data";
import { formatarPercentagem } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { Card, CardTitle } from "@/ui/Card";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { FiltroJanela, useJanelaUrl } from "@/ui/JanelaDatas";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela } from "@/ui/Tabela";
import { useRelatorioComercial } from "../api";
import { ESTADOS_LEAD, ETAPAS } from "../comum";
import { MOEDAS } from "../regras";

const mes = (aaaamm: string) => {
  const [a, m] = aaaamm.split("-");
  return a && m ? `${nomeMes(Number(m))} de ${a}` : aaaamm;
};

export default function RelatorioComercial() {
  const hoje = hojeIso();
  const { de, ate, mudar } = useJanelaUrl({ de: `${hoje.slice(0, 4)}-01-01`, ate: hoje });
  const [params, setParams] = useSearchParams();
  const idMoeda = useId();
  const m = params.get("moeda");
  const moedaSel = MOEDAS.find((x) => x === m) ?? "AOA";
  const erroJanela = de > ate ? "O fim não pode ser antes do início." : undefined;
  const r = useRelatorioComercial({ de, ate, moeda: moedaSel }, !erroJanela);
  const escolherMoeda = (x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x === "AOA") n.delete("moeda");
    else n.set("moeda", x);
    setParams(n, { replace: true });
  };
  const d = r.data;
  return (
    <>
      <PageHeader titulo="Relatório comercial" descricao="O funil de hoje e o que se ganhou e perdeu no período. Só as oportunidades na moeda escolhida." />
      <div className="flex flex-wrap items-start gap-4">
        <FiltroJanela de={de} ate={ate} mudar={mudar} erro={erroJanela} />
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
      </div>
      {r.error ? <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} /> : null}
      {erroJanela ? null : !d ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-6">
          <GrelhaKpis>
            <Kpi rotulo="Ganhas no período" valor={String(d.won)} detalhe={moeda(d.wonValue, d.currency)} />
            <Kpi rotulo="Perdidas no período" valor={String(d.lost)} />
            <Kpi rotulo="Taxa de ganho" valor={formatarPercentagem(d.winRate, 1)} detalhe="Das fechadas no período" />
            <Kpi rotulo="Conversão de leads" valor={formatarPercentagem(d.leadConversionRate, 1)} detalhe="Dos leads do período já fechados" />
            <Kpi rotulo="Actividades por fazer" valor={String(d.openActivities)} detalhe={`${String(d.overdueActivities)} atrasadas`} />
          </GrelhaKpis>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-3">Funil aberto, por etapa</CardTitle>
              <Tabela
                rotulo="Funil por etapa"
                colunas={[
                  { id: "etapa", cabecalho: "Etapa", celula: (p) => ETAPAS[p.stage] ?? p.stage },
                  { id: "n", cabecalho: "Oportunidades", alinhar: "direita", celula: (p) => String(p.count) },
                  { id: "total", cabecalho: "Valor", alinhar: "direita", celula: (p) => moeda(p.totalValue, d.currency) },
                  { id: "pond", cabecalho: "Ponderado", alinhar: "direita", esconderAte: "sm", celula: (p) => moeda(p.weightedValue, d.currency) },
                ]}
                linhas={d.pipeline}
                chave={(p) => p.stage}
                aCarregar={false}
                vazio="Sem oportunidades abertas."
              />
            </Card>
            <Card>
              <CardTitle className="mb-3">Previsão por mês de fecho</CardTitle>
              <Tabela
                rotulo="Previsão por mês"
                colunas={[
                  { id: "mes", cabecalho: "Mês", celula: (p) => mes(p.month) },
                  { id: "n", cabecalho: "Oportunidades", alinhar: "direita", celula: (p) => String(p.count) },
                  { id: "total", cabecalho: "Valor", alinhar: "direita", esconderAte: "sm", celula: (p) => moeda(p.totalValue, d.currency) },
                  { id: "pond", cabecalho: "Ponderado", alinhar: "direita", celula: (p) => moeda(p.weightedValue, d.currency) },
                ]}
                linhas={d.forecast}
                chave={(p) => p.month}
                aCarregar={false}
                vazio="Nenhuma oportunidade aberta tem fecho previsto."
              />
            </Card>
            <Card>
              <CardTitle className="mb-3">Leads do período, por estado</CardTitle>
              <Tabela
                rotulo="Leads por estado"
                colunas={[
                  { id: "estado", cabecalho: "Estado", celula: (p: [string, unknown]) => ESTADOS_LEAD[p[0]] ?? p[0] },
                  { id: "n", cabecalho: "Leads", alinhar: "direita", celula: (p: [string, unknown]) => String(p[1]) },
                ]}
                linhas={Object.entries(d.leadsByStatus)}
                chave={(p) => p[0]}
                aCarregar={false}
                vazio="Sem leads no período."
              />
            </Card>
            <Card>
              <CardTitle className="mb-3">Por responsável (fechadas no período)</CardTitle>
              <Tabela
                rotulo="Desempenho por responsável"
                colunas={[
                  { id: "quem", cabecalho: "Responsável", celula: (p) => (p.ownerEmployeeId === null ? "Sem responsável" : (p.ownerName ?? "—")) },
                  { id: "g", cabecalho: "Ganhas", alinhar: "direita", celula: (p) => String(p.won) },
                  { id: "p", cabecalho: "Perdidas", alinhar: "direita", esconderAte: "sm", celula: (p) => String(p.lost) },
                  { id: "t", cabecalho: "Taxa", alinhar: "direita", celula: (p) => formatarPercentagem(p.winRate, 1) },
                  { id: "v", cabecalho: "Valor ganho", alinhar: "direita", esconderAte: "md", celula: (p) => moeda(p.wonValue, d.currency) },
                ]}
                linhas={d.byOwner}
                chave={(p) => p.ownerEmployeeId ?? "sem"}
                aCarregar={false}
                vazio="Nada fechado no período."
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
