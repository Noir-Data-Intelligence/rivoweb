/** Fixtures da F5 — SÓ em tests/ (§8.2). Tipadas contra schema.d.ts. Dados de teste. */
import type { components } from "../../src/lib/api/schema";
import { ID } from "./f1";
import { meAdminF4 } from "./f4";

type S = components["schemas"];

/** Permissões da F5 (Facto: catálogo de perfis, ADR-080). */
const PERMS_F5 = [
  "documents.read",
  "documents.write",
  "procurement.suppliers.read",
  "procurement.suppliers.write",
  "finance.payables.read",
  "finance.payables.write",
  "finance.payments.request",
  "finance.payments.execute",
  "finance.treasury.read",
  "finance.treasury.write",
  "finance.reports.read",
  "finance.expenses.read",
  "finance.expenses.write",
  "finance.expenses.approve",
];

export const meAdminF5: S["CurrentUserResponse"] = { ...meAdminF4, permissions: [...new Set([...meAdminF4.permissions, ...PERMS_F5])] };

/** Finanças: executa pagamentos e gere a tesouraria; não pede, não regista facturas de compra, não lê o arquivo. */
export const meFinancasF5: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000009",
  email: "financas5@teste.local",
  displayName: "Finanças Teste",
  roles: ["Finance"],
  permissions: [
    "approval.requests.read",
    "approval.requests.decide",
    "documents.write",
    "finance.invoices.read",
    "finance.invoices.cancel",
    "finance.payables.read",
    "finance.payments.execute",
    "finance.treasury.read",
    "finance.treasury.write",
    "finance.reports.read",
    "finance.expenses.read",
    "finance.expenses.write",
    "finance.expenses.approve",
    "procurement.suppliers.read",
  ],
};

/** Gestão: regista facturas de compra e pede pagamentos; não executa nem gere a tesouraria. */
export const meGestorF5: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000010",
  email: "gestor5@teste.local",
  displayName: "Gestor Teste",
  roles: ["Manager"],
  permissions: [
    "approval.requests.read",
    "approval.requests.decide",
    "documents.write",
    "finance.payables.read",
    "finance.payables.write",
    "finance.payments.request",
    "finance.expenses.read",
    "finance.expenses.approve",
    "procurement.suppliers.read",
  ],
};

/** Quem aprovou nos cenários (não é nem a Ana nem o Carlos). */
const APROVADOR = "00000000-0000-4000-8000-000000000052";

export const IDF5 = {
  fornecedor: "00000000-0000-4000-8000-000000000901",
  factura: "00000000-0000-4000-8000-000000000902",
  pedido: "00000000-0000-4000-8000-000000000903",
  aprovacao: "00000000-0000-4000-8000-000000000904",
  conta: "00000000-0000-4000-8000-000000000905",
  contaUsd: "00000000-0000-4000-8000-000000000906",
  documento: "00000000-0000-4000-8000-000000000907",
};

/** Quem pede é o Carlos (emp2); a conta das Finanças está ligada à Ana (emp1). */
export const painelAna = (): S["MyDashboardView"] => ({ employeeId: ID.emp1, displayName: "Ana Teste", unreadNotifications: 0, pendingApprovals: 0, announcements: [] });
export const painelCarlos = (): S["MyDashboardView"] => ({ employeeId: ID.emp2, displayName: "Carlos Teste", unreadNotifications: 0, pendingApprovals: 0, announcements: [] });

export const fornecedor = (): S["SupplierReference"] => ({
  supplierId: IDF5.fornecedor,
  name: "Kwanza Serviços, Lda",
  taxId: "5417000001",
  iban: "AO30004000001234567890123",
  status: "Active",
  email: "geral@kwanza.teste",
  phone: null,
  addressDetail: "Rua Rainha Ginga, 10",
  city: "Luanda",
  country: "AO",
  contactPerson: "Joana Mateus",
});

export const factura = (estado = "Normal"): S["PurchaseInvoiceView"] => ({
  purchaseInvoiceId: IDF5.factura,
  supplierInvoiceNumber: "FT 2026/123",
  supplierId: IDF5.fornecedor,
  purchaseOrderId: null,
  supplierName: "Kwanza Serviços, Lda",
  supplierTaxId: "5417000001",
  issuedOn: "2026-10-01",
  dueOn: "2026-10-31",
  currency: "AOA",
  netTotal: 1000000,
  taxTotal: 140000,
  grossTotal: 1140000,
  status: estado,
  description: "Manutenção de equipamentos — 10/2026",
  cancelledAt: null,
  cancellationReason: null,
});

