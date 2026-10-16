/**
 * F6 — fiscal, contabilidade e planeamento, com a API simulada: versões
 * fiscais (sobreposição avisada, fecho com data), IRT (escalões validados,
 * simulação), relatórios (contas sem classe e diferença à vista), impostos
 * (nota oficial, SAF-T descarregado), lançamento em partida dobrada com
 * valores em texto, períodos (fecho sem corpo), regras equilibradas,
 * orçamentos (tectos em texto, aprovação sem corpo) e permissões por perfil.
 */
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { colaboradores, departamentos, ID } from "../../fixtures/f1";
import { painelAna } from "../../fixtures/f5";
import {
  antiguidade,
  balancete,
  balanco,
  centros,
  classesReporte,
  contasRazao,
  diarios,
  escolhasPlaneamento,
  IDF6,
  isencaoAlimentacao,
  lancamento,
  meAdminF6,
  meFinancasF6,
  meGestorF6,
  meLeitorFiscal,
  orcamento,
  pautas,
  periodos,
  previsaoRascunho,
  previsoes,
  regrasLancamento,
  resultados,
  resumoIva,
  resumoRetencoes,
  tabelaIrt,
  versoesPlano,
} from "../../fixtures/f6";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const problema = (status: number, corpo: Record<string, unknown>) => ({ status, corpo: { status, ...corpo }, cabecalhos: { "Content-Type": "application/problem+json" } });

function comF6(api: ApiSimulada, me = meAdminF6): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/dashboard/me", { status: 200, corpo: painelAna() })
    .em("GET", "/fiscal/tax-rates", { status: 200, corpo: pautas() })
    .em("GET", "/fiscal/income-tax-schedule", { status: 200, corpo: tabelaIrt() })
    .em("GET", "/fiscal/subsidy-exemptions", (route) =>
      new URL(route.request().url()).searchParams.get("kind") === "0" ? { status: 200, corpo: isencaoAlimentacao() } : problema(404, { title: "Not Found" }),
    )
    .em("GET", "/finance/ledger/trial-balance", { status: 200, corpo: balancete() })
    .em("GET", "/finance/reports/balance-sheet", { status: 200, corpo: balanco() })
    .em("GET", "/finance/reports/income-statement", { status: 200, corpo: resultados() })
    .em("GET", "/finance/receivables/aging", { status: 200, corpo: antiguidade() })
    .em("GET", "/finance/payables/aging", { status: 200, corpo: antiguidade("Ngola Limpezas, SA") })
    .em("GET", "/finance/tax-summaries/vat", { status: 200, corpo: resumoIva() })
    .em("GET", "/finance/tax-summaries/withholdings", { status: 200, corpo: resumoRetencoes() })
    .em("GET", "/finance/ledger/journals", { status: 200, corpo: diarios() })
    .em("GET", "/finance/ledger/accounts", pag(contasRazao()))
    .em("GET", "/finance/ledger/entries", pag([lancamento()]))
    .em("GET", `/finance/ledger/entries/${IDF6.lancamento}`, { status: 200, corpo: lancamento() })
    .em("GET", "/finance/ledger/periods", { status: 200, corpo: periodos() })
    .em("GET", "/finance/ledger/posting-rules", { status: 200, corpo: regrasLancamento() })
    .em("GET", "/finance/ledger/accounting-rules", { status: 200, corpo: [] })
    .em("GET", "/finance/ledger/chart-versions", { status: 200, corpo: versoesPlano() })
    .em("GET", "/finance/ledger/reporting-rules", { status: 200, corpo: classesReporte() })
    .em("GET", "/finance/planning/cost-centres", pag(centros()))
    .em("GET", "/finance/planning/budgets", pag([orcamento()]))
    .em("GET", "/finance/planning/cost-forecasts", pag(previsoes()))
    .em("GET", "/finance/planning/lookups", { status: 200, corpo: escolhasPlaneamento() })
    .em("GET", "/hr/departments", pag(departamentos()))
    .em("GET", "/hr/employees", pag(colaboradores()));
}

