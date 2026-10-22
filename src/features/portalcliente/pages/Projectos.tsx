/**
 * Portal do cliente › Projectos (F12): os projectos que a empresa decidiu
 * mostrar a este cliente, com o progresso e os marcos.
 */
import { Link } from "react-router";
import { formatarData } from "@/lib/format/data";
import { BarraProgresso } from "@/ui/BarraProgresso";
import { Badge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useProjectosCliente } from "../api";

export default function ProjectosCliente() {
  const lista = useProjectosCliente();
  return (
    <>
      <PageHeader titulo="Projectos" descricao="O andamento dos projectos que temos consigo: progresso e marcos." />
      {lista.isPending ? (
        <Skeleton className="h-32" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
      ) : lista.data.length === 0 ? (
        <p className="text-muted-foreground">Ainda não há projectos para ver aqui.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Projectos">
          {lista.data.map((p) => {
            const proximo = [...p.milestones].filter((m) => m.status !== "Reached").sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
            return (
              <li key={p.projectId}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to={`/cliente/projectos/${p.projectId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    {p.status === "Closed" ? <Badge tom="neutro">Concluído</Badge> : <Badge tom="sucesso">Em curso</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatarData(p.startDate)} → {p.endDate ? formatarData(p.endDate) : "em curso"}
                  </p>
                  <div className="mt-3">
                    <BarraProgresso valor={Number(p.completionPercent)} rotulo={`${p.name}: ${String(p.completionPercent)}% feito`} />
                  </div>
                  {proximo ? (
                    <p className="mt-2 text-sm text-foreground">
                      Próximo marco: {proximo.name}, a {formatarData(proximo.targetDate)}
                    </p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
