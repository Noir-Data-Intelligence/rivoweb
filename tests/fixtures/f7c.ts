/** Fixtures da F7c (recrutamento, entradas e saídas), com a forma das respostas reais de `/hr/*`. Dados de teste. */
import type { components } from "@/lib/api/schema";
import { ID } from "./f1";

type S = components["schemas"];

export const IDF7C = {
  vaga: "00000000-0000-4000-8000-000000000901",
  vagaFechada: "00000000-0000-4000-8000-000000000902",
  candidato: "00000000-0000-4000-8000-000000000903",
  candidatoProposta: "00000000-0000-4000-8000-000000000904",
  contratado: "00000000-0000-4000-8000-000000000905",
  novoColaborador: "00000000-0000-4000-8000-000000000906",
  processo: "00000000-0000-4000-8000-000000000907",
  tarefa1: "00000000-0000-4000-8000-000000000908",
  tarefa2: "00000000-0000-4000-8000-000000000909",
} as const;

export const vagas = (): S["JobOpeningView"][] => [
  { openingId: IDF7C.vaga, title: "Contabilista Teste", departmentId: ID.dep1, vacancies: 2, description: "Reforço da equipa.", requirements: "Licenciatura.", status: "Open" },
  { openingId: IDF7C.vagaFechada, title: "Motorista Teste", departmentId: null, vacancies: 1, description: null, requirements: null, status: "Closed" },
];

export const candidatos = (etapa = "Screening", proposta = "Offer"): S["CandidateView"][] => [
  { candidateId: IDF7C.candidato, openingId: IDF7C.vaga, fullName: "Bruno Teste", email: "bruno@teste.local", phone: null, appliedOn: "2026-10-01", stage: etapa, notes: null, hiredEmployeeId: null },
  {
    candidateId: IDF7C.candidatoProposta,
    openingId: IDF7C.vaga,
    fullName: "Dora Teste",
    email: null,
    phone: "+244 900 000 001",
    appliedOn: "2026-09-20",
    stage: proposta,
    notes: null,
    hiredEmployeeId: proposta === "Hired" ? IDF7C.novoColaborador : null,
  },
];

export const processos = (feita2 = false, estado = "InProgress"): S["LifecycleProcessView"][] => [
  {
    processId: IDF7C.processo,
    employeeId: ID.emp2,
    kind: "Offboarding",
    status: estado,
    startedAt: "2026-10-10T09:00:00+00:00",
    completedAt: estado === "Completed" ? "2026-10-17T10:00:00+00:00" : null,
    lastWorkingDay: "2026-10-31",
    reason: "Fim do contrato.",
    notes: null,
    pendingTasks: feita2 ? 0 : 1,
    tasks: [
      { taskId: IDF7C.tarefa1, title: "Devolver o portátil", category: "it", order: 0, dueOn: "2026-10-30", description: null, isCompleted: true, completedAt: "2026-10-10T09:00:00+00:00", completedBy: null },
      { taskId: IDF7C.tarefa2, title: "Acerto final de contas", category: "finance", order: 1, dueOn: null, description: null, isCompleted: feita2, completedAt: feita2 ? "2026-10-17T09:00:00+00:00" : null, completedBy: null },
    ],
  },
];

// --- Bloco 2: anúncios e pedidos internos

export const IDF7C2 = {
  anuncio: "00000000-0000-4000-8000-000000000921",
  agendado: "00000000-0000-4000-8000-000000000922",
  arquivado: "00000000-0000-4000-8000-000000000923",
  pedido: "00000000-0000-4000-8000-000000000924",
  fechado: "00000000-0000-4000-8000-000000000925",
} as const;

export const anunciosGestao = (): S["AnnouncementView"][] => [
  { announcementId: IDF7C2.anuncio, title: "Encerramento para inventário", body: "Dia 31 o armazém fecha às 14h.", departmentId: ID.dep1, pinned: true, publishedAt: "2026-10-01T08:00:00+01:00", expiresAt: null, archived: false, visible: true, authorUserId: null },
  { announcementId: IDF7C2.agendado, title: "Formação de segurança", body: "Inscrições em Novembro.", departmentId: null, pinned: false, publishedAt: "2099-01-01T00:00:00+01:00", expiresAt: null, archived: false, visible: false, authorUserId: null },
  { announcementId: IDF7C2.arquivado, title: "Aviso antigo", body: "Já não se aplica.", departmentId: null, pinned: false, publishedAt: "2026-01-01T00:00:00+01:00", expiresAt: null, archived: true, visible: false, authorUserId: null },
];

