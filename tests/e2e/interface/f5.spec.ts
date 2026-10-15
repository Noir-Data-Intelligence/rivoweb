/**
 * F5 — contas a pagar, com a API simulada: fornecedores (IBAN verificado),
 * factura de compra (valores em texto), pedir pagamento (202, tecto do que
 * falta pedir), executar (só conta da moeda, BR-3 visível, aviso de sucesso),
 * anexos (carregamento e recusa no cliente).
 */
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { aprovacaoPagamento, contas, documento, factura, fornecedor, IDF5, meAdminF5, meFinancasF5, meGestorF5, painelAna, painelCarlos, pedidoPagamento } from "../../fixtures/f5";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });

function comF5(api: ApiSimulada, me = meAdminF5, painel = painelAna()): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/dashboard/me", { status: 200, corpo: painel })
    .em("GET", "/procurement/suppliers", pag([fornecedor()]))
    .em("GET", `/procurement/suppliers/${IDF5.fornecedor}`, { status: 200, corpo: fornecedor(), cabecalhos: { ETag: 'W/"1"' } })
    .em("GET", "/finance/purchase-invoices", pag([factura()]))
    .em("GET", `/finance/purchase-invoices/${IDF5.factura}`, { status: 200, corpo: factura() })
    .em("GET", "/finance/payment-requests", pag([pedidoPagamento()]))
    .em("GET", `/finance/payment-requests/${IDF5.pedido}`, { status: 200, corpo: pedidoPagamento() })
    .em("GET", `/finance/payment-requests/${IDF5.pedido}/documents`, { status: 200, corpo: [] })
    .em("GET", `/approval/requests/${IDF5.aprovacao}`, { status: 200, corpo: aprovacaoPagamento() })
    .em("GET", "/finance/accounts", pag(contas()));
}

