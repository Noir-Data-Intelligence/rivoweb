/**
 * F10 (1.º bloco) — portal do cliente, com a API simulada: início (em dívida,
 * facturas), extracto (período no URL), pagamentos (comprovativo carregado e
 * enviado com o valor em texto, `?factura=`), documentos (descarregar em
 * anexo), mensagens, suporte (abrir, responder, avaliar um fechado) e ajuda
 * (pesquisa no URL, artigo em texto simples, «foi útil?»). Nenhum pedido leva
 * o id do cliente (S9). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { artigo, artigos, comprovativos, extracto, ficheiros, IDF10, meCliente, mensagens, partilhados, resumo, tickets } from "../../fixtures/f10";

function comPortal(api: ApiSimulada): ApiSimulada {
  return api
    .comConta(meCliente)
    .em("GET", "/customer-portal/me", (route) => {
      const q = new URL(route.request().url()).searchParams;
      return { status: 200, corpo: resumo(q.get("from") ?? "", q.get("to") ?? "") };
    })
    .em("GET", "/customer-portal/me/statement", { status: 200, corpo: extracto() })
    .em("GET", "/customer-portal/me/payment-claims", { status: 200, corpo: comprovativos() })
    .em("GET", "/customer-portal/me/messages", { status: 200, corpo: mensagens() })
    .em("GET", "/customer-portal/me/tickets", { status: 200, corpo: tickets() })
    .em("GET", "/customer-portal/me/documents", { status: 200, corpo: partilhados() })
    .em("GET", "/documents/me", { status: 200, corpo: ficheiros() })
    .em("GET", "/customer-portal/me/knowledge-base", { status: 200, corpo: artigos() })
    .em("GET", "/customer-portal/me/knowledge-base/como-enviar-um-comprovativo", { status: 200, corpo: artigo() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

/** S9: os pedidos do portal nunca dizem de que cliente são. */
function semIdDeCliente(api: ApiSimulada) {
  const suspeitos = api.pedidos.filter((p) => /customerId|customer_id/i.test(p.query) || /customerId/i.test(JSON.stringify(p.corpo ?? "")) || p.caminho.includes(IDF10.cliente));
  expect(suspeitos).toEqual([]);
}

const espacos = (s: string) => s.replace(/[\u00A0\u202F]/g, " ");

