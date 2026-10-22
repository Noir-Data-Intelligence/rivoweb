/** F13 (1.º bloco) — analytics (tendências, RH, vendas) e auditoria. */
import type { components } from "../../src/lib/api/schema";
import { meAdminF12 } from "./f12";

type S = components["schemas"];

export const meAdminF13: S["CurrentUserResponse"] = { ...meAdminF12, permissions: [...new Set([...meAdminF12.permissions, "analytics.overview.read", "audit.trail.read", "identity.users.read", "ai.assistant.use", "ai.provider.manage"])] };

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

// --- Bloco 2: ESG.

export const IDF13 = {
  gasoleo: "00000000-0000-4000-8000-000000001301",
  formacao: "00000000-0000-4000-8000-000000001302",
  inactivo: "00000000-0000-4000-8000-000000001303",
  solar: "00000000-0000-4000-8000-000000001311",
  fechada: "00000000-0000-4000-8000-000000001312",
  antiga: "00000000-0000-4000-8000-000000001321",
  ana: "00000000-0000-4000-8000-000000001322",
};

export const indicadoresEsg = (): S["IndicatorView"][] => [
  { indicatorId: IDF13.gasoleo, code: "ENV-01", name: "Gasóleo da frota", pillar: "Environmental", category: "Energia", unit: "litros", aggregation: "Sum", direction: "LowerIsBetter", annualTarget: 30000, conversionFactor: 2.68, convertedUnit: "kgCO2e", factorSource: "Inventário interno 2026", isActive: true },
  { indicatorId: IDF13.formacao, code: "SOC-01", name: "Horas de formação <b>por pessoa</b>", pillar: "Social", category: null, unit: "horas", aggregation: "Average", direction: "HigherIsBetter", annualTarget: null, conversionFactor: null, convertedUnit: null, factorSource: null, isActive: true },
  { indicatorId: IDF13.inactivo, code: "GOV-09", name: "Antigo", pillar: "Governance", category: null, unit: "n.º", aggregation: "Last", direction: "HigherIsBetter", annualTarget: null, conversionFactor: null, convertedUnit: null, factorSource: null, isActive: false },
];

export const medicoesEsg = (): S["MeasurementView"][] => [{ measurementId: "m1", indicatorId: IDF13.gasoleo, period: "2026-02-01", value: 1200, reportedValue: 3216, source: "Facturas de combustível", notes: "<script>x</script>" }];

export const iniciativasEsg = (): S["InitiativeView"][] => [
  { initiativeId: IDF13.solar, title: "Painéis solares", pillar: "Environmental", description: "Armazém central.", indicatorId: IDF13.gasoleo, ownerEmployeeId: IDF13.antiga, ownerName: "Joana <b>Antiga</b>", startsOn: "2026-03-01", endsOn: "2026-09-30", budget: 2500000, currency: "AOA", progress: 20, status: "InProgress" },
  { initiativeId: IDF13.fechada, title: "Código de conduta", pillar: "Governance", description: null, indicatorId: null, ownerEmployeeId: null, ownerName: null, startsOn: null, endsOn: null, budget: null, currency: "AOA", progress: 100, status: "Completed" },
];

/** Colaboradores activos para escolher o responsável (B41); a Joana já saiu. */
export const escolhasEsg = (): S["EsgLookups"] => ({ employees: [{ id: IDF13.ana, name: "Ana Sustentável" }] });

export const relatorioEsg = (ano = 2026): S["EsgReport"] => ({
  year: ano,
  overallScore: 50,
  pillars: [
    {
      pillar: "Environmental",
      indicators: 1,
      onTarget: 1,
      withTarget: 1,
      score: 100,
      activeInitiatives: 1,
      results: [{ indicatorId: IDF13.gasoleo, code: "ENV-01", name: "Gasóleo da frota", unit: "kgCO2e", actual: 3216, previousYear: 4000.5, target: 30000, meetsTarget: true, monthly: [{ month: "2026-02", value: 3216 }] }],
    },
    {
      pillar: "Social",
      indicators: 1,
      onTarget: 0,
      withTarget: 0,
      score: null,
      activeInitiatives: 0,
      results: [{ indicatorId: IDF13.formacao, code: "SOC-01", name: "Horas de formação", unit: "horas", actual: 12.5, previousYear: null, target: null, meetsTarget: null, monthly: [] }],
    },
    { pillar: "Governance", indicators: 0, onTarget: 0, withTarget: 0, score: null, activeInitiatives: 0, results: [] },
  ],
});


// --- Bloco 3: IA (sempre simulada; os pedidos reais gastam saldo).

export const estadoIa = (ligada = true): S["AiStatusResponse"] => ({ enabled: ligada, model: ligada ? "claude-opus-5" : null, provider: ligada ? "anthropic" : null, fallbackEnabled: true });

export const fornecedorIa = (): S["AiProviderSettingsView"] => ({
  activeProvider: "anthropic",
  fallbackEnabled: true,
  updatedAt: null,
  providers: [
    { name: "anthropic", configured: true, model: "claude-opus-5" },
    { name: "openai", configured: true, model: "gpt-5" },
    { name: "outro", configured: false, model: "x-1" },
  ],
});

export const leituraIa = (): S["InsightsView"] => ({
  from: "2026-01-01",
  to: "2026-10-22",
  sections: ["finance", "sales"],
  summary: "A receita cresceu 12% face ao trimestre anterior.\n<script>x</script>",
  insights: [
    { area: "finance", severity: "attention", title: "Clientes a pagar mais tarde", detail: "O prazo médio subiu para 48 dias." },
    { area: "sales", severity: "critical", title: "Pipeline concentrado", detail: "Duas oportunidades valem 70% do pipeline." },
  ],
  model: "claude-opus-5",
});

export const previsaoIa = (): S["RevenueForecastView"] => ({
  currency: "AOA",
  history: [{ month: "2026-09", revenue: 1500000, expenses: 900000 }],
  forecast: [
    { month: "2026-11", revenue: 1600000, expenses: 950000 },
    { month: "2026-12", revenue: 1700000.5, expenses: 980000 },
  ],
  method: "Média móvel com sazonalidade",
  assumptions: "Sem novos contratos grandes.",
  confidence: "Média",
  model: "claude-opus-5",
});

export const facturaLida = (): S["ExtractedInvoice"] => ({
  supplierName: "Kwanza Serviços, Lda",
  supplierTaxId: "5417 000001",
  invoiceNumber: "FT 2026/777",
  issuedOn: "2026-10-01",
  dueOn: "2026-10-31",
  currency: "AOA",
  netTotal: 100000,
  taxTotal: 14000,
  grossTotal: 114000,
  lines: [{ description: "Manutenção do gerador", quantity: 1, unitPrice: 100000, taxRate: 14, total: 114000 }],
  warnings: ["A data de vencimento estava pouco legível."],
});