const sla = (quebrada: boolean): S["TicketSla"] => ({ responseDueAt: "2026-10-15T13:00:00+00:00", resolutionDueAt: "2026-10-17T09:00:00+00:00", firstResponseAt: quebrada ? null : "2026-10-15T10:00:00+00:00", responseBreached: quebrada, resolutionBreached: false });

export const pedidosGestao = (estado = "Open", comResposta = false): S["TicketView"][] => [
  {
    ticketId: IDF7C2.pedido,
    subject: "Declaração de rendimentos",
    category: "DocumentRequest",
    priority: "High",
    status: estado,
    requesterEmployeeId: ID.emp2,
    assigneeEmployeeId: estado === "Open" ? null : ID.emp1,
    openedAt: "2026-10-15T09:00:00+00:00",
    resolvedAt: estado === "Resolved" || estado === "Closed" ? "2026-10-17T08:00:00+00:00" : null,
    messageCount: comResposta ? 2 : 1,
    messages: [
      { messageId: "00000000-0000-4000-8000-000000000926", authorUserId: null, fromRequester: true, body: "Preciso para o banco.", sentAt: "2026-10-15T09:00:00+00:00" },
      ...(comResposta ? [{ messageId: "00000000-0000-4000-8000-000000000927", authorUserId: null, fromRequester: false, body: "Fica pronta amanhã.", sentAt: "2026-10-17T10:00:00+00:00" }] : []),
    ],
    sla: sla(!comResposta),
  },
  { ticketId: IDF7C2.fechado, subject: "Cadeira partida", category: "Facilities", priority: "Low", status: "Closed", requesterEmployeeId: ID.emp1, assigneeEmployeeId: null, openedAt: "2026-10-01T09:00:00+00:00", resolvedAt: "2026-10-02T09:00:00+00:00", messageCount: 1, messages: null, sla: null },
];

export const politicasSla = (): S["TicketSlaPolicyView"][] => [
  { category: "HumanResources", responseMinutes: 240, resolutionMinutes: 2880 },
  { category: "It", responseMinutes: 60, resolutionMinutes: 480 },
];

// --- Bloco 3: formação e turnos

export const IDF7C3 = {
  curso: "00000000-0000-4000-8000-000000000941",
  cancelado: "00000000-0000-4000-8000-000000000942",
  inscricao: "00000000-0000-4000-8000-000000000943",
  concluida: "00000000-0000-4000-8000-000000000944",
  manha: "00000000-0000-4000-8000-000000000945",
  noite: "00000000-0000-4000-8000-000000000946",
  escalado: "00000000-0000-4000-8000-000000000947",
  troca: "00000000-0000-4000-8000-000000000948",
} as const;

export const cursos = (inscritos = 1, cancelado = false): S["TrainingCourseView"][] => [
  { courseId: IDF7C3.curso, title: "Primeiros socorros", provider: "Cruz Vermelha Teste", description: "Curso prático.", startsOn: "2026-11-02", endsOn: "2026-11-03", hours: 16, cost: 150000, currency: "AOA", capacity: 2, cancelled: cancelado, enrolled: inscritos, completed: 1, certificateValidityMonths: 24 },
  { courseId: IDF7C3.cancelado, title: "Excel avançado", provider: null, description: null, startsOn: "2026-09-01", endsOn: null, hours: null, cost: null, currency: null, capacity: null, cancelled: true, enrolled: 0, completed: 0, certificateValidityMonths: null },
];

export const inscricoesGestao = (estado = "Enrolled"): S["TrainingEnrolmentView"][] => [
  { enrolmentId: IDF7C3.inscricao, courseId: IDF7C3.curso, employeeId: ID.emp2, status: estado, completedOn: estado === "Completed" ? "2026-10-17" : null, score: estado === "Completed" ? 87.5 : null, notes: null, certificateNumber: estado === "Completed" ? "PS-001" : null, certificateExpiresOn: estado === "Completed" ? "2028-10-17" : null },
  { enrolmentId: IDF7C3.concluida, courseId: IDF7C3.curso, employeeId: ID.emp1, status: "Completed", completedOn: "2026-10-03", score: 92, notes: null, certificateNumber: "PS-000", certificateExpiresOn: "2028-10-03" },
];

