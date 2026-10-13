/** Fixtures da F2 — SÓ em tests/ (§8.2). Tipadas contra schema.d.ts. Valores de teste. */
import type { components } from "../../src/lib/api/schema";
import { meAdminF1 } from "./f1";

type S = components["schemas"];

export const meAdminF2: S["CurrentUserResponse"] = {
  ...meAdminF1,
  permissions: [...meAdminF1.permissions, "dashboard.overview.read", "alerts.alerts.read", "alerts.alerts.write", "finance.invoices.read", "commercial.crm.read"],
};

/** Só leitura de alertas e sem finanças: vê pessoas, não vê o executivo nem escreve regras. */
export const meLeitorAlertas: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000005",
  email: "leitor@teste.local",
  displayName: "Leitor Teste",
  roles: ["HR"],
  permissions: ["hr.employees.read", "alerts.alerts.read"],
};

export const meuPainel = (): S["MyDashboardView"] => ({
  employeeId: null,
  displayName: "Administração Teste",
  unreadNotifications: 2,
  pendingApprovals: 1,
  announcements: [
    { announcementId: "00000000-0000-4000-8000-000000000201", title: "Fecho do mês", body: "Lançamentos até dia 5.\n<b>sem HTML</b>", pinned: true, publishedAt: "2026-10-01T09:00:00Z" },
  ],
});

export const kpisCompletos = (): S["RoleDashboardView"] => ({
  from: "2026-01-01",
  to: "2026-10-13",
  currency: "AOA",
  sections: ["finance", "hr", "sales"],
  finance: {
    revenue: 1500000.5,
    expenses: 900000,
    profit: 600000.5,
    receivables: 250000,
    payables: 120000,
    monthlyRevenue: [
      { year: 2026, month: 8, amount: 400000 },
      { year: 2026, month: 9, amount: 500000 },
      { year: 2026, month: 10, amount: 600000.5 },
    ],
    monthlyExpenses: [
      { year: 2026, month: 8, amount: 450000 },
      { year: 2026, month: 9, amount: 200000 },
      { year: 2026, month: 10, amount: 250000 },
    ],
    topCustomers: [],
  },
  hr: {
    activeHeadcount: 12,
    inactiveHeadcount: 1,
    byDepartment: [
      { departmentId: null, department: "Operações", count: 8 },
      { departmentId: null, department: "Finanças", count: 4 },
    ],
    hiresInPeriod: 3,
    monthlyHires: [{ month: "2026-03", count: 2 }, { month: "2026-07", count: 1 }],
    absencesInPeriod: 5,
    unjustifiedAbsences: 1,
    lateArrivalsInPeriod: 2,
    approvedLeaveDaysInPeriod: 20,
    pendingLeaveRequests: 2,
    openTickets: 1,
    trainingHoursCompleted: 10,
    activeContracts: 12,
  },
  sales: {
    openOpportunities: 4,
    pipelineValue: 800000,
    weightedPipelineValue: 300000,
    pipeline: [
      { stage: "Proposal", count: 2, totalValue: 300000 },
      { stage: "Negotiation", count: 2, totalValue: 500000 },
    ],
    won: 3,
    lost: 1,
    winRate: 75,
    wonValue: 900000,
    monthlyWon: [{ month: "2026-05", count: 2, value: 600000 }],
    leadsByStatus: {},
    leadConversionRate: 20,
    overdueActivities: 0,
    contractsExpiringIn30Days: 1,
  },
});

export const visaoExecutiva = (): S["ExecutiveOverviewView"] => ({
  from: "2026-01-01",
  to: "2026-10-13",
  currency: "AOA",
  revenue: 1500000.5,
  expenses: 900000,
  profit: 600000.5,
  receivables: 250000,
  payables: 120000,
  topCustomers: [{ customerId: "00000000-0000-4000-8000-000000000301", customerName: "Cliente Teste, Lda", netRevenue: 700000 }],
});

export const notificacoes = (): S["NotificationView"][] => [
  { notificationId: "00000000-0000-4000-8000-000000000401", type: "AccessProfileAssigned", title: "Perfil de acesso atribuído", message: "Foi-lhe atribuído o perfil 'HR'.", read: false, createdAt: "2026-10-12T10:00:00Z", readAt: null },
  { notificationId: "00000000-0000-4000-8000-000000000402", type: "Alert", title: "Facturas vencidas", message: "2 facturas vencidas há 30 dias.", read: false, createdAt: "2026-10-11T10:00:00Z", readAt: null },
  { notificationId: "00000000-0000-4000-8000-000000000403", type: "Alert", title: "Lida antes", message: "Já lida.", read: true, createdAt: "2026-10-10T10:00:00Z", readAt: "2026-10-10T11:00:00Z" },
];

export const regras = (): S["AlertRuleView"][] => [
  {
    ruleId: "00000000-0000-4000-8000-000000000501",
    name: "Cobranças",
    kind: "ReceivablesOverdue",
    thresholdDays: 30,
    recipients: [meAdminF1.userId],
    sendEmail: false,
    isActive: true,
    lastEvaluatedAt: null,
    openAlerts: 1,
  },
];

export const eventos = (): S["AlertEventView"][] => [
  {
    alertId: "00000000-0000-4000-8000-000000000601",
    ruleId: "00000000-0000-4000-8000-000000000501",
    kind: "ReceivablesOverdue",
    title: "FT 2026/17 vencida",
    detail: "Cliente Teste, Lda · 45 dias",
    dueOn: "2026-08-29",
    amount: 120000,
    currency: "AOA",
    raisedAt: "2026-10-12T06:00:00Z",
    status: "Open",
    resolvedAt: null,
  },
];
