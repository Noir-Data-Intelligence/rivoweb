/**
 * Portal do cliente › Extracto: facturas, notas de crédito e recibos de um
 * período (por omissão, do início do ano a hoje), com o saldo depois de cada
 * movimento. Saldo positivo é o que o cliente deve.
 */
import { moeda } from "@/features/facturacao";
import { formatarData, hojeIso } from "@/lib/format/data";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { FiltroJanela, useJanelaUrl } from "@/ui/JanelaDatas";
import { Kpi } from "@/ui/Kpi";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useExtracto, type LinhaExtracto } from "../api";
import { NOMES_EXTRACTO } from "../regras";

export default function Extracto() {
  const hoje = hojeIso();
  const { de, ate, mudar } = useJanelaUrl({ de: `${hoje.slice(0, 4)}-01-01`, ate: hoje });
  const erro = ate < de ? "A data final não pode ser anterior à inicial." : undefined;
  const extracto = useExtracto(de, ate, !erro);
  const colunas: Coluna<LinhaExtracto>[] = [
    { id: "data", cabecalho: "Data", celula: (l) => formatarData(l.date) },
    {
      id: "documento",
      cabecalho: "Documento",
      celula: (l) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{l.documentNumber}</span>
          <span className="text-sm text-muted-foreground">{NOMES_EXTRACTO[l.documentType] ?? l.documentType}</span>
        </div>
      ),
    },
    { id: "debito", cabecalho: "Débito", alinhar: "direita", esconderAte: "sm", celula: (l) => (l.direction === "Debit" ? moeda(l.amount) : "—") },
    { id: "credito", cabecalho: "Crédito", alinhar: "direita", esconderAte: "sm", celula: (l) => (l.direction === "Credit" ? moeda(l.amount) : "—") },
    { id: "saldo", cabecalho: "Saldo", alinhar: "direita", celula: (l) => moeda(l.balanceAfter) },
  ];
  return (
    <>
      <PageHeader titulo="Extracto" descricao="Facturas, notas de crédito e recibos do período, com o saldo depois de cada um. Saldo positivo é o que está por pagar." />
      <FiltroJanela de={de} ate={ate} mudar={mudar} erro={erro} />
      {erro ? null : extracto.error ? (
        <ErrorPanel erro={extracto.error} tentarDeNovo={() => void extracto.refetch()} />
      ) : (
        <>
          {extracto.data ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Kpi rotulo="Saldo inicial" valor={moeda(extracto.data.openingBalance)} detalhe={`A ${formatarData(de)}`} />
              <Kpi rotulo="Saldo final" valor={moeda(extracto.data.closingBalance)} detalhe={`A ${formatarData(ate)}`} />
            </div>
          ) : null}
          <Tabela
            rotulo="Movimentos do extracto"
            colunas={colunas}
            linhas={extracto.data?.lines}
            chave={(l) => `${l.documentType}-${l.documentNumber}`}
            aCarregar={extracto.isPending}
            vazio="Sem movimentos no período."
          />
        </>
      )}
    </>
  );
}
