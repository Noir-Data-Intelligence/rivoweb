/** F13 (1.º bloco) — analytics (tendências, RH, vendas) e auditoria. */
import type { components } from "../../src/lib/api/schema";
import { meAdminF12 } from "./f12";

type S = components["schemas"];

export const meAdminF13: S["CurrentUserResponse"] = { ...meAdminF12, permissions: [...new Set([...meAdminF12.permissions, "analytics.overview.read", "audit.trail.read", "identity.users.read"])] };

/** O Manager de produção lê o analytics, não a auditoria. */
export const meManagerF13: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000013",
  email: "gestao@teste.local",
  displayName: "Gestão Teste",
  roles: ["Manager"],
  permissions: ["analytics.overview.read", "esg.esg.read", "esg.esg.write", "ai.assistant.use"],
};

export const tendencias = (moeda = "AOA"): S["AnalyticsOverviewView"] => ({
  from: "2026-01-01",
  to: "2026-03-31",
  currency: moeda,
  monthlyRevenue: [
    { year: 2026, month: 1, amount: 1200000 },
    { year: 2026, month: 3, amount: 1500000.5 },
  ],
  monthlyExpenses: [{ year: 2026, month: 2, amount: 800000 }],
  fleetPeriodExpenses: 46500.5,
  fleetPeriodDistanceKm: 1240.5,
  fleetPeriodMaintenanceCost: 85000,
  inventoryCurrentValue: 3250000,
  inventoryPeriodValuation: 410000,
});

export const analyticsRh = (): S["WorkforceSnapshot"] => ({
  activeHeadcount: 42,
  inactiveHeadcount: 3,
  byDepartment: [
    { departmentId: "d1", department: "Operações", count: 20 },
    { departmentId: null, department: "Sem departamento", count: 2 },
  ],
  hiresInPeriod: 5,
  monthlyHires: [{ month: "2026-02", count: 5 }],
  absencesInPeriod: 9,
  unjustifiedAbsences: 1,
  lateArrivalsInPeriod: 14,
  approvedLeaveDaysInPeriod: 37,
  pendingLeaveRequests: 2,
  openTickets: 4,
  trainingHoursCompleted: 126.5,
  activeContracts: 40,
});

export const analyticsVendas = (): S["SalesSnapshot"] => ({
  openOpportunities: 7,
  pipelineValue: 9000000,
  weightedPipelineValue: 4100000,
  pipeline: [{ stage: "Proposal", count: 3, totalValue: 6000000 }],
  won: 4,
  lost: 2,
  winRate: 66.7,
  wonValue: 5200000,
  monthlyWon: [{ month: "2026-03", count: 2, value: 2600000 }],
  leadsByStatus: { New: 6, Qualified: 3, Converted: 2 },
  leadConversionRate: 18.2,
  overdueActivities: 3,
  contractsExpiringIn30Days: 1,
});

export const ACTOR = "00000000-0000-4000-8000-0000000000a1";
export const registosAuditoria = (): S["AuditEntryView"][] => [
  { id: "r1", action: "finance.sales_invoice.issued", entityType: "finance.sales_invoice", entityId: "00000000-0000-4000-8000-000000000b01", actorId: ACTOR, ipAddress: "10.0.0.5", correlationId: "corr-1", occurredAt: "2026-10-22T09:30:00Z" },
  { id: "r2", action: "hr.employee.<script>x</script>", entityType: "hr.employee", entityId: "00000000-0000-4000-8000-000000000b02", actorId: null, ipAddress: null, correlationId: null, occurredAt: "2026-10-22T08:00:00Z" },
];

export const contasAuditoria = (): S["UserSummary"][] => [{ userId: ACTOR, email: "financas@teste.local", isActive: true, roles: ["Finance"] }];
