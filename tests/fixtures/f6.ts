/** Fixtures da F6 — SÓ em tests/ (§8.2). Tipadas contra schema.d.ts. Dados de teste. */
import type { components } from "../../src/lib/api/schema";
import { ID } from "./f1";
import { meAdminF5 } from "./f5";

type S = components["schemas"];

/** Permissões da F6 (Facto: `/identity/me` dos perfis de produção, 2026-10-16). */
const PERMS_F6 = [
  "fiscal.rates.read",
  "fiscal.rates.write",
  "fiscal.tax_entity.read",
  "fiscal.tax_entity.write",
  "finance.ledger.read",
  "finance.ledger.write",
  "finance.ledger.close",
  "finance.planning.read",
  "finance.planning.write",
  "finance.budgets.approve",
  "finance.reports.read",
  "hr.employees.read",
  "hr.departments.read",
];

export const meAdminF6: S["CurrentUserResponse"] = { ...meAdminF5, permissions: [...new Set([...meAdminF5.permissions, ...PERMS_F6])] };

/** Finanças: lança e lê relatórios, aprova orçamentos; não fecha períodos, não define regras, não cria orçamentos, não lê RH. */
export const meFinancasF6: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000011",
  email: "financas6@teste.local",
  displayName: "Finanças Teste",
  roles: ["Finance"],
  permissions: ["finance.reports.read", "finance.ledger.read", "finance.ledger.write", "finance.planning.read", "finance.budgets.approve", "fiscal.rates.read", "fiscal.rates.write"],
};

/** Gestor: só o planeamento (cria e revê orçamentos, não aprova), sem RH. */
export const meGestorF6: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000012",
  email: "gestor6@teste.local",
  displayName: "Gestor Teste",
  roles: ["Manager"],
  permissions: ["finance.planning.read", "finance.planning.write"],
};

/** Só consulta a fiscalidade. */
export const meLeitorFiscal: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000013",
  email: "leitor6@teste.local",
  displayName: "Leitor Teste",
  roles: ["Auditor"],
  permissions: ["fiscal.rates.read"],
};

export const IDF6 = {
  pautaIva: "00000000-0000-4000-8000-000000000951",
  versaoIva: "00000000-0000-4000-8000-000000000952",
  pautaInss: "00000000-0000-4000-8000-000000000953",
  versaoInss: "00000000-0000-4000-8000-000000000954",
  irt: "00000000-0000-4000-8000-000000000955",
  versaoIrt: "00000000-0000-4000-8000-000000000956",
  isencao: "00000000-0000-4000-8000-000000000957",
  versaoIsencao: "00000000-0000-4000-8000-000000000958",
  diario: "00000000-0000-4000-8000-000000000959",
  lancamento: "00000000-0000-4000-8000-000000000960",
  periodo: "00000000-0000-4000-8000-000000000961",
  centro: "00000000-0000-4000-8000-000000000962",
  orcamento: "00000000-0000-4000-8000-000000000963",
  previsao: "00000000-0000-4000-8000-000000000964",
  regra: "00000000-0000-4000-8000-000000000965",
  classe: "00000000-0000-4000-8000-000000000966",
  conta11: "00000000-0000-4000-8000-000000000967",
  conta111: "00000000-0000-4000-8000-000000000968",
  conta62: "00000000-0000-4000-8000-000000000969",
  conta621: "00000000-0000-4000-8000-000000000970",
};

export const pautas = (): S["TaxRateScheduleView"][] => [
  {
    scheduleId: IDF6.pautaIva,
    kind: 0,
    code: "NOR",
    description: "IVA - taxa normal",
    requiresExemptionCode: false,
    versions: [{ versionId: IDF6.versaoIva, percentage: 14, effectiveFrom: "2019-10-01", effectiveTo: null, legalInstrument: "Lei n.º 7/19 (Código do IVA)" }],
  },
  {
    scheduleId: IDF6.pautaInss,
    kind: 1,
    code: "INSS",
    description: "INSS - contribuição do trabalhador",
    requiresExemptionCode: false,
    versions: [{ versionId: IDF6.versaoInss, percentage: 3, effectiveFrom: "2020-01-01", effectiveTo: null, legalInstrument: "Decreto Presidencial n.º 227/18" }],
  },
];

export const tabelaIrt = (): S["IncomeTaxScheduleView"] => ({
  scheduleId: IDF6.irt,
  versions: [
    {
      versionId: IDF6.versaoIrt,
      effectiveFrom: "2020-01-01",
      effectiveTo: null,
      legalInstrument: "Lei n.º 14/25 (Tabela B)",
      brackets: [
        { lowerBound: 0, fixedPortion: 0, rate: 0 },
        { lowerBound: 150000, fixedPortion: 12500, rate: 16 },
        { lowerBound: 200000, fixedPortion: 31250, rate: 18 },
      ],
    },
  ],
});

