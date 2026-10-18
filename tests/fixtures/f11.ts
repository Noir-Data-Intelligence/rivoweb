/** F11 (1.º bloco) — CRM: leads, oportunidades, actividades, tipos de serviço e relatório. */
import type { components } from "../../src/lib/api/schema";
import { IDF3 } from "./f3";

type S = components["schemas"];

/** As do catálogo de produção (`catalogo-perfis.json`, 2026-10-18). */
const PERMS: Record<string, string[]> = { Sales: ["commercial.customers.read","commercial.customers.write","commercial.crm.read","commercial.crm.write","commercial.contracts.read","commercial.contracts.write","commercial.collections.read","commercial.collections.write","finance.invoices.read","finance.invoices.write","finance.receipts.read","finance.documents.deliver","messaging.conversations.read","messaging.conversations.write","messaging.knowledge_base.write","ai.assistant.use","documents.write"], Manager: ["approval.requests.read","approval.requests.decide","dashboard.overview.read","analytics.overview.read","finance.payables.read","finance.payables.write","finance.payments.request","finance.planning.read","finance.planning.write","finance.expenses.read","finance.expenses.approve","commercial.crm.read","commercial.contracts.read","procurement.suppliers.read","procurement.requisitions.read","procurement.requisitions.write","procurement.orders.read","procurement.orders.write","procurement.receipts.read","alerts.alerts.read","alerts.alerts.write","esg.esg.read","esg.esg.write","ai.assistant.use","documents.write"] };
const perms = (perfil: string) => PERMS[perfil] ?? [];

export const IDF11 = {
  lead: "00000000-0000-4000-8000-000000000b01",
  leadConvertido: "00000000-0000-4000-8000-000000000b02",
  novoLead: "00000000-0000-4000-8000-000000000b03",
  op1: "00000000-0000-4000-8000-000000000b11",
  op2: "00000000-0000-4000-8000-000000000b12",
  opLead: "00000000-0000-4000-8000-000000000b13",
  opGanha: "00000000-0000-4000-8000-000000000b14",
  novaOp: "00000000-0000-4000-8000-000000000b15",
  act1: "00000000-0000-4000-8000-000000000b21",
  act2: "00000000-0000-4000-8000-000000000b22",
  servico: "00000000-0000-4000-8000-000000000b31",
  novoCliente: "00000000-0000-4000-8000-000000000b41",
  dono: "00000000-0000-4000-8000-000000000b51",
};

/** Como em produção: o Sales lê clientes e escreve no CRM; não lê os RH. */
export const meVendasF11: S["CurrentUserResponse"] = { userId: "00000000-0000-4000-8000-000000000006", email: "vendas@teste.local", displayName: "Vendas Teste", roles: ["Sales"], permissions: perms("Sales") };
/** O Manager lê o CRM, sem clientes nem escrita. */
export const meGestorF11: S["CurrentUserResponse"] = { userId: "00000000-0000-4000-8000-000000000008", email: "gestor@teste.local", displayName: "Gestor Teste", roles: ["Manager"], permissions: perms("Manager") };

export const leads = (): S["LeadView"][] => [
  {
    leadId: IDF11.lead,
    name: "Marta Lopes",
    company: "Lopes & Filhos",
    email: "marta@lopes.ao",
    phone: "+244 923 000 000",
    source: "Feira",
    status: "New",
    ownerEmployeeId: IDF11.dono,
    notes: "Quer auditoria.\n<script>alert(1)</script>",
    disqualificationReason: null,
    convertedCustomerId: null,
    convertedOpportunityId: null,
    createdAt: "2026-10-01T09:00:00Z",
  },
  {
    leadId: IDF11.leadConvertido,
    name: "Rui Costa",
    company: null,
    email: null,
    phone: null,
    source: null,
    status: "Converted",
    ownerEmployeeId: null,
    notes: null,
    disqualificationReason: null,
    convertedCustomerId: IDF3.cliente,
    convertedOpportunityId: IDF11.op1,
    createdAt: "2026-09-01T09:00:00Z",
  },
];

