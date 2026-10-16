/** Portal › Bens à minha guarda: activos da empresa entregues ao próprio e ainda não devolvidos. */
import { formatarData } from "@/lib/format/data";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useMeusBens, type BemAGuarda } from "../api";

export default function Bens() {
  const bens = useMeusBens();
  const colunas: Coluna<BemAGuarda>[] = [
    { id: "codigo", cabecalho: "Código", celula: (b) => <span className="font-medium">{b.assetCode}</span> },
    { id: "nome", cabecalho: "Bem", celula: (b) => b.assetName },
    { id: "desde", cabecalho: "Entregue a", esconderAte: "sm", celula: (b) => formatarData(b.assignedOn) },
    { id: "estado", cabecalho: "Estado na entrega", esconderAte: "md", celula: (b) => b.conditionOnAssign ?? "—" },
  ];
  return (
    <>
      <PageHeader titulo="Bens à minha guarda" descricao="Equipamento da empresa que tem consigo. A devolução regista-se na gestão de activos." />
      <Tabela
        rotulo="Bens à minha guarda"
        colunas={colunas}
        linhas={bens.data}
        chave={(b) => b.custodyId}
        aCarregar={bens.isPending}
        erro={bens.error ? <ErrorPanel erro={bens.error} tentarDeNovo={() => void bens.refetch()} /> : undefined}
        vazio="Não tem bens da empresa à sua guarda."
      />
    </>
  );
}
