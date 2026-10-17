/** Recepções de mercadoria: o que chegou, contra que ordem, quando e por quem. */
import { Link } from "react-router";
import { formatarData } from "@/lib/format/data";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useRecepcoes, type Recepcao } from "../api";
import { EstadoRecepcao, useNomePessoa } from "../comum";

export default function Recepcoes() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useRecepcoes({ ordem: null, pagina, tamanho });
  const nomeDe = useNomePessoa();
  const colunas: Coluna<Recepcao>[] = [
    {
      id: "data",
      cabecalho: "Recebida a",
      celula: (r) => (
        <Link to={`/encomendas/${r.purchaseOrderId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {formatarData(r.receivedOn)}
        </Link>
      ),
    },
    { id: "quem", cabecalho: "Por", celula: (r) => nomeDe(r.receivedByEmployeeId) },
    { id: "guia", cabecalho: "Guia de remessa", esconderAte: "sm", celula: (r) => r.deliveryNote ?? "—" },
    { id: "linhas", cabecalho: "Linhas", alinhar: "direita", esconderAte: "md", celula: (r) => String(r.lines.length) },
    { id: "estado", cabecalho: "Estado", celula: (r) => <EstadoRecepcao estado={r.status} /> },
  ];
  return (
    <>
      <PageHeader titulo="Recepções" descricao="Mercadoria recebida contra as ordens de compra. Abra a ordem para registar ou anular." />
      <Tabela
        rotulo="Recepções"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(r) => r.goodsReceiptId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há recepções."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
