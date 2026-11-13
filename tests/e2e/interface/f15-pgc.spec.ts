/**
 * Contabilidade pelo PGC (backend #125 e #126), com a API simulada: carregar
 * o plano, Balanço e DR nos modelos do decreto (unidade no URL, avisos e
 * contas fora do plano), apuramento do IVA do mês, apuramento e abertura do
 * exercício, e lançar o histórico (simular primeiro, mês a mês no ano).
 * Só o Admin (`finance.ledger.close`) carrega o PGC, fecha o exercício e
 * lança o histórico; o Finance apura o IVA e lê as demonstrações.
 */
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { painelAna } from "../../fixtures/f5";
import { contasRazao, meAdminF6, meFinancasF6, periodos, resumoIva, versoesPlano, classesReporte } from "../../fixtures/f6";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const problema = (status: number, corpo: Record<string, unknown>) => ({ status, corpo: { status, ...corpo }, cabecalhos: { "Content-Type": "application/problem+json" } });
const ENTRADA = "00000000-0000-4000-8000-000000000f01";

const balancoPgc = (unidade = 1000): S["StatutoryStatementView"] => ({
  statement: "BalanceSheet",
  title: "Balanço",
  entityName: "Empresa <b>Teste</b>, Lda",
  entityTaxId: "5000000000",
  fiscalYear: 2026,
  uptoPeriod: null,
  reportingDate: "2026-12-31",
  currency: "AOA",
  unit: unidade,
  unitLabel: unidade === 1000 ? "milhares de kwanzas" : unidade === 1000000 ? "milhões de kwanzas" : "kwanzas",
  lines: [
    { key: "activo", label: "ACTIVO", note: null, kind: "Heading", level: 1, current: null, previous: null },
    { key: "imob", label: "Imobilizações corpóreas", note: "4", kind: "Item", level: 2, current: unidade === 1 ? 12500000.5 : 12501, previous: 9800 },
    { key: "caixa", label: "Disponibilidades", note: "12", kind: "Item", level: 2, current: 3200, previous: 0 },
    { key: "total-activo", label: "Total do activo", note: null, kind: "Total", level: 1, current: 15701, previous: 9800 },
  ],
  outsideThePlan: [{ accountCode: "99", accountName: "Conta antiga <i>sem PGC</i>", amount: 150.25 }],
  notes: ["O perfil fiscal não tem a morada da sede."],
});

const drPgc = (): S["StatutoryStatementView"] => ({
  ...balancoPgc(),
  statement: "IncomeStatement",
  title: "Demonstração de resultados (por natureza)",
  uptoPeriod: 9,
  reportingDate: "2026-09-30",
  lines: [
    { key: "vendas", label: "Vendas", note: "22", kind: "Item", level: 1, current: 5400, previous: 4100 },
    { key: "pessoal", label: "Custos com o pessoal", note: "29", kind: "Item", level: 1, current: -2100, previous: -1900 },
    { key: "rl", label: "Resultado líquido do exercício", note: null, kind: "Total", level: 1, current: 3300, previous: 2200 },
  ],
  outsideThePlan: [],
  notes: [],
});

const semIndicacao = (ano: number) => ({ fiscalYear: ano, indicated: false, amount: null, records: [] });

function comPgc(api: ApiSimulada, me = meAdminF6): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/dashboard/me", { status: 200, corpo: painelAna() })
    .em("GET", "/finance/ledger/accounts", pag(contasRazao()))
    .em("GET", "/finance/ledger/chart-versions", { status: 200, corpo: versoesPlano() })
    .em("GET", "/finance/ledger/reporting-rules", { status: 200, corpo: classesReporte() })
    .em("GET", "/finance/ledger/periods", { status: 200, corpo: periodos() })
    .em("GET", "/finance/tax-summaries/vat", { status: 200, corpo: resumoIva() })
    .em("GET", "/finance/ledger/fiscal-years/2025/income-tax-estimate", { status: 200, corpo: semIndicacao(2025) })
    .em("GET", "/finance/ledger/fiscal-years/2026/income-tax-estimate", { status: 200, corpo: semIndicacao(2026) })
    .em("GET", "/finance/ledger/fiscal-years/2025/vat-pro-rata", { status: 200, corpo: semIndicacao(2025) })
    .em("GET", "/finance/ledger/fiscal-years/2026/vat-pro-rata", { status: 200, corpo: semIndicacao(2026) })
    .em("GET", "/finance/reports/statutory/balance-sheet", (route) => ({ status: 200, corpo: balancoPgc(Number(new URL(route.request().url()).searchParams.get("unit") ?? 1000)) }))
    .em("GET", "/finance/reports/statutory/income-statement", { status: 200, corpo: drPgc() });
}

