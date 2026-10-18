/**
 * F11 (3.º bloco) — contratos de clientes e cobranças, com a API simulada:
 * lista com filtros no URL, registar validado, activar, renovar (estende o
 * fim), aditamento (sem deixar o valor negativo), terminar com motivo,
 * anexar um ficheiro carregado (descarregar só com o arquivo, B37); cobranças:
 * vencidas, acção sobre uma factura, promessa validada, histórico com nomes
 * das vencidas; o separador «Comercial» na ficha do cliente.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF3 } from "../apoio-f3";
import { IDF3 } from "../../fixtures/f3";
import { meAdminF10 } from "../../fixtures/f10b";
import { accoes, aditamentos, anexos, contratos, IDF11C, meFinancasF11, meVendasF11, oportunidades, propostas, vencidas } from "../../fixtures/f11";

function comContratos(api: ApiSimulada, me = meVendasF11): ApiSimulada {
  return comF3(api, me)
    .em("GET", "/commercial/contracts", { status: 200, corpo: contratos() })
    .em("GET", `/commercial/contracts/${IDF11C.activo}`, { status: 200, corpo: contratos()[0] })
    .em("GET", `/commercial/contracts/${IDF11C.rascunho}`, { status: 200, corpo: contratos()[1] })
    .em("GET", `/commercial/contracts/${IDF11C.activo}/amendments`, { status: 200, corpo: aditamentos() })
    .em("GET", `/commercial/contracts/${IDF11C.rascunho}/amendments`, { status: 200, corpo: [] })
    .em("GET", `/commercial/contracts/${IDF11C.activo}/documents`, { status: 200, corpo: anexos() })
    .em("GET", `/commercial/contracts/${IDF11C.rascunho}/documents`, { status: 200, corpo: [] })
    .em("GET", "/finance/receivables/overdue", { status: 200, corpo: vencidas() })
    .em("GET", "/commercial/collections/actions", { status: 200, corpo: accoes() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("contratos de clientes", () => {
  test("Sales: filtros no URL, registar validado, activar o rascunho", async ({ page, api, violacoes }) => {
    await comContratos(api)
      .em("POST", "/commercial/contracts", { status: 201, corpo: { contractId: IDF11C.rascunho } })
      .em("POST", `/commercial/contracts/${IDF11C.rascunho}/activation`, { status: 204 })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.getByRole("link", { name: "Contratos de clientes" }).click();
    const tabela = page.getByRole("table", { name: "Contratos de clientes" });
    await expect(tabela.getByRole("row").filter({ hasText: "Manutenção anual" })).toContainText("faltam 18 dias");
    await expect(tabela.getByRole("row").filter({ hasText: "Manutenção anual" })).toContainText("Cliente Teste, Lda");
    await expect(tabela.getByRole("row").filter({ hasText: "Avença jurídica" })).toContainText("sem fim");
    await verificar(page);
    await page.getByLabel("Acabam em").selectOption("30");
    await expect(page).toHaveURL(/acabam=30/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/commercial/contracts" && p.query.includes("expiringWithinDays=30"))).toBe(true);

    await page.getByRole("button", { name: "Novo contrato" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Fim (opcional)").fill("2025-12-31");
    await d.getByLabel("SLA de resposta (horas, opcional)").fill("0");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Indique a referência.")).toBeVisible();
    await expect(d.getByText("Escolha o cliente.")).toBeVisible();
    await expect(d.getByText("Horas inteiras, maiores que zero.")).toBeVisible();
    expect(api.escritas("POST", "/commercial/contracts")).toHaveLength(0);
    await d.getByLabel("Referência").fill("CT-2026/09");
    await d.getByLabel("Cliente").selectOption({ label: "Cliente Teste, Lda" });
    await d.getByLabel("Título").fill("Avença jurídica");
    await d.getByLabel("Tipo").selectOption("Legal");
    await d.getByLabel("Início").fill("2026-01-01");
    await d.getByLabel("Fim (opcional)").fill("");
    await d.getByLabel("SLA de resposta (horas, opcional)").fill("");
    await d.getByLabel("Valor (opcional)").fill("80 000");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(page).toHaveURL(new RegExp(`/contratos-clientes/${IDF11C.rascunho}$`));
    expect(api.escritas("POST", "/commercial/contracts")[0]?.corpo).toEqual({
      number: "CT-2026/09",
      title: "Avença jurídica",
      customerId: IDF3.cliente,
      kind: "Legal",
      startsOn: "2026-01-01",
      endsOn: null,
      value: "80000.00",
      currency: "AOA",
      slaResponseHours: null,
      slaResolutionHours: null,
      renewalNoticeDays: null,
      autoRenew: false,
      notes: null,
    });
    await page.getByRole("button", { name: "Activar" }).click();
    await d.getByRole("button", { name: "Activar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/contracts/${IDF11C.rascunho}/activation`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });

  test("ficha: renovar estende o fim, aditamento sem valor negativo, anexar, terminar com motivo", async ({ page, api, violacoes }) => {
    await comContratos(api)
      .em("POST", `/commercial/contracts/${IDF11C.activo}/renewal`, { status: 204 })
      .em("POST", `/commercial/contracts/${IDF11C.activo}/amendments`, { status: 201, corpo: { id: "a2" } })
      .em("POST", "/documents", { status: 201, corpo: { documentId: IDF11C.documento, fileName: "contrato.pdf", contentType: "application/pdf", sizeInBytes: 1000, category: "Contrato de cliente", contentHash: "x", uploadedBy: null, uploadedAt: "2026-10-18T10:00:00Z" } })
      .em("POST", `/commercial/contracts/${IDF11C.activo}/documents`, { status: 201, corpo: { linkId: "l2" } })
      .em("POST", `/commercial/contracts/${IDF11C.activo}/termination`, { status: 204 })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.goto(`/contratos-clientes/${IDF11C.activo}`);
    await expect(page.getByRole("heading", { name: "Manutenção anual", level: 1 })).toBeVisible();
    await expect(page.getByText("<b>SLA</b> reforçado")).toBeVisible();
    await expect(page.getByRole("table", { name: "Aditamentos" })).toContainText("+200 000,00 Kz");
    // Sem o arquivo, os anexos não se abrem (B37).
    await expect(page.getByRole("table", { name: "Anexos" })).toContainText("Contrato assinado");
    await expect(page.getByText("(B37)", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Descarregar/ })).toHaveCount(0);
    await verificar(page);

    await page.getByRole("button", { name: "Renovar" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Novo fim").fill("2026-11-05");
    await d.getByRole("button", { name: "Renovar" }).click();
    await expect(d.getByText("A renovação tem de estender o fim actual.")).toBeVisible();
    await d.getByLabel("Novo fim").fill("2027-11-05");
    await d.getByRole("button", { name: "Renovar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/contracts/${IDF11C.activo}/renewal`)[0]?.corpo).toEqual({ endsOn: "2027-11-05" });

    await page.getByRole("button", { name: "Novo aditamento" }).click();
    await d.getByLabel("Descrição").fill("Reduz o âmbito.");
    await d.getByLabel("Variação do valor em AOA (opcional)").fill("-1 200 000,01");
    await d.getByRole("button", { name: "Registar aditamento" }).click();
    await expect(d.getByText("O aditamento deixaria o contrato com valor negativo.")).toBeVisible();
    await d.getByLabel("Variação do valor em AOA (opcional)").fill("-200 000");
    await d.getByLabel("Novo fim (opcional)").fill("2026-12-31");
    await d.getByRole("button", { name: "Registar aditamento" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/contracts/${IDF11C.activo}/amendments`)[0]?.corpo).toEqual({ description: "Reduz o âmbito.", effectiveOn: null, valueChange: "-200000.00", newEndsOn: "2026-12-31" });

    await page.getByRole("button", { name: "Anexar ficheiro" }).click();
    await d.getByLabel("Ficheiro").setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await expect(d.getByText("contrato.pdf")).toBeVisible();
    await d.getByRole("button", { name: "Anexar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/contracts/${IDF11C.activo}/documents`)[0]?.corpo).toEqual({ documentId: IDF11C.documento, category: "Contrato assinado" });

    await page.getByRole("button", { name: "Terminar" }).click();
    await d.getByRole("button", { name: "Terminar" }).click();
    await expect(d.getByText("Indique o motivo.")).toBeVisible();
    await d.getByLabel("Motivo").fill("Cliente mudou de fornecedor.");
    await d.getByRole("button", { name: "Terminar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/contracts/${IDF11C.activo}/termination`)[0]?.corpo).toMatchObject({ reason: "Cliente mudou de fornecedor." });
    expect(await violacoes()).toEqual([]);
  });

  test("Admin abre o anexo pelo arquivo, com o nome do ficheiro", async ({ page, api }) => {
    await comContratos(api, { ...meAdminF10, permissions: [...meAdminF10.permissions, "commercial.contracts.read", "commercial.contracts.write"] })
      .em("GET", `/documents/${IDF11C.documento}/metadata`, { status: 200, corpo: { documentId: IDF11C.documento, fileName: "contrato-assinado.pdf", contentType: "application/pdf", sizeInBytes: 1000, category: "Contrato de cliente", contentHash: "x", uploadedBy: null, uploadedAt: "2026-01-02T10:00:00Z" } })
      .em("GET", `/documents/${IDF11C.documento}`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .ligar();
    await entrar(page, meAdminF10.email);
    await page.goto(`/contratos-clientes/${IDF11C.activo}`);
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar contrato-assinado.pdf" }).click();
    expect((await descarga).suggestedFilename()).toBe("contrato-assinado.pdf");
  });
});

test.describe("cobranças", () => {
  test("Finance: vencidas por atraso, acção sobre uma factura, promessa validada; histórico com nomes; contrato só leitura", async ({ page, api, violacoes }) => {
    await comContratos(api, meFinancasF11).em("POST", "/commercial/collections/actions", { status: 201, corpo: { actionId: "c9" } }).ligar();
    await entrar(page, meFinancasF11.email);
    await page.getByRole("link", { name: "Cobranças" }).click();
    const linhas = page.getByRole("table", { name: "Facturas vencidas" }).getByRole("row");
    await expect(linhas.nth(1)).toContainText("FT 2026/12");
    await expect(linhas.nth(1)).toContainText("79 dias");
    await verificar(page);

    await page.getByRole("button", { name: "Registar acção sobre FT 2026/12" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Tipo").selectOption("PaymentPromise");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Registe o que foi feito ou combinado.")).toBeVisible();
    await expect(d.getByText("Uma promessa precisa de valor positivo.")).toBeVisible();
    await expect(d.getByText("Uma promessa precisa de data.")).toBeVisible();
    await d.getByLabel("Quando").fill("2026-10-18T10:15");
    await d.getByLabel("O que foi feito ou combinado").fill("Paga na sexta.");
    await d.getByLabel("Valor prometido em AOA").fill("570 000");
    await d.getByLabel("Data prometida").fill("2026-10-24");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/commercial/collections/actions")[0]?.corpo).toEqual({
      customerId: IDF3.cliente,
      salesInvoiceId: IDF11C.factura,
      kind: "PaymentPromise",
      notes: "Paga na sexta.",
      occurredAt: "2026-10-18T10:15:00+01:00",
      promisedAmount: "570000.00",
      promisedDate: "2026-10-24",
      nextFollowUpOn: null,
      ownerEmployeeId: null,
    });

    await page.getByRole("link", { name: "Acções" }).click();
    const accao = page.getByRole("table", { name: "Acções de cobrança" }).getByRole("row").nth(1);
    await expect(accao).toContainText("Promessa de pagamento");
    await expect(accao).toContainText("Cliente Teste, Lda");
    await expect(accao).toContainText("FT 2026/40");
    await expect(accao).toContainText("750,00 USD até 17/10/2026");
    await expect(accao).toContainText("<script>x</script>");
    expect(await page.locator("main script").count()).toBe(0);

    // O Finance lê contratos, sem botões nem o nome do cliente (não lê clientes).
    await page.goto(`/contratos-clientes/${IDF11C.activo}`);
    await expect(page.getByRole("button", { name: "Renovar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Anexar ficheiro" })).toHaveCount(0);
    await expect(page.getByText("Cliente Teste, Lda")).toHaveCount(0);
    expect(api.pedidos.some((p) => p.caminho === "/commercial/customers")).toBe(false);
    expect(await violacoes()).toEqual([]);
  });
});

test.describe("ficha do cliente", () => {
  test("separador «Comercial»: oportunidades, propostas, contratos e cobranças do cliente", async ({ page, api }) => {
    await comContratos(api)
      .em("GET", "/commercial/opportunities", { status: 200, corpo: oportunidades() })
      .em("GET", "/commercial/proposals", { status: 200, corpo: propostas() })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.goto(`/clientes/${IDF3.cliente}?vista=comercial`);
    await expect(page.getByRole("list", { name: "Oportunidades" })).toContainText("Auditoria 2027");
    await expect(page.getByRole("list", { name: "Propostas" })).toContainText("PROP-20261015-A1B2C3");
    await expect(page.getByRole("list", { name: "Contratos" })).toContainText("CT-2026/07");
    await expect(page.getByRole("list", { name: "Acções de cobrança" })).toContainText("Promessa de pagamento");
    for (const c of ["/commercial/opportunities", "/commercial/proposals", "/commercial/contracts", "/commercial/collections/actions"]) {
      expect(api.pedidos.some((p) => p.caminho === c && p.query.includes(`customerId=${IDF3.cliente}`))).toBe(true);
    }
  });
});
