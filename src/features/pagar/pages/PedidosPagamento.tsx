/** Pedidos de pagamento (§5.6): lista. Pede-se a partir da factura de compra. */
import { Link } from "react-router";
import { moeda } from "@/features/facturacao";
import { formatarData } from "@/lib/format/data";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { usePedidosPagamento, type PedidoPagamento } from "../api";
import { EstadoPedidoPagamento } from "../comum";

export default function PedidosPagamento() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const pedidos = usePedidosPagamento({ pagina, tamanho, factura: null });
  const colunas: Coluna<PedidoPagamento>[] = [
    {
      id: "factura",
      cabecalho: "Factura",
      celula: (p) => (
        <Link to={`/pedidos-pagamento/${p.paymentRequestId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {p.supplierInvoiceNumber}
        </Link>
      ),
    },
    { id: "beneficiario", cabecalho: "Beneficiário", esconderAte: "sm", celula: (p) => p.payeeName, className: "max-w-[14rem] truncate" },
    { id: "data", cabecalho: "Pedido em", esconderAte: "md", celula: (p) => formatarData(p.requestedOn) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (p) => moeda(p.amount, p.currency) },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoPedidoPagamento estado={p.status} /> },
  ];
  return (
    <>
      <PageHeader titulo="Pedidos de pagamento" descricao="Pede-se a partir da factura de compra. Depois de aprovado, quem tem a tesouraria executa: quem pede não paga." />
      <Tabela
        rotulo="Pedidos de pagamento"
        colunas={colunas}
        linhas={pedidos.data?.items}
        chave={(p) => p.paymentRequestId}
        aCarregar={pedidos.isPending}
        erro={pedidos.error ? <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} /> : undefined}
        vazio="Ainda não há pedidos de pagamento."
        rodape={pedidos.data && pedidos.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={pedidos.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