test.describe("PGC", () => {
  test("plano de contas: o Admin carrega o PGC e vê o que se criou; o Finance não tem o botão", async ({ page, api, browser, violacoes }) => {
    await comPgc(api)
      .em("POST", "/finance/ledger/pgc", {
        status: 200,
        corpo: { chartVersionId: "00000000-0000-4000-8000-000000000f02", accountsCreated: 752, accountsKept: 3, accountsAdopted: 1, journalsCreated: 6, postingRulesCreated: 7, postingRulesKept: 0, postingRulesUpdated: 0, reportingRulesCreated: 40, notes: ["A conta <b>11</b> já existia e foi adoptada."] } satisfies S["PgcLoadResult"],
      })
      .ligar();
    await entrar(page);
    await page.goto("/plano-contas");
    await page.getByRole("button", { name: "Carregar o PGC" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByText("Não apaga nem altera o que já existe", { exact: false })).toBeVisible();
    await d.getByRole("button", { name: "Carregar", exact: true }).click();
    await expect(d.getByText("PGC carregado.")).toBeVisible();
    await expect(d.getByText("752")).toBeVisible();
    await expect(d.getByText("A conta <b>11</b> já existia e foi adoptada.")).toBeVisible();
    await semViolacoesAxe(page);
    expect(api.escritas("POST", "/finance/ledger/pgc")).toHaveLength(1);
    await d.getByRole("button", { name: "Fechar", exact: true }).first().click();
    await expect(d).toHaveCount(0);
    expect(await violacoes()).toEqual([]);

    const contexto = await browser.newContext({ baseURL: "http://localhost:4173" });
    const outra = await contexto.newPage();
    const { ApiSimulada } = await import("../apoio");
    await comPgc(new ApiSimulada(outra), meFinancasF6).ligar();
    await entrar(outra, meFinancasF6.email);
    await outra.goto("/plano-contas");
    await expect(outra.getByRole("heading", { name: "Plano de contas", level: 1 })).toBeVisible();
    await expect(outra.getByRole("button", { name: "Carregar o PGC" })).toHaveCount(0);
    await contexto.close();
  });

  test("relatórios: Balanço e DR no modelo do PGC, com notas, comparativo, unidade no URL, avisos e contas fora do plano; axe e responsivo", async ({ page, api, violacoes }) => {
    await comPgc(api, meFinancasF6).ligar();
    await entrar(page, meFinancasF6.email);
    await page.goto("/relatorios?vista=balanco-pgc&ano=2026");
    await expect(page.getByText("Empresa <b>Teste</b>, Lda")).toBeVisible();
    await expect(page.getByText("Balanço em 31/12/2026")).toBeVisible();
    await expect(page.getByText("Valores expressos em milhares de kwanzas")).toBeVisible();
    const tabela = page.getByRole("table", { name: "Balanço do ano de 2026" });
    await expect(tabela.getByRole("columnheader", { name: "2025" })).toBeVisible();
    const linha = tabela.getByRole("row").filter({ hasText: "Imobilizações corpóreas" });
    await expect(linha).toContainText("4");
    await expect(linha).toContainText("12 501");
    await expect(linha).toContainText("9 800");
    await expect(page.getByText("O perfil fiscal não tem a morada da sede.")).toBeVisible();
    await expect(page.getByText("1 conta movimentada está fora do PGC", { exact: false })).toBeVisible();
    await expect(page.getByText("Conta antiga <i>sem PGC</i>", { exact: false })).toBeVisible();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.getByLabel("Unidade").selectOption({ label: "Kwanzas (para conferir)" });
    await expect(page).toHaveURL(/unidade=1(&|$)/);
    await expect(tabela.getByRole("row").filter({ hasText: "Imobilizações corpóreas" })).toContainText("12 500 000,50");
    expect(api.pedidos.some((p) => p.caminho === "/finance/reports/statutory/balance-sheet" && new URLSearchParams(p.query).get("unit") === "1" && new URLSearchParams(p.query).get("fiscalYear") === "2026")).toBe(true);

    await page.goto("/relatorios?vista=resultados-pgc&ano=2026&periodo=9");
    await expect(page.getByText("Demonstração de resultados (por natureza), até Setembro de 2026")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Custos com o pessoal" })).toContainText("−2 100");
    expect(api.pedidos.some((p) => p.caminho === "/finance/reports/statutory/income-statement" && new URLSearchParams(p.query).get("uptoPeriod") === "9" && new URLSearchParams(p.query).get("unit") === "1000")).toBe(true);
    expect(await violacoes()).toEqual([]);
  });

  test("impostos: o Finance apura o IVA do mês no razão, com ou sem o crédito anterior; sem mês, pede o mês", async ({ page, api, violacoes }) => {
    await comPgc(api, meFinancasF6)
      .em("POST", "/finance/ledger/vat-settlements", {
        status: 200,
        corpo: { outcome: "Settled", fiscalYear: 2026, month: 9, entryId: ENTRADA, transactionId: "APU 2026/9", outputTax: 140000, deductibleTax: 35000.5, adjustments: 0, creditBroughtForward: 0, payable: 104999.5, recoverable: 0, notes: ["Sem notas de crédito no mês."] } satisfies S["VatSettlementView"],
      })
      .ligar();
    await entrar(page, meFinancasF6.email);
    await page.goto("/impostos?ano=2026");
    await expect(page.getByText("Escolha um mês para apurar o IVA no razão.")).toBeVisible();
    await page.goto("/impostos?ano=2026&periodo=9");
    await page.getByRole("button", { name: "Apurar o IVA de Setembro" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Incluir o crédito de IVA dos meses anteriores").uncheck();
    await d.getByRole("button", { name: "Apurar", exact: true }).click();
    await expect(d.getByText("IVA apurado.")).toBeVisible();
    await expect(d.getByRole("link", { name: "Ver o lançamento APU 2026/9" })).toHaveAttribute("href", `/lancamentos/${ENTRADA}`);
    await expect(d.getByText("104 999,50 Kz")).toBeVisible();
    await expect(d.getByText("Sem notas de crédito no mês.")).toBeVisible();
    await semViolacoesAxe(page);
    expect(api.escritas("POST", "/finance/ledger/vat-settlements")[0]?.corpo).toEqual({ fiscalYear: 2026, month: 9, carryForwardCredit: false });
    expect(await violacoes()).toEqual([]);
  });

  test("períodos: o Admin apura e abre o exercício (409 com a razão); o Finance não vê o fecho", async ({ page, api, browser, violacoes }) => {
    await comPgc(api)
      .em("POST", "/finance/ledger/fiscal-years/2026/closing", {
        status: 200,
        corpo: {
          fiscalYear: 2026,
          outcome: "Done",
          message: null,
          netResult: -1250000.75,
          entries: [{ entryId: ENTRADA, transactionId: "APU 2026/1", description: "Apuramento de resultados", lines: 14, total: 9800000 }],
          notes: ["Falta a estimativa do imposto industrial de 2026: indique-a e volte a apurar."],
        } satisfies S["FiscalYearView"],
      })
      .em("POST", "/finance/ledger/fiscal-years/2026/opening", problema(409, { title: "Conflict", detail: "O exercício de 2025 ainda não foi apurado." }))
      .ligar();
    await entrar(page);
    await page.goto("/periodos?ano=2026");
    await page.getByRole("button", { name: "Apurar os resultados de 2026" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Apurar resultados" }).click();
    await expect(d.getByText("Feito.")).toBeVisible();
    await expect(d.getByText("−1 250 000,75 Kz")).toBeVisible();
    await expect(d.getByRole("link", { name: "APU 2026/1" })).toHaveAttribute("href", `/lancamentos/${ENTRADA}`);
    // Avisa sem recusar (ADR-118), e leva ao cartão que falta.
    await expect(d.getByText("Falta a estimativa do imposto industrial de 2026: indique-a e volte a apurar.")).toBeVisible();
    await expect(d.getByRole("button", { name: "Ir para a actualização cambial (Dezembro)" })).toHaveCount(0);
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Ir para o imposto industrial" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Imposto industrial de 2026" })).toBeInViewport();

    await page.getByRole("button", { name: "Abrir 2026 com os saldos de 2025" }).click();
    await d.getByRole("button", { name: "Abrir exercício" }).click();
    await expect(d.getByText("O exercício de 2025 ainda não foi apurado.")).toBeVisible();
    expect(api.escritas("POST", "/finance/ledger/fiscal-years/2026/opening")).toHaveLength(1);
    expect(await violacoes()).toEqual([]);

    const contexto = await browser.newContext({ baseURL: "http://localhost:4173" });
    const outra = await contexto.newPage();
    const { ApiSimulada } = await import("../apoio");
    await comPgc(new ApiSimulada(outra), meFinancasF6).ligar();
    await entrar(outra, meFinancasF6.email);
    await outra.goto("/periodos?ano=2026");
    await expect(outra.getByRole("cell", { name: "10 · Outubro", exact: true })).toBeVisible();
    await expect(outra.getByText("Fecho do exercício de 2026")).toHaveCount(0);
    await expect(outra.getByText("Lançar o histórico")).toHaveCount(0);
    await contexto.close();
  });

  test("lançar o histórico: simular antes, confirmar depois; problemas em lista; o ano inteiro mês a mês", async ({ page, api, violacoes }) => {
    const resposta = (de: string, ate: string, simular: boolean): S["DocumentHistoryView"] => ({
      from: de,
      to: ate,
      dryRun: simular,
      posted: 3,
      alreadyPosted: 2,
      cancelled: 1,
      withoutRule: 0,
      postedByKind: { SalesInvoice: 2, Receipt: 1 },
      problems: de === "2026-09-01" ? [{ document: "FT <b>A</b>/7", date: "2026-09-12", error: "Sem câmbio USD do dia nem anterior." }] : [],
    });
    await comPgc(api)
      .em("POST", "/finance/ledger/document-postings", (route) => {
        const b = route.request().postDataJSON() as { from: string; to: string; dryRun: boolean };
        return { status: 200, corpo: resposta(b.from, b.to, b.dryRun) };
      })
      .ligar();
    await entrar(page);
    await page.goto("/periodos?ano=2026");
    const cartao = page.getByRole("heading", { name: "Lançar o histórico" }).locator("..");
    await cartao.getByLabel("Mês", { exact: true }).fill("2026-09");
    await expect(cartao.getByRole("button", { name: "Lançar Setembro de 2026" })).toBeDisabled();
    await cartao.getByRole("button", { name: "Simular Setembro de 2026" }).click();
    const simulacao = page.getByRole("region", { name: "Resultado da simulação" });
    await expect(simulacao.getByText("Simulação de Setembro de 2026: nada foi gravado.")).toBeVisible();
    await expect(simulacao.getByText("Por tipo: Facturas 2 · Recibos 1")).toBeVisible();
    await expect(simulacao.getByRole("cell", { name: "FT <b>A</b>/7" })).toBeVisible();
    await expect(simulacao.getByText("Sem câmbio USD do dia nem anterior.")).toBeVisible();
    await semViolacoesAxe(page);
    expect(api.escritas("POST", "/finance/ledger/document-postings")[0]?.corpo).toEqual({ from: "2026-09-01", to: "2026-09-30", dryRun: true });

    await cartao.getByRole("button", { name: "Lançar Setembro de 2026" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Lançar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Resultado do lançamento" }).getByText("Histórico de Setembro de 2026 lançado.")).toBeVisible();
    expect(api.escritas("POST", "/finance/ledger/document-postings")[1]?.corpo).toEqual({ from: "2026-09-01", to: "2026-09-30", dryRun: false });

    // Mudar a escolha obriga a simular de novo.
    await page.goto("/periodos?ano=2025");
    const cartao25 = page.getByRole("heading", { name: "Lançar o histórico" }).locator("..");
    await cartao25.getByLabel("O ano de 2025 inteiro, mês a mês").check();
    await expect(cartao25.getByRole("button", { name: "Lançar o ano de 2025" })).toBeDisabled();
    await cartao25.getByRole("button", { name: "Simular o ano de 2025" }).click();
    await expect(page.getByRole("region", { name: "Resultado da simulação" }).getByText("36", { exact: true })).toBeVisible();
    const pedidos = api.escritas("POST", "/finance/ledger/document-postings").slice(2);
    expect(pedidos).toHaveLength(12);
    expect(pedidos[11]?.corpo).toEqual({ from: "2025-12-01", to: "2025-12-31", dryRun: true });
    expect(await violacoes()).toEqual([]);
  });

  test("actualização cambial: Dezembro por omissão, simular antes de lançar, contas, facturas em aberto, ganho ou perda e avisos; axe", async ({ page, api, violacoes }) => {
    const ACD = "00000000-0000-4000-8000-000000000f43";
    const EST = "00000000-0000-4000-8000-000000000f44";
    const FACTURA_USD = "00000000-0000-4000-8000-000000000f45";
    const COMPRA_USD = "00000000-0000-4000-8000-000000000f46";
    const DESPESA_USD = "00000000-0000-4000-8000-000000000f47";
    const resposta = (simular: boolean): S["ExchangeRevaluationView"] => ({
      outcome: simular ? "Preview" : "Revalued",
      fiscalYear: 2025,
      month: 12,
      on: "2025-12-31",
      entryId: simular ? null : ENTRADA,
      transactionId: simular ? null : "ACT-2025-12",
      ledgerBalance: 9500000,
      revaluedBalance: 9312000.4,
      difference: -187999.6,
      accounts: [{ accountId: "00000000-0000-4000-8000-000000000f41", name: "Conta <b>USD</b> BIC", currency: "USD", balance: 10000, rate: 931.2000400, rateOn: "2025-12-27", kwanzas: 9312000.4 }],
      notes: ["O câmbio é de 27/12/2025, anterior ao fim do mês."],
      documents: [
        { kind: "Receivable", documentId: FACTURA_USD, number: "FT S001/9", party: "Cliente <i>USD</i>", currency: "USD", open: 1000, rate: 931.20004, rateOn: "2025-12-27", accountCode: "31.1.2.2", registered: 912000, revalued: 931200.04, difference: 19200.04 },
        { kind: "Payable", documentId: COMPRA_USD, number: "INV-77", party: "Fornecedor ZA", currency: "USD", open: 500, rate: 931.20004, rateOn: "2025-12-27", accountCode: "32.1.2.2", registered: 470000, revalued: 465600.02, difference: 4399.98 },
        { kind: "EmployeeExpense", documentId: DESPESA_USD, number: "Hotel em Joanesburgo", party: "Ana Teste", currency: "USD", open: 300, rate: 931.20004, rateOn: "2025-12-27", accountCode: "36.9", registered: 276000, revalued: 279360.01, difference: -3360.01 },
      ],
      debtsDifference: 23600.02,
      debtsEntryId: simular ? null : ACD,
      debtsReversalEntryId: simular ? null : EST,
    });
    await comPgc(api)
      .em("POST", "/finance/ledger/exchange-revaluations", (route) => ({ status: 200, corpo: resposta((route.request().postDataJSON() as { dryRun: boolean }).dryRun) }))
      .ligar();
    await entrar(page);
    await page.goto("/periodos?ano=2025");
    const cartao = page.getByRole("heading", { name: "Actualização cambial" }).locator("..");
    await expect(cartao.getByLabel("Mês")).toHaveValue("12");
    await expect(cartao.getByRole("button", { name: "Lançar Dezembro de 2025" })).toBeDisabled();
    await cartao.getByRole("button", { name: "Simular Dezembro de 2025" }).click();
    const r = page.getByRole("region", { name: "Resultado da actualização cambial" });
    await expect(r.getByText("Simulação a 31/12/2025: nada foi gravado.")).toBeVisible();
    await expect(r.getByText("Perda nos depósitos (76.2.2)")).toBeVisible();
    await expect(r.getByText("187\u00a0999,60 Kz")).toBeVisible();
    await expect(r.getByText("Ganho nos clientes, fornecedores e despesas (66.2.2)")).toBeVisible();
    await expect(r.getByText("23\u00a0600,02 Kz")).toBeVisible();
    await expect(r.getByRole("cell", { name: "Conta <b>USD</b> BIC" })).toBeVisible();
    const facturas = r.getByRole("table", { name: "Documentos em moeda estrangeira em aberto" });
    await expect(facturas.getByRole("link", { name: "FT S001/9" })).toHaveAttribute("href", `/facturas/${FACTURA_USD}`);
    await expect(facturas.getByRole("link", { name: "INV-77" })).toHaveAttribute("href", `/facturas-compra/${COMPRA_USD}`);
    // A despesa por reembolsar (36.9) também se actualiza (ADR-115): não é uma venda.
    await expect(facturas.getByRole("link", { name: "Hotel em Joanesburgo" })).toHaveAttribute("href", `/despesas/${DESPESA_USD}`);
    await expect(facturas.getByRole("row").filter({ hasText: "Hotel em Joanesburgo" })).toContainText("Despesa de colaborador");
    await expect(facturas.getByRole("row").filter({ hasText: "Hotel em Joanesburgo" })).not.toContainText("Venda");
    await expect(facturas.getByRole("cell", { name: "Cliente <i>USD</i>" })).toBeVisible();
    await expect(facturas.getByText("19\u00a0200,04 Kz")).toBeVisible();
    await expect(r.getByText("O câmbio é de 27/12/2025, anterior ao fim do mês.")).toBeVisible();
    await semViolacoesAxe(page);
    await cartao.getByRole("button", { name: "Lançar Dezembro de 2025" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Lançar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(r.getByRole("link", { name: "Ver o lançamento dos depósitos ACT-2025-12" })).toHaveAttribute("href", `/lancamentos/${ENTRADA}`);
    await expect(r.getByRole("link", { name: "Ver o lançamento dos clientes, fornecedores e despesas" })).toHaveAttribute("href", `/lancamentos/${ACD}`);
    await expect(r.getByRole("link", { name: "Ver o estorno no dia 1 do mês seguinte" })).toHaveAttribute("href", `/lancamentos/${EST}`);
    expect(api.escritas("POST", "/finance/ledger/exchange-revaluations").map((p) => p.corpo)).toEqual([
      { fiscalYear: 2025, month: 12, dryRun: true },
      { fiscalYear: 2025, month: 12, dryRun: false },
    ]);
    // Mudar o mês obriga a simular de novo.
    await cartao.getByLabel("Mês").selectOption("11");
    await expect(cartao.getByRole("button", { name: "Lançar Novembro de 2025" })).toBeDisabled();
    expect(await violacoes()).toEqual([]);
  });

  test("imposto industrial (ADR-118): indicar uma vez; corrigir com o novo total e o motivo; registos com o lançamento", async ({ page, api, violacoes }) => {
    const IMP = "00000000-0000-4000-8000-000000000f51";
    let estimativa: S["IncomeTaxEstimateView"] = { fiscalYear: 2025, indicated: false, amount: null, records: [] };
    const registo = (kind: string, amount: number, difference: number, n: number, notes: string | null): S["IncomeTaxEstimateRecordView"] => ({
      recordId: `00000000-0000-4000-8000-00000000f5${String(n)}0`,
      kind,
      amount,
      difference,
      entryId: IMP,
      archivalNumber: n === 1 ? "IMP-2025" : `IMP-2025-${String(n)}`,
      entryVoided: false,
      notes,
      recordedBy: null,
      recordedAt: "2026-01-20T10:00:00Z",
    });
    await comPgc(api)
      .em("GET", "/finance/ledger/fiscal-years/2025/income-tax-estimate", () => ({ status: 200, corpo: estimativa }))
      .em("POST", "/finance/ledger/fiscal-years/2025/income-tax-estimate", () => {
        estimativa = { fiscalYear: 2025, indicated: true, amount: 1200000, records: [registo("Initial", 1200000, 1200000, 1, "Estimativa do contabilista")] };
        return { status: 201, corpo: { estimate: estimativa, notes: [] } };
      })
      .em("POST", "/finance/ledger/fiscal-years/2025/income-tax-estimate/adjustments", () => {
        estimativa = { ...estimativa, amount: 1000000, records: [...estimativa.records, registo("Adjustment", 1000000, -200000, 2, "Prejuízo fiscal reportado")] };
        return { status: 201, corpo: { estimate: estimativa, notes: ["O exercício de 2025 já está apurado: volte a apurar para a 87.1 bater."] } };
      })
      .ligar();
    await entrar(page);
    await page.goto("/periodos?ano=2025");
    const cartao = page.locator("#imposto-industrial");
    await expect(cartao.getByText("Falta a estimativa do imposto industrial de 2025.")).toBeVisible();
    await cartao.getByRole("button", { name: "Indicar estimativa" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Indicar", exact: true }).click();
    await expect(d.getByText("Indique um valor de zero para cima, até 2 casas.")).toBeVisible();
    // «Sem imposto» põe zero e trava o valor.
    await d.getByLabel("Sem imposto (zero)").check();
    await expect(d.getByLabel("Imposto estimado (Kz)")).toBeDisabled();
    await d.getByLabel("Sem imposto (zero)").uncheck();
    await d.getByLabel("Imposto estimado (Kz)").fill("1 200 000");
    await d.getByLabel("Nota (opcional)").fill("Estimativa do contabilista");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Indicar", exact: true }).click();
    await expect(d.getByText("Estimativa de 2025: 1\u00a0200\u00a0000,00 Kz.")).toBeVisible();
    await d.getByRole("button", { name: "Fechar", exact: true }).first().click();
    await expect(cartao.getByText("Estimativa em vigor")).toBeVisible();
    await expect(cartao.getByRole("link", { name: "IMP-2025" })).toHaveAttribute("href", `/lancamentos/${IMP}`);

    await cartao.getByRole("button", { name: "Corrigir" }).click();
    await d.getByLabel("Novo total (Kz)").fill("1 200 000");
    await d.getByRole("button", { name: "Corrigir", exact: true }).click();
    await expect(d.getByText("O novo valor tem de ser diferente do que está em vigor.")).toBeVisible();
    await expect(d.getByText("Diga porque corrige.")).toBeVisible();
    await d.getByLabel("Novo total (Kz)").fill("1 000 000");
    await d.getByLabel("Motivo").fill("Prejuízo fiscal reportado");
    await d.getByRole("button", { name: "Corrigir", exact: true }).click();
    await expect(d.getByText("O exercício de 2025 já está apurado: volte a apurar para a 87.1 bater.")).toBeVisible();
    await d.getByRole("button", { name: "Fechar", exact: true }).first().click();
    await expect(cartao.getByRole("row").filter({ hasText: "Correcção" })).toContainText("−200\u00a0000,00 Kz");
    await expect(cartao.getByRole("row").filter({ hasText: "Correcção" })).toContainText("Prejuízo fiscal reportado");
    expect(api.escritas("POST", "/finance/ledger/fiscal-years/2025/income-tax-estimate").map((p) => p.corpo)).toEqual([{ amount: "1200000.00", notes: "Estimativa do contabilista" }]);
    expect(api.escritas("POST", "/finance/ledger/fiscal-years/2025/income-tax-estimate/adjustments").map((p) => p.corpo)).toEqual([{ amount: "1000000.00", reason: "Prejuízo fiscal reportado" }]);
    expect(await violacoes()).toEqual([]);
  });

  test("pró-rata do IVA (ADR-124): a favor da empresa vai com sinal menos; corrigir com partes no imobilizado e o motivo", async ({ page, api }) => {
    let prorata: S["VatProRataView"] = { fiscalYear: 2025, indicated: false, amount: null, records: [] };
    const registo = (amount: number, n: number): S["VatProRataRecordView"] => ({
      recordId: `00000000-0000-4000-8000-00000000f6${String(n)}0`,
      kind: n === 1 ? "Initial" : "Adjustment",
      amount,
      difference: amount,
      fixedAssets: [],
      costAccountCode: "63.5",
      entryId: ENTRADA,
      archivalNumber: "PRT-2025",
      entryVoided: false,
      notes: null,
      recordedBy: null,
      recordedAt: "2026-01-20T10:00:00Z",
    });
    await comPgc(api)
      .em("GET", "/finance/ledger/fiscal-years/2025/vat-pro-rata", () => ({ status: 200, corpo: prorata }))
      .em("POST", "/finance/ledger/fiscal-years/2025/vat-pro-rata", () => {
        prorata = { fiscalYear: 2025, indicated: true, amount: -250000, records: [registo(-250000, 1)] };
        return { status: 201, corpo: { proRata: prorata, notes: ["Volte a apurar o IVA de Dezembro de 2025: já estava apurado sem a regularização."] } };
      })
      .em("POST", "/finance/ledger/fiscal-years/2025/vat-pro-rata/adjustments", () => ({ status: 201, corpo: { proRata: { ...prorata, amount: 300000 }, notes: [] } }))
      .ligar();
    await entrar(page);
    await page.goto("/periodos?ano=2025");
    const cartao = page.getByRole("heading", { name: "Pró-rata do IVA de 2025" }).locator("..");
    await cartao.getByRole("button", { name: "Indicar", exact: true }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("A favor da empresa", { exact: false }).check();
    await expect(d.getByRole("button", { name: "Juntar uma parte no imobilizado" })).toHaveCount(0);
    await d.getByLabel("Valor da regularização (Kz)").fill("250 000");
    await d.getByRole("button", { name: "Indicar", exact: true }).click();
    await expect(d.getByText("Volte a apurar o IVA de Dezembro de 2025: já estava apurado sem a regularização.")).toBeVisible();
    await expect(d.getByText("A favor da empresa: o IVA deduzido a menos passa a proveito (63.5).")).toBeVisible();
    await d.getByRole("button", { name: "Fechar", exact: true }).first().click();
    await expect(cartao.getByText("Regularização em vigor")).toBeVisible();

    await cartao.getByRole("button", { name: "Corrigir" }).click();
    await d.getByLabel("Novo total (Kz)").fill("300 000");
    await d.getByRole("button", { name: "Juntar uma parte no imobilizado" }).click();
    await d.getByLabel("Conta da parte 1").fill("75.1");
    await d.getByLabel("Valor da parte 1 (Kz)").fill("400 000");
    await d.getByRole("button", { name: "Corrigir", exact: true }).click();
    await expect(d.getByText("Conta do imobilizado: 11, 12 ou 14.")).toBeVisible();
    await expect(d.getByText("As partes do imobilizado não podem passar do valor da regularização.")).toBeVisible();
    await expect(d.getByText("Diga porque corrige.")).toBeVisible();
    await d.getByLabel("Conta da parte 1").fill("11.3");
    await d.getByLabel("Valor da parte 1 (Kz)").fill("100 000");
    await d.getByLabel("Motivo").fill("Pró-rata definitivo de 62%");
    await d.getByRole("button", { name: "Corrigir", exact: true }).click();
    await expect(d.getByText("A favor do Estado: o IVA deduzido a mais passa a custo (75.3.1.2), ou ao imobilizado.")).toBeVisible();
    expect(api.escritas("POST", "/finance/ledger/fiscal-years/2025/vat-pro-rata").map((p) => p.corpo)).toEqual([{ amount: "-250000.00", fixedAssets: null, notes: null }]);
    expect(api.escritas("POST", "/finance/ledger/fiscal-years/2025/vat-pro-rata/adjustments").map((p) => p.corpo)).toEqual([
      { amount: "300000.00", fixedAssets: [{ accountCode: "11.3", amount: "100000.00" }], reason: "Pró-rata definitivo de 62%" },
    ]);
  });

  test("regularização de existências (ADR-117, ADR-122): simular; a contagem muda o final e obriga a simular de novo; quebras na 78.4.1", async ({ page, api, violacoes }) => {
    type Corpo = S["InventoryRegularisationRequest"];
    const resposta = (c: Corpo): S["InventoryRegularisationView"] => {
      const contagem = c.closingStock?.find((x) => x.accountCode === "22.1");
      const final = contagem ? Number(contagem.amount) : 800000;
      const diferenca = final - 800000;
      const fora = Boolean(c.countDifferencesToOtherResults) && diferenca !== 0;
      return {
        outcome: c.dryRun ? "Preview" : "Regularised",
        fiscalYear: 2025,
        on: "2025-12-31",
        entryId: c.dryRun ? null : ENTRADA,
        transactionId: c.dryRun ? null : "REX-2025",
        purchases: [{ accountCode: "21.1", amount: 1200000 }],
        stock: [
          { stockAccountCode: "22.1", costAccountCode: "71.1", opening: 500000, proposed: 800000, closing: final, countDifference: diferenca, differenceAccountCode: fora ? (diferenca < 0 ? "78.4.1" : "68.4.1") : null },
          { stockAccountCode: "26", costAccountCode: "71.2", opening: 0, proposed: 150000, closing: 150000, countDifference: 0, differenceAccountCode: null },
        ],
        costOfSales: [{ accountCode: "71.1", amount: 900000 - (fora ? 0 : diferenca) }],
        notes: [],
      };
    };
    await comPgc(api)
      .em("POST", "/finance/ledger/fiscal-years/2025/inventory-regularisation", (route) => ({ status: 200, corpo: resposta(route.request().postDataJSON() as Corpo) }))
      .ligar();
    await entrar(page);
    await page.goto("/periodos?ano=2025");
    const cartao = page.getByRole("heading", { name: "Regularização de existências de 2025" }).locator("..");
    await expect(cartao.getByRole("button", { name: "Lançar 2025" })).toBeDisabled();
    await cartao.getByRole("button", { name: "Simular 2025" }).click();
    const r = cartao.getByRole("region", { name: "Resultado da regularização de existências" });
    await expect(r.getByText("Simulação a 31/12/2025: nada foi gravado.")).toBeVisible();
    await expect(r.getByRole("columnheader", { name: "Diferença da contagem" })).toHaveCount(0);
    await expect(cartao.getByRole("button", { name: "Lançar 2025" })).toBeEnabled();
    await expect(r.getByLabel("A diferença da contagem não afecta o custo", { exact: false })).toHaveCount(0);

    // A contagem física deu menos: o final muda, e tem de se simular de novo.
    await r.getByLabel("Final da 22.1 (contagem física)").fill("780 000");
    await expect(cartao.getByRole("button", { name: "Lançar 2025" })).toBeDisabled();
    await expect(cartao.getByText("Mudou o final ou a escolha das diferenças: simule de novo antes de lançar.")).toBeVisible();
    await r.getByLabel("A diferença da contagem não afecta o custo", { exact: false }).check();
    await cartao.getByRole("button", { name: "Simular de novo" }).click();
    const linha = r.getByRole("row").filter({ hasText: "22.1" });
    await expect(linha).toContainText("(quebra)");
    await expect(linha).toContainText("vai para a 78.4.1");
    await expect(r.getByRole("row").filter({ hasText: "71.2" })).toContainText("—");
    await semViolacoesAxe(page);
    await cartao.getByRole("button", { name: "Lançar 2025" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Lançar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(r.getByText("Regularização de 2025 lançada.")).toBeVisible();
    await expect(r.getByRole("link", { name: "Ver o lançamento REX-2025" })).toHaveAttribute("href", `/lancamentos/${ENTRADA}`);
    const comContagem = { closingStock: [{ accountCode: "22.1", amount: "780000.00" }], countDifferencesToOtherResults: true };
    expect(api.escritas("POST", "/finance/ledger/fiscal-years/2025/inventory-regularisation").map((p) => p.corpo)).toEqual([
      { dryRun: true, closingStock: null, countDifferencesToOtherResults: false },
      { dryRun: true, ...comContagem },
      { dryRun: false, ...comContagem },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("versões do plano: a nova fica inactiva; activar mostra o 409 com as contas em falta; desactivar", async ({ page, api }) => {
    const ID_NOVA = "00000000-0000-4000-8000-000000000f51";
    const ID_PGC = "00000000-0000-4000-8000-000000000f52";
    await comPgc(api)
      .em("GET", "/finance/ledger/chart-versions", {
        status: 200,
        corpo: [
          { chartVersionId: ID_PGC, jurisdiction: "AO", name: "PGC", version: "82/01-IVA", source: "Decreto n.º 82/01", effectiveFrom: "2002-01-01", effectiveTo: null, isActive: true, accountCount: 758 },
          { chartVersionId: ID_NOVA, jurisdiction: "AO", name: "Plano <b>novo</b>", version: "2027", source: "Teste", effectiveFrom: "2027-01-01", effectiveTo: null, isActive: false, accountCount: 0 },
        ] satisfies S["ChartOfAccountsVersionView"][],
      })
      .em("POST", `/finance/ledger/chart-versions/${ID_NOVA}/activation`, problema(409, { title: "Conflict", detail: "Faltam as contas 61.1.1 e 62.1.1 usadas pelas regras de lançamento activas." }))
      .em("POST", `/finance/ledger/chart-versions/${ID_PGC}/deactivation`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/plano-contas?vista=versoes");
    await page.getByRole("button", { name: "Nova versão" }).click();
    await expect(page.getByRole("dialog").getByText("A versão nova fica inactiva até ser activada.")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Activar Plano <b>novo</b> 2027" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Activar versão" }).click();
    await expect(page.getByRole("dialog").getByText("Faltam as contas 61.1.1 e 62.1.1 usadas pelas regras de lançamento activas.")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Desactivar PGC 82/01-IVA" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar versão" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/ledger/chart-versions/${ID_PGC}/deactivation`)).toHaveLength(1);
  });
});