const op = (id: string, titulo: string, etapa: string, extra: Partial<S["OpportunityView"]> = {}): S["OpportunityView"] => ({
  opportunityId: id,
  title: titulo,
  customerId: IDF3.cliente,
  leadId: null,
  stage: etapa,
  boardOrder: 0,
  estimatedValue: 1000000,
  currency: "AOA",
  probability: 25,
  weightedValue: 250000,
  expectedCloseDate: "2026-12-15",
  ownerEmployeeId: IDF11.dono,
  notes: null,
  lostReason: null,
  createdAt: "2026-10-05T10:00:00Z",
  closedAt: null,
  ...extra,
});

export const oportunidades = (): S["OpportunityView"][] => [
  op(IDF11.op1, "Auditoria 2027", "Proposal", { createdAt: "2026-10-10T10:00:00Z" }),
  op(IDF11.op2, "Formação em Excel", "Prospecting", { estimatedValue: 5000, currency: "USD", probability: 10, weightedValue: 500, expectedCloseDate: null }),
  op(IDF11.opLead, "Consultoria fiscal", "Qualification", { customerId: null, leadId: IDF11.lead, createdAt: "2026-10-12T10:00:00Z" }),
  op(IDF11.opGanha, "Contabilidade 2026", "Won", { probability: 100, weightedValue: 1000000, closedAt: "2026-09-30T10:00:00Z", createdAt: "2026-08-01T10:00:00Z" }),
];

export const quadro = (): S["PipelineColumn"][] => [
  { stage: "Prospecting", items: [oportunidades()[1] as S["OpportunityView"]] },
  { stage: "Qualification", items: [oportunidades()[2] as S["OpportunityView"]] },
  { stage: "Proposal", items: [oportunidades()[0] as S["OpportunityView"]] },
  { stage: "Negotiation", items: [] },
];

export const historico = (): S["StageChangeView"][] => [
  { fromStage: "Qualification", toStage: "Proposal", changedAt: "2026-10-15T10:00:00Z", changedByUserId: null, daysInPreviousStage: 3.5 },
  { fromStage: null, toStage: "Prospecting", changedAt: "2026-10-10T10:00:00Z", changedByUserId: null, daysInPreviousStage: null },
  { fromStage: "Prospecting", toStage: "Qualification", changedAt: "2026-10-12T00:00:00Z", changedByUserId: null, daysInPreviousStage: 1.6 },
];

export const actividades = (): S["CrmActivityView"][] => [
  { activityId: IDF11.act1, kind: "Call", subject: "Ligar à Marta", notes: null, scheduledAt: "2026-10-02T09:00:00Z", done: false, completedAt: null, leadId: IDF11.lead, opportunityId: null, customerId: null, ownerEmployeeId: null },
  { activityId: IDF11.act2, kind: "Meeting", subject: "Reunião de proposta", notes: "Levar a proposta.", scheduledAt: "2099-01-10T09:00:00Z", done: false, completedAt: null, leadId: null, opportunityId: IDF11.op1, customerId: IDF3.cliente, ownerEmployeeId: null },
];

export const servicos = (): S["ServiceTypeView"][] => [
  { serviceTypeId: IDF11.servico, code: "AUD", name: "Auditoria", description: "Por hora.", unitPrice: 25000, currency: "AOA", active: true },
  { serviceTypeId: "00000000-0000-4000-8000-000000000b32", code: "OLD", name: "Serviço antigo", description: null, unitPrice: 0, currency: "AOA", active: false },
];

export const relatorio = (): S["CrmReport"] => ({
  currency: "AOA",
  pipeline: [
    { stage: "Prospecting", count: 3, totalValue: 3000000, weightedValue: 300000 },
    { stage: "Proposal", count: 1, totalValue: 1000000, weightedValue: 500000 },
  ],
  forecast: [{ month: "2026-12", count: 2, totalValue: 2000000, weightedValue: 750000 }],
  won: 4,
  lost: 1,
  winRate: 80,
  wonValue: 4500000,
  leadsByStatus: { New: 5, Contacted: 2, Qualified: 1, Disqualified: 1, Converted: 3 },
  leadConversionRate: 75,
  byOwner: [
    { ownerEmployeeId: IDF11.dono, won: 3, lost: 1, winRate: 75, wonValue: 3500000 },
    { ownerEmployeeId: null, won: 1, lost: 0, winRate: 100, wonValue: 1000000 },
  ],
  openActivities: 7,
  overdueActivities: 2,
});
