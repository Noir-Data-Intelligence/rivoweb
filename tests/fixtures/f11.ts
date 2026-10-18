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
    ownerName: "Joana Vendas",
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
  ownerName: "Joana Vendas",
  customerName: "Cliente Teste, Lda",
  leadName: null,
  notes: null,
  lostReason: null,
  createdAt: "2026-10-05T10:00:00Z",
  closedAt: null,
  ...extra,
});

export const oportunidades = (): S["OpportunityView"][] => [
  op(IDF11.op1, "Auditoria 2027", "Proposal", { createdAt: "2026-10-10T10:00:00Z" }),
  op(IDF11.op2, "Formação em Excel", "Prospecting", { estimatedValue: 5000, currency: "USD", probability: 10, weightedValue: 500, expectedCloseDate: null }),
  op(IDF11.opLead, "Consultoria fiscal", "Qualification", { customerId: null, customerName: null, leadId: IDF11.lead, leadName: "Marta Lopes (Lopes & Filhos)", createdAt: "2026-10-12T10:00:00Z" }),
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
  { activityId: IDF11.act1, kind: "Call", subject: "Ligar à Marta", notes: null, scheduledAt: "2026-10-02T09:00:00Z", done: false, completedAt: null, leadId: IDF11.lead, leadName: "Marta Lopes (Lopes & Filhos)", opportunityId: null, customerId: null, ownerEmployeeId: null },
  { activityId: IDF11.act2, kind: "Meeting", subject: "Reunião de proposta", notes: "Levar a proposta.", scheduledAt: "2099-01-10T09:00:00Z", done: false, completedAt: null, leadId: null, opportunityId: IDF11.op1, customerId: IDF3.cliente, customerName: "Cliente Teste, Lda", ownerEmployeeId: IDF11.dono, ownerName: "Joana Vendas" },
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
    { ownerEmployeeId: IDF11.dono, ownerName: "Joana Vendas", won: 3, lost: 1, winRate: 75, wonValue: 3500000 },
    { ownerEmployeeId: null, won: 1, lost: 0, winRate: 100, wonValue: 1000000 },
  ],
  openActivities: 7,
  overdueActivities: 2,
});

// --- Propostas (2.º bloco)

export const IDF11P = {
  rascunho: "00000000-0000-4000-8000-000000000c01",
  enviada: "00000000-0000-4000-8000-000000000c02",
  linha1: "00000000-0000-4000-8000-000000000c11",
  linha2: "00000000-0000-4000-8000-000000000c12",
  modelo: "00000000-0000-4000-8000-000000000c21",
  nova: "00000000-0000-4000-8000-000000000c03",
};

const linha = (id: string, n: number, desc: string, q: number, p: number, d: number, t: number): S["ProposalLineView"] => ({ lineId: id, position: n, serviceTypeId: null, description: desc, quantity: q, unitPrice: p, discountPercent: d, total: t });

export const propostas = (): S["ProposalView"][] => [
  {
    proposalId: IDF11P.rascunho,
    number: "PROP-20261015-A1B2C3",
    title: "Auditoria 2027",
    customerId: IDF3.cliente,
    customerName: "Cliente Teste, Lda",
    leadId: null,
    opportunityId: IDF11.op1,
    status: "Draft",
    currency: "AOA",
    validUntil: "2026-11-30",
    body: "Exmos. Senhores,\n<img src=x onerror=alert(1)>",
    notes: null,
    decisionNotes: null,
    total: 34688.89,
    createdAt: "2026-10-15T10:00:00Z",
    sentAt: null,
    decidedAt: null,
    lines: [linha(IDF11P.linha1, 1, "Horas de auditoria", 3, 12500.5, 7.5, 34688.89), linha(IDF11P.linha2, 2, "Deslocação", 1, 0, 0, 0)],
  },
  {
    proposalId: IDF11P.enviada,
    number: "PROP-20261001-D4E5F6",
    title: "Consultoria fiscal",
    customerId: null,
    leadId: IDF11.lead,
    leadName: "Marta Lopes (Lopes & Filhos)",
    opportunityId: null,
    status: "Sent",
    currency: "USD",
    validUntil: null,
    body: null,
    notes: "Inclui IVA.",
    decisionNotes: null,
    total: 4500,
    createdAt: "2026-10-01T10:00:00Z",
    sentAt: "2026-10-02T10:00:00Z",
    decidedAt: null,
    lines: [linha("00000000-0000-4000-8000-000000000c13", 1, "Consultoria", 10, 450, 0, 4500)],
  },
];

export const versoes = (): S["ProposalVersionView"][] => [
  { versionId: "v1", number: 1, reason: "revised", total: 30000, createdAt: "2026-10-16T10:00:00Z", snapshot: { title: "Auditoria", total: 30000, lines: [{ description: "Horas de auditoria", total: 30000 }] } as unknown as S["ProposalVersionView"]["snapshot"] },
  { versionId: "v2", number: 2, reason: "sent", total: 34688.89, createdAt: "2026-10-17T10:00:00Z", snapshot: { title: "Auditoria 2027", total: 34688.89, lines: [] } as unknown as S["ProposalVersionView"]["snapshot"] },
];

