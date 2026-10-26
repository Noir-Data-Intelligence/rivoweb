/** Auditoria interna (backend #119) e trilha por período (#122). */
import type { components } from "../../src/lib/api/schema";
import { meAdminF13, meManagerF13 } from "./f13";

type S = components["schemas"];

/** O Admin conduz a auditoria interna; o Manager lê (catálogo de 2026-10-26). */
export const meAdminF14: S["CurrentUserResponse"] = {
  ...meAdminF13,
  permissions: [...new Set([...meAdminF13.permissions, "internalaudit.audits.read", "internalaudit.audits.write", "internalaudit.findings.read", "internalaudit.findings.write", "internalaudit.actions.read", "internalaudit.actions.write"])],
};
export const meManagerF14: S["CurrentUserResponse"] = { ...meManagerF13, permissions: [...meManagerF13.permissions, "internalaudit.audits.read", "internalaudit.findings.read", "internalaudit.actions.read"] };

export const IDF14 = {
  campo: "00000000-0000-4000-8000-000000001401",
  relatorio: "00000000-0000-4000-8000-000000001402",
  fechada: "00000000-0000-4000-8000-000000001403",
  achado1: "00000000-0000-4000-8000-000000001411",
  achado2: "00000000-0000-4000-8000-000000001412",
  plano1: "00000000-0000-4000-8000-000000001421",
  plano2: "00000000-0000-4000-8000-000000001422",
  compras: "00000000-0000-4000-8000-000000001431",
  ana: "00000000-0000-4000-8000-000000001441",
  rui: "00000000-0000-4000-8000-000000001442",
};

const base = {
  objectives: null,
  scope: null,
  departmentId: IDF14.compras,
  departmentName: "Compras",
  ownerEmployeeId: IDF14.ana,
  ownerName: "Ana Auditora",
  plannedStart: "2026-11-01",
  plannedEnd: "2026-11-30",
  cancellationReason: null,
  createdAt: "2026-10-20T09:00:00Z",
  createdByUserId: null,
  closedAt: null,
} as const;

export const auditoriasF14 = (): S["AuditView"][] => [
  { ...base, auditId: IDF14.relatorio, auditNumber: "AUD-2026-002", title: "Compras <b>2026</b>", objectives: "Rever as compras acima de 1 milhão", riskRating: "High", status: "Reporting", findingsTotal: 2, findingsOpen: 2 },
  { ...base, auditId: IDF14.campo, auditNumber: "AUD-2026-003", title: "Caixa pequena", riskRating: "Low", status: "InProgress", findingsTotal: 0, findingsOpen: 0 },
  { ...base, auditId: IDF14.fechada, auditNumber: "AUD-2026-001", title: "Inventário", riskRating: "Critical", status: "Closed", closedAt: "2026-10-10T12:00:00Z", findingsTotal: 1, findingsOpen: 0 },
];

export const achadosF14 = (): S["FindingView"][] => [
  { findingId: IDF14.achado1, auditId: IDF14.relatorio, auditNumber: "AUD-2026-002", auditTitle: "Compras <b>2026</b>", description: "Compras sem três cotações", severity: "Critical", controlRef: "CP-04", recommendation: "Exigir três cotações acima do limite.", status: "InRemediation", resolutionNotes: null, identifiedAt: "2026-11-03T10:00:00Z", identifiedByUserId: null, resolvedAt: null, actionPlansTotal: 2, actionPlansDone: 1 },
  { findingId: IDF14.achado2, auditId: IDF14.relatorio, auditNumber: "AUD-2026-002", auditTitle: "Compras <b>2026</b>", description: "Fornecedor <script>x</script> sem contrato", severity: "Medium", controlRef: null, recommendation: null, status: "Open", resolutionNotes: null, identifiedAt: "2026-11-04T10:00:00Z", identifiedByUserId: null, resolvedAt: null, actionPlansTotal: 0, actionPlansDone: 0 },
];

export const planosF14 = (): S["ActionPlanView"][] => [
  { actionPlanId: IDF14.plano1, findingId: IDF14.achado1, auditId: IDF14.relatorio, auditNumber: "AUD-2026-002", action: "Rever o procedimento de compras", ownerEmployeeId: IDF14.rui, ownerName: "Rui Compras", dueDate: "2026-11-20", status: "Done", isOverdue: false, createdAt: "2026-11-05T10:00:00Z", completedAt: "2026-11-18T10:00:00Z" },
  { actionPlanId: IDF14.plano2, findingId: IDF14.achado1, auditId: IDF14.relatorio, auditNumber: "AUD-2026-002", action: "Formar os compradores", ownerEmployeeId: IDF14.rui, ownerName: "Rui Compras", dueDate: "2026-10-01", status: "InProgress", isOverdue: true, createdAt: "2026-11-05T10:00:00Z", completedAt: null },
];

export const detalheF14 = (id: string): S["AuditDetailView"] => {
  const [primeira] = auditoriasF14();
  const audit = auditoriasF14().find((a) => a.auditId === id) ?? primeira;
  if (!audit) throw new Error("sem auditorias");
  const findings = achadosF14().filter((f) => f.auditId === audit.auditId);
  return { audit, findings, actionPlans: planosF14().filter((p) => findings.some((f) => f.findingId === p.findingId)) };
};

export const historicoF14 = (): S["HistoryEntryView"][] => [
  { action: "internalaudit.audit.planned", entityType: "internalaudit.audit", entityId: IDF14.relatorio, actorUserId: "u1", actorName: "Admin Teste", occurredAt: "2026-10-20T09:00:00Z" },
  { action: "internalaudit.finding.identified", entityType: "internalaudit.finding", entityId: IDF14.achado2, actorUserId: null, actorName: null, occurredAt: "2026-11-04T10:00:00Z" },
  { action: "internalaudit.action_plan.created", entityType: "internalaudit.action_plan", entityId: IDF14.plano2, actorUserId: "u1", actorName: "Admin Teste", occurredAt: "2026-11-05T10:00:00Z" },
];

export const resumoF14 = (): S["InternalAuditOverview"] => ({ activeAudits: 2, openFindings: 2, overdueActionPlans: 1, compliancePercent: null });

export const opcoesF14 = (): S["InternalAuditLookups"] => ({
  departments: [{ id: IDF14.compras, name: "Compras" }],
  employees: [
    { id: IDF14.ana, name: "Ana Auditora" },
    { id: IDF14.rui, name: "Rui Compras" },
  ],
});

export const eventosPorDia = (de: string, ate: string): S["AuditDailyCountView"][] => {
  const out: S["AuditDailyCountView"][] = [];
  for (let d = new Date(`${de}T00:00:00Z`); d.toISOString().slice(0, 10) <= ate; d.setUTCDate(d.getUTCDate() + 1)) out.push({ date: d.toISOString().slice(0, 10), count: out.length === 2 ? 159 : out.length });
  return out;
};