test.describe("portal do cliente", () => {
  test("início: em dívida, facturas e o caminho para enviar o comprovativo", async ({ page, api, violacoes }) => {
    await comPortal(api).ligar();
    await entrar(page, meCliente.email);
    await expect(page).toHaveURL(/\/cliente$/);
    await expect(page.getByRole("heading", { name: "Cliente Teste, Lda", level: 1 })).toBeVisible();
    await expect.poll(async () => espacos(await page.getByText("Em dívida hoje").locator("..").innerText())).toContain("1 250 000,50 Kz");
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    for (const n of ["Extracto", "Pagamentos", "Documentos", "Mensagens", "Suporte", "Ajuda"]) await expect(menu.getByRole("link", { name: n })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "FT 2026/12" }).getByText("Anulado")).toBeVisible();
    await expect(page.getByRole("link", { name: "Enviar o comprovativo da factura FT 2026/12" })).toHaveCount(0);
    await verificar(page);
    await page.getByRole("link", { name: "Enviar o comprovativo da factura FT 2026/57" }).click();
    await expect(page).toHaveURL(new RegExp(`/cliente/pagamentos\\?factura=${IDF10.factura2}`));
    await expect(page.getByRole("dialog").getByLabel("Factura")).toHaveValue(IDF10.factura2);
    semIdDeCliente(api);
    expect(await violacoes()).toEqual([]);
  });

  test("pagamentos: lista com o motivo da rejeição; enviar validado, com o ficheiro carregado e o valor em texto", async ({ page, api }) => {
    await comPortal(api)
      .em("POST", "/documents", { status: 201, corpo: { ...ficheiros()[0], documentId: IDF10.documento, fileName: "comprovativo.pdf" } })
      .em("POST", "/customer-portal/me/payment-claims", { status: 201, corpo: { claimId: "00000000-0000-4000-8000-000000000f29" } })
      .ligar();
    await entrar(page, meCliente.email);
    await page.goto("/cliente/pagamentos");
    const rejeitado = page.getByRole("row").filter({ hasText: "O valor não entrou na conta." });
    await expect(rejeitado).toContainText("FT 2026/41");
    await expect(rejeitado.getByText("Rejeitado")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "750 000,50" }).getByText("Por confirmar")).toBeVisible();
    await verificar(page);

    await page.getByRole("button", { name: "Enviar comprovativo" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Factura").locator("option")).toHaveText(["Escolha…", /FT 2026\/57/, /FT 2026\/41/]);
    await d.getByLabel("Pago a").fill("2099-01-01");
    await d.getByRole("button", { name: "Enviar" }).click();
    await expect(d.getByText("Escolha a factura.")).toBeVisible();
    await expect(d.getByText("Valor positivo (até 2 casas decimais).")).toBeVisible();
    await expect(d.getByText("A data do pagamento não pode ser futura.")).toBeVisible();
    await expect(d.getByText("Anexe o comprovativo.")).toBeVisible();
    expect(api.escritas("POST", "/customer-portal/me/payment-claims")).toHaveLength(0);

    await d.getByLabel("Factura").selectOption(IDF10.factura1);
    await d.getByLabel("Valor pago").fill("750 000,50");
    await d.getByLabel("Pago a").fill("2026-10-12");
    await d.getByLabel("Comprovativo").setInputFiles({ name: "programa.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
    await expect(d.getByText("Formato não aceite.", { exact: false })).toBeVisible();
    expect(api.escritas("POST", "/documents")).toHaveLength(0);
    await d.getByLabel("Comprovativo").setInputFiles({ name: "comprovativo.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await expect(d.getByText("comprovativo.pdf")).toBeVisible();
    await d.getByLabel("Notas (opcional)").fill("  Transferência do BAI. ");
    await d.getByRole("button", { name: "Enviar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/customer-portal/me/payment-claims").map((p) => p.corpo)).toEqual([
      { salesInvoiceId: IDF10.factura1, amount: "750000.50", paidOn: "2026-10-12", documentId: IDF10.documento, notes: "Transferência do BAI." },
    ]);
    semIdDeCliente(api);
  });

  test("extracto: período no URL, débitos, créditos e saldos", async ({ page, api }) => {
    await comPortal(api).ligar();
    await entrar(page, meCliente.email);
    await page.goto("/cliente/extracto?de=2026-01-01&ate=2026-10-17");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/customer-portal/me/statement" && p.query.includes("from=2026-01-01") && p.query.includes("to=2026-10-17"))).toBe(true);
    const nc = page.getByRole("row").filter({ hasText: "NC 2026/3" });
    await expect(nc).toContainText("Nota de crédito");
    await expect.poll(async () => espacos(await page.getByText("Saldo final").locator("..").innerText())).toContain("1 250 000,50 Kz");
    await page.getByLabel("De", { exact: true }).fill("2026-11-01");
    await expect(page.getByText("A data final não pode ser anterior à inicial.")).toBeVisible();
    await verificar(page);
  });

  test("documentos: partilhados e carregados, descarregados em anexo", async ({ page, api }) => {
    await comPortal(api)
      .em("GET", `/customer-portal/me/documents/${IDF10.partilha}/content`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .ligar();
    await entrar(page, meCliente.email);
    await page.goto("/cliente/documentos");
    await expect(page.getByRole("table", { name: "Documentos partilhados" })).toContainText("Contrato de prestação de serviços");
    await expect(page.getByRole("table", { name: "Ficheiros carregados" })).toContainText("transferencia-outubro.pdf");
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar Contrato de prestação de serviços" }).click();
    expect((await descarga).suggestedFilename()).toBe("contrato-2026.pdf");
    await verificar(page);
  });

  test("mensagens: a conversa aberta, as anteriores e uma mensagem nova", async ({ page, api }) => {
    await comPortal(api)
      .em("POST", "/customer-portal/me/messages", { status: 201, corpo: { conversationId: IDF10.conversaAberta, messageId: "m5" } })
      .ligar();
    await entrar(page, meCliente.email);
    await page.goto("/cliente/mensagens");
    await expect(page.getByRole("region", { name: "Conversa aberta" })).toContainText("Já está nos documentos partilhados.");
    await expect(page.getByText("Bom dia, recebi a factura.")).toBeHidden();
    await page.getByText(/^Conversa de /).click();
    await expect(page.getByText("Bom dia, recebi a factura.")).toBeVisible();
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Escreva a mensagem.")).toBeVisible();
    await page.getByLabel("Nova mensagem").fill("  Obrigado!​ ");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect.poll(() => api.escritas("POST", "/customer-portal/me/messages").map((p) => p.corpo)).toEqual([{ body: "Obrigado!" }]);
    await verificar(page);
  });

  test("suporte: abrir um pedido, responder a um aberto, avaliar um fechado", async ({ page, api }) => {
    await comPortal(api)
      .em("POST", "/customer-portal/me/tickets", { status: 201, corpo: { conversationId: IDF10.ticketAberto, messageId: "t9" } })
      .em("POST", `/customer-portal/me/tickets/${IDF10.ticketAberto}/messages`, { status: 201, corpo: { messageId: "t10" } })
      .em("POST", `/customer-portal/me/tickets/${IDF10.ticketFechado}/rating`, { status: 204 })
      .ligar();
    await entrar(page, meCliente.email);
    await page.goto("/cliente/suporte");
    const linhas = page.getByRole("table", { name: "Pedidos de suporte" }).getByRole("row");
    await expect(linhas.nth(1)).toContainText("Factura FT 2026/57 com NIF errado");
    await verificar(page);

    await page.getByRole("button", { name: "Novo pedido" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Enviar pedido" }).click();
    await expect(d.getByText("Indique o assunto.")).toBeVisible();
    await d.getByLabel("Assunto").fill("Pedido de segunda via");
    await d.getByLabel("Descrição").fill("Da factura FT 2026/41.");
    await d.getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page).toHaveURL(new RegExp(`/cliente/suporte/${IDF10.ticketAberto}$`));
    expect(api.escritas("POST", "/customer-portal/me/tickets").map((p) => p.corpo)).toEqual([{ subject: "Pedido de segunda via", body: "Da factura FT 2026/41." }]);
    await page.getByLabel("Responder").fill("Segue em anexo no e-mail.");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect.poll(() => api.escritas("POST", `/customer-portal/me/tickets/${IDF10.ticketAberto}/messages`).map((p) => p.corpo)).toEqual([{ body: "Segue em anexo no e-mail." }]);

    await page.goto(`/cliente/suporte/${IDF10.ticketFechado}`);
    await expect(page.getByText("Este pedido está fechado", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Responder")).toHaveCount(0);
    await page.getByRole("button", { name: "Enviar avaliação" }).click();
    await expect(page.getByText("Escolha de 1 a 5.")).toBeVisible();
    await page.getByLabel("4 · Bom").check();
    await page.getByLabel("Recomendaria? (opcional)").selectOption("8");
    await page.getByRole("button", { name: "Enviar avaliação" }).click();
    await expect.poll(() => api.escritas("POST", `/customer-portal/me/tickets/${IDF10.ticketFechado}/rating`).map((p) => p.corpo)).toEqual([{ rating: 4, netPromoterScore: 8, comment: null }]);
    await verificar(page);

    await page.goto(`/cliente/suporte/${IDF10.ticketAvaliado}`);
    await expect(page.getByText("Avaliou este atendimento com 5 em 5", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar avaliação" })).toHaveCount(0);
    semIdDeCliente(api);
  });

  test("ajuda: pesquisa no URL, artigo em texto simples (sem HTML) e «foi útil?»", async ({ page, api, violacoes }) => {
    await comPortal(api)
      .em("GET", "/customer-portal/me/knowledge-base/alterar-os-dados-de-facturacao", { status: 200, corpo: { ...artigo('<img src=x onerror="window.__xss=1">\nLinha 2'), slug: "alterar-os-dados-de-facturacao", title: "Alterar os dados de facturação" } })
      .em("POST", `/customer-portal/me/knowledge-base/${IDF10.artigo}/feedback`, { status: 204 })
      .ligar();
    await entrar(page, meCliente.email);
    await page.goto("/cliente/ajuda");
    await expect(page.getByRole("list", { name: "Artigos" }).getByRole("listitem")).toHaveCount(2);
    await page.getByLabel("Pesquisar").fill("comprovativo");
    await page.getByRole("button", { name: "Pesquisar" }).click();
    await expect(page).toHaveURL(/q=comprovativo/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/customer-portal/me/knowledge-base" && p.query.includes("search=comprovativo"))).toBe(true);
    await page.getByLabel("Categoria").selectOption("Pagamentos");
    await expect(page).toHaveURL(/categoria=Pagamentos/);
    await verificar(page);

    await page.getByRole("link", { name: "Como enviar um comprovativo" }).click();
    await expect(page.getByRole("heading", { name: "Como enviar um comprovativo", level: 1 })).toBeVisible();
    await expect(page.getByRole("article")).toContainText("A equipa confirma em 2 dias úteis.");
    await page.getByRole("button", { name: "Sim" }).click();
    await expect(page.getByRole("status")).toContainText("Obrigado.");
    expect(api.escritas("POST", `/customer-portal/me/knowledge-base/${IDF10.artigo}/feedback`).map((p) => p.corpo)).toEqual([{ helpful: true }]);
    await verificar(page);

    await page.goto("/cliente/ajuda/alterar-os-dados-de-facturacao");
    await expect(page.getByRole("article")).toContainText('<img src=x onerror="window.__xss=1">');
    await expect(page.getByRole("article").locator("img")).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(api.pedidos.filter((p) => p.caminho === "/customer-portal/me/knowledge-base/como-enviar-um-comprovativo")).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });
});
