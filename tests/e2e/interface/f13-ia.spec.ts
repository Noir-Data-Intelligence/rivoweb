/**
 * F13 (3.º bloco) — IA, sempre com a API simulada (os pedidos reais gastam
 * saldo): nada se pede sem carregar no botão; leitura do período, previsão
 * (429 com a mensagem do limite), rascunho; configuração do fornecedor (sem
 * chave não se escolhe); ler uma factura de compra para pré-preencher o
 * registo (o fornecedor com o mesmo NIF é escolhido); o assistente do
 * portal do cliente; desligada, nenhum botão. Texto da IA nunca vira HTML.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { meCliente } from "../../fixtures/f10";
import { estadoIa, facturaLida, fornecedorIa, leituraIa, meAdminF13, meManagerF13, previsaoIa } from "../../fixtures/f13";
import { factura, fornecedor, IDF5, meGestorF5, painelCarlos } from "../../fixtures/f5";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const pagos = (api: ApiSimulada) => api.pedidos.filter((p) => p.metodo === "POST" && p.caminho.startsWith("/ai/"));

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("assistente de IA", () => {
  test("Manager: nada se pede ao abrir; leitura, previsão com 429 e rascunho por botão", async ({ page, api, violacoes }) => {
    let previsoes = 0;
    await comF1(api, meManagerF13)
      .em("GET", "/ai/status", { status: 200, corpo: estadoIa() })
      .em("POST", "/ai/insights", { status: 200, corpo: leituraIa() })
      .em("POST", "/ai/forecasts/revenue", () => (++previsoes === 1 ? { status: 429, corpo: { title: "Too Many Requests", status: 429 } } : { status: 200, corpo: previsaoIa() }))
      .em("POST", "/ai/drafts", { status: 200, corpo: { kind: "collection-message", text: "Caro cliente,\nlembramos a factura FT 1.", model: "claude-opus-5" } })
      .ligar();
    await entrar(page, meManagerF13.email);
    await page.getByRole("link", { name: "Assistente de IA" }).click();
    await expect(page.getByText("Com anthropic (claude-opus-5)", { exact: false })).toBeVisible();
    await expect(page.getByText("Cada pedido gasta saldo pago", { exact: false })).toBeVisible();
    await page.getByLabel("Moeda").selectOption("USD");
    expect(pagos(api)).toHaveLength(0);
    await verificar(page);

    await page.getByRole("button", { name: "Pedir a leitura" }).click();
    await expect(page.getByRole("list", { name: "Observações" })).toContainText("Pipeline concentrado");
    await expect(page.getByText("<script>x</script>", { exact: false })).toBeVisible();
    expect(await page.locator("main script").count()).toBe(0);
    await expect(page.getByText("Áreas lidas: Finanças, Vendas", { exact: false })).toBeVisible();
    expect(pagos(api)).toHaveLength(1);
    expect(api.escritas("POST", "/ai/insights")[0]?.corpo).toMatchObject({ currency: "USD" });
    await verificar(page);

    await page.getByRole("link", { name: "Previsão de receita" }).click();
    await page.getByLabel("Meses a prever").selectOption("2");
    await page.getByRole("button", { name: "Pedir a previsão" }).click();
    await expect(page.getByText("Limite de pedidos atingido.")).toBeVisible();
    expect(previsoes).toBe(1);
    await page.getByRole("button", { name: "Pedir a previsão" }).click();
    const t = page.getByRole("table", { name: "Receita e despesa por mês" });
    await expect(t.getByRole("row").filter({ hasText: "dezembro" })).toContainText("Previsto");
    await expect(t.getByRole("row").filter({ hasText: "setembro" })).toContainText("Real");
    expect(api.escritas("POST", "/ai/forecasts/revenue")[1]?.corpo).toEqual({ months: 2, currency: "AOA" });

    await page.getByRole("link", { name: "Rascunhos" }).click();
    await page.getByRole("button", { name: "Escrever o rascunho" }).click();
    await expect(page.getByText("Diga o que pretende.")).toBeVisible();
    await page.getByLabel("Tipo de texto").selectOption("collection-message");
    await page.getByLabel("O que pretende").fill("Lembrete cordial de factura vencida.");
    await page.getByRole("button", { name: "Escrever o rascunho" }).click();
    await expect(page.getByLabel("Rascunho")).toContainText("lembramos a factura FT 1.");
    expect(api.escritas("POST", "/ai/drafts")[0]?.corpo).toEqual({ kind: "collection-message", instructions: "Lembrete cordial de factura vencida.", context: null });
    expect(pagos(api)).toHaveLength(4);
    expect(await violacoes()).toEqual([]);
  });

  test("desligada: aviso e nenhum botão", async ({ page, api }) => {
    await comF1(api, meManagerF13).em("GET", "/ai/status", { status: 200, corpo: estadoIa(false) }).ligar();
    await entrar(page, meManagerF13.email);
    await page.goto("/assistente");
    await expect(page.getByText("As funcionalidades de IA não estão ligadas neste servidor.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pedir a leitura" })).toHaveCount(0);
  });

  test("Admin: fornecedor activo e recurso; sem chave não se escolhe", async ({ page, api, violacoes }) => {
    await comF1(api, meAdminF13)
      .em("GET", "/ai/status", { status: 200, corpo: estadoIa() })
      .em("GET", "/ai/provider", { status: 200, corpo: fornecedorIa() })
      .em("PUT", "/ai/provider", { status: 204 })
      .ligar();
    await entrar(page, meAdminF13.email);
    await page.getByRole("link", { name: "Inteligência artificial" }).click();
    await expect(page.getByRole("table", { name: "Fornecedores de IA" }).getByRole("row").filter({ hasText: "outro" })).toContainText("Sem chave");
    await expect(page.getByLabel("Fornecedor activo").locator("option", { hasText: "(sem chave)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await verificar(page);
    await page.getByLabel("Fornecedor activo").selectOption("openai");
    await page.getByLabel("Se o activo falhar, recorrer ao outro").click();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect.poll(() => api.escritas("PUT", "/ai/provider")[0]?.corpo).toEqual({ provider: "openai", fallbackEnabled: false });
    expect(pagos(api)).toHaveLength(0);
    expect(await violacoes()).toEqual([]);
  });
});

test.describe("IA noutros ecrãs", () => {
  test("factura de compra lida com IA: campos preenchidos, fornecedor pelo NIF, avisos; regista o confirmado", async ({ page, api }) => {
    await api
      .comConta(meGestorF5)
      .em("GET", "/dashboard/me", { status: 200, corpo: painelCarlos() })
      .em("GET", "/procurement/suppliers", pag([fornecedor()]))
      .em("GET", "/finance/purchase-invoices", pag([factura()]))
      .em("GET", "/ai/status", { status: 200, corpo: estadoIa() })
      .em("POST", "/ai/invoice-extraction", { status: 200, corpo: facturaLida() })
      .em("POST", "/finance/purchase-invoices", { status: 201, corpo: { purchaseInvoiceId: IDF5.factura } })
      .ligar();
    await entrar(page, meGestorF5.email);
    await page.goto("/facturas-compra");
    await page.getByRole("button", { name: "Registar factura" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByRole("button", { name: "Ler com IA" })).toBeDisabled();
    await d.getByLabel("Ler a factura com IA (opcional)").setInputFiles({ name: "texto.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(d.getByText("Só PDF ou imagem (JPEG, PNG, WebP, GIF).")).toBeVisible();
    await d.getByLabel("Ler a factura com IA (opcional)").setInputFiles({ name: "factura.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    expect(pagos(api)).toHaveLength(0);
    await d.getByRole("button", { name: "Ler com IA" }).click();
    await expect(d.getByRole("list", { name: "Avisos da leitura" })).toContainText("pouco legível");
    await expect(d.getByLabel("Fornecedor", { exact: true })).toHaveValue(IDF5.fornecedor);
    await expect(d.getByLabel("Número da factura")).toHaveValue("FT 2026/777");
    await expect(d.getByLabel("Vence em")).toHaveValue("2026-10-31");
    await expect(d.getByLabel("Valor sem IVA")).toHaveValue("100000");
    await d.getByRole("button", { name: "Registar factura" }).click();
    await expect(page).toHaveURL(new RegExp(`/facturas-compra/${IDF5.factura}$`));
    expect(api.escritas("POST", "/finance/purchase-invoices")[0]?.corpo).toMatchObject({ supplierInvoiceNumber: "FT 2026/777", supplierId: IDF5.fornecedor, issuedOn: "2026-10-01", dueOn: "2026-10-31", netTotal: "100000.00", taxTotal: "14000.00" });
    expect(pagos(api)).toHaveLength(1);
  });

  test("portal do cliente: pergunta, resposta em texto, conversa no ecrã", async ({ page, api, violacoes }) => {
    await api
      .comConta(meCliente)
      .em("GET", "/customer-portal/me", { status: 200, corpo: { customerId: "x", customerName: "Cliente Teste, Lda", from: "2026-10-01", to: "2026-10-22", currency: "AOA", netRevenue: 0, outstanding: 0, invoices: [] } })
      .em("GET", "/ai/status", { status: 200, corpo: estadoIa() })
      .em("POST", "/ai/customer-assistant", { status: 200, corpo: { answer: "Tem 2 facturas por pagar.\n<img src=x onerror=alert(1)>", model: "claude-opus-5" } })
      .ligar();
    await entrar(page, meCliente.email);
    await page.getByRole("link", { name: "Assistente" }).click();
    await page.getByRole("button", { name: "Perguntar" }).click();
    await expect(page.getByText("Escreva a pergunta.")).toBeVisible();
    await page.getByLabel("A sua pergunta").fill("Quanto devo?");
    await page.getByRole("button", { name: "Perguntar" }).click();
    const conversa = page.getByRole("list", { name: "Conversa com o assistente" });
    await expect(conversa).toContainText("Quanto devo?");
    await expect(conversa).toContainText("<img src=x onerror=alert(1)>");
    await expect(conversa).toContainText("Resposta automática, sem valor contratual.");
    await expect(page.getByText("só valem se a empresa os confirmar por escrito", { exact: false })).toBeVisible();
    expect(await page.locator("main img").count()).toBe(0);
    await expect(page.getByLabel("A sua pergunta")).toHaveValue("");
    expect(api.escritas("POST", "/ai/customer-assistant")[0]?.corpo).toEqual({ question: "Quanto devo?" });
    await verificar(page);
    expect(await violacoes()).toEqual([]);
  });
});
