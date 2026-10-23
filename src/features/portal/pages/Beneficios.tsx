/** Portal › Benefícios: as adesões do próprio, activas em cima e as terminadas em «Anteriores». */
import { moeda } from "@/features/facturacao";
import { formatarData } from "@/lib/format/data";
import { Badge } from "@/ui/Badge";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { useMeusBeneficios, type MeuBeneficio } from "../api";

function Lista({ titulo, itens }: { titulo: string; itens: readonly MeuBeneficio[] }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-3">
      <CardTitle>{titulo}</CardTitle>
      <ul className="grid gap-3 md:grid-cols-2">
        {itens.map((b) => (
          <li key={b.enrolmentId}>
            <Card className="flex h-full flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{b.name}</h3>
                  <p className="text-sm text-muted-foreground">{b.kind}</p>
                </div>
                {b.status === "Active" ? <Badge tom="sucesso">Activo</Badge> : b.status === "Cancelled" ? <Badge>Terminado</Badge> : <Badge>{b.status}</Badge>}
              </div>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {moeda(b.monthlyValue, b.currency)}
                <span className="text-sm font-normal text-muted-foreground"> por mês</span>
              </p>
              {b.description ? <p className="whitespace-pre-line text-sm text-foreground">{b.description}</p> : null}
              <p className="mt-auto text-xs text-muted-foreground">
                Desde {formatarData(b.startsOn)}
                {b.cancelledOn ? ` · terminado a ${formatarData(b.cancelledOn)}` : ""}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Beneficios() {
  const lista = useMeusBeneficios();
  const activos = lista.data?.filter((b) => b.status === "Active") ?? [];
  const anteriores = lista.data?.filter((b) => b.status !== "Active") ?? [];
  return (
    <>
      <PageHeader titulo="Benefícios" descricao="Os benefícios que a empresa lhe atribuiu. As adesões e as alterações são feitas pelos Recursos Humanos." />
      {lista.isPending ? (
        <Skeleton className="h-40" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
      ) : lista.data.length === 0 ? (
        <EmptyState frase="Ainda não tem benefícios atribuídos. Fale com os Recursos Humanos." />
      ) : (
        <div className="flex flex-col gap-6">
          {activos.length > 0 ? <Lista titulo="Activos" itens={activos} /> : <p className="text-sm text-muted-foreground">Não tem benefícios activos.</p>}
          {anteriores.length > 0 ? <Lista titulo="Anteriores" itens={anteriores} /> : null}
        </div>
      )}
    </>
  );
}
