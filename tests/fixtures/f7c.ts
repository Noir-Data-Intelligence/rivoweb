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
