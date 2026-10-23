/**
 * Portal › O meu contrato: o mais recente em destaque e os anteriores por
 * baixo. Traz o salário (o próprio já o vê nos recibos); as notas internas dos
 * RH não vêm nesta vista.
 */
import { moeda } from "@/features/facturacao";
import { nome, TIPO_CONTRATO } from "@/features/rh";
import { formatarData } from "@/lib/format/data";
import { Badge } from "@/ui/Badge";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela } from "@/ui/Tabela";
import { useMeusContratos, type MeuContrato } from "../api";

const Estado = ({ estado }: { estado: string }) =>
  estado === "Active" ? <Badge tom="sucesso">Em vigor</Badge> : estado === "Terminated" ? <Badge>Terminado</Badge> : <Badge>{estado}</Badge>;

function Destaque({ c }: { c: MeuContrato }) {
  const linhas: [string, string][] = [
    ["Tipo", nome(TIPO_CONTRATO, c.type)],
    ["Início", formatarData(c.startsOn)],
    ["Fim", c.endsOn ? formatarData(c.endsOn) : "Sem data de fim"],
    ["Salário mensal bruto", moeda(c.monthlySalary, c.currency)],
  ];
  return (
    <Card aria-labelledby="contrato-actual">
      <div className="mb-4 flex items-center justify-between gap-3">
        <CardTitle id="contrato-actual">Contrato mais recente</CardTitle>
        <Estado estado={c.status} />
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {linhas.map(([r, v]) => (
          <div key={r}>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{r}</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function Contrato() {
  const lista = useMeusContratos();
  const [actual, ...anteriores] = lista.data ?? [];
  return (
    <>
      <PageHeader titulo="O meu contrato" descricao="O seu contrato de trabalho, tal como está registado nos Recursos Humanos." />
      {lista.isPending ? (
        <Skeleton className="h-32" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
      ) : !actual ? (
        <EmptyState frase="Não há contrato registado. Fale com os Recursos Humanos." />
      ) : (
        <div className="flex flex-col gap-6">
          <Destaque c={actual} />
          {anteriores.length > 0 ? (
            <section aria-label="Contratos anteriores" className="flex flex-col gap-3">
              <CardTitle>Contratos anteriores</CardTitle>
              <Tabela
                rotulo="Contratos anteriores"
                colunas={[
                  { id: "tipo", cabecalho: "Tipo", celula: (c) => nome(TIPO_CONTRATO, c.type) },
                  { id: "periodo", cabecalho: "Período", celula: (c) => `${formatarData(c.startsOn)} – ${c.endsOn ? formatarData(c.endsOn) : "sem data de fim"}` },
                  { id: "salario", cabecalho: "Salário mensal", alinhar: "direita", esconderAte: "sm", celula: (c) => moeda(c.monthlySalary, c.currency) },
                  { id: "estado", cabecalho: "Estado", celula: (c) => <Estado estado={c.status} /> },
                ]}
                linhas={anteriores}
                chave={(c) => c.contractId}
                aCarregar={false}
                vazio=""
              />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