export const pedidoPagamento = (estado = "Eligible", valor: number | string = 640000): S["PaymentRequestView"] => ({
  paymentRequestId: IDF5.pedido,
  purchaseInvoiceId: IDF5.factura,
  supplierInvoiceNumber: "FT 2026/123",
  payeeName: "Kwanza Serviços, Lda",
  payeeTaxId: "5417000001",
  amount: valor,
  currency: "AOA",
  status: estado,
  requestedByEmployeeId: ID.emp2,
  requestedOn: "2026-10-14",
  approvalRequestId: IDF5.aprovacao,
  executedFromAccountId: estado === "Executed" ? IDF5.conta : null,
  executedByEmployeeId: estado === "Executed" ? ID.emp1 : null,
  executedAt: estado === "Executed" ? "2026-10-15T10:00:00Z" : null,
  executedMethod: estado === "Executed" ? "TB" : null,
  executionReference: estado === "Executed" ? "TRF-1" : null,
  notes: "Primeira prestação",
  cancelledAt: null,
  cancellationReason: null,
});

export const aprovacaoPagamento = (estado = "Approved", decididoPor: string | null = APROVADOR): S["ApprovalStatusView"] => ({
  requestId: IDF5.aprovacao,
  processType: "finance.payment_request",
  sourceModule: "finance",
  sourceReference: IDF5.factura,
  status: estado,
  currentStep: 1,
  totalSteps: 1,
  pendingApprovers: [],
  decisions: decididoPor ? [{ decidedByEmployeeId: decididoPor, action: "Approved", decidedAt: "2026-10-14T12:00:00Z", step: 1, notes: null, decidedByName: "Rui Teste" }] : [],
  requestedByEmployeeId: ID.emp2,
  requestedByName: "Carlos Teste",
  summary: "Pagamento de 640 000,00 AOA a Kwanza Serviços, Lda, factura FT 2026/123",
  submittedAt: "2026-10-14T09:00:00Z",
});

export const contas = (): S["BankAccountView"][] => [
  { accountId: IDF5.conta, name: "Conta à ordem BAI", bank: "Banco de teste", iban: null, currency: "AOA", balance: 5000000, isActive: true },
  { accountId: IDF5.contaUsd, name: "Conta USD", bank: "Banco de teste", iban: null, currency: "USD", balance: 10000, isActive: true },
];

export const documento = (nome = "factura.pdf"): S["DocumentDescriptor"] => ({
  documentId: IDF5.documento,
  fileName: nome,
  contentType: "application/pdf",
  sizeInBytes: 1024,
  category: "Anexo de pedido de pagamento",
  contentHash: "abc",
  uploadedBy: null,
  uploadedAt: "2026-10-15T09:00:00Z",
});

// Despesas

export const IDF5D = {
  despesa: "00000000-0000-4000-8000-000000000911",
  minha: "00000000-0000-4000-8000-000000000912",
  comprovativo: "00000000-0000-4000-8000-000000000913",
};

export const despesa = (estado = "Submitted", colaborador = ID.emp2, nome = "Carlos Teste"): S["ExpenseClaimView"] => ({
  expenseId: IDF5D.despesa,
  employeeId: colaborador,
  employeeName: nome,
  spentOn: "2026-10-12",
  description: "Táxi para reunião no cliente",
  category: "Transporte",
  amount: 7500,
  currency: "AOA",
  projectId: null,
  billable: false,
  receiptDocumentId: IDF5D.comprovativo,
  status: estado,
  submittedAt: "2026-10-12T15:00:00Z",
  decidedAt: estado === "Submitted" ? null : "2026-10-13T09:00:00Z",
  decisionNotes: estado === "Rejected" ? "Sem comprovativo legível." : null,
  reimbursedOn: estado === "Reimbursed" ? "2026-10-14" : null,
  reimbursedFromAccountId: null,
  reimbursementReference: estado === "Reimbursed" ? "TRF-9" : null,
});

export const resumoDespesas = (): S["ExpenseSummary"][] => [{ currency: "AOA", submitted: 7500, approved: 996500, reimbursed: 3260500, rejected: 599500 }];

export const minhaDespesa = (estado = "Submitted"): S["OwnExpense"] => ({
  expenseId: IDF5D.minha,
  spentOn: "2026-10-07",
  description: "Almoço com cliente",
  category: "Refeições",
  amount: 12000,
  currency: "AOA",
  projectId: null,
  status: estado,
  submittedAt: "2026-10-07T13:00:00Z",
  decisionNotes: null,
  reimbursedOn: null,
});