export const isencaoAlimentacao = (): S["SubsidyExemptionScheduleView"] => ({
  scheduleId: IDF6.isencao,
  kind: 0,
  versions: [{ versionId: IDF6.versaoIsencao, amount: 30000, effectiveFrom: "2020-01-01", effectiveTo: null, legalInstrument: "Isento até 30.000 Kz/mês" }],
});

export const balancete = (): S["TrialBalanceView"] => ({
  fiscalYear: 2026,
  period: null,
  totalDebit: 1140000,
  totalCredit: 1140000,
  isBalanced: true,
  lines: [
    { accountCode: "111", accountName: "Caixa", openingDebit: 0, openingCredit: 0, periodDebit: 1140000, periodCredit: 0, closingDebit: 1140000, closingCredit: 0 },
    { accountCode: "621", accountName: "Vendas", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 1000000, closingDebit: 0, closingCredit: 1000000 },
    { accountCode: "3453", accountName: "IVA liquidado", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 140000, closingDebit: 0, closingCredit: 140000 },
  ],
});

export const balanco = (): S["BalanceSheet"] => ({
  fiscalYear: 2026,
  period: null,
  totalAssets: 1140000,
  totalLiabilities: 0,
  totalEquity: 1000000,
  resultForTheYear: 1000000,
  difference: 140000,
  assets: [{ section: "Meios monetários", class: "Asset", order: 1, total: 1140000, accounts: [{ accountCode: "111", accountName: "Caixa", amount: 1140000 }] }],
  liabilities: [],
  equity: [],
  unmapped: [{ accountCode: "3453", accountName: "IVA liquidado", amount: 140000 }],
});

export const resultados = (): S["IncomeStatement"] => ({
  fiscalYear: 2026,
  period: null,
  yearToDate: true,
  totalRevenue: 1000000,
  totalExpenses: 250000.5,
  netResult: 749999.5,
  revenue: [{ section: "Vendas", class: "Revenue", order: 1, total: 1000000, accounts: [{ accountCode: "621", accountName: "Vendas", amount: 1000000 }] }],
  expenses: [{ section: "Fornecimentos e serviços", class: "Expense", order: 1, total: 250000.5, accounts: [{ accountCode: "752", accountName: "Fornecimentos", amount: 250000.5 }] }],
  unmapped: [],
});

export const antiguidade = (nome = "Kuito Consultoria, Lda"): S["AgingReport"] => ({
  asOf: "2026-10-16",
  currency: "AOA",
  totals: { current: 15080718, days1To30: 0, days31To60: 0, days61To90: 0, over90: 19918194, total: 34998912 },
  parties: [{ partyId: "01a13658-203b-79f6-b031-f9cf2fbfa109", partyName: nome, buckets: { current: 15080718, days1To30: 0, days31To60: 0, days61To90: 0, over90: 19918194, total: 34998912 } }],
});

export const resumoIva = (): S["VatSummary"] => ({
  from: "2026-10-01",
  to: "2026-10-31",
  currency: "AOA",
  output: [{ taxCode: "NOR", taxPercentage: 14, taxableBase: 2780264600, tax: 389237044, documents: 1124 }],
  outputTax: 389237044,
  creditNotes: [{ taxCode: "NOR", taxPercentage: 14, taxableBase: 7619550, tax: 1066737, documents: 17 }],
  creditNoteTax: 1066737,
  inputTax: 203236553.8,
  purchaseInvoices: 222,
  netPosition: 184933753.2,
  note: "Soma do IVA dos documentos registados no período, pela data do facto gerador. Não aplica regras fiscais novas nem substitui a declaração oficial.",
});

export const resumoRetencoes = (): S["WithholdingSummary"] => ({
  from: "2026-10-01",
  to: "2026-10-31",
  currency: "AOA",
  lines: [{ customerId: "00000000-0000-4000-8000-000000000971", customerName: "Cliente Retentor, SA", customerTaxId: "5000000009", invoices: 2, taxableBase: 100000, withheld: 6500 }],
  totalWithheld: 6500,
});

export const diarios = (): S["JournalView"][] => [{ journalId: IDF6.diario, code: "OD", name: "Operações diversas", isActive: true }];

