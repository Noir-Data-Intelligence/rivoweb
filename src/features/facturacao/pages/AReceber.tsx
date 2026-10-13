/** Facturas vencidas com saldo em aberto (vencimento = dueDate, ou a data do documento). */
import Big from "big.js";
import { Link } from "react-router";
import { formatarData } from "@/lib/format/data";
import { dinheiro } from "@/lib/money/money";
import { Badge } from "@/ui/Badge";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVencidas, type Vencida } from "../api";
import { moeda } from "../comum";

export default function AReceber() {
  const vencidas = useVencidas();
  const lista = vencidas.data ?? [];
  // Totais por moeda, somados com Big (nunca em number).
  const porMoeda = new Map<string, Big>();
  for (const v of lista) porMoeda.set(v.currency, (porMoeda.get(v.currency) ?? new Big(0)).plus(dinheiro(v.outstanding)));
  const colunas: Coluna<Vencida>[] = [
    {
      id: "numero",
      cabecalho: "Factura",
      ordenar: (v) => v.number,
      celula: (v) => (
        <Link to={`/facturas/${v.invoiceId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {v.number}
        </Link>
      ),
    },
    { id: "cliente", cabecalho: "Cliente", ordenar: (v) => v.customerName, esconderAte: "sm", celula: (v) => v.customerName, className: "max-w-[14rem] truncate" },
    { id: "venc", cabecalho: "Vencimento", ordenar: (v) => v.dueDate, esconderAte: "md", celula: (v) => formatarData(v.dueDate) },
    {
      id: "dias",
      cabecalho: "Atraso",
      ordenar: (v) => Number(v.daysOverdue),
      celula: (v) => <Badge tom={Number(v.daysOverdue) > 90 ? "erro" : Number(v.daysOverdue) > 30 ? "aviso" : "neutro"}>{`${String(v.daysOverdue)} dias`}</Badge>,
    },
    { id: "total", cabecalho: "Total", alinhar: "direita", esconderAte: "lg", celula: (v) => moeda(v.grossTotal, v.currency) },
    { id: "aberto", cabecalho: "Em aberto", alinhar: "direita", ordenar: (v) => Number(v.outstanding), celula: (v) => moeda(v.outstanding, v.currency) },
  ];
  return (
    <>
      <PageHeader titulo="A receber" descricao="Facturas vencidas com saldo em aberto, à data de hoje." />
      {lista.length > 0 ? (
        <div className="mb-6">
          <GrelhaKpis>
            <Kpi rotulo="Facturas vencidas" valor={String(lista.length)} />
            {[...porMoeda.entries()].map(([m, v]) => (
              <Kpi key={m} rotulo={`Em aberto (${m})`} valor={moeda(v.toFixed(2), m)} />
            ))}
          </GrelhaKpis>
        </div>
      ) : null}
      <Tabela
        rotulo="Facturas vencidas"
        colunas={colunas}
        linhas={vencidas.data}
        chave={(v) => v.invoiceId}
        aCarregar={vencidas.isPending}
        erro={vencidas.error ? <ErrorPanel erro={vencidas.error} tentarDeNovo={() => void vencidas.refetch()} /> : undefined}
        vazio="Não há facturas vencidas em aberto."
        ordenavel
      />
    </>
  );
}
