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

function comPgc(api: ApiSimulada, me = meAdminF6): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/dashboard/me", { status: 200, corpo: painelAna() })
    .em("GET", "/finance/ledger/accounts", pag(contasRazao()))
    .em("GET", "/finance/ledger/chart-versions", { status: 200, corpo: versoesPlano() })
    .em("GET", "/finance/ledger/reporting-rules", { status: 200, corpo: classesReporte() })
    .em("GET", "/finance/ledger/periods", { status: 200, corpo: periodos() })
    .em("GET", "/finance/tax-summaries/vat", { status: 200, corpo: resumoIva() })
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
        corpo: { fiscalYear: 2026, outcome: "Done", message: null, netResult: -1250000.75, entries: [{ entryId: ENTRADA, transactionId: "APU 2026/1", description: "Apuramento de resultados", lines: 14, total: 9800000 }] } satisfies S["FiscalYearView"],
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
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Fechar", exact: true }).first().click();

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
});
