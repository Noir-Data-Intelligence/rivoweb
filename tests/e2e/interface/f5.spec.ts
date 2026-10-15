/**
 * F5 — contas a pagar, com a API simulada: fornecedores (IBAN verificado),
 * factura de compra (valores em texto), pedir pagamento (202, tecto do que
 * falta pedir), executar (só conta da moeda, BR-3 visível, aviso de sucesso),
 * anexos (carregamento e recusa no cliente).
 */
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { colaboradores } from "../../fixtures/f1";
import { meColaborador } from "../../fixtures/identidade";
import {
  aprovacaoPagamento,
  cambios,
  contas,
  despesa,
  documento,
  extracto,
  factura,
  fornecedor,
  fundo,
  IDF5,
  IDF5D,
  IDF5T,
  itemPrevisao,
  letra,
  linhaExtracto,
  meAdminF5,
  meFinancasF5,
  meGestorF5,
  minhaDespesa,
  movimentosFundo,
  painelAna,
  painelCarlos,
  pedidoPagamento,
  previsto,
  reconciliacao,
  resumoDespesas,
} from "../../fixtures/f5";

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

function comDespesas(api: ApiSimulada, me = meAdminF5, painel = painelAna()): ApiSimulada {
  const outra = { ...despesa("Reimbursed"), expenseId: "00000000-0000-4000-8000-000000000919" };
  return comF5(api, me, painel)
    .em("GET", "/finance/expenses", { status: 200, corpo: [despesa(), outra] })
    .em("GET", "/finance/expenses/summary", { status: 200, corpo: resumoDespesas() })
    .em("GET", `/finance/expenses/${IDF5D.despesa}`, { status: 200, corpo: despesa() })
    .em("GET", "/hr/employees", pag(colaboradores()));
}

