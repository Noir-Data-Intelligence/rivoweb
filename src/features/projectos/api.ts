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
 * - comentários de tarefa (4000) e checklist (passos de 300, marcar e tirar);
 * - tempo: colaborador (o servidor confirma), tarefa opcional, dia (não
 *   futuro), horas 0–24 (2 casas) e no máximo 24 por dia por colaborador,
 *   descrição (500), facturável; num projecto fechado não; apagar um registo;
 *   resumo com o total, o facturável e as horas por colaborador;
 * - orçamento por linhas: categoria (100), descrição (500), previsto e gasto
 *   ≥ 0; num projecto fechado não; desvio por linha e total, e se o previsto
 *   passa o aprovado;
 * - ficheiros: um documento carregado (o servidor só confirma que existe),
 *   tarefa opcional, categoria (100); retirar pede o motivo (500) e deixa a
 *   ligação e o documento (eliminação lógica); a lista não traz o nome nem há
 *   descarga pelo projecto (B39): só quem lê o arquivo os abre;
 * - recursos: colaborador ou viatura (o servidor confirma), início não antes
 *   do projecto, o mesmo recurso uma vez em aberto; terminar com a data (não
 *   antes do início);
 * - visibilidade ao cliente: ligar a um cliente e mostrar no portal (só com
 *   cliente);
 * - as vistas trazem os nomes de quem tem a tarefa, do recurso alocado, de
 *   quem registou o tempo e de quem comentou; as escolhas (colaboradores,
 *   viaturas e clientes activos) vêm de `/projects/lookups`, para quem
 *   escreve nos projectos, sem pedir os RH, a frota ou os clientes (B38).
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
export type ComentarioTarefa = S["CommentView"];
export type PassoChecklist = S["ChecklistItemView"];
export type ResumoTempo = S["TimeSummary"];
export type RegistoTempo = S["TimeEntryView"];
export type Orcamento = S["BudgetBreakdown"];
export type LinhaOrcamento = S["ProjectBudgetLineView"];
export type FicheiroProjecto = S["ProjectFileView"];
export type Alocacao = S["ResourceAllocationView"];
export type Visibilidade = S["CustomerVisibilityView"];
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

export function useComentariosTarefa(id: string, tarefa: string, activo: boolean) {
  return useQuery({
    queryKey: [...chaves.projecto(id), "comments", tarefa],
    queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/comments", { params: { path: { projectId: id }, query: { taskId: tarefa } }, signal })),
    enabled: activo,
  });
}

export function useChecklist(id: string, tarefa: string, activo: boolean) {
  return useQuery({
    queryKey: [...chaves.projecto(id), "checklist", tarefa],
    queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/tasks/{taskId}/checklist", { params: { path: { projectId: id, taskId: tarefa } }, signal })),
    enabled: activo,
  });
}