test.describe("fornecedores", () => {
  test("lista, IBAN verificado no cliente e registo; 400 só com detalhe aparece", async ({ page, api, violacoes }) => {
    let tentativas = 0;
    await comF5(api)
      .em("POST", "/procurement/suppliers", () =>
        ++tentativas === 1
          ? { status: 400, corpo: { title: "Bad Request", status: 400, detail: "O NIF já pertence a outro fornecedor." }, cabecalhos: { "Content-Type": "application/problem+json" } }
          : { status: 201, corpo: { supplierId: IDF5.fornecedor } },
      )
      .ligar();
    await entrar(page);
    await page.goto("/fornecedores");
    await expect(page.getByRole("link", { name: "Kwanza Serviços, Lda" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Novo fornecedor" }).click();
    await page.getByLabel("Nome").fill("Novo Fornecedor, Lda");
    await page.getByLabel("NIF").fill("5417000002");
    await page.getByLabel("IBAN").fill("AO06 0040 0000 1234 5678 9012 3");
    await page.getByRole("button", { name: "Registar fornecedor" }).click();
    await expect(page.getByText("Este IBAN não passa a verificação.", { exact: false })).toBeVisible();
    expect(api.escritas("POST", "/procurement/suppliers")).toHaveLength(0);
    await page.getByLabel("IBAN").fill("AO30 0040 0000 1234 5678 9012 3");
    await page.getByRole("button", { name: "Registar fornecedor" }).click();
    await expect(page.getByText("O NIF já pertence a outro fornecedor.")).toBeVisible();
    await page.getByRole("button", { name: "Registar fornecedor" }).click();
    await expect(page.getByRole("heading", { name: "Kwanza Serviços, Lda", level: 1 })).toBeVisible();
    expect(api.escritas("POST", "/procurement/suppliers").at(-1)?.corpo).toMatchObject({ name: "Novo Fornecedor, Lda", taxId: "5417000002", iban: "AO30004000001234567890123", email: null, country: "AO" });
    await expect(page.getByText("AO30004000001234567890123")).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });

  test("quem não qualifica fornecedores só lê", async ({ page, api }) => {
    await comF5(api, meFinancasF5).ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto("/fornecedores");
    await expect(page.getByRole("link", { name: "Kwanza Serviços, Lda" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo fornecedor" })).toHaveCount(0);
    await page.getByRole("link", { name: "Kwanza Serviços, Lda" }).click();
    await expect(page.getByRole("button", { name: "Corrigir dados" })).toHaveCount(0);
  });
});

test.describe("facturas de compra", () => {
  test("registar com fornecedor da lista: valores em texto e total à vista", async ({ page, api }) => {
    await comF5(api, meGestorF5, painelCarlos())
      .em("POST", "/finance/purchase-invoices", { status: 201, corpo: { purchaseInvoiceId: IDF5.factura } })
      .ligar();
    await entrar(page, "gestor5@teste.local");
    await page.goto("/facturas-compra");
    await expect(page.getByRole("link", { name: "FT 2026/123" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Registar factura" }).click();
    await page.getByLabel("Fornecedor", { exact: true }).selectOption(IDF5.fornecedor);
    await expect(page.getByLabel("Nome do fornecedor")).toHaveCount(0);
    await page.getByLabel("Número da factura").fill("FT 2026/124");
    await page.getByLabel("Valor sem IVA").fill("1 234 567,89");
    await page.getByLabel("IVA", { exact: true }).fill("172839,50");
    await expect(page.getByText("1 407 407,39", { exact: false })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Registar factura" }).click();
    await expect(page).toHaveURL(new RegExp(`/facturas-compra/${IDF5.factura}$`));
    expect(api.escritas("POST", "/finance/purchase-invoices")[0]?.corpo).toMatchObject({
      supplierInvoiceNumber: "FT 2026/124",
      supplierId: IDF5.fornecedor,
      supplierName: "Kwanza Serviços, Lda",
      supplierTaxId: "5417000001",
      currency: "AOA",
      netTotal: "1234567.89",
      taxTotal: "172839.50",
      purchaseOrderId: null,
    });
  });

  test("pedir pagamento: tecto do que falta pedir, 202 abre o pedido", async ({ page, api }) => {
    await comF5(api, meGestorF5, painelCarlos())
      .em("POST", "/finance/payment-requests", { status: 202, corpo: { paymentRequestId: IDF5.pedido, approvalRequestId: IDF5.aprovacao, estado: "PendenteAprovacao" } })
      .ligar();
    await entrar(page, "gestor5@teste.local");
    await page.goto(`/facturas-compra/${IDF5.factura}`);
    // 1 140 000 de total menos 640 000 já pedidos
    await expect(page.getByText("Falta pedir 500 000,00", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anular" })).toHaveCount(0);
    await page.getByRole("button", { name: "Pedir pagamento" }).click();
    await expect(page.getByLabel(/^Valor/)).toHaveValue("500000,00");
    await page.getByLabel(/^Valor/).fill("500000,01");
    await page.getByRole("dialog").getByRole("button", { name: "Submeter pedido" }).click();
    await expect(page.getByText("Não pode passar de", { exact: false })).toBeVisible();
    expect(api.escritas("POST", "/finance/payment-requests")).toHaveLength(0);
    await page.getByLabel(/^Valor/).fill("250000");
    await page.getByLabel("Notas").fill("Segunda prestação");
    await page.getByRole("dialog").getByRole("button", { name: "Submeter pedido" }).dblclick();
    await expect(page).toHaveURL(new RegExp(`/pedidos-pagamento/${IDF5.pedido}$`));
    expect(api.escritas("POST", "/finance/payment-requests").map((p) => p.corpo)).toEqual([
      { purchaseInvoiceId: IDF5.factura, amount: "250000.00", requestedByEmployeeId: null, requestedOn: null, costCentreId: null, notes: "Segunda prestação" },
    ]);
  });
});

test.describe("pedidos de pagamento", () => {
  test("executar: só contas da moeda, corpo sem quem paga, aviso de sucesso; axe e responsivo", async ({ page, api, violacoes }) => {
    let executado = false;
    await comF5(api, meFinancasF5)
      .em("GET", `/finance/payment-requests/${IDF5.pedido}`, () => ({ status: 200, corpo: pedidoPagamento(executado ? "Executed" : "Eligible") }))
      .em("POST", `/finance/payment-requests/${IDF5.pedido}/execution`, () => {
        executado = true;
        return { status: 200, corpo: { estado: "Executado", saldoRestante: 4360000 } };
      })
      .ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto(`/pedidos-pagamento/${IDF5.pedido}`);
    await expect(page.getByText("Carlos Teste · 14/10/2026")).toBeVisible();
    await expect(page.getByText("Aprovado", { exact: true })).toBeVisible();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Executar pagamento" }).click();
    const opcoes = await page.getByLabel("Conta de onde sai").locator("option").allTextContents();
    expect(opcoes.some((o) => o.includes("Conta USD"))).toBe(false);
    await page.getByRole("dialog").getByRole("button", { name: "Executar pagamento" }).click();
    await expect(page.getByText("Escolha a conta.")).toBeVisible();
    await page.getByLabel("Conta de onde sai").selectOption(IDF5.conta);
    await page.getByLabel("Meio de pagamento").selectOption("MB");
    await page.getByLabel("Referência").fill("MCX-77");
    await page.getByRole("dialog").getByRole("button", { name: "Executar pagamento" }).dblclick();
    await expect(page.getByText("Pagamento executado.")).toBeVisible();
    await expect(page.getByText("4 360 000,00", { exact: false })).toBeVisible();
    expect(api.escritas("POST", `/finance/payment-requests/${IDF5.pedido}/execution`).map((p) => p.corpo)).toEqual([
      { bankAccountId: IDF5.conta, method: "MB", reference: "MCX-77", executedByEmployeeId: null },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("quem pediu não vê executar (BR-3)", async ({ page, api }) => {
    await comF5(api, meFinancasF5, painelCarlos())
      .ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto(`/pedidos-pagamento/${IDF5.pedido}`);
    await expect(page.getByText("Foi você que pediu este pagamento.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Executar pagamento" })).toHaveCount(0);
  });

  test("a aprovação ainda em curso não deixa executar", async ({ page, api }) => {
    await comF5(api, meFinancasF5)
      .em("GET", `/approval/requests/${IDF5.aprovacao}`, { status: 200, corpo: aprovacaoPagamento("InProgress", null) })
      .ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto(`/pedidos-pagamento/${IDF5.pedido}`);
    await expect(page.getByText("Ainda não está aprovado.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Executar pagamento" })).toHaveCount(0);
  });

  test("403 de segregação vindo do servidor aparece no diálogo", async ({ page, api }) => {
    await comF5(api, meFinancasF5)
      .em("POST", `/finance/payment-requests/${IDF5.pedido}/execution`, {
        status: 403,
        corpo: { title: "Forbidden", status: 403, detail: "Quem aprovou o pedido não o pode executar (BR-3)." },
        cabecalhos: { "Content-Type": "application/problem+json" },
      })
      .ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto(`/pedidos-pagamento/${IDF5.pedido}`);
    await page.getByRole("button", { name: "Executar pagamento" }).click();
    await page.getByLabel("Conta de onde sai").selectOption(IDF5.conta);
    await page.getByRole("dialog").getByRole("button", { name: "Executar pagamento" }).click();
    await expect(page.getByRole("dialog").getByText("Quem aprovou o pedido não o pode executar (BR-3).")).toBeVisible();
  });

  test("anexar: recusa no cliente o que nunca passaria; carrega em multipart e liga ao pedido", async ({ page, api }) => {
    let anexos: unknown[] = [];
    await comF5(api, meGestorF5, painelCarlos())
      .em("GET", `/finance/payment-requests/${IDF5.pedido}/documents`, () => ({ status: 200, corpo: anexos }))
      .em("POST", "/documents", { status: 201, corpo: documento() })
      .em("POST", `/finance/payment-requests/${IDF5.pedido}/documents`, () => {
        anexos = [{ linkId: "l1", documentId: IDF5.documento, category: "Proposta", fileName: "factura.pdf", attachedAt: "2026-10-15T09:00:00Z" }];
        return { status: 201, corpo: { id: "l1" } };
      })
      .ligar();
    await entrar(page, "gestor5@teste.local");
    await page.goto(`/pedidos-pagamento/${IDF5.pedido}`);
    await expect(page.getByText("Sem anexos.")).toBeVisible();
    await page.getByRole("button", { name: "Anexar" }).click();
    await page.getByLabel("Ficheiro").setInputFiles({ name: "programa.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
    await expect(page.getByText("Formato não aceite.", { exact: false })).toBeVisible();
    await page.getByLabel("Ficheiro").setInputFiles({ name: "grande.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    await expect(page.getByText("O ficheiro passa de 10 MB.")).toBeVisible();
    expect(api.escritas("POST", "/documents")).toHaveLength(0);
    await page.getByLabel("Tipo").selectOption("Proposta");
    await page.getByLabel("Ficheiro").setInputFiles({ name: "factura.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n") });
    await expect(page.getByRole("dialog").getByText("factura.pdf")).toBeVisible();
    expect(String(api.escritas("POST", "/documents")[0]?.corpo)).toContain('name="category"');
    await page.getByRole("dialog").getByRole("button", { name: "Anexar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/payment-requests/${IDF5.pedido}/documents`).map((p) => p.corpo)).toEqual([{ documentId: IDF5.documento, category: "Proposta" }]);
    await expect(page.getByText("Proposta ·", { exact: false })).toBeVisible();
    await expect(page.getByText("(B20)", { exact: false })).toBeVisible();
  });
});
