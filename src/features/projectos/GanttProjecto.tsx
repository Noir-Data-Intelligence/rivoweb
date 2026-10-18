/**
 * Gantt do projecto: cada tarefa com início e prazo numa linha do tempo, e os
 * marcos. A barra só reforça: as datas, o progresso e as dependências estão
 * no texto (leitores de ecrã e impressão).
 */
import { formatarData, formatarDataCurta } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Skeleton } from "@/ui/Layout";
import { useDependencias, useGantt, type Projecto } from "./api";
import { EstadoMarco, EstadoTarefa } from "./comum";

const dia = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

export function GanttDoProjecto({ p }: { p: Projecto }) {
  const gantt = useGantt(p.projectId);
  const deps = useDependencias(p.projectId);
  if (gantt.isPending) return <Skeleton className="h-64" />;
  if (gantt.error) return <ErrorPanel erro={gantt.error} tentarDeNovo={() => void gantt.refetch()} />;
  const g = gantt.data;
  const datas = [g.startDate, g.endDate, ...g.tasks.flatMap((t) => [t.startDate, t.dueDate]), ...g.milestones.map((m) => m.targetDate)].filter((d): d is string => !!d).sort();
  const ini = dia(datas[0] ?? g.startDate);
  const fim = Math.max(dia(datas[datas.length - 1] ?? g.startDate), ini + 1);
  const pos = (iso: string) => ((dia(iso) - ini) / (fim - ini + 1)) * 100;
  const titulo = (id: string) => g.tasks.find((t) => t.taskId === id)?.title ?? "Tarefa";
  const dependeDe = (id: string) => (deps.data ?? []).filter((d) => d.taskId === id).map((d) => titulo(d.dependsOnTaskId));
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="min-w-0">
        <CardTitle className="mb-1">Tarefas no tempo</CardTitle>
        <p className="mb-3 text-sm text-muted-foreground">
          De {formatarData(datas[0] ?? g.startDate)} a {formatarData(datas[datas.length - 1] ?? g.startDate)}.
        </p>
        {/* Com scroll em ecrãs estreitos: recebe o foco para se deslizar pelo teclado. */}
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="Gantt das tarefas (desliza na horizontal)">
          <table className="w-full min-w-[40rem] border-collapse text-sm" aria-label="Gantt das tarefas">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="w-[30%] py-2 pr-3 font-medium">
                  Tarefa
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Datas e progresso
                </th>
                <th scope="col" className="w-[45%] py-2 font-medium">
                  <span className="sr-only">Linha do tempo</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {g.tasks.map((t) => {
                const de = t.startDate ?? t.dueDate;
                const ate = t.dueDate ?? t.startDate;
                const dd = dependeDe(t.taskId);
                return (
                  <tr key={t.taskId} className="border-b border-border align-top last:border-0">
                    <td className="py-2 pr-3">
                      <span className="block break-words font-medium text-foreground">{t.title}</span>
                      {dd.length > 0 ? <span className="block text-xs text-muted-foreground">Depende de: {dd.join(", ")}</span> : null}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      <span className="block">{de && ate ? `${formatarDataCurta(de)} → ${formatarDataCurta(ate)}` : "Sem datas"}</span>
                      <span className="block">
                        {String(t.progress)}% · {formatarNumeroDecimal(String(t.loggedHours), 1)} h
                        {t.estimatedHours ? ` de ${formatarNumeroDecimal(String(t.estimatedHours), 1)} h` : ""}
                      </span>
                      {t.status !== "Pending" ? <EstadoTarefa estado={t.status} /> : null}
                    </td>
                    <td className="py-2" aria-hidden>
                      {de && ate ? (
                        <div className="relative h-5 rounded bg-muted">
                          <div className="absolute inset-y-0 rounded bg-primary/30" style={{ left: `${pos(de)}%`, width: `${Math.max(pos(ate) - pos(de) + 100 / (fim - ini + 1), 1)}%` }}>
                            <div className="h-full rounded bg-primary" style={{ width: `${Math.min(Math.max(Number(t.progress), 0), 100)}%` }} />
                          </div>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {g.tasks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-muted-foreground">
                    Ainda não há tarefas.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardTitle className="mb-3">Marcos</CardTitle>
        {g.milestones.length === 0 ? <p className="text-sm text-muted-foreground">Sem marcos.</p> : null}
        <ul className="divide-y divide-border text-sm" aria-label="Marcos no tempo">
          {[...g.milestones]
            .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
            .map((m) => (
              <li key={m.milestoneId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium text-foreground">{m.name}</span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  {formatarData(m.targetDate)} <EstadoMarco estado={m.status} />
                </span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