export const contasRazao = (): S["LedgerAccountView"][] => [
  { accountId: IDF6.conta11, code: "11", name: "Caixa (classe)", category: "GA", parentCode: "1", acceptsPostings: false, isAnalytic: false, isActive: true },
  { accountId: IDF6.conta111, code: "111", name: "Caixa", category: "GM", parentCode: "11", acceptsPostings: true, isAnalytic: false, isActive: true },
  { accountId: IDF6.conta62, code: "62", name: "Vendas (classe)", category: "GA", parentCode: "6", acceptsPostings: false, isAnalytic: false, isActive: true },
  { accountId: IDF6.conta621, code: "621", name: "Vendas", category: "GM", parentCode: "62", acceptsPostings: true, isAnalytic: false, isActive: true },
];

export const lancamento = (estornado = false): S["JournalEntryView"] => ({
  entryId: IDF6.lancamento,
  transactionId: "2026-10-10 OD 0001",
  journalCode: "OD",
  archivalNumber: "0001",
  transactionDate: "2026-10-10",
  period: 10,
  description: "Venda a dinheiro",
  type: "N",
  sourceId: "manual",
  postedAt: "2026-10-10T09:00:00Z",
  totalDebit: 1140000,
  totalCredit: 1140000,
  isVoided: estornado,
  voidedAt: estornado ? "2026-10-11T09:00:00Z" : null,
  voidReason: estornado ? "Lançado em duplicado" : null,
  lines: [
    { recordNumber: 1, accountCode: "111", side: "Debit", amount: 1140000, description: "Recebido", costCentreId: IDF6.centro, sourceDocumentId: null },
    { recordNumber: 2, accountCode: "621", side: "Credit", amount: 1140000, description: "Venda", costCentreId: null, sourceDocumentId: null },
  ],
});

export const periodos = (): S["AccountingPeriodView"][] => [
  { periodId: IDF6.periodo, fiscalYear: 2026, number: 10, status: "Open", isAdjustmentPeriod: false, closedAt: null, closedByEmployeeId: null, reopenedAt: null, reopenReason: null },
  { periodId: "00000000-0000-4000-8000-000000000972", fiscalYear: 2026, number: 9, status: "Closed", isAdjustmentPeriod: false, closedAt: "2026-10-05T10:00:00Z", closedByEmployeeId: ID.emp1, reopenedAt: null, reopenReason: null },
];

export const regrasLancamento = (): S["PostingRuleView"][] => [
  {
    ruleId: IDF6.regra,
    event: "SalesInvoiceIssued",
    journalCode: "OD",
    description: "Venda a crédito",
    isActive: true,
    lines: [
      { lineNumber: 1, accountCode: "311", side: "Debit", amount: "Gross", description: "Cliente" },
      { lineNumber: 2, accountCode: "621", side: "Credit", amount: "Net", description: "Vendas" },
      { lineNumber: 3, accountCode: "3453", side: "Credit", amount: "Tax", description: "IVA liquidado" },
    ],
  },
];

export const versoesPlano = (): S["ChartOfAccountsVersionView"][] => [
  { chartVersionId: "00000000-0000-0000-0000-000000000000", jurisdiction: "AO", name: "Sem versão atribuída", version: "0", source: "Placeholder de migração", effectiveFrom: "2026-01-01", effectiveTo: null, isActive: true, accountCount: 0 },
];

export const classesReporte = (): S["ReportingRuleView"][] => [{ ruleId: IDF6.classe, codePrefix: "11", class: "Asset", section: "Meios monetários", order: 1 }];

export const centros = (): S["CostCentreView"][] => [{ costCentreId: IDF6.centro, code: "CC01", name: "Direcção Geral", departmentId: ID.dep1, responsibleEmployeeId: ID.emp1, isActive: true }];

export const orcamento = (estado = "Draft"): S["BudgetView"] => ({
  budgetId: IDF6.orcamento,
  costCentreId: IDF6.centro,
  fiscalYear: 2026,
  currency: "AOA",
  status: estado,
  annualTotal: 3000000.5,
  approvedAt: estado === "Approved" ? "2026-10-13T17:39:20Z" : null,
  approvedByEmployeeId: estado === "Approved" ? ID.emp1 : null,
  lines: [
    { month: 1, amount: 1000000.5 },
    { month: 2, amount: 2000000 },
  ],
});

export const previsoes = (): S["CostForecastView"][] => [
  { forecastId: IDF6.previsao, departmentId: ID.dep1, fiscalYear: 2026, month: 1, currency: "AOA", operationalCosts: 6026000, fixedCosts: 3270000, total: 9296000, status: "Submitted", submittedAt: "2026-10-13T17:39:14Z" },
];
