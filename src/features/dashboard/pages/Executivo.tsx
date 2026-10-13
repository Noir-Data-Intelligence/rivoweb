/**
 * Dashboard executivo (§5.3): os cinco números do período e os clientes que
 * mais facturaram (`/dashboard/overview`), mais a evolução mensal quando o
 * perfil lê finanças (`/dashboard/kpis`, a mesma janela).
 */
import { dinheiro } from "@/lib/money/money";
import { formatarMoeda } from "@/lib/format/numero";
import { NOME_PERIODO } from "@/lib/format/periodo";
import { formatarData } from "@/lib/format/data";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useKpis, useVisaoExecutiva } from "../api";
import { SeccaoFinancas, SeletorPeriodo, TopClientes, usePeriodo } from "../componentes";

export default function Executivo() {
  const { periodo, janela, mudar } = usePeriodo();
  const visao = useVisaoExecutiva(janela);
  const kpis = useKpis(janela);
  const v = visao.data;
  const m = (x: number | string) => formatarMoeda(dinheiro(x), v?.currency ?? "AOA");
  return (
    <>
      <PageHeader
        titulo="Dashboard executivo"
        descricao={`${NOME_PERIODO[periodo]} · ${formatarData(janela.from)} a ${formatarData(janela.to)}`}
        accao={<SeletorPeriodo periodo={periodo} aoMudar={mudar} />}
      />
      {visao.isPending ? (
        <Skeleton className="h-24" />
      ) : visao.error ? (
        <ErrorPanel erro={visao.error} tentarDeNovo={() => void visao.refetch()} />
      ) : (
        <div className="flex flex-col gap-8" aria-busy={visao.isFetching || undefined}>
          <GrelhaKpis>
            <Kpi rotulo="Receita" valor={m(visao.data.revenue)} />
            <Kpi rotulo="Despesa" valor={m(visao.data.expenses)} />
            <Kpi rotulo="Resultado" valor={m(visao.data.profit)} />
            <Kpi rotulo="A receber" valor={m(visao.data.receivables)} detalhe={`A pagar: ${m(visao.data.payables)}`} />
          </GrelhaKpis>
          {kpis.data?.finance ? <SeccaoFinancas f={kpis.data.finance} janela={janela} moedaKpis={kpis.data.currency} titulo="Evolução mensal" comKpis={false} /> : null}
          {kpis.error ? <ErrorPanel erro={kpis.error} tentarDeNovo={() => void kpis.refetch()} /> : null}
          <TopClientes clientes={visao.data.topCustomers} moedaKpis={visao.data.currency} />
        </div>
      )}
    </>
  );
}
