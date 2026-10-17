/** Ordens de compra: emitidas a partir das requisições aprovadas; o estado diz se já chegou tudo. */
import { Link } from "react-router";
import { formatarData } from "@/lib/format/data";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useOrdens, type OrdemCompra } from "../api";
import { EstadoOrdem, valor } from "../comum";

export default function Ordens() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useOrdens({ requisicao: null, fornecedor: null, pagina, tamanho });
  const colunas: Coluna<OrdemCompra>[] = [
    {
      id: "fornecedor",
      cabecalho: "Ordem",
      celula: (o) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/encomendas/${o.purchaseOrderId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {o.supplierName}
          </Link>
          <span className="truncate text-sm text-muted-foreground">{o.lines.map((l) => l.description).join(", ")}</span>
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { id: "emitida", cabecalho: "Emitida a", esconderAte: "sm", celula: (o) => formatarData(o.issuedOn) },
    { id: "esperada", cabecalho: "Entrega esperada", esconderAte: "md", celula: (o) => (o.expectedOn ? formatarData(o.expectedOn) : "—") },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (o) => valor(o.total, o.currency) },
    { id: "estado", cabecalho: "Estado", celula: (o) => <EstadoOrdem estado={o.status} recebida={o.fullyReceived} /> },
  ];
  return (
    <>
      <PageHeader titulo="Ordens de compra" descricao="Encomendas aos fornecedores, nascidas de requisições aprovadas, e o que já chegou." />
      <Tabela
        rotulo="Ordens de compra"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(o) => o.purchaseOrderId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há ordens de compra."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
