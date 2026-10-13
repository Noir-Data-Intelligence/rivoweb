/**
 * F3 — clientes e facturação, com a API simulada. O que sobe à API em cada
 * escrita (dinheiro em texto, nunca number), confirmações de emissão e de
 * envio, sem duplo envio, permissões por perfil, axe e CSP.
 */
import { IDF3, meFinancas, meVendas } from "../../fixtures/f3";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test } from "../apoio";
import { comF3 } from "../apoio-f3";

test.describe("clientes", () => {
  test("lista, registo com país em maiúsculas, ficha e contacto; axe e CSP", async ({ page, api, violacoes }) => {
    await comF3(api)
      .em("POST", "/commercial/customers", { status: 201, corpo: { customerId: IDF3.cliente } })
      .em("POST", `/commercial/customers/${IDF3.cliente}/contacts`, { status: 201, corpo: { id: IDF3.contacto } })
      .ligar();
    await entrar(page);
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Clientes" }).first().click();
    await expect(page.getByRole("link", { name: "Cliente Teste, Lda" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Novo cliente" }).click();
    await page.getByLabel("Nome", { exact: true }).fill("Outro Cliente");
    await page.getByLabel("NIF").fill("5000000002");
    await page.getByLabel("Morada de facturação").fill("Av. Teste, 2");
    await page.getByLabel("Cidade").fill("Benguela");
    await page.getByLabel("País").fill("ao");
    await page.getByRole("button", { name: "Registar cliente" }).click();
    await expect(page).toHaveURL(new RegExp(`/clientes/${IDF3.cliente}$`));
    expect(api.escritas("POST", "/commercial/customers")[0]?.corpo).toMatchObject({ name: "Outro Cliente", taxId: "5000000002", country: "AO", email: null, accountType: "Customer" });
    await page.getByRole("button", { name: "Contacto" }).click();
    await page.getByRole("dialog").getByLabel("Nome").fill("Maria Teste");
    await page.getByRole("dialog").getByLabel("Contacto de facturação").check();
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/customers/${IDF3.cliente}/contacts`)[0]?.corpo).toEqual({ name: "Maria Teste", role: null, email: null, phone: null, decisionMaker: false, billingContact: true });
    await semViolacoesAxe(page);
    expect(await violacoes()).toEqual([]);
  });

  test("eliminar com história: 409 e oferece desactivar", async ({ page, api }) => {
    await comF3(api)
      .em("DELETE", `/commercial/customers/${IDF3.cliente}`, { status: 409, corpo: { title: "Conflito", status: 409, detail: "O cliente tem documentos." }, cabecalhos: { "Content-Type": "application/problem+json" } })
      .em("POST", `/commercial/customers/${IDF3.cliente}/status`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto(`/clientes/${IDF3.cliente}`);
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("O cliente tem documentos.")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar em vez disso" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const pedido = api.escritas("POST", `/commercial/customers/${IDF3.cliente}/status`)[0];
    expect(pedido?.corpo).toEqual({ active: false });
    expect(pedido?.ifMatch).toBe('"2"');
  });
});

test.describe("facturas", () => {
  test("nova factura: totais previstos, rascunho com dinheiro em texto, emissão confirmada", async ({ page, api }) => {
    await comF3(api)
      .em("POST", "/finance/invoice-drafts", { status: 201, corpo: { draftId: IDF3.rascunho } })
      .em("GET", `/finance/invoice-drafts/${IDF3.rascunho}`, {
        status: 200,
        corpo: {
          draftId: IDF3.rascunho, customerId: IDF3.cliente, documentType: "FT", series: null, currency: "AOA", dueDate: null, paymentTerms: null, withholdingRate: "6.5",
          paymentMethod: null, referencedInvoiceId: null, lines: [{ description: "Consultoria", quantity: 2.5, unitPrice: 1000.1, taxCode: "NOR" }], netTotal: 2500.25, notes: null,
          createdAt: "2026-10-13T10:00:00Z", updatedAt: "2026-10-13T10:00:00Z", issuedInvoiceId: null,
        },
      })
      .em("POST", `/finance/invoice-drafts/${IDF3.rascunho}/issue`, { status: 201, corpo: { id: IDF3.factura, number: "FT S001/17" }, atrasoMs: 700 })
      .ligar();
    await entrar(page);
    await page.goto("/facturas");
    await page.getByRole("link", { name: "Nova factura" }).click();
    // A lista fica no ecrã enquanto o editor carrega: esperar pelo editor.
    await expect(page.getByRole("heading", { name: "Nova factura", level: 1 })).toBeVisible();
    await page.getByLabel("Cliente").selectOption(IDF3.cliente);
    await expect(page.getByLabel("Cliente")).toHaveValue(IDF3.cliente);
    await page.getByLabel("Retenção na fonte (%)").fill("6,5");
    await expect(page.getByLabel("Cliente")).toHaveValue(IDF3.cliente);
    await page.getByLabel("Descrição").fill("Consultoria");
    await page.getByLabel("Qtd.").fill("2,5");
    await page.getByLabel("Preço unitário").fill("1 000,10");
    // Pré-visualização com a taxa em vigor (Admin lê as taxas): IVA 14 %.
    const totais = page.getByRole("definition");
    await expect(page.getByLabel("Totais previstos")).toContainText("2 500,25 Kz");
    await expect(page.getByLabel("Totais previstos")).toContainText("350,04 Kz");
    await expect(page.getByLabel("Totais previstos")).toContainText("162,52 Kz");
    await expect(page.getByLabel("Totais previstos")).toContainText("2 687,77 Kz");
    expect(await totais.count()).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Emitir…" }).click();
    const dialogo = page.getByRole("dialog", { name: /Emitir Factura/ });
    await expect(dialogo).toContainText("não se apaga");
    expect(api.escritas("POST", "/finance/invoice-drafts")[0]?.corpo).toEqual({
      customerId: IDF3.cliente, documentType: "FT", series: null, currency: "AOA", dueDate: null, paymentTerms: null, withholdingRate: "6.5",
      paymentMethod: null, referencedInvoiceId: null, notes: null, lines: [{ description: "Consultoria", quantity: "2.5", unitPrice: "1000.10", taxCode: "NOR" }],
    });
    // Clique duplo com rede lenta: um só pedido de emissão.
    await dialogo.getByRole("button", { name: "Emitir documento" }).dblclick();
    await expect(page).toHaveURL(new RegExp(`/facturas/${IDF3.factura}$`));
    expect(api.escritas("POST", `/finance/invoice-drafts/${IDF3.rascunho}/issue`)).toHaveLength(1);
  });

  test("ficha: números do servidor, PDF, envio e anulação confirmados", async ({ page, api }) => {
    await comF3(api)
      .em("GET", `/finance/sales-invoices/${IDF3.factura}/document`, { status: 200, bruto: { conteudo: "%PDF-1.4 teste", tipo: "application/pdf" } })
      .em("POST", `/finance/sales-invoices/${IDF3.factura}/delivery`, { status: 200, corpo: { enviadoPara: "cliente@teste.local" } })
      .em("POST", `/finance/sales-invoices/${IDF3.factura}/cancellation`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto(`/facturas/${IDF3.factura}`);
    await expect(page.getByRole("heading", { name: "FT S001/17" })).toBeVisible();
    await expect(page.getByText("114 000,00 Kz").first()).toBeVisible();
    await expect(page.getByText("100 000,00 Kz").first()).toBeVisible();
    const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PDF" }).click()]);
    expect(descarga.suggestedFilename()).toBe("FT S001-17.pdf");
    await page.getByRole("button", { name: "Enviar ao cliente" }).click();
    await expect(page.getByRole("dialog")).toContainText("Sai um e-mail para o endereço do cliente");
    await page.getByRole("dialog").getByRole("button", { name: "Enviar e-mail" }).click();
    await expect(page.getByText("FT S001/17 enviado para cliente@teste.local.")).toBeVisible();
    await page.getByRole("button", { name: "Anular" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Anular documento" }).click();
    await expect(page.getByText("Indique o motivo da anulação.")).toBeVisible();
    await page.getByLabel("Motivo").fill("Emitida em duplicado");
    await page.getByRole("dialog").getByRole("button", { name: "Anular documento" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/sales-invoices/${IDF3.factura}/cancellation`)[0]?.corpo).toEqual({ reason: "Emitida em duplicado" });
    await semViolacoesAxe(page);
  });

  test("nota de crédito e recibo a partir da factura", async ({ page, api }) => {
    await comF3(api)
      .em("POST", "/finance/credit-notes", { status: 201, corpo: { creditNoteId: IDF3.nota, number: "NC S001/1" } })
      .em("GET", `/finance/credit-notes/${IDF3.nota}`, { status: 404, corpo: { status: 404 }, cabecalhos: { "Content-Type": "application/problem+json" } })
      .em("POST", "/finance/receipts", { status: 201, corpo: { receiptId: IDF3.recibo, number: "RG S001/4" } })
      .em("GET", `/finance/receipts/${IDF3.recibo}`, { status: 404, corpo: { status: 404 }, cabecalhos: { "Content-Type": "application/problem+json" } })
      .ligar();
    await entrar(page);
    await page.goto(`/facturas/${IDF3.factura}`);
    await page.getByRole("button", { name: "Nota de crédito" }).click();
    await page.getByRole("dialog").getByLabel(/Consultoria/).fill("1");
    await page.getByRole("dialog").getByLabel("Motivo").fill("Desconto acordado");
    await expect(page.getByRole("dialog")).toContainText("57 000,00 Kz");
    await page.getByRole("button", { name: "Emitir nota de crédito" }).click();
    await expect(page).toHaveURL(new RegExp(`/notas-credito/${IDF3.nota}$`));
    expect(api.escritas("POST", "/finance/credit-notes")[0]?.corpo).toEqual({
      salesInvoiceId: IDF3.factura, series: null, issuedOn: null, reason: "Desconto acordado", lines: [{ description: "Consultoria", quantity: "1", unitPrice: "50000", taxCode: "NOR" }],
    });
    await page.goto(`/facturas/${IDF3.factura}`);
    await page.getByRole("button", { name: "Registar recebimento" }).click();
    await page.getByLabel("Valor recebido").fill("100 000,01");
    await page.getByLabel("Meio").selectOption("TB");
    await page.getByRole("button", { name: "Emitir recibo" }).click();
    await expect(page.getByText("Entre 0 e o valor em aberto")).toBeVisible();
    await page.getByLabel("Valor recebido").fill("40 000,50");
    await page.getByRole("button", { name: "Emitir recibo" }).click();
    await expect(page).toHaveURL(new RegExp(`/recibos/${IDF3.recibo}$`));
    expect(api.escritas("POST", "/finance/receipts")[0]?.corpo).toMatchObject({ method: "TB", settlements: [{ salesInvoiceId: IDF3.factura, amount: "40000.50" }] });
  });

  test("pró-forma: converter em factura-recibo exige o meio", async ({ page, api }) => {
    await comF3(api).em("POST", `/finance/proformas/${IDF3.proforma}/conversion`, { status: 201, corpo: { id: IDF3.factura, number: "FR S001/1" } }).ligar();
    await entrar(page);
    await page.goto("/proformas");
    await page.getByRole("button", { name: "Converter" }).click();
    await page.getByRole("dialog").getByLabel("Tipo").selectOption("FR");
    await page.getByRole("button", { name: "Emitir factura" }).click();
    await expect(page.getByText("Escolha o meio.")).toBeVisible();
    await page.getByRole("dialog").getByLabel("Meio de pagamento").selectOption("NU");
    await page.getByRole("button", { name: "Emitir factura" }).click();
    await expect(page).toHaveURL(new RegExp(`/facturas/${IDF3.factura}$`));
    expect(api.escritas("POST", `/finance/proformas/${IDF3.proforma}/conversion`)[0]?.corpo).toMatchObject({ documentType: "FR", paymentMethod: "NU", dueDate: null });
  });

  test("a receber, configuração e responsividade", async ({ page, api }) => {
    await comF3(api).ligar();
    await entrar(page);
    await page.goto("/a-receber");
    await expect(page.getByText("57 000,50 Kz").first()).toBeVisible();
    await expect(page.getByText("74 dias")).toBeVisible();
    await page.goto("/facturacao");
    await expect(page.getByText("14 % desde 01/10/2019", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir série" })).toBeVisible();
    for (const caminho of ["/facturas", `/facturas/${IDF3.factura}`, "/facturas/rascunhos/novo"]) {
      await page.goto(caminho);
      await page.setViewportSize({ width: 360, height: 800 });
      await page.getByRole("heading", { level: 1 }).waitFor();
      await semScrollHorizontal(page);
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    await semViolacoesAxe(page);
  });
});

test.describe("permissões por perfil", () => {
  test("Vendas: emite e envia, sem anular, creditar nem receber; IVA só na emissão", async ({ page, api }) => {
    await comF3(api, meVendas).ligar();
    await entrar(page, "vendas@teste.local");
    await page.goto(`/facturas/${IDF3.factura}`);
    await expect(page.getByRole("button", { name: "Enviar ao cliente" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anular" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nota de crédito" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Registar recebimento" })).toHaveCount(0);
    await page.goto("/facturas/rascunhos/novo");
    await page.getByLabel("Preço unitário").fill("100");
    await expect(page.getByLabel("Totais previstos")).toContainText("Na emissão");
    expect(api.pedidos.some((p) => p.caminho === "/fiscal/tax-rates")).toBe(false);
  });

  test("Finanças: anula, credita e recebe; sem nova factura nem envio", async ({ page, api }) => {
    await comF3(api, meFinancas).ligar();
    await entrar(page, "financas@teste.local");
    await page.goto("/facturas");
    await expect(page.getByRole("link", { name: "Nova factura" })).toHaveCount(0);
    await page.goto(`/facturas/${IDF3.factura}`);
    await expect(page.getByRole("button", { name: "Anular" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nota de crédito" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registar recebimento" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar ao cliente" })).toHaveCount(0);
    await page.goto("/facturas/rascunhos/novo");
    await expect(page.getByText("Não tem acesso", { exact: false })).toBeVisible();
    expect(api.pedidos.some((p) => p.caminho === "/commercial/customers")).toBe(false);
  });
});