export const tiposTurno = (): S["ShiftTypeView"][] => [
  { shiftTypeId: IDF7C3.manha, code: "M", name: "Manhã", startsAt: "06:00:00", endsAt: "14:00:00", crossesMidnight: false, active: true },
  { shiftTypeId: IDF7C3.noite, code: "N", name: "Noite", startsAt: "22:00:00", endsAt: "06:00:00", crossesMidnight: true, active: true },
];

export const escala = (dia: string): S["ShiftAssignmentView"][] => [
  { assignmentId: IDF7C3.escalado, employeeId: ID.emp2, employeeName: "Carlos Teste", departmentId: ID.dep1, shiftTypeId: IDF7C3.noite, shiftCode: "N", shiftName: "Noite", day: dia, startsAt: "22:00:00", endsAt: "06:00:00", notes: null },
];

export const trocasGestao = (dia: string, estado = "Pending"): S["ShiftChangeView"][] => [
  { requestId: IDF7C3.troca, assignmentId: IDF7C3.escalado, day: dia, requesterEmployeeId: ID.emp2, requesterName: "Carlos Teste", proposedEmployeeId: ID.emp1, proposedName: "Ana Teste", reason: "Consulta médica.", status: estado, requestedAt: "2026-10-16T10:00:00+00:00", decidedAt: estado === "Pending" ? null : "2026-10-17T10:00:00+00:00", decisionNotes: null },
];

// --- Bloco 4: declarações, desempenho, conquistas, importação

export const IDF7C4 = {
  modelo: "00000000-0000-4000-8000-000000000961",
  emitida: "00000000-0000-4000-8000-000000000962",
  ciclo: "00000000-0000-4000-8000-000000000963",
  cicloPlaneado: "00000000-0000-4000-8000-000000000964",
  objectivo: "00000000-0000-4000-8000-000000000965",
  kr: "00000000-0000-4000-8000-000000000966",
  conquista: "00000000-0000-4000-8000-000000000967",
} as const;

export const modelosGestao = (): S["DocumentTemplateView"][] => [
  { templateId: IDF7C4.modelo, name: "Declaração de trabalho", title: "DECLARAÇÃO", body: "Declara-se que {{nome}} trabalha nesta empresa desde {{admissao}}.", selfService: true, active: true },
];

export const emitidas = (): S["IssuedDeclarationView"][] => [
  { declarationId: IDF7C4.emitida, templateId: IDF7C4.modelo, title: "DECLARAÇÃO", employeeId: ID.emp2, employeeName: "Carlos Teste", issuedAt: "2026-10-16T10:00:00+00:00", bySelf: true, verificationCode: "AB12CD34EF56", contentHash: "x" },
];

export const ciclos = (estadoPlaneado = "Planned"): S["ReviewCycleView"][] => [
  { cycleId: IDF7C4.ciclo, name: "Avaliação 2026", startsOn: "2026-01-01", endsOn: "2026-12-31", status: "Active", objectives: 1, averageProgress: 40 },
  { cycleId: IDF7C4.cicloPlaneado, name: "Avaliação 2027", startsOn: "2027-01-01", endsOn: "2027-12-31", status: estadoPlaneado, objectives: 0, averageProgress: 0 },
];

export const objectivosGestao = (valor = 4): S["ObjectiveView"][] => [
  {
    objectiveId: IDF7C4.objectivo,
    cycleId: IDF7C4.ciclo,
    title: "Visitar clientes",
    description: null,
    ownerEmployeeId: ID.emp2,
    ownerName: "Carlos Teste",
    departmentId: null,
    weight: 50,
    dropped: false,
    progress: valor * 10,
    keyResults: [{ keyResultId: IDF7C4.kr, title: "Clientes visitados", unit: "clientes", startValue: 0, targetValue: 10, currentValue: valor, progress: valor * 10 }],
  },
];

export const conquistasGestao = (): S["AchievementView"][] => [
  { achievementId: IDF7C4.conquista, code: "PONTUAL", name: "Pontualidade", description: "Um mês sem atrasos.", icon: "star", points: 50, active: true, awarded: 3 },
];

export const classificacao = (): S["LeaderboardEntry"][] => [{ employeeId: ID.emp2, employeeName: "Carlos Teste", points: 150, achievements: 3 }];

export const conquistasDe = (): S["EmployeeAchievementView"][] => [
  { awardId: "00000000-0000-4000-8000-000000000968", employeeId: ID.emp2, achievementId: IDF7C4.conquista, code: "PONTUAL", name: "Pontualidade", icon: "star", points: 50, awardedAt: "2026-10-01T10:00:00+00:00", note: "Bom trabalho." },
];
