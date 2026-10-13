/** Fixtures da F3 — SÓ em tests/ (§8.2). Tipadas contra schema.d.ts. Dados de teste. */
import type { components } from "../../src/lib/api/schema";
import { meAdminF2 } from "./f2";

type S = components["schemas"];

const PERMS_F3 = [
  "commercial.customers.read",
  "commercial.customers.write",
  "finance.invoices.read",
  "finance.invoices.write",
  "finance.invoices.cancel",
  "finance.series.write",
  "finance.receipts.read",
  "finance.receipts.write",
  "finance.documents.deliver",
  "fiscal.rates.read",
];

export const meAdminF3: S["CurrentUserResponse"] = { ...meAdminF2, permissions: [...meAdminF2.permissions, ...PERMS_F3] };

/** Vendas: emite e envia, não anula nem regista recebimentos, não lê taxas. */
export const meVendas: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000006",
  email: "vendas@teste.local",
  displayName: "Vendas Teste",
  roles: ["Sales"],
  permissions: ["commercial.customers.read", "commercial.customers.write", "finance.invoices.read", "finance.invoices.write", "finance.receipts.read", "finance.documents.deliver"],
};

/** Finanças: anula, credita e recebe; não emite nem envia; não lê clientes. */
export const meFinancas: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000007",
  email: "financas@teste.local",
  displayName: "Finanças Teste",
  roles: ["Finance"],
  permissions: ["finance.invoices.read", "finance.invoices.cancel", "finance.receipts.read", "finance.receipts.write", "fiscal.rates.read"],
};

export const IDF3 = {
  cliente: "00000000-0000-4000-8000-000000000701",
  rascunho: "00000000-0000-4000-8000-000000000702",
  factura: "00000000-0000-4000-8000-000000000703",
  nota: "00000000-0000-4000-8000-000000000704",
  recibo: "00000000-0000-4000-8000-000000000705",
  proforma: "00000000-0000-4000-8000-000000000706",
  contacto: "00000000-0000-4000-8000-000000000707",
};

export const clientes = (): S["CustomerListItem"][] => [
  {
    customerId: IDF3.cliente,
    name: "Cliente Teste, Lda",
    taxId: "5000000001",
    status: "Active",
    city: "Luanda",
    country: "AO",
    userId: null,
    assignedToEmployeeId: null,
    email: "cliente@teste.local",
    phone: null,
    industry: null,
    website: null,
    contactPerson: null,
    accountType: "Customer",
  },
];

export const fichaCliente = (): S["CustomerDetailView"] => ({
  customerId: IDF3.cliente,
  name: "Cliente Teste, Lda",
  taxId: "5000000001",
  status: "Active",
  billingAddress: { detail: "Rua de Teste, 1", city: "Luanda", country: "AO" },
  assignedToEmployeeId: null,
  email: "cliente@teste.local",
  phone: null,
  industry: null,
  website: null,
  contactPerson: null,
  accountType: "Customer",
});

export const pautas = (): S["TaxRateScheduleView"][] => [
  {
    scheduleId: "00000000-0000-4000-8000-000000000711",
    kind: 0 as never,
    code: "NOR",
    description: "Taxa normal",
    requiresExemptionCode: false,
    versions: [{ versionId: "00000000-0000-4000-8000-000000000712", percentage: 14, effectiveFrom: "2019-10-01", effectiveTo: null, legalInstrument: "Lei de teste" }],
  },
  { scheduleId: "00000000-0000-4000-8000-000000000713", kind: 0 as never, code: "ISE", description: "Isento", requiresExemptionCode: true, versions: [] },
];

export const series = (): S["DocumentSeriesView"][] => [
  { seriesId: "00000000-0000-4000-8000-000000000721", type: "FT", code: "S001", nextSequence: 18, isActive: true },
  { seriesId: "00000000-0000-4000-8000-000000000722", type: "RG", code: "S001", nextSequence: 4, isActive: true },
];

const linha = { lineNumber: 1, description: "Consultoria", quantity: 2, unitPrice: 50000, taxCode: "NOR", taxPercentage: 14, netAmount: 100000, taxAmount: 14000 };

export const factura = (estado = "Normal"): S["SalesInvoiceView"] => ({
  invoiceId: IDF3.factura,
  number: "FT S001/17",
  issuedOn: "2026-10-01",
  taxPointDate: "2026-10-01",
  status: estado,
  customerId: IDF3.cliente,
  isFinalConsumer: false,
  customerName: "Cliente Teste, Lda",
  customerTaxId: "5000000001",
  customerAddressDetail: "Rua de Teste, 1",
  customerCity: "Luanda",
  customerCountry: "AO",
  currency: "AOA",
  netTotal: 100000,
  taxTotal: 14000,
  grossTotal: 114000,
  fiscalNotice: "Processado por programa de teste.",
  cancelledAt: null,
  cancellationReason: null,
  documentType: "FT",
  dueDate: "2026-10-31",
  paymentTerms: "30 dias",
  withholdingRate: null,
  withholdingAmount: 0,
  amountPayable: 114000,
  paymentMethod: null,
  referencedInvoiceId: null,
  referencedInvoiceNumber: null,
  lines: [linha],
});

export const resumoFactura = (): S["SalesInvoiceSummary"] => ({
  invoiceId: IDF3.factura,
  number: "FT S001/17",
  issuedOn: "2026-10-01",
  status: "Normal",
  customerName: "Cliente Teste, Lda",
  customerTaxId: "5000000001",
  currency: "AOA",
  grossTotal: 114000,
  documentType: "FT",
  dueDate: "2026-10-31",
  amountPayable: 114000,
});

export const saldo = (): S["InvoiceBalanceView"] => ({
  invoiceId: IDF3.factura,
  number: "FT S001/17",
  status: "Normal",
  currency: "AOA",
  invoiced: 114000,
  credited: 0,
  received: 14000,
  outstanding: 100000,
  settled: false,
});

export const proforma = (): S["ProformaView"] => ({
  proformaId: IDF3.proforma,
  number: "PF S001/3",
  issuedOn: "2026-10-05",
  validUntil: "2026-11-05",
  customerId: IDF3.cliente,
  customerName: "Cliente Teste, Lda",
  currency: "AOA",
  lines: [{ description: "Consultoria", quantity: 1, unitPrice: 50000, taxCode: "NOR", taxPercentage: 14, net: 50000, tax: 7000 }],
  netTotal: 50000,
  taxTotal: 7000,
  grossTotal: 57000,
  status: "Open",
  notes: null,
  convertedInvoiceId: null,
  convertedInvoiceNumber: null,
});

export const vencidas = (): S["OverdueReceivable"][] => [
  { invoiceId: IDF3.factura, number: "FT S001/9", customerId: IDF3.cliente, customerName: "Cliente Teste, Lda", issuedOn: "2026-07-01", dueDate: "2026-07-31", daysOverdue: 74, grossTotal: 57000, outstanding: 57000.5, currency: "AOA" },
];