export const modelos = (): S["ProposalTemplateView"][] => [
  { templateId: IDF11P.modelo, name: "Proposta padrão", body: "Exmos. {{cliente}},\nSegue a proposta «{{titulo}}», válida até {{validade}}.", active: true },
  { templateId: "00000000-0000-4000-8000-000000000c22", name: "Modelo antigo", body: "Antigo.", active: false },
];

// --- Contratos e cobranças (3.º bloco)

/** Como em produção: lê contratos, regista cobranças, lê facturas; não lê clientes. */
export const meFinancasF11: S["CurrentUserResponse"] = { userId: "00000000-0000-4000-8000-000000000007", email: "financas@teste.local", displayName: "Finanças Teste", roles: ["Finance"], permissions: ["approval.requests.read","approval.requests.decide","documents.write","finance.invoices.read","finance.receipts.read","finance.receipts.write","finance.payables.read","finance.payments.execute","finance.treasury.read","finance.treasury.write","finance.reports.read","finance.invoices.cancel","finance.ledger.read","finance.ledger.write","finance.assets.read","finance.assets.write","finance.planning.read","finance.budgets.approve","finance.expenses.read","finance.expenses.write","finance.expenses.approve","fiscal.rates.read","fiscal.rates.write","fiscal.tax_entity.read","fiscal.tax_entity.write","procurement.suppliers.read","procurement.orders.read","procurement.receipts.read","commercial.collections.read","commercial.collections.write","commercial.contracts.read","alerts.alerts.read","ai.assistant.use"] };

export const IDF11C = {
  rascunho: "00000000-0000-4000-8000-000000000d01",
  activo: "00000000-0000-4000-8000-000000000d02",
  anexo: "00000000-0000-4000-8000-000000000d11",
  documento: "00000000-0000-4000-8000-000000000d12",
  factura: "00000000-0000-4000-8000-000000000d21",
  factura2: "00000000-0000-4000-8000-000000000d22",
};

const contrato = (id: string, numero: string, titulo: string, estado: string, extra: Partial<S["CustomerContractView"]> = {}): S["CustomerContractView"] => ({
  contractId: id,
  number: numero,
  title: titulo,
  customerId: IDF3.cliente,
  customerName: "Cliente Teste, Lda",
  kind: "Commercial",
  status: estado,
  startsOn: "2026-01-01",
  endsOn: "2026-12-31",
  value: 1200000,
  currency: "AOA",
  slaResponseHours: 4,
  slaResolutionHours: 24,
  renewalNoticeDays: 30,
  autoRenew: false,
  notes: null,
  terminatedOn: null,
  terminationReason: null,
  daysToExpiry: 74,
  ...extra,
});

export const contratos = (): S["CustomerContractView"][] => [
  contrato(IDF11C.activo, "CT-2026/07", "Manutenção anual", "Active", { endsOn: "2026-11-05", daysToExpiry: 18, notes: "<b>SLA</b> reforçado" }),
  contrato(IDF11C.rascunho, "CT-2026/09", "Avença jurídica", "Draft", { kind: "Legal", endsOn: null, daysToExpiry: null, value: null, currency: null }),
];

export const aditamentos = (): S["ContractAmendmentView"][] => [
  { amendmentId: "a1", number: 1, description: "Mais horas de suporte.", effectiveOn: "2026-06-01", valueChange: 200000, previousEndsOn: null, newEndsOn: null, recordedAt: "2026-06-01T10:00:00Z" },
];

export const anexos = (): S["ContractDocumentView"][] => [{ linkId: IDF11C.anexo, documentId: IDF11C.documento, category: "Contrato assinado", fileName: "contrato-assinado.pdf", attachedAt: "2026-01-02T10:00:00Z" }];

export const vencidas = (): S["OverdueReceivable"][] => [
  { invoiceId: IDF11C.factura, number: "FT 2026/12", customerId: IDF3.cliente, customerName: "Cliente Teste, Lda", issuedOn: "2026-07-01", dueDate: "2026-07-31", daysOverdue: 79, grossTotal: 570000, outstanding: 570000, currency: "AOA" },
  { invoiceId: IDF11C.factura2, number: "FT 2026/40", customerId: IDF3.cliente, customerName: "Cliente Teste, Lda", issuedOn: "2026-09-01", dueDate: "2026-09-30", daysOverdue: 18, grossTotal: 2000, outstanding: 1500, currency: "USD" },
];

export const accoes = (): S["CollectionActionView"][] => [
  { actionId: "c1", customerId: IDF3.cliente, customerName: "Cliente Teste, Lda", salesInvoiceId: IDF11C.factura2, invoiceNumber: "FT 2026/40", ownerName: "Joana Vendas", kind: "PaymentPromise", notes: "Paga metade sexta.\n<script>x</script>", occurredAt: "2026-10-10T09:00:00Z", promisedAmount: 750, promisedDate: "2026-10-17", nextFollowUpOn: "2026-10-20", ownerEmployeeId: IDF11.dono },
];

/** `/commercial/lookups` (B35). */
export const escolhasComerciais = (): S["CommercialLookups"] => ({
  employees: [{ id: IDF11.dono, name: "Joana Vendas" }],
  customers: [{ id: IDF3.cliente, name: "Cliente Teste, Lda" }],
});
