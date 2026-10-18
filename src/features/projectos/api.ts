/**
 * Projectos (§5.13, F12): projectos, marcos, tarefas, quadro, Gantt e
 * dependências.
 *
 * Factos (`ProjectsModuleEndpoints.cs`, `ProjectWorkEndpoints.cs`,
 * `ProjectSharingEndpoints.cs`, `Project.cs`, `ProjectTask.cs`, `Milestone.cs`,
 * `ProjectWork.cs`, `ProjectsDbContext.cs`):
 * - ler com `projects.projects.read`, escrever com `.write`;
 * - lista por nome, paginada, com ou sem fechados; o projecto traz marcos,
 *   tarefas, orçamento aprovado, alocações, cliente, visibilidade e % feito
 *   (tarefas feitas sobre as não canceladas);
 * - projecto: nome (200), início; fechar com a data (não antes do início);
 *   fechado não muda mais;
 * - orçamento: valor > 0 e moeda; uma revisão não muda a moeda;
 * - marco: nome (200), data alvo (não antes do início do projecto); alcançar
 *   uma vez, com a data; comentários da equipa num marco com o nome que o
 *   cliente vê (vazio, «Equipa»), até 4000;
 * - tarefa: título (200), prazo (não antes do início do projecto), atribuída
 *   a um colaborador (o servidor confirma que existe); planear: título,
 *   descrição (4000), início e prazo (não antes do início do projecto, prazo
 *   não antes do início da tarefa), horas estimadas ≥ 0, prioridade (Low,
 *   Normal, High, Urgent), progresso 0–100; concluir ou cancelar só uma em
 *   curso;
 * - quadro: Backlog, ToDo, InProgress, Review e Done; mover para Done conclui;
 * - dependências: informativas (não bloqueiam), sem a própria tarefa e sem
 *   ciclos (409);
 * - as vistas só trazem ids de pessoas (B38): os nomes vêm dos RH para quem os
 *   lê; sem isso, «—», e a atribuição não se oferece.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Projecto = S["ProjectView"];
export type Marco = S["MilestoneView"];
export type Tarefa = S["ProjectTaskView"];
export type ColunaQuadro = S["BoardColumn"];
export type Cartao = S["BoardCard"];
export type Gantt = S["GanttView"];
export type Dependencia = S["DependencyView"];
export type ComentarioMarco = S["MilestoneCommentView"];
export type Etapa = S["MoveTaskRequest"]["stage"];
export type Prioridade = NonNullable<S["PlanTaskRequest"]["priority"]>;

export const chaves = {
  todos: ["projects"] as const,
  projecto: (id: string) => ["projects", "detail", id] as const,
};

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: chaves.todos });
}

export function useProjectos(f: { fechados: boolean; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: [...chaves.todos, "list", f],
    queryFn: ({ signal }) => lerPagina(api.GET("/projects", { params: { query: { includeClosed: f.fechados, page: f.pagina, pageSize: f.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useProjecto(id: string) {
  return useQuery({ queryKey: chaves.projecto(id), queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}", { params: { path: { projectId: id } }, signal })) });
}

export function useQuadroProjecto(id: string) {
  return useQuery({ queryKey: [...chaves.projecto(id), "board"], queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/board", { params: { path: { projectId: id } }, signal })) });
}

export function useGantt(id: string) {
  return useQuery({ queryKey: [...chaves.projecto(id), "gantt"], queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/gantt", { params: { path: { projectId: id } }, signal })) });
}

export function useDependencias(id: string) {
  return useQuery({ queryKey: [...chaves.projecto(id), "dependencies"], queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/dependencies", { params: { path: { projectId: id } }, signal })) });
}

export function useComentariosMarcos(id: string) {
  return useQuery({ queryKey: [...chaves.projecto(id), "milestone-comments"], queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/milestones/comments", { params: { path: { projectId: id } }, signal })) });
}

export function useAbrirProjecto() {
  const invalidar = useInvalidar();
  return useEscrita({ mutationFn: (b: S["OpenProjectRequest"]) => ler(api.POST("/projects", { body: b })), onSuccess: invalidar });
}

/** Todas as escritas sobre um projecto, por acto. */
export function useAcaoProjecto(id: string) {
  const invalidar = useInvalidar();
  const path = { projectId: id };
  return useEscrita({
    mutationFn: async (
      a:
        | { acto: "fechar"; corpo: S["CloseProjectRequest"] }
        | { acto: "orcamento"; corpo: S["SetBudgetRequest"] }
        | { acto: "marco"; corpo: S["AddMilestoneRequest"] }
        | { acto: "alcancar"; marco: string; corpo: S["ReachMilestoneRequest"] }
        | { acto: "comentarMarco"; marco: string; corpo: S["MilestoneCommentRequest"] }
        | { acto: "tarefa"; corpo: S["AddTaskRequest"] }
        | { acto: "planear"; tarefa: string; corpo: S["PlanTaskRequest"] }
        | { acto: "atribuir"; tarefa: string; corpo: S["AssignTaskRequest"] }
        | { acto: "concluir"; tarefa: string }
        | { acto: "cancelar"; tarefa: string }
        | { acto: "mover"; tarefa: string; corpo: S["MoveTaskRequest"] }
        | { acto: "depender"; tarefa: string; corpo: S["DependencyRequest"] }
        | { acto: "tirarDependencia"; dependencia: string },
    ): Promise<unknown> => {
      switch (a.acto) {
        case "fechar":
          return enviar(api.POST("/projects/{projectId}/closure", { params: { path }, body: a.corpo }));
        case "orcamento":
          return enviar(api.POST("/projects/{projectId}/budget", { params: { path }, body: a.corpo }));
        case "marco":
          return ler(api.POST("/projects/{projectId}/milestones", { params: { path }, body: a.corpo }));
        case "alcancar":
          return enviar(api.POST("/projects/{projectId}/milestones/{milestoneId}/reached", { params: { path: { ...path, milestoneId: a.marco } }, body: a.corpo }));
        case "comentarMarco":
          return ler(api.POST("/projects/{projectId}/milestones/{milestoneId}/comments", { params: { path: { ...path, milestoneId: a.marco } }, body: a.corpo }));
        case "tarefa":
          return ler(api.POST("/projects/{projectId}/tasks", { params: { path }, body: a.corpo }));
        case "planear":
          return enviar(api.PUT("/projects/{projectId}/tasks/{taskId}", { params: { path: { ...path, taskId: a.tarefa } }, body: a.corpo }));
        case "atribuir":
          return enviar(api.POST("/projects/{projectId}/tasks/{taskId}/assignment", { params: { path: { ...path, taskId: a.tarefa } }, body: a.corpo }));
        case "concluir":
          return enviar(api.POST("/projects/{projectId}/tasks/{taskId}/completion", { params: { path: { ...path, taskId: a.tarefa } } }));
        case "cancelar":
          return enviar(api.POST("/projects/{projectId}/tasks/{taskId}/cancellation", { params: { path: { ...path, taskId: a.tarefa } } }));
        case "mover":
          return enviar(api.POST("/projects/{projectId}/tasks/{taskId}/move", { params: { path: { ...path, taskId: a.tarefa } }, body: a.corpo }));
        case "depender":
          return ler(api.POST("/projects/{projectId}/tasks/{taskId}/dependencies", { params: { path: { ...path, taskId: a.tarefa } }, body: a.corpo }));
        case "tirarDependencia":
          return enviar(api.DELETE("/projects/{projectId}/dependencies/{dependencyId}", { params: { path: { ...path, dependencyId: a.dependencia } } }));
      }
    },
    onSuccess: invalidar,
  });
}