export function useTempo(f: { projecto?: string; de?: string | null; ate?: string | null }) {
  return useQuery({
    queryKey: [...chaves.todos, "time", f],
    queryFn: ({ signal }) =>
      ler(api.GET("/projects/time-entries", { params: { query: { ...(f.projecto ? { projectId: f.projecto } : {}), ...(f.de ? { from: f.de } : {}), ...(f.ate ? { to: f.ate } : {}) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useOrcamentoLinhas(id: string) {
  return useQuery({ queryKey: [...chaves.projecto(id), "budget-lines"], queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/budget/lines", { params: { path: { projectId: id } }, signal })) });
}

export function useFicheirosProjecto(id: string) {
  return useQuery({ queryKey: [...chaves.projecto(id), "files"], queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/files", { params: { path: { projectId: id } }, signal })) });
}

export function useVisibilidade(id: string) {
  return useQuery({ queryKey: [...chaves.projecto(id), "visibility"], queryFn: ({ signal }) => ler(api.GET("/projects/{projectId}/customer-visibility", { params: { path: { projectId: id } }, signal })) });
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
        | { acto: "tirarDependencia"; dependencia: string }
        | { acto: "comentar"; tarefa: string; corpo: S["CommentRequest"] }
        | { acto: "passo"; tarefa: string; corpo: S["ChecklistItemRequest"] }
        | { acto: "marcarPasso"; passo: string; corpo: S["ChecklistToggleRequest"] }
        | { acto: "tirarPasso"; passo: string }
        | { acto: "tempo"; corpo: S["TimeEntryRequest"] }
        | { acto: "apagarTempo"; registo: string }
        | { acto: "linha"; linha: string | null; corpo: S["BudgetLineRequest"] }
        | { acto: "apagarLinha"; linha: string }
        | { acto: "anexar"; corpo: S["AttachFileRequest"] }
        | { acto: "retirarFicheiro"; ficheiro: string; corpo: S["RemoveFileRequest"] }
        | { acto: "alocar"; corpo: S["AllocateResourceRequest"] }
        | { acto: "terminarAlocacao"; alocacao: string; corpo: S["EndAllocationRequest"] }
        | { acto: "visibilidade"; corpo: S["CustomerVisibilityRequest"] },
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
        case "comentar":
          return ler(api.POST("/projects/{projectId}/tasks/{taskId}/comments", { params: { path: { ...path, taskId: a.tarefa } }, body: a.corpo }));
        case "passo":
          return ler(api.POST("/projects/{projectId}/tasks/{taskId}/checklist", { params: { path: { ...path, taskId: a.tarefa } }, body: a.corpo }));
        case "marcarPasso":
          return enviar(api.POST("/projects/{projectId}/checklist/{itemId}/toggle", { params: { path: { ...path, itemId: a.passo } }, body: a.corpo }));
        case "tirarPasso":
          return enviar(api.DELETE("/projects/{projectId}/checklist/{itemId}", { params: { path: { ...path, itemId: a.passo } } }));
        case "tempo":
          return ler(api.POST("/projects/{projectId}/time-entries", { params: { path }, body: a.corpo }));
        case "apagarTempo":
          return enviar(api.DELETE("/projects/{projectId}/time-entries/{entryId}", { params: { path: { ...path, entryId: a.registo } } }));
        case "linha":
          return a.linha === null
            ? ler(api.POST("/projects/{projectId}/budget/lines", { params: { path }, body: a.corpo }))
            : enviar(api.PUT("/projects/{projectId}/budget/lines/{lineId}", { params: { path: { ...path, lineId: a.linha } }, body: a.corpo }));
        case "apagarLinha":
          return enviar(api.DELETE("/projects/{projectId}/budget/lines/{lineId}", { params: { path: { ...path, lineId: a.linha } } }));
        case "anexar":
          return ler(api.POST("/projects/{projectId}/files", { params: { path }, body: a.corpo }));
        case "retirarFicheiro":
          return enviar(api.POST("/projects/{projectId}/files/{fileId}/removal", { params: { path: { ...path, fileId: a.ficheiro } }, body: a.corpo }));
        case "alocar":
          return ler(api.POST("/projects/{projectId}/allocations", { params: { path }, body: a.corpo }));
        case "terminarAlocacao":
          return enviar(api.POST("/projects/{projectId}/allocations/{allocationId}/end", { params: { path: { ...path, allocationId: a.alocacao } }, body: a.corpo }));
        case "visibilidade":
          return enviar(api.PUT("/projects/{projectId}/customer-visibility", { params: { path }, body: a.corpo }));
      }
    },
    onSuccess: invalidar,
  });
}

/** Colaboradores, viaturas e clientes activos para escolher (B38). */
export function useEscolhasProjecto(activo: boolean) {
  return useQuery({
    queryKey: ["projects", "lookups"],
    queryFn: ({ signal }) => ler(api.GET("/projects/lookups", { signal })),
    enabled: activo,
    staleTime: 60_000,
  });
}
