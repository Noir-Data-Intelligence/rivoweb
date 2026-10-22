/**
 * ESG (§5.14, F13): relatório anual por pilar (ano no URL), catálogo de
 * indicadores com as medições mensais e iniciativas; vista no URL.
 */
import { useId } from "react";
import { useSearchParams } from "react-router";
import { formatarInteiro, formatarPercentagem } from "@/lib/format/numero";
import { hojeIso } from "@/lib/format/data";
import { Badge } from "@/ui/Badge";
import { Card, CardTitle } from "@/ui/Card";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useRelatorioEsg, type ResultadoIndicador } from "../api";
import { numeroEsg, pilarDe } from "../comum";
import { IndicadoresEsg } from "../Indicadores";
import { IniciativasEsg } from "../Iniciativas";

type VistaEsg = "relatorio" | "indicadores" | "iniciativas";
const VISTAS: readonly Vista<VistaEsg>[] = [
  { valor: "relatorio", texto: "Relatório" },
  { valor: "indicadores", texto: "Indicadores" },
  { valor: "iniciativas", texto: "Iniciativas" },
];

const pontuacao = (v: number | string | null) => (v === null ? "—" : formatarPercentagem(String(v), 1));

function Relatorio() {
  const [params, setParams] = useSearchParams();
  const actual = Number(hojeIso().slice(0, 4));
  const anos = Array.from({ length: 5 }, (_, k) => actual - k);
  const pedido = Number(params.get("ano"));
  const ano = anos.includes(pedido) ? pedido : actual;
  const r = useRelatorioEsg(ano);
  const idAno = useId();
  const colunas = (unidade: (x: ResultadoIndicador) => string): Coluna<ResultadoIndicador>[] => [
    { id: "ind", cabecalho: "Indicador", className: "max-w-[16rem]", celula: (x) => <span className="break-words font-medium">{`${x.code} · ${x.name}`}</span> },
    { id: "actual", cabecalho: `Em ${String(ano)}`, alinhar: "direita", celula: (x) => `${numeroEsg(x.actual)} ${unidade(x)}` },
    { id: "anterior", cabecalho: `Em ${String(ano - 1)}`, alinhar: "direita", esconderAte: "md", celula: (x) => (x.previousYear === null ? "—" : `${numeroEsg(x.previousYear)} ${unidade(x)}`) },
    { id: "meta", cabecalho: "Meta", alinhar: "direita", esconderAte: "sm", celula: (x) => (x.target === null ? "—" : `${numeroEsg(x.target)} ${unidade(x)}`) },
    { id: "cumpre", cabecalho: "Meta cumprida", celula: (x) => (x.meetsTarget === null ? <Badge>Sem meta</Badge> : x.meetsTarget ? <Badge tom="sucesso">Sim</Badge> : <Badge tom="erro">Não</Badge>) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[10rem] flex-col gap-1.5">
        <label htmlFor={idAno} className="text-sm font-medium text-foreground">
          Ano
        </label>
        <Select
          id={idAno}
          value={String(ano)}
          onChange={(e) => {
            const n = new URLSearchParams(window.location.search);
            if (Number(e.target.value) === actual) n.delete("ano");
            else n.set("ano", e.target.value);
            setParams(n, { replace: true });
          }}
        >
          {anos.map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      {r.isPending ? (
        <Skeleton className="h-48" />
      ) : r.error ? (
        <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} />
      ) : (
        <div className="flex flex-col gap-6" aria-busy={r.isFetching || undefined}>
          <GrelhaKpis>
            <Kpi rotulo="Pontuação global" valor={pontuacao(r.data.overallScore)} detalhe="Indicadores com meta que a cumprem." />
            {r.data.pillars.map((p) => (
              <Kpi key={p.pillar} rotulo={pilarDe(p.pillar)} valor={pontuacao(p.score)} detalhe={`${formatarInteiro(Number(p.onTarget))} de ${formatarInteiro(Number(p.withTarget))} metas · ${formatarInteiro(Number(p.activeInitiatives))} iniciativas activas`} />
            ))}
          </GrelhaKpis>
          {r.data.pillars.map((p) => (
            <Card key={p.pillar}>
              <CardTitle className="mb-3">{`${pilarDe(p.pillar)} · ${formatarInteiro(Number(p.indicators))} indicadores`}</CardTitle>
              <Tabela rotulo={`Indicadores ${pilarDe(p.pillar)}`} colunas={colunas((x) => x.unit)} linhas={p.results} chave={(x) => x.indicatorId} aCarregar={false} vazio="Sem indicadores activos neste pilar." />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Esg() {
  const vista = useVista(VISTAS);
  return (
    <>
      <PageHeader titulo="ESG" descricao="Sustentabilidade: indicadores ambientais, sociais e de governação, as medições de cada mês, as iniciativas e o relatório do ano." />
      <Vistas rotulo="ESG" vistas={VISTAS} actual={vista} />
      {vista === "indicadores" ? <IndicadoresEsg /> : vista === "iniciativas" ? <IniciativasEsg /> : <Relatorio />}
    </>
  );
}
