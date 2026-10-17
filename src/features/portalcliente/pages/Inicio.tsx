/**
 * Portal do cliente › Início: o que deve hoje, o facturado no mês e as
 * facturas. Os dados vêm do mesmo pedido que confirma a ligação ao cliente
 * (`usePortalCliente`): o valor em dívida e as facturas não dependem do
 * período; o facturado, sim (mês corrente).
 */
import { Upload } from "lucide-react";
import { Link } from "react-router";
import { moeda, EstadoDocumento } from "@/features/facturacao";
import { usePortalCliente } from "@/features/identity/api";
import { formatarData } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import type { FacturaCliente } from "../api";

export default function Inicio() {
  const portal = usePortalCliente();
  if (portal.isPending) return <Skeleton className="h-48" />;
  if (portal.error) return <ErrorPanel erro={portal.error} tentarDeNovo={() => void portal.refetch()} />;
  const r = portal.data;
  const facturas = [...r.invoices].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn) || b.number.localeCompare(a.number));
  const colunas: Coluna<FacturaCliente>[] = [
    { id: "numero", cabecalho: "Factura", celula: (f) => <span className="font-medium text-foreground">{f.number}</span> },
    { id: "data", cabecalho: "Emitida a", esconderAte: "sm", celula: (f) => formatarData(f.issuedOn) },
    { id: "estado", cabecalho: "Estado", esconderAte: "md", celula: (f) => <EstadoDocumento estado={f.status} /> },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (f) => moeda(f.grossTotal, f.currency) },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (f) =>
        f.status === "Normal" ? (
          <Button asChild variante="ghost" tamanho="sm">
            <Link to={`/cliente/pagamentos?factura=${encodeURIComponent(f.invoiceId)}`} aria-label={`Enviar o comprovativo da factura ${f.number}`}>
              <Upload strokeWidth={1.75} aria-hidden />
              Enviar comprovativo
            </Link>
          </Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader titulo={r.customerName} descricao="O que está em dívida, o facturado este mês e as suas facturas." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Kpi rotulo="Em dívida hoje" valor={moeda(r.outstanding, r.currency)} detalhe="Facturas por pagar, já descontados os recibos e as notas de crédito." />
        <Kpi rotulo="Facturado este mês" valor={moeda(r.netRevenue, r.currency)} detalhe={`De ${formatarData(r.from)} a ${formatarData(r.to)}, sem impostos e já descontadas as notas de crédito.`} />
      </div>
      <Tabela rotulo="Facturas" colunas={colunas} linhas={facturas} chave={(f) => f.invoiceId} vazio="Ainda não há facturas." />
    </>
  );
}