test.describe("fiscal", () => {
  test("taxas: versão em vigor, nova versão avisa da sobreposição, fecho com data; axe e responsivo", async ({ page, api, violacoes }) => {
    await comF6(api)
      .em("POST", `/fiscal/tax-rates/${IDF6.pautaIva}/versions`, { status: 201, corpo: { versionId: "00000000-0000-4000-8000-000000000990" } })
      .em("POST", `/fiscal/tax-rates/${IDF6.pautaIva}/versions/${IDF6.versaoIva}/closure`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/fiscal");
    await expect(page.getByText("NOR · IVA - taxa normal")).toBeVisible();
    await expect(page.getByText("IVA · hoje: 14,00 %")).toBeVisible();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Nova versão de NOR" }).click();
    await page.getByRole("dialog").getByLabel("Taxa (%)").fill("16,5");
    await expect(page.getByRole("dialog").getByText("Cruza-se com a versão em vigor desde 01/10/2019", { exact: false })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Registar versão" }).click();
    await expect(page.getByText("Indique o instrumento legal.")).toBeVisible();
    await page.getByRole("dialog").getByLabel("Em vigor desde").fill("2027-01-01");
    await page.getByRole("dialog").getByLabel("Instrumento legal").fill("Lei de teste");
    await page.getByRole("dialog").getByRole("button", { name: "Registar versão" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/fiscal/tax-rates/${IDF6.pautaIva}/versions`)[0]?.corpo).toEqual({ percentage: "16.5", effectiveFrom: "2027-01-01", effectiveTo: null, legalInstrument: "Lei de teste" });
    await page.getByRole("button", { name: "Fechar a versão de NOR de 01/10/2019" }).click();
    await page.getByRole("dialog").getByLabel("Último dia em vigor").fill("2026-12-31");
    await page.getByRole("dialog").getByRole("button", { name: "Fechar versão" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/fiscal/tax-rates/${IDF6.pautaIva}/versions/${IDF6.versaoIva}/closure`)[0]?.corpo).toEqual({ effectiveTo: "2026-12-31" });
    expect(await violacoes()).toEqual([]);
  });

  test("IRT: escalões, simulação e nova tabela com escalões validados no cliente", async ({ page, api }) => {
    await comF6(api)
      .em("GET", "/fiscal/income-tax-schedule/determination", { status: 200, corpo: { amount: 21500, rate: 18, fixedPortion: 12500, bracketLowerBound: 150000, legalInstrument: "Lei n.º 14/25 (Tabela B)" } })
      .em("POST", "/fiscal/income-tax-schedule/versions", { status: 201, corpo: { versionId: "00000000-0000-4000-8000-000000000991" } })
      .ligar();
    await entrar(page);
    await page.goto("/fiscal?vista=irt");
    await expect(page.getByRole("cell", { name: "150 000,00 Kz" }).first()).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByLabel("Matéria colectável (Kz)").fill("200 000");
    await page.getByRole("button", { name: "Simular" }).click();
    await expect(page.getByText("21 500,00 Kz")).toBeVisible();
    expect(api.pedidos.find((p) => p.caminho === "/fiscal/income-tax-schedule/determination")?.query).toContain("taxableIncome=200000.00");
    await page.getByRole("button", { name: "Nova tabela" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Acima de (Kz) · escalão 2")).toHaveValue(/^150\s000,00$/);
    await d.getByLabel("Acima de (Kz) · escalão 1").fill("100");
    await d.getByLabel("Em vigor desde").fill("2027-01-01");
    await d.getByLabel("Instrumento legal").fill("Lei de teste");
    await d.getByRole("button", { name: "Registar tabela" }).click();
    await expect(d.getByText("O primeiro escalão tem de começar em zero (é a isenção).")).toBeVisible();
    expect(api.escritas("POST", "/fiscal/income-tax-schedule/versions")).toHaveLength(0);
    await d.getByLabel("Acima de (Kz) · escalão 1").fill("0");
    await d.getByRole("button", { name: "Registar tabela" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/fiscal/income-tax-schedule/versions")[0]?.corpo).toMatchObject({
      brackets: [
        { lowerBound: "0.00", fixedPortion: "0.00", rate: "0" },
        { lowerBound: "150000.00", fixedPortion: "12500.00", rate: "16" },
        { lowerBound: "200000.00", fixedPortion: "31250.00", rate: "18" },
      ],
      effectiveFrom: "2027-01-01",
    });
  });

  test("subsídios: limiar em vigor e série sem versões (404 = vazio); só consulta sem fiscal.rates.write", async ({ page, api }) => {
    await comF6(api, meLeitorFiscal).ligar();
    await entrar(page, meLeitorFiscal.email);
    await page.goto("/fiscal?vista=subsidios");
    await expect(page.getByText("Hoje: isento até 30 000,00 Kz por mês.")).toBeVisible();
    await expect(page.getByText("Sem limiar em vigor hoje", { exact: false })).toBeVisible();
    await expect(page.getByText("Só consulta: este perfil não altera a configuração fiscal.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Nova versão/ })).toHaveCount(0);
    await semViolacoesAxe(page);
  });
});

test.describe("relatórios e impostos", () => {
  test("balancete, balanço com contas sem classe e diferença, resultados e antiguidade; axe", async ({ page, api, violacoes }) => {
    await comF6(api).ligar();
    await entrar(page);
    await page.goto("/relatorios");
    await expect(page.getByRole("cell", { name: "Caixa", exact: true })).toBeVisible();
    await expect(page.getByText("Equilibrado", { exact: true })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Balanço" }).click();
    await expect(page.getByText("1 conta movimentada não tem classe de reporte", { exact: false })).toBeVisible();
    await expect(page.getByText("diferença de 140 000,00 Kz", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Configurar as classes de reporte" })).toHaveAttribute("href", "/plano-contas?vista=reporte");
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Resultados" }).click();
    await expect(page.getByText("749 999,50 Kz")).toBeVisible();
    await page.getByLabel("Período").selectOption("3");
    // O router muda o URL em transição: o estado da caixa acompanha logo a seguir.
    await page.getByLabel("Acumulado de Janeiro a Março").click();
    await expect(page.getByLabel("Acumulado de Janeiro a Março")).not.toBeChecked();
    await expect.poll(() => api.pedidos.filter((p) => p.caminho === "/finance/reports/income-statement").at(-1)?.query).toContain("yearToDate=false");
    await page.getByRole("link", { name: "Antiguidade de saldos" }).click();
    await expect(page.getByRole("cell", { name: "Kuito Consultoria, Lda" })).toBeVisible();
    await page.getByLabel("Saldos de", { exact: true }).selectOption("fornecedores");
    await expect(page.getByRole("cell", { name: "Ngola Limpezas, SA" })).toBeVisible();
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    expect(await violacoes()).toEqual([]);
  });

  test("IVA com a nota oficial, retenções e SAF-T descarregado pelo período", async ({ page, api }) => {
    await comF6(api)
      .em("GET", "/finance/saft-ao", { status: 200, bruto: { conteudo: "<?xml version=\"1.0\"?><AuditFile/>", tipo: "application/xml" } })
      .ligar();
    await entrar(page);
    await page.goto("/impostos?ano=2026&periodo=10");
    await expect(page.getByText("Não é a declaração oficial.")).toBeVisible();
    await expect(page.getByText("184 933 753,20 Kz")).toBeVisible();
    await expect(page.getByText("IVA a entregar")).toBeVisible();
    expect(api.pedidos.find((p) => p.caminho === "/finance/tax-summaries/vat")?.query).toContain("from=2026-10-01&to=2026-10-31");
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Retenções na fonte" }).click();
    await expect(page.getByRole("cell", { name: "Cliente Retentor, SA" })).toBeVisible();
    await page.getByRole("link", { name: "SAF-T" }).click();
    await expect(page.getByText("A Rivo não é software certificado pela AGT.")).toBeVisible();
    const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Descarregar SAF-T/ }).click()]);
    expect(descarga.suggestedFilename()).toMatch(/^SAF-T[ _]AO[ _]2026-10-01[ _]a[ _]2026-10-31\.xml$/);
    expect(api.pedidos.find((p) => p.caminho === "/finance/saft-ao")?.query).toBe("?from=2026-10-01&to=2026-10-31");
  });
});

test.describe("contabilidade", () => {
  test("novo lançamento: totais em Big, só equilibrado, valores em texto; abre a ficha", async ({ page, api }) => {
    await comF6(api)
      .em("POST", "/finance/ledger/entries", { status: 201, corpo: { entryId: IDF6.lancamento, transactionId: "2026-10-10 OD 0002" } })
      .ligar();
    await entrar(page);
    await page.goto("/lancamentos");
    await expect(page.getByRole("link", { name: "OD 0001" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Novo lançamento" }).click();
    await expect(page.getByRole("heading", { name: "Novo lançamento", level: 1 })).toBeVisible();
    await page.getByLabel("Diário").selectOption(IDF6.diario);
    await page.getByLabel("N.º de arquivo").fill("0002");
    await page.getByLabel("Data").fill("2026-10-10");
    await page.getByLabel("Descrição", { exact: true }).fill("Venda a dinheiro");
    await page.getByLabel("Conta · linha 1").fill("111");
    await page.getByLabel("Valor · linha 1").fill("1 140 000,10");
    await page.getByLabel("Descrição · linha 1").fill("Recebido");
    await page.getByLabel("Centro de custo · linha 1").selectOption(IDF6.centro);
    await page.getByLabel("Conta · linha 2").fill("621");
    await page.getByLabel("Valor · linha 2").fill("1140000");
    await page.getByLabel("Descrição · linha 2").fill("Venda");
    await expect(page.getByText("Diferença: 0,10 Kz")).toBeVisible();
    await page.getByRole("button", { name: "Lançar" }).click();
    await expect(page.getByText("O total a débito tem de igualar o total a crédito.")).toBeVisible();
    expect(api.escritas("POST", "/finance/ledger/entries")).toHaveLength(0);
    await page.getByLabel("Conta · linha 2").fill("999");
    await page.getByLabel("Valor · linha 2").fill("1140000,10");
    await page.getByRole("button", { name: "Lançar" }).click();
    await expect(page.getByText("A conta 999 não existe ou não aceita movimento.")).toBeVisible();
    await page.getByLabel("Conta · linha 2").fill("621");
    await expect(page.getByText("Equilibrado")).toBeVisible();
    await page.getByRole("button", { name: "Lançar" }).click();
    await expect(page).toHaveURL(new RegExp(`/lancamentos/${IDF6.lancamento}$`));
    expect(api.escritas("POST", "/finance/ledger/entries")[0]?.corpo).toEqual({
      journalCode: "OD",
      archivalNumber: "0002",
      transactionDate: "2026-10-10",
      fiscalYear: 2026,
      period: 10,
      description: "Venda a dinheiro",
      type: "N",
      lines: [
        { accountCode: "111", side: "Debit", amount: "1140000.10", description: "Recebido", costCentreId: IDF6.centro, sourceDocumentId: null },
        { accountCode: "621", side: "Credit", amount: "1140000.10", description: "Venda", costCentreId: null, sourceDocumentId: null },
      ],
    });
  });

  test("ficha do lançamento: linhas, centro de custo pelo nome e estorno com motivo", async ({ page, api }) => {
    await comF6(api)
      .em("POST", `/finance/ledger/entries/${IDF6.lancamento}/void`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto(`/lancamentos/${IDF6.lancamento}`);
    await expect(page.getByRole("heading", { name: "Lançamento OD 0001", level: 1 })).toBeVisible();
    await expect(page.getByRole("cell", { name: "CC01 · Direcção Geral" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Estornar" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Lançado em duplicado");
    await page.getByRole("dialog").getByRole("button", { name: "Estornar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/ledger/entries/${IDF6.lancamento}/void`)[0]?.corpo).toEqual({ reason: "Lançado em duplicado" });
  });

  test("períodos: abrir, fechar sem corpo, reabrir com motivo; o Finance não fecha", async ({ page, api, browser }) => {
    await comF6(api)
      .em("POST", "/finance/ledger/periods", { status: 201, corpo: {} })
      .em("POST", "/finance/ledger/periods/2026/10/closure", { status: 204 })
      .em("POST", "/finance/ledger/periods/2026/9/reopening", { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/periodos?ano=2026");
    await expect(page.getByRole("cell", { name: "10 · Outubro", exact: true })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Abrir período" }).click();
    await page.getByRole("dialog").getByLabel("Período").selectOption("11");
    await page.getByRole("dialog").getByRole("button", { name: "Abrir período" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/finance/ledger/periods")[0]?.corpo).toEqual({ fiscalYear: 2026, number: 11 });
    await page.getByRole("button", { name: "Fechar o período 10 · Outubro" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Fechar período" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const fecho = api.escritas("POST", "/finance/ledger/periods/2026/10/closure")[0];
    expect(fecho?.corpo ?? null).toBeNull();
    await page.getByRole("button", { name: "Reabrir" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Factura esquecida");
    await page.getByRole("dialog").getByRole("button", { name: "Reabrir" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/finance/ledger/periods/2026/9/reopening")[0]?.corpo).toEqual({ reason: "Factura esquecida" });

    const contexto = await browser.newContext({ baseURL: "http://localhost:4173" });
    const outra = await contexto.newPage();
    const { ApiSimulada } = await import("../apoio");
    const api2 = new ApiSimulada(outra);
    await comF6(api2, meFinancasF6).ligar();
    await entrar(outra, meFinancasF6.email);
    await outra.goto("/periodos?ano=2026");
    await expect(outra.getByRole("cell", { name: "10 · Outubro", exact: true })).toBeVisible();
    await expect(outra.getByRole("button", { name: /Fechar o período/ })).toHaveCount(0);
    await expect(outra.getByRole("button", { name: "Abrir período" })).toBeVisible();
    await contexto.close();
  });

  test("plano de contas: conta-mãe validada como no servidor; classes de reporte criadas, revistas e apagadas", async ({ page, api }) => {
    await comF6(api)
      .em("POST", "/finance/ledger/accounts", { status: 201, corpo: {} })
      .em("POST", "/finance/ledger/reporting-rules", { status: 201, corpo: { id: "00000000-0000-4000-8000-000000000992" } })
      .em("PUT", `/finance/ledger/reporting-rules/${IDF6.classe}`, { status: 204 })
      .em("DELETE", `/finance/ledger/reporting-rules/${IDF6.classe}`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/plano-contas");
    await expect(page.getByRole("cell", { name: "Caixa", exact: true })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Abrir conta" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Código").fill("1111");
    await d.getByLabel("Conta-mãe").fill("111");
    await d.getByLabel("Descrição").fill("Caixa sede");
    await d.getByRole("button", { name: "Abrir conta" }).click();
    await expect(d.getByText("111 é conta de movimento e não agrega outras.")).toBeVisible();
    await d.getByLabel("Conta-mãe").fill("11");
    await d.getByRole("button", { name: "Abrir conta" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/finance/ledger/accounts")[0]?.corpo).toEqual({ code: "1111", name: "Caixa sede", category: "GM", parentCode: "11" });

    await page.getByRole("link", { name: "Classes de reporte" }).click();
    await expect(page.getByRole("cell", { name: "Meios monetários" })).toBeVisible();
    await page.getByRole("button", { name: "Nova classe" }).click();
    await page.getByRole("dialog").getByLabel("Prefixo das contas").fill("62");
    await page.getByRole("dialog").getByLabel("Classe").selectOption("Revenue");
    await page.getByRole("dialog").getByLabel("Rubrica").fill("Vendas");
    await page.getByRole("dialog").getByLabel("Ordem").fill("1");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/finance/ledger/reporting-rules")[0]?.corpo).toEqual({ codePrefix: "62", class: "Revenue", section: "Vendas", order: 1 });
    await page.getByRole("button", { name: "Rever a classe do prefixo 11" }).click();
    await page.getByRole("dialog").getByLabel("Ordem").fill("2");
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("PUT", `/finance/ledger/reporting-rules/${IDF6.classe}`)[0]?.corpo).toEqual({ codePrefix: "11", class: "Asset", section: "Meios monetários", order: 2 });
    await page.getByRole("button", { name: "Apagar a classe do prefixo 11" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Apagar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("DELETE", `/finance/ledger/reporting-rules/${IDF6.classe}`)).toHaveLength(1);
  });

  test("regras de lançamento: só equilibradas; desactivar; sem regra o acontecimento diz que não gera", async ({ page, api }) => {
    await comF6(api)
      .em("POST", "/finance/ledger/posting-rules", { status: 201, corpo: {} })
      .em("POST", `/finance/ledger/posting-rules/${IDF6.regra}/deactivation`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/regras-contabilisticas");
    await expect(page.getByText("Venda a crédito")).toBeVisible();
    await expect(page.getByText("Sem regra: não gera lançamento.").first()).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Nova regra" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Acontecimento").selectOption("ReceiptRegistered");
    await d.getByLabel("Diário").selectOption("OD");
    await d.getByLabel("Descrição", { exact: true }).fill("Recebimento");
    await d.getByLabel("Conta · 1").fill("111");
    await d.getByLabel("Descrição · 1").fill("Caixa");
    await d.getByLabel("Conta · 2").fill("311");
    await d.getByLabel("Descrição · 2").fill("Cliente");
    await d.getByRole("button", { name: "Tirar a linha 3" }).click();
    await d.getByRole("button", { name: "Definir regra" }).click();
    await expect(d.getByText("A regra não equilibra", { exact: false })).toBeVisible();
    await d.getByLabel("Valor · 2").selectOption("Gross");
    await d.getByRole("button", { name: "Definir regra" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/finance/ledger/posting-rules")[0]?.corpo).toEqual({
      event: "ReceiptRegistered",
      journalCode: "OD",
      description: "Recebimento",
      lines: [
        { accountCode: "111", side: "Debit", amount: "Gross", description: "Caixa" },
        { accountCode: "311", side: "Credit", amount: "Gross", description: "Cliente" },
      ],
    });
    await page.getByRole("button", { name: "Desactivar a regra Venda a crédito" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/ledger/posting-rules/${IDF6.regra}/deactivation`)).toHaveLength(1);
  });
});

test.describe("planeamento", () => {
  test("Manager: só o planeamento no menu, nomes do servidor sem ler RH, abre centro pelas escolhas, cria orçamento e não aprova", async ({ page, api }) => {
    await comF6(api, meGestorF6)
      .em("POST", "/finance/planning/budgets", { status: 201, corpo: { budgetId: "00000000-0000-4000-8000-000000000993", estado: "Draft" } })
      .em("POST", "/finance/planning/cost-centres", { status: 201, corpo: { id: "00000000-0000-4000-8000-000000000995" } })
      .ligar();
    await entrar(page, meGestorF6.email);
    await page.goto("/centros-custo");
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(menu.getByRole("link", { name: "Orçamentos" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Lançamentos" })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "Direcção Geral" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Ana Teste" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Operações" })).toBeVisible();
    await expect(page.getByText(IDF6.centro)).toHaveCount(0);
    await page.getByRole("button", { name: "Abrir centro" }).click();
    const c = page.getByRole("dialog");
    await c.getByLabel("Código").fill("cc02");
    await c.getByLabel("Nome").fill("Logística");
    await c.getByLabel("Departamento (opcional)").selectOption({ label: "Operações" });
    await c.getByLabel("Responsável").selectOption({ label: "Ana Teste" });
    await semViolacoesAxe(page);
    await c.getByRole("button", { name: "Abrir centro" }).click();
    await expect(c).toHaveCount(0);
    expect(api.escritas("POST", "/finance/planning/cost-centres")[0]?.corpo).toEqual({ code: "CC02", name: "Logística", departmentId: ID.dep1, responsibleEmployeeId: ID.emp1 });
    // As escolhas vêm do planeamento, não das listas de RH.
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/"))).toBe(false);
    await page.goto("/orcamentos");
    await expect(page.getByRole("table", { name: "Orçamentos" }).getByText("CC01 · Direcção Geral", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Aprovar o orçamento/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Rever o orçamento de CC01 · Direcção Geral" })).toBeVisible();
    await page.getByRole("button", { name: "Novo orçamento" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Centro de custo").selectOption(IDF6.centro);
    await d.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(d.getByText("Indique o tecto de pelo menos um mês.")).toBeVisible();
    await d.getByLabel("Janeiro").fill("1 000 000,50");
    await d.getByLabel("Dezembro").fill("2000000");
    await expect(d.getByText("3 000 000,50 Kz")).toBeVisible();
    await d.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/finance/planning/budgets")[0]?.corpo).toMatchObject({ costCentreId: IDF6.centro, currency: "AOA", monthlyCeilings: { "1": "1000000.50", "12": "2000000.00" } });
  });

  test("Finance aprova o rascunho sem corpo e não o revê; Admin vê os nomes e regista previsão submetida", async ({ page, api, browser }) => {
    await comF6(api, meFinancasF6)
      .em("POST", `/finance/planning/budgets/${IDF6.orcamento}/approval`, { status: 204 })
      .ligar();
    await entrar(page, meFinancasF6.email);
    await page.goto("/orcamentos");
    await expect(page.getByRole("button", { name: /Rever o orçamento/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Aprovar o orçamento de CC01 · Direcção Geral" }).click();
    await expect(page.getByRole("dialog")).toContainText("Total anual de 3 000 000,50 Kz");
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/planning/budgets/${IDF6.orcamento}/approval`)[0]?.corpo ?? null).toBeNull();

    const contexto = await browser.newContext({ baseURL: "http://localhost:4173" });
    const outra = await contexto.newPage();
    const { ApiSimulada } = await import("../apoio");
    const api2 = new ApiSimulada(outra);
    await comF6(api2)
      .em("POST", "/finance/planning/cost-forecasts", { status: 201, corpo: {} })
      .ligar();
    await entrar(outra);
    await outra.goto("/centros-custo");
    await expect(outra.getByRole("cell", { name: "Ana Teste" })).toBeVisible();
    await expect(outra.getByRole("cell", { name: "Operações" })).toBeVisible();
    await outra.goto("/previsoes-custos");
    await expect(outra.getByRole("cell", { name: "Operações" })).toBeVisible();
    await outra.getByRole("button", { name: "Registar previsão" }).click();
    const d = outra.getByRole("dialog");
    await d.getByLabel("Departamento").selectOption({ label: "Operações" });
    await d.getByLabel("Mês").selectOption("3");
    await d.getByLabel("Custos operacionais").fill("6 026 000");
    await d.getByLabel("Custos fixos").fill("0");
    await d.getByRole("button", { name: "Submeter" }).click();
    await expect(d).toHaveCount(0);
    expect(api2.escritas("POST", "/finance/planning/cost-forecasts")[0]?.corpo).toMatchObject({ month: 3, currency: "AOA", operationalCosts: "6026000.00", fixedCosts: "0.00", submit: true });
    await semViolacoesAxe(outra);
    await contexto.close();
  });

  test("previsão em rascunho: rever os custos em texto e submeter depois (B23)", async ({ page, api }) => {
    const rascunho = previsaoRascunho();
    let lista = [rascunho, ...previsoes()];
    await comF6(api, meGestorF6)
      .em("GET", "/finance/planning/cost-forecasts", () => pag(lista))
      .em("PUT", `/finance/planning/cost-forecasts/${rascunho.forecastId}`, { status: 204 })
      .em("POST", `/finance/planning/cost-forecasts/${rascunho.forecastId}/submission`, () => {
        lista = [{ ...rascunho, status: "Submitted", submittedAt: "2026-10-16T10:00:00Z" }, ...previsoes()];
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meGestorF6.email);
    await page.goto("/previsoes-custos");
    // A submetida não se revê nem se submete.
    await expect(page.getByRole("button", { name: /previsão de Operações, Janeiro/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Rever a previsão de Operações, Fevereiro 2026" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Custos fixos")).toHaveValue("250000,50");
    await d.getByLabel("Custos operacionais").fill("");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("Indique os custos operacionais (zero se não houver).")).toBeVisible();
    await d.getByLabel("Custos operacionais").fill("1 200 000");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/finance/planning/cost-forecasts/${rascunho.forecastId}`).map((x) => x.corpo)).toEqual([{ operationalCosts: "1200000.00", fixedCosts: "250000.50" }]);
    await page.getByRole("button", { name: "Submeter a previsão de Operações, Fevereiro 2026" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Submeter" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Submeter a previsão/ })).toHaveCount(0);
    expect(api.escritas("POST", `/finance/planning/cost-forecasts/${rascunho.forecastId}/submission`)).toHaveLength(1);
  });
});
