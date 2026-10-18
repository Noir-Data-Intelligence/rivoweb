/** O quadro do projecto (Backlog → Feita), com «Mover para» em cada cartão; Feita conclui. */
import { useId } from "react";
import { useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Card } from "@/ui/Card";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Skeleton } from "@/ui/Layout";
import { useAcaoProjecto, useQuadroProjecto, type Cartao, type Etapa, type Projecto } from "./api";
import { ETAPAS, PrioridadeBadge, usePessoas } from "./comum";

const ORDEM: readonly Etapa[] = ["Backlog", "ToDo", "InProgress", "Review", "Done"];

function Mover({ p, c, etapa }: { p: Projecto; c: Cartao; etapa: Etapa }) {
  const accao = useAcaoProjecto(p.projectId);
  const id = useId();
  return (
    <div className="mt-3 flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Mover para
      </label>
      <Select id={id} value={etapa} disabled={accao.isPending} aria-label={`Mover ${c.title} para`} onChange={(e) => accao.mutate({ acto: "mover", tarefa: c.taskId, corpo: { stage: e.target.value as Etapa, boardOrder: null } })}>
        {ORDEM.map((x) => (
          <option key={x} value={x}>
            {ETAPAS[x]}
            {x === "Done" ? " (conclui)" : ""}
          </option>
        ))}
      </Select>
      {accao.error ? <ErrorPanel erro={accao.error} /> : null}
    </div>
  );
}

export function QuadroDoProjecto({ p }: { p: Projecto }) {
  const quadro = useQuadroProjecto(p.projectId);
  const pessoas = usePessoas();
  const { pode } = useUtilizador();
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  if (quadro.isPending) return <Skeleton className="h-64" />;
  if (quadro.error) return <ErrorPanel erro={quadro.error} tentarDeNovo={() => void quadro.refetch()} />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {ORDEM.map((etapa) => {
        const cartoes = quadro.data.find((c) => c.stage === etapa)?.cards ?? [];
        return (
          <section key={etapa} aria-label={`${ETAPAS[etapa]} (${String(cartoes.length)})`} className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-muted/40 p-3">
            <h2 className="text-sm font-semibold text-foreground">
              {ETAPAS[etapa]} <span className="font-normal text-muted-foreground">· {cartoes.length}</span>
            </h2>
            {cartoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : null}
            <ul className="flex flex-col gap-3">
              {cartoes.map((c) => (
                <li key={c.taskId}>
                  <Card className="p-3">
                    <p className="break-words font-medium text-foreground">{c.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <PrioridadeBadge p={c.priority} />
                      {c.dueDate ? <span>prazo {formatarData(c.dueDate)}</span> : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(c.progress)}% · {formatarNumeroDecimal(String(c.loggedHours), 1)} h registadas · {String(c.comments)} comentários
                    </p>
                    {c.assignedEmployeeId && pessoas.nome(c.assignedEmployeeId) ? <p className="mt-1 text-xs text-foreground">{pessoas.nome(c.assignedEmployeeId)}</p> : null}
                    {escreve && etapa !== "Done" ? <Mover p={p} c={c} etapa={etapa} /> : null}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
