/** Valorização do stock: o valor dos movimentos de cada artigo num período (por omissão, o mês corrente). */
import Big from "big.js";
import { Link } from "react-router";
import { hojeIso } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { FiltroJanela, useJanelaUrl } from "@/ui/JanelaDatas";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useValorizacao, type Valorizacao as TipoValorizacao } from "../api";
import { kz } from "../comum";

export default function Valorizacao() {
  const hoje = hojeIso();
  const { de, ate, mudar } = useJanelaUrl({ de: `${hoje.slice(0, 7)}-01`, ate: hoje });
  const erro = ate < de ? "A data final não pode ser anterior à inicial." : undefined;
  const lista = useValorizacao({ de, ate }, !erro);
  const total = (lista.data ?? []).reduce((t, x) => t.plus(new Big(x.periodValue)), new Big(0));
  const colunas: Coluna<TipoValorizacao>[] = [
    {
      id: "artigo",
      cabecalho: "Artigo",
      celula: (x) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/artigos/${x.itemId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {x.name}
          </Link>
          <span className="text-sm text-muted-foreground">{x.sku}</span>
        </div>
      ),
    },
    { id: "valor", cabecalho: "Valor no período", alinhar: "direita", celula: (x) => kz(x.periodValue) },
  ];
  return (
    <>
      <PageHeader titulo="Valorização do stock" descricao="Valor dos movimentos de cada artigo no período, ao custo de cada movimento." />
      <FiltroJanela de={de} ate={ate} mudar={mudar} erro={erro} />
      {erro ? null : (
        <>
          <Tabela
            rotulo="Valorização por artigo"
            colunas={colunas}
            linhas={lista.data}
            chave={(x) => x.itemId}
            aCarregar={lista.isPending}
            erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
            vazio="Sem movimentos no período."
          />
          {lista.data && lista.data.length > 0 ? <Alert tom="info" className="mt-4" titulo={`Total do período: ${kz(total)}`} /> : null}
        </>
      )}
    </>
  );
}
