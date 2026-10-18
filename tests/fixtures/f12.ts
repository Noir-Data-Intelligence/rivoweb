/** F12 (1.º bloco) — projectos: projecto, marcos, tarefas, quadro, Gantt e dependências. */
import type { components } from "../../src/lib/api/schema";
import { ID } from "./f1";
import { meAdminF10 } from "./f10b";

type S = components["schemas"];

export const IDF12 = {
  projecto: "00000000-0000-4000-8000-000000000e01",
  fechado: "00000000-0000-4000-8000-000000000e02",
  marco1: "00000000-0000-4000-8000-000000000e11",
  marco2: "00000000-0000-4000-8000-000000000e12",
  t1: "00000000-0000-4000-8000-000000000e21",
  t2: "00000000-0000-4000-8000-000000000e22",
  t3: "00000000-0000-4000-8000-000000000e23",
  dep: "00000000-0000-4000-8000-000000000e31",
};

/** Como em produção: só `projects.projects.read/.write`. */
export const meGestorProjectos: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000010",
  email: "projectos@teste.local",
  displayName: "Paula Projectos",
  roles: ["ProjectManager"],
  permissions: ["projects.projects.read", "projects.projects.write"],
};

export const meAdminF12: S["CurrentUserResponse"] = { ...meAdminF10, permissions: [...new Set([...meAdminF10.permissions, "projects.projects.read", "projects.projects.write", "hr.employees.read"])] };

const tarefa = (id: string, titulo: string, extra: Partial<S["ProjectTaskView"]> = {}): S["ProjectTaskView"] => ({
  taskId: id,
  title: titulo,
  status: "Pending",
  dueDate: "2026-03-15",
  assignedEmployeeId: null,
  description: null,
  startDate: "2026-03-01",
  estimatedHours: 16,
  priority: "Normal",
  stage: "ToDo",
  boardOrder: 0,
  progress: 0,
  ...extra,
});

export const projecto = (): S["ProjectView"] => ({
  projectId: IDF12.projecto,
  name: "Implementação ERP",
  status: "Active",
  startDate: "2026-02-01",
  endDate: null,
  milestones: [
    { milestoneId: IDF12.marco1, name: "Arranque", status: "Reached", targetDate: "2026-02-15", reachedOn: "2026-02-14" },
    { milestoneId: IDF12.marco2, name: "Go-live", status: "Pending", targetDate: "2026-06-30", reachedOn: null },
  ],
  tasks: [
    tarefa(IDF12.t1, "Levantamento", { status: "Done", stage: "Done", progress: 100, assignedEmployeeId: ID.emp1, description: "Entrevistas.\n<script>x</script>" }),
    tarefa(IDF12.t2, "Configuração", { stage: "InProgress", priority: "High", progress: 40, assignedEmployeeId: ID.emp1 }),
    tarefa(IDF12.t3, "Formação", { stage: "Backlog", dueDate: null, startDate: null, estimatedHours: null }),
  ],
  budget: { amount: 5000000, currency: "AOA", setAt: "2026-02-01T10:00:00Z" },
  allocations: [],
  customerId: null,
  visibleToCustomer: false,
  completionPercent: 33,
});

export const projectos = (): S["ProjectView"][] => [projecto(), { ...projecto(), projectId: IDF12.fechado, name: "Auditoria 2025", status: "Closed", endDate: "2025-12-31", completionPercent: 100, budget: null }];

export const quadroProjecto = (): S["BoardColumn"][] => [
  { stage: "Backlog", cards: [{ taskId: IDF12.t3, title: "Formação", priority: "Normal", dueDate: null, assignedEmployeeId: null, boardOrder: 0, progress: 0, comments: 0, loggedHours: 0 }] },
  { stage: "ToDo", cards: [] },
  { stage: "InProgress", cards: [{ taskId: IDF12.t2, title: "Configuração", priority: "High", dueDate: "2026-03-15", assignedEmployeeId: ID.emp1, boardOrder: 0, progress: 40, comments: 2, loggedHours: 6.5 }] },
  { stage: "Review", cards: [] },
  { stage: "Done", cards: [{ taskId: IDF12.t1, title: "Levantamento", priority: "Normal", dueDate: "2026-03-15", assignedEmployeeId: ID.emp1, boardOrder: 0, progress: 100, comments: 0, loggedHours: 16 }] },
];

export const gantt = (): S["GanttView"] => ({
  projectId: IDF12.projecto,
  name: "Implementação ERP",
  startDate: "2026-02-01",
  endDate: null,
  tasks: projecto().tasks.map((t) => ({
    taskId: t.taskId,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    stage: t.stage ?? "ToDo",
    priority: t.priority ?? "Normal",
    startDate: t.startDate ?? null,
    dueDate: t.dueDate,
    estimatedHours: t.estimatedHours ?? null,
    loggedHours: t.taskId === IDF12.t2 ? 6.5 : 0,
    progress: t.progress ?? 0,
    assignedEmployeeId: t.assignedEmployeeId,
  })),
  milestones: projecto().milestones.map((m) => ({ milestoneId: m.milestoneId, name: m.name, targetDate: m.targetDate, status: m.status })),
});

export const dependencias = (): S["DependencyView"][] => [{ dependencyId: IDF12.dep, taskId: IDF12.t2, dependsOnTaskId: IDF12.t1 }];

export const comentariosMarcos = (): S["MilestoneCommentView"][] => [
  { commentId: "mc1", milestoneId: IDF12.marco1, fromCustomer: true, authorName: "Cliente Teste", body: "Óptimo arranque!\n<img src=x onerror=alert(1)>", postedAt: "2026-02-15T10:00:00Z" },
];
