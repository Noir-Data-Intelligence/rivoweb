/**
 * Pedidos de pagamento (§5.6): lista. Pede-se a partir da factura de compra.
 * O estado de um pedido por pagar diz-se pela decisão em Aprovações (nota 54).
 * A API não filtra por ela: com um estado escolhido, lêem-se os 200 pedidos
 * mais recentes e filtram-se aqui.
 */
import { useId } from "react";
import { Link, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { formatarData } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { usePedidosPagamento, type PedidoPagamento } from "../api";
import { ESTADOS_PAGAMENTO, EstadoPedidoPagamento, estadoPagamento, type EstadoPagamento } from "../comum";

/** Quantos pedidos se lêem para filtrar por estado (o máximo de uma página da API). */
const LIMITE_FILTRO = 200;

export default function PedidosPagamento() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const idEstado = useId();
  const estado = (ESTADOS_PAGAMENTO.find((e) => e.valor === params.get("estado"))?.valor ?? null) as EstadoPagamento | null;
  const pedidos = usePedidosPagamento(estado ? { pagina: 1, tamanho: LIMITE_FILTRO, factura: null } : { pagina, tamanho, factura: null });
  const linhas = estado ? pedidos.data?.items.filter((p) => estadoPagamento(p) === estado) : pedidos.data?.items;
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
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoPedidoPagamento p={p} /> },
  ];
  return (
    <>
      <PageHeader titulo="Pedidos de pagamento" descricao="Pede-se a partir da factura de compra. Depois de aprovado, quem tem a tesouraria executa: quem pede não paga." />
      <div className="mb-4 flex flex-col gap-1.5 sm:w-72">
        <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
          Estado
        </label>
        <Select
          id={idEstado}
          value={estado ?? ""}
          onChange={(e) =>
            setParams((a) => {
              const n = new URLSearchParams(a);
              if (e.target.value) n.set("estado", e.target.value);
              else n.delete("estado");
              n.delete("pagina");
              return n;
            })
          }
        >
          <option value="">Todos os estados</option>
          {ESTADOS_PAGAMENTO.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.rotulo}
            </option>
          ))}
        </Select>
      </div>
      {estado && pedidos.data && pedidos.data.total > LIMITE_FILTRO ? (
        <Alert tom="info" className="mb-4" titulo={`Só entre os ${String(LIMITE_FILTRO)} pedidos mais recentes.`}>
          Há {String(pedidos.data.total)} pedidos; os mais antigos não entram neste filtro.
        </Alert>
      ) : null}
      <Tabela
        rotulo="Pedidos de pagamento"
        colunas={colunas}
        linhas={linhas}
        chave={(p) => p.paymentRequestId}
        aCarregar={pedidos.isPending}
        erro={pedidos.error ? <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} /> : undefined}
        vazio={estado ? "Nenhum pedido neste estado." : "Ainda não há pedidos de pagamento."}
        rodape={!estado && pedidos.data && pedidos.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={pedidos.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
