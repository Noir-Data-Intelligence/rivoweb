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
  viatura: "00000000-0000-4000-8000-000000000e51",
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
    tarefa(IDF12.t1, "Levantamento", { status: "Done", stage: "Done", progress: 100, assignedEmployeeId: ID.emp1, assignedEmployeeName: "Ana Teste", description: "Entrevistas.\n<script>x</script>" }),
    tarefa(IDF12.t2, "Configuração", { stage: "InProgress", priority: "High", progress: 40, assignedEmployeeId: ID.emp1, assignedEmployeeName: "Ana Teste" }),
    tarefa(IDF12.t3, "Formação", { stage: "Backlog", dueDate: null, startDate: null, estimatedHours: null }),
  ],
  budget: { amount: 5000000, currency: "AOA", setAt: "2026-02-01T10:00:00Z" },
  allocations: [],
  customerId: null,
  visibleToCustomer: false,
  completionPercent: 33,
});

/** As escolhas dos projectos (B38): para quem escreve, sem os RH, a frota ou os clientes. */
export const escolhasProjecto = (): S["ProjectLookups"] => ({
  employees: [{ id: ID.emp1, name: "Ana Teste" }],
  vehicles: [{ id: IDF12.viatura, name: "LD-12-34-AB · Toyota Hilux" }],
  customers: [{ id: "00000000-0000-4000-8000-000000000701", name: "Cliente Teste, Lda" }],
});

export const projectos = (): S["ProjectView"][] => [projecto(), { ...projecto(), projectId: IDF12.fechado, name: "Auditoria 2025", status: "Closed", endDate: "2025-12-31", completionPercent: 100, budget: null }];

export const quadroProjecto = (): S["BoardColumn"][] => [
  { stage: "Backlog", cards: [{ taskId: IDF12.t3, title: "Formação", priority: "Normal", dueDate: null, assignedEmployeeId: null, boardOrder: 0, progress: 0, comments: 0, loggedHours: 0 }] },
  { stage: "ToDo", cards: [] },
  { stage: "InProgress", cards: [{ taskId: IDF12.t2, title: "Configuração", priority: "High", dueDate: "2026-03-15", assignedEmployeeId: ID.emp1, assignedEmployeeName: "Ana Teste", boardOrder: 0, progress: 40, comments: 2, loggedHours: 6.5 }] },
  { stage: "Review", cards: [] },
  { stage: "Done", cards: [{ taskId: IDF12.t1, title: "Levantamento", priority: "Normal", dueDate: "2026-03-15", assignedEmployeeId: ID.emp1, assignedEmployeeName: "Ana Teste", boardOrder: 0, progress: 100, comments: 0, loggedHours: 16 }] },
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
    assignedEmployeeName: t.assignedEmployeeName ?? null,
  })),
  milestones: projecto().milestones.map((m) => ({ milestoneId: m.milestoneId, name: m.name, targetDate: m.targetDate, status: m.status })),
});

export const dependencias = (): S["DependencyView"][] => [{ dependencyId: IDF12.dep, taskId: IDF12.t2, dependsOnTaskId: IDF12.t1 }];

export const comentariosMarcos = (): S["MilestoneCommentView"][] => [
  { commentId: "mc1", milestoneId: IDF12.marco1, fromCustomer: true, authorName: "Cliente Teste", body: "Óptimo arranque!\n<img src=x onerror=alert(1)>", postedAt: "2026-02-15T10:00:00Z" },
];

// --- Bloco 2: trabalho do projecto e portal do cliente.

export const comentariosTarefa = (): S["CommentView"][] => [
  { commentId: "c1", taskId: IDF12.t2, authorUserId: null, authorName: "Paula Projectos", body: "Falta a tabela de IVA.\n<script>x</script>", postedAt: "2026-03-05T10:00:00Z" },
];

export const checklist = (): S["ChecklistItemView"][] => [
  { itemId: "i1", taskId: IDF12.t2, title: "Plano de contas", order: 1, done: true, doneAt: "2026-03-04T10:00:00Z" },
  { itemId: "i2", taskId: IDF12.t2, title: "Séries de facturação", order: 2, done: false, doneAt: null },
];

export const tempo = (): S["TimeSummary"] => ({
  totalHours: 22.5,
  billableHours: 16,
  byEmployee: [{ employeeId: ID.emp1, employeeName: "Ana Teste", hours: 22.5 }],
  entries: [
    { entryId: "e1", projectId: IDF12.projecto, taskId: IDF12.t2, employeeId: ID.emp1, employeeName: "Ana Teste", day: "2026-03-05", hours: 6.5, description: "Configuração inicial", billable: true },
    { entryId: "e2", projectId: IDF12.projecto, taskId: null, employeeId: ID.emp1, employeeName: "Ana Teste", day: "2026-03-04", hours: 16, description: null, billable: false },
  ],
});

export const orcamentoLinhas = (): S["BudgetBreakdown"] => ({
  approvedAmount: 5000000,
  currency: "AOA",
  plannedTotal: 5500000,
  actualTotal: 1200000,
  variance: 4300000,
  plannedExceedsApproved: true,
  lines: [{ lineId: "l1", category: "Mão-de-obra", description: "Consultores", plannedAmount: 5500000, actualAmount: 1200000, variance: 4300000 }],
});

export const ficheirosProjecto = (): S["ProjectFileView"][] => [{ linkId: "f1", documentId: "00000000-0000-4000-8000-000000000e41", taskId: IDF12.t1, category: "Caderno de encargos", attachedAt: "2026-02-02T10:00:00Z" }];

export const visibilidade = (comCliente = false): S["CustomerVisibilityView"] => ({ projectId: IDF12.projecto, customerId: comCliente ? "00000000-0000-4000-8000-000000000701" : null, customerName: comCliente ? "Cliente Teste, Lda" : null, visibleToCustomer: false });

export const projectosCliente = (): S["CustomerProjectView"][] => [
  {
    projectId: IDF12.projecto,
    name: "Implementação ERP",
    status: "Active",
    startDate: "2026-02-01",
    endDate: null,
    completionPercent: 33,
    milestones: [
      { milestoneId: IDF12.marco1, name: "Arranque", targetDate: "2026-02-15", status: "Reached", reachedOn: "2026-02-14", comments: [{ commentId: "mc0", fromCustomer: false, authorName: "Paula Projectos", body: "Arranque feito.\n<img src=x onerror=alert(1)>", postedAt: "2026-02-14T10:00:00Z" }] },
      { milestoneId: IDF12.marco2, name: "Go-live", targetDate: "2026-06-30", status: "Pending", reachedOn: null, comments: [] },
    ],
  },
];
