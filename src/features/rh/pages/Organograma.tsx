/** Organograma: departamentos, o responsável e os colaboradores activos com o cargo actual. */
import { Crown } from "lucide-react";
import { Link } from "react-router";
import { formatarDataHora } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Card } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useOrganograma, type Organograma as TipoOrganograma } from "../gestao";

type Pessoa = TipoOrganograma["departments"][number]["members"][number];

/** Responsável primeiro, depois por nível hierárquico (o mais alto primeiro) e nome. */
function ordenar(membros: readonly Pessoa[], responsavel: string | null): Pessoa[] {
  const c = new Intl.Collator("pt");
  return [...membros].sort(
    (a, b) =>
      Number(b.employeeId === responsavel) - Number(a.employeeId === responsavel) ||
      Number(b.isManager) - Number(a.isManager) ||
      Number(a.hierarchyLevel ?? 99) - Number(b.hierarchyLevel ?? 99) ||
      c.compare(a.fullName, b.fullName),
  );
}

export default function Organograma() {
  const org = useOrganograma();
  return (
    <>
      <PageHeader titulo="Organograma" descricao={org.data ? `${String(org.data.headcount)} colaboradores activos · a ${formatarDataHora(org.data.asOf)}` : "Quem está em cada departamento."} />
      {org.isPending ? (
        <Skeleton className="h-64" />
      ) : org.error ? (
        <ErrorPanel erro={org.error} tentarDeNovo={() => void org.refetch()} />
      ) : org.data.departments.length === 0 ? (
        <Alert tom="info" titulo="Ainda não há colaboradores activos." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {org.data.departments.map((d) => (
            <Card key={d.departmentId ?? "sem"} className="flex flex-col gap-3">
              <div>
                <h2 className="text-md font-semibold text-foreground">{d.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {d.members.length} {d.members.length === 1 ? "pessoa" : "pessoas"}
                  {d.managerName ? ` · responsável: ${d.managerName}` : d.departmentId ? " · sem responsável" : ""}
                </p>
              </div>
              <ul className="flex flex-col divide-y divide-border border-t border-border">
                {ordenar(d.members, d.managerEmployeeId).map((p) => (
                  <li key={p.employeeId} className="flex items-start gap-2 py-2">
                    {p.employeeId === d.managerEmployeeId ? <Crown className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.75} aria-label="Responsável" /> : <span className="size-4 shrink-0" aria-hidden />}
                    <div className="min-w-0">
                      <Link to={`/colaboradores/${p.employeeId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                        {p.fullName}
                      </Link>
                      <p className="text-sm text-muted-foreground">{p.positionName ?? "Sem cargo"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