test.describe("despesas", () => {
  test("resumo, filtro por estado e registo em nome de um colaborador; axe e responsivo", async ({ page, api, violacoes }) => {
    await comDespesas(api)
      .em("POST", "/finance/expenses", { status: 201, corpo: { id: IDF5D.despesa } })
      .ligar();
    await entrar(page);
    await page.goto("/despesas");
    await expect(page.getByText("3 260 500,00", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Táxi para reunião no cliente" }).first()).toBeVisible();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByLabel("Estado").selectOption("Submitted");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/finance/expenses" && p.query.includes("status=Submitted"))).toBe(true);
    await page.getByRole("button", { name: "Registar despesa" }).click();
    await page.getByLabel("Categoria").fill("Combustível");
    await page.getByLabel("Descrição").fill("Gasóleo da viatura de serviço");
    await page.getByLabel("Valor").fill("25 000,50");
    await page.getByRole("dialog").getByRole("button", { name: "Registar despesa" }).click();
    await expect(page.getByText("Escolha o colaborador.")).toBeVisible();
    await page.getByLabel("Colaborador").selectOption({ label: "Carlos Teste" });
    await page.getByRole("dialog").getByRole("button", { name: "Registar despesa" }).click();
    await expect(page).toHaveURL(new RegExp(`/despesas/${IDF5D.despesa}$`));
    expect(api.escritas("POST", "/finance/expenses")[0]?.corpo).toMatchObject({ category: "Combustível", amount: "25000.50", currency: "AOA", billable: false, projectId: null, receiptDocumentId: null });
    expect(await violacoes()).toEqual([]);
  });

  test("rejeitar exige motivo; aprovar sem notas; comprovativo descarrega com o arquivo", async ({ page, api }) => {
    await comDespesas(api)
      .em("POST", `/finance/expenses/${IDF5D.despesa}/rejection`, { status: 204 })
      .em("POST", `/finance/expenses/${IDF5D.despesa}/approval`, { status: 204 })
      .em("GET", `/documents/${IDF5D.comprovativo}`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .ligar();
    await entrar(page);
    await page.goto(`/despesas/${IDF5D.despesa}`);
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar" }).click();
    expect((await descarga).suggestedFilename()).toContain("comprovativo");
    await page.getByRole("button", { name: "Rejeitar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(page.getByText("Indique o motivo da rejeição.")).toBeVisible();
    await page.getByLabel("Motivo").fill("Valor acima do limite diário.");
    await page.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/expenses/${IDF5D.despesa}/rejection`).map((p) => p.corpo)).toEqual([{ notes: "Valor acima do limite diário." }]);
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/expenses/${IDF5D.despesa}/approval`).map((p) => p.corpo)).toEqual([{ notes: null }]);
  });

  test("a própria despesa não se decide; quem não lê o arquivo vê o porquê (B20)", async ({ page, api }) => {
    await comDespesas(api, meGestorF5, painelCarlos()).ligar();
    await entrar(page, "gestor5@teste.local");
    await page.goto(`/despesas/${IDF5D.despesa}`);
    await expect(page.getByText("É a sua despesa.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
    await expect(page.getByText("(B20)", { exact: false })).toBeVisible();
  });

  test("reembolsar: data, conta da moeda e referência", async ({ page, api }) => {
    await comDespesas(api, meFinancasF5)
      .em("GET", `/finance/expenses/${IDF5D.despesa}`, { status: 200, corpo: despesa("Approved") })
      .em("POST", `/finance/expenses/${IDF5D.despesa}/reimbursement`, { status: 204 })
      .ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto(`/despesas/${IDF5D.despesa}`);
    await page.getByRole("button", { name: "Marcar reembolsada" }).click();
    await page.getByLabel("Data do reembolso").fill("2026-10-14");
    await page.getByLabel("Conta de onde saiu (opcional)").selectOption(IDF5.conta);
    await page.getByLabel("Referência (opcional)").fill("TRF-9");
    await page.getByRole("dialog").getByRole("button", { name: "Marcar reembolsada" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/expenses/${IDF5D.despesa}/reimbursement`).map((p) => p.corpo)).toEqual([{ on: "2026-10-14", fromAccountId: IDF5.conta, reference: "TRF-9" }]);
  });

  test("portal: submeter com comprovativo e retirar", async ({ page, api, violacoes }) => {
    const colaborador = { ...meColaborador, permissions: ["documents.write"] };
    let lista = [minhaDespesa()];
    await api
      .comConta(colaborador)
      .em("GET", "/portal/me/expenses", () => ({ status: 200, corpo: lista }))
      .em("POST", "/documents", { status: 201, corpo: { ...documento("recibo.jpg"), documentId: IDF5D.comprovativo, category: "Comprovativo de despesa" } })
      .em("POST", "/portal/me/expenses", { status: 201, corpo: { expenseId: "00000000-0000-4000-8000-000000000918" } })
      .em("POST", `/portal/me/expenses/${IDF5D.minha}/withdrawal`, () => {
        lista = [minhaDespesa("Withdrawn")];
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meColaborador.email);
    await page.getByRole("navigation", { name: "Principal" }).first().getByRole("link", { name: "Despesas" }).click();
    await expect(page.getByRole("heading", { name: "As minhas despesas", level: 1 })).toBeVisible();
    await expect(page.getByText("Almoço com cliente")).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Nova despesa" }).click();
    await page.getByLabel("Categoria").fill("Transporte");
    await page.getByLabel("Descrição").fill("Táxi para o aeroporto");
    await page.getByLabel("Valor").fill("9000");
    await page.getByLabel("Comprovativo (opcional)").setInputFiles({ name: "recibo.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) });
    await expect(page.getByRole("dialog").getByText("recibo.jpg")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Submeter" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/portal/me/expenses")[0]?.corpo).toMatchObject({ description: "Táxi para o aeroporto", amount: "9000.00", receiptDocumentId: IDF5D.comprovativo });
    await page.getByRole("button", { name: "Retirar a despesa Almoço com cliente" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Retirar" }).click();
    await expect(page.getByText("Retirada")).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });

  test("portal sem ficha ligada explica em vez de mostrar erro", async ({ page, api }) => {
    await api
      .comConta({ ...meColaborador, permissions: ["documents.write"] })
      .em("GET", "/portal/me/expenses", { status: 403, corpo: { title: "Forbidden", status: 403 }, cabecalhos: { "Content-Type": "application/problem+json" } })
      .ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/despesas");
    await expect(page.getByText("A sua conta não está ligada a uma ficha de colaborador.")).toBeVisible();
  });
});

function comTesouraria(api: ApiSimulada, me = meAdminF5): ApiSimulada {
  return comF5(api, me)
    .em("GET", `/finance/accounts/${IDF5.conta}/statement`, { status: 200, corpo: extracto() })
    .em("GET", `/finance/accounts/${IDF5.conta}/reconciliation`, { status: 200, corpo: reconciliacao() })
    .em("GET", `/finance/accounts/${IDF5.conta}/statement-lines`, { status: 200, corpo: [linhaExtracto()] })
    .em("GET", "/finance/exchange-rates", { status: 200, corpo: cambios() })
    .em("GET", "/finance/petty-cash", { status: 200, corpo: [fundo()] })
    .em("GET", `/finance/petty-cash/${IDF5T.fundo}/movements`, { status: 200, corpo: movimentosFundo() })
    .em("GET", "/finance/bills", { status: 200, corpo: [letra()] })
    .em("GET", `/finance/bills/${IDF5T.letra}`, { status: 200, corpo: letra() })
    .em("GET", "/finance/cash-flow/forecast", { status: 200, corpo: previsto() })
    .em("GET", "/finance/cash-flow/actual", { status: 200, corpo: { from: "2026-04-15", to: "2026-10-15", bankAccountId: null, totalInflows: 5100000, totalOutflows: 100000, months: [{ month: "2026-10", inflows: 5100000, outflows: 100000, net: 5000000 }] } })
    .em("GET", "/finance/cash-flow/items", { status: 200, corpo: [itemPrevisao()] });
}

test.describe("tesouraria", () => {
  test("contas e ficha: extracto, depósito em texto; axe e responsivo", async ({ page, api, violacoes }) => {
    await comTesouraria(api)
      .em("POST", `/finance/accounts/${IDF5.conta}/deposits`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/contas");
    await expect(page.getByRole("link", { name: "Conta à ordem BAI" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Conta à ordem BAI" }).click();
    await expect(page.getByRole("cell", { name: "Levantamento para caixa" })).toBeVisible();
    await expect(page.getByText("5 100 000,00 Kz").first()).toBeVisible();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Depositar" }).click();
    await page.getByLabel(/^Valor/).fill("1 250 000,5");
    await page.getByLabel("Referência (opcional)").fill("DEP-1");
    await page.getByRole("dialog").getByRole("button", { name: "Depositar" }).dblclick();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/accounts/${IDF5.conta}/deposits`).map((p) => p.corpo)).toEqual([{ amount: "1250000.50", reference: "DEP-1" }]);
    expect(await violacoes()).toEqual([]);
  });

  test("reconciliação: conciliar à mão com o movimento do mesmo valor primeiro", async ({ page, api }) => {
    await comTesouraria(api)
      .em("POST", `/finance/statement-lines/${IDF5T.linha}/match`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto(`/contas/${IDF5.conta}?vista=reconciliacao`);
    await expect(page.getByRole("cell", { name: "LEV BALCAO" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Conciliar", exact: true }).click();
    const primeira = await page.getByRole("dialog").getByLabel("Movimento da conta").locator("option").nth(1).textContent();
    expect(primeira).toContain("Levantamento para caixa");
    await page.getByRole("dialog").getByLabel("Movimento da conta").selectOption(IDF5T.movimento);
    await page.getByRole("dialog").getByRole("button", { name: "Conciliar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/statement-lines/${IDF5T.linha}/match`).map((p) => p.corpo)).toEqual([{ movementId: IDF5T.movimento }]);
  });

  test("o Manager vê contas e movimenta, mas não a reconciliação", async ({ page, api }) => {
    await comTesouraria(api, meGestorF5).ligar();
    await entrar(page, "gestor5@teste.local");
    await page.goto(`/contas/${IDF5.conta}?vista=reconciliacao`);
    await expect(page.getByRole("cell", { name: "Levantamento para caixa" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reconciliação" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Depositar" })).toBeVisible();
  });

  test("câmbios: lista, taxa com 6 casas em texto e conversão; 404 sem taxa", async ({ page, api, violacoes }) => {
    await comTesouraria(api)
      .em("POST", "/finance/exchange-rates", { status: 201, corpo: { id: "00000000-0000-4000-8000-000000000931" } })
      .em("GET", "/finance/exchange-rates/conversion", (route) => {
        const q = new URL(route.request().url()).searchParams;
        return q.get("from") === "EUR"
          ? { status: 404, corpo: { title: "Not Found", status: 404 }, cabecalhos: { "Content-Type": "application/problem+json" } }
          : { status: 200, corpo: { amount: 100, from: "USD", to: "AOA", on: "2026-10-15", rate: 932.8183, rateDate: "2026-10-07", converted: 93281.83 } };
      })
      .ligar();
    await entrar(page);
    await page.goto("/cambios");
    await expect(page.getByRole("cell", { name: "932,818300 AOA" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByLabel("Valor").fill("100");
    await page.getByRole("button", { name: "Converter" }).click();
    await expect(page.getByText("93 281,83 Kz")).toBeVisible();
    await page.getByLabel("De", { exact: true }).selectOption("EUR");
    await page.getByRole("button", { name: "Converter" }).click();
    await expect(page.getByText("Não há câmbio registado", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Registar câmbio" }).click();
    await page.getByRole("dialog").getByLabel(/^Taxa/).fill("1021,1668");
    await page.getByRole("dialog").getByRole("button", { name: "Registar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/finance/exchange-rates")[0]?.corpo).toMatchObject({ currency: "USD", rate: "1021.1668", source: "BNA" });
    expect(await violacoes()).toEqual([]);
  });

  test("caixa pequena: reposição sem valor repõe o que falta", async ({ page, api }) => {
    await comTesouraria(api, meFinancasF5)
      .em("POST", `/finance/petty-cash/${IDF5T.fundo}/movements`, { status: 201, corpo: { id: "00000000-0000-4000-8000-000000000932" } })
      .ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto("/caixa-pequena");
    await page.getByRole("link", { name: "Caixa da sede" }).click();
    await expect(page.getByText("259 500,00 Kz").first()).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Registar movimento" }).click();
    await page.getByRole("dialog").getByLabel("Tipo").selectOption("Replenishment");
    await expect(page.getByText("Vazio repõe o que falta: 259 500,00 Kz.")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Registar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/petty-cash/${IDF5T.fundo}/movements`)[0]?.corpo).toMatchObject({ kind: "Replenishment", amount: null });
  });

  test("letras: só as acções do estado; descontar com encargos em texto", async ({ page, api }) => {
    await comTesouraria(api, meFinancasF5)
      .em("POST", `/finance/bills/${IDF5T.letra}/discount`, { status: 204 })
      .ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto("/letras");
    await page.getByRole("link", { name: "L2026-003" }).click();
    await expect(page.getByRole("button", { name: "Registar aceite" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Endossar" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Descontar" }).click();
    await page.getByRole("dialog").getByLabel(/^Encargos/).fill("9260000");
    await page.getByRole("dialog").getByRole("button", { name: "Descontar" }).click();
    await expect(page.getByText("Os encargos vão de zero a menos do valor da letra.")).toBeVisible();
    await page.getByRole("dialog").getByLabel(/^Encargos/).fill("125 000");
    await page.getByRole("dialog").getByRole("button", { name: "Descontar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/finance/bills/${IDF5T.letra}/discount`)[0]?.corpo).toEqual({ on: expect.any(String), fee: "125000.00", bank: "BAI", notes: null });
  });

  test("fluxo de caixa: previsto por mês e origem, realizado, previsões manuais; axe", async ({ page, api, violacoes }) => {
    await comTesouraria(api, meFinancasF5).ligar();
    await entrar(page, "financas5@teste.local");
    await page.goto("/fluxo-caixa");
    await expect(page.getByRole("cell", { name: "6 500 000,00 Kz" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Previsão manual" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Realizado" }).click();
    await expect(page.getByRole("cell", { name: "5 000 000,00 Kz" })).toBeVisible();
    await page.getByRole("link", { name: "Previsões manuais" }).click();
    await expect(page.getByText("mensal até", { exact: false })).toBeVisible();
    await semViolacoesAxe(page);
    expect(await violacoes()).toEqual([]);
  });
});
