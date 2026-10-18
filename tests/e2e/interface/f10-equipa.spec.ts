/**
 * F10 (2.º bloco) — o lado da equipa, com a API simulada: fila de
 * comprovativos (descarregar, confirmar com o recibo, rejeitar com o motivo),
 * conversas (responder, fechar), base de conhecimento (escrever, publicar,
 * arquivar; texto simples), portal na ficha do cliente (ligar a conta,
 * partilhar e revogar) e arquivo de documentos. Texto dos clientes nunca vira
 * HTML. Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test } from "../apoio";
import { comF3 } from "../apoio-f3";
import { utilizadores } from "../../fixtures/f1";
import { IDF3 } from "../../fixtures/f3";
import {
  arquivo,
  artigosEquipa,
  candidatas,
  conversasEquipa,
  filaComprovativos,
  historicoConta,
  IDF10B,
  meAdminF10,
  meFinancasF10,
  meRhF10,
  meVendasF10,
  partilhas,
  ticketEquipa,
} from "../../fixtures/f10b";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

/** Nenhum HTML vindo de fora corre: não há `<img>` nem `<script>` injectados. */
async function semHtmlInjectado(page: Page) {
  expect(await page.locator("main img, main script").count()).toBe(0);
}

test.describe("comprovativos", () => {
  test("Finance: fila por confirmar, ficheiro em anexo, confirmar regista o recibo, rejeitar pede o motivo", async ({ page, api, violacoes }) => {
    await comF3(api, meFinancasF10)
      .em("GET", "/finance/payment-claims", pag(filaComprovativos()))
      .em("GET", `/finance/payment-claims/${IDF10B.pendente}/document`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .em("POST", `/finance/payment-claims/${IDF10B.pendente}/confirmation`, { status: 200, corpo: { receiptId: IDF10B.recibo } })
      .em("POST", `/finance/payment-claims/${IDF10B.pendente}/rejection`, { status: 204 })
      .ligar();
    await entrar(page, meFinancasF10.email);
    await page.getByRole("link", { name: "Comprovativos" }).click();
    await expect(page).toHaveURL(/\/comprovativos$/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/finance/payment-claims" && p.query.includes("status=Pending"))).toBe(true);
    const tabela = page.getByRole("table", { name: "Comprovativos" });
    await expect(tabela).toContainText("Cliente Teste, Lda");
    // Sem `commercial.customers.read`, o cliente não é ligação; a factura é.
    await expect(tabela.getByRole("link", { name: "Cliente Teste, Lda" })).toHaveCount(0);
    await expect(tabela.getByRole("link", { name: "FT 2026/57" }).first()).toHaveAttribute("href", `/facturas/${IDF10B.factura}`);
    await expect(tabela).toContainText('Nota do cliente: <img src=x onerror="alert(1)"> Transferência do BAI.');
    await semHtmlInjectado(page);
    await expect(tabela).toContainText("500 000,00 Kz");
    await verificar(page);

    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar o comprovativo de Cliente Teste, Lda (transferencia.pdf)" }).click();
    expect((await descarga).suggestedFilename()).toBe("transferencia.pdf");

    await page.getByRole("button", { name: "Rejeitar o comprovativo de Cliente Teste, Lda (FT 2026/57)" }).first().click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Rejeitar" }).click();
    await expect(d.getByText("Diga ao cliente porque rejeita.")).toBeVisible();
    expect(api.escritas("POST", `/finance/payment-claims/${IDF10B.pendente}/rejection`)).toHaveLength(0);
    await d.getByLabel("Motivo").fill("  O valor não confere.  ");
    await d.getByRole("button", { name: "Rejeitar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/payment-claims/${IDF10B.pendente}/rejection`)[0]?.corpo).toEqual({ reason: "O valor não confere." });

    await page.getByRole("button", { name: "Confirmar o pagamento de Cliente Teste, Lda (FT 2026/57)" }).first().click();
    await expect(d).toContainText("por transferência bancária a 15/10/2026");
    await expect(d).toContainText("Regista um recibo de 500 000,00 Kz para FT 2026/57");
    await d.getByRole("button", { name: "Confirmar e registar o recibo" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/payment-claims/${IDF10B.pendente}/confirmation`)).toHaveLength(1);
    await expect(page.getByRole("link", { name: "Ver o recibo registado" })).toHaveAttribute("href", `/recibos/${IDF10B.recibo}`);

    await page.getByLabel("Estado").selectOption("todos");
    await expect(page).toHaveURL(/estado=todos/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/finance/payment-claims" && !p.query.includes("status="))).toBe(true);
    expect(await violacoes()).toEqual([]);
  });

  test("Sales lê a fila e descarrega, mas não confirma nem rejeita", async ({ page, api }) => {
    await comF3(api, meVendasF10).em("GET", "/finance/payment-claims", pag(filaComprovativos())).ligar();
    await entrar(page, meVendasF10.email);
    await page.goto("/comprovativos?estado=todos");
    await expect(page.getByRole("table", { name: "Comprovativos" }).getByRole("link", { name: "Cliente Teste, Lda" }).first()).toHaveAttribute("href", `/clientes/${IDF3.cliente}`);
    await expect(page.getByText("O valor não entrou na conta.")).toBeVisible();
    await expect(page.getByRole("table", { name: "Comprovativos" })).toContainText("120 000,50 USD");
    await expect(page.getByRole("button", { name: /^Descarregar o comprovativo/ })).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^Confirmar o pagamento/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Rejeitar o comprovativo/ })).toHaveCount(0);
  });
});

test.describe("conversas", () => {
  test("Sales: abertas por omissão, responder e fechar um pedido; o texto do cliente fica texto", async ({ page, api, violacoes }) => {
    let estado: "Open" | "Closed" = "Open";
    await comF3(api, meVendasF10)
      .em("GET", "/messaging/conversations", pag(conversasEquipa()))
      .em("GET", `/messaging/conversations/${IDF10B.ticket}`, () => ({ status: 200, corpo: ticketEquipa(estado) }))
      .em("POST", `/messaging/conversations/${IDF10B.ticket}/messages`, { status: 201, corpo: { messageId: "t3" } })
      .em("POST", `/messaging/conversations/${IDF10B.ticket}/closure`, () => {
        estado = "Closed";
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meVendasF10.email);
    await page.getByRole("link", { name: "Conversas" }).click();
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/messaging/conversations" && p.query.includes("status=0"))).toBe(true);
    await expect(page.getByRole("table", { name: "Conversas" })).toContainText("Factura em duplicado");
    await verificar(page);
    await page.getByLabel("Tipo").selectOption("Ticket");
    await expect(page).toHaveURL(/tipo=Ticket/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/messaging/conversations" && p.query.includes("kind=1"))).toBe(true);

    await page.getByRole("link", { name: "Cliente Teste, Lda" }).first().click();
    await expect(page.getByRole("heading", { name: "Factura em duplicado", level: 1 })).toBeVisible();
    await expect(page.getByText("Pedido de suporte · Cliente Teste, Lda", { exact: false })).toBeVisible();
    await expect(page.getByText("<script>alert(1)</script>")).toBeVisible();
    await semHtmlInjectado(page);
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Escreva a mensagem.")).toBeVisible();
    await page.getByLabel("Responder ao cliente").fill("Já anulámos a factura repetida.\nObrigado.");
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect.poll(() => api.escritas("POST", `/messaging/conversations/${IDF10B.ticket}/messages`)[0]?.corpo).toEqual({ body: "Já anulámos a factura repetida.\nObrigado." });
    await verificar(page);

    await page.getByRole("button", { name: "Fechar o pedido" }).click();
    await expect(page.getByRole("dialog")).toContainText("passa a poder avaliar");
    await page.getByRole("dialog").getByRole("button", { name: "Fechar o pedido" }).click();
    await expect(page.getByText("Fechada: já não recebe respostas.")).toBeVisible();
    await expect(page.getByLabel("Responder ao cliente")).toHaveCount(0);
    expect(api.escritas("POST", `/messaging/conversations/${IDF10B.ticket}/closure`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });
});

test.describe("base de conhecimento", () => {
  test("Sales: pesquisa no URL, escrever um rascunho validado, publicar; arquivado só se lê", async ({ page, api, violacoes }) => {
    const lista = artigosEquipa();
    await comF3(api, meVendasF10)
      .em("GET", "/messaging/knowledge-base", { status: 200, corpo: lista })
      .em("GET", `/messaging/knowledge-base/${IDF10B.publicado}`, { status: 200, corpo: lista[0] })
      .em("GET", `/messaging/knowledge-base/${IDF10B.arquivado}`, { status: 200, corpo: lista[2] })
      .em("GET", `/messaging/knowledge-base/${IDF10B.novo}`, { status: 200, corpo: { ...lista[1], articleId: IDF10B.novo, title: "Como pedir a 2.ª via", audience: "Everyone" } })
      .em("POST", "/messaging/knowledge-base", { status: 201, corpo: { articleId: IDF10B.novo } })
      .em("POST", `/messaging/knowledge-base/${IDF10B.novo}/publication`, { status: 204 })
      .ligar();
    await entrar(page, meVendasF10.email);
    await page.getByRole("link", { name: "Base de conhecimento" }).click();
    const tabela = page.getByRole("table", { name: "Artigos" });
    await expect(tabela).toContainText("Como enviar um comprovativo");
    await expect(tabela.getByRole("row").filter({ hasText: "Prazos de pagamento" })).toContainText("Rascunho");
    await verificar(page);
    await page.getByLabel("Pesquisar").fill("comprovativo");
    await page.getByLabel("Pesquisar").press("Enter");
    await expect(page).toHaveURL(/q=comprovativo/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/messaging/knowledge-base" && p.query.includes("search=comprovativo"))).toBe(true);

    await page.getByRole("link", { name: "Como enviar um comprovativo" }).click();
    await expect(page.getByText("<img src=x onerror=alert(1)>", { exact: false })).toBeVisible();
    await semHtmlInjectado(page);
    await expect(page.getByText("7 sim · 1 não")).toBeVisible();

    await page.goto(`/base-conhecimento/${IDF10B.arquivado}`);
    await expect(page.getByText("Arquivado")).toBeVisible();
    await expect(page.getByRole("button", { name: "Corrigir" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0);

    await page.goto("/base-conhecimento");
    await page.getByRole("link", { name: "Novo artigo" }).click();
    await page.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(page.getByText("Indique o título.")).toBeVisible();
    await expect(page.getByText("Escreva o texto.")).toBeVisible();
    expect(api.escritas("POST", "/messaging/knowledge-base")).toHaveLength(0);
    await page.getByLabel("Título").fill("  Como pedir a 2.ª via ");
    await page.getByLabel("Quem vê").selectOption("Everyone");
    await page.getByLabel("Texto").fill("Escreva-nos em Suporte.\n\nIndique o número da factura.");
    await page.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(page).toHaveURL(new RegExp(`/base-conhecimento/${IDF10B.novo}$`));
    expect(api.escritas("POST", "/messaging/knowledge-base")[0]?.corpo).toEqual({
      title: "Como pedir a 2.ª via",
      slug: null,
      body: "Escreva-nos em Suporte.\n\nIndique o número da factura.",
      category: null,
      audience: "Everyone",
    });
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("dialog")).toContainText("Os clientes passam a vê-lo no portal");
    await page.getByRole("dialog").getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/messaging/knowledge-base/${IDF10B.novo}/publication`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });
});

test.describe("portal na ficha do cliente", () => {
  test("Sales: ligar a conta pela lista de contas por ligar, partilhar um ficheiro carregado, revogar", async ({ page, api, violacoes }) => {
    let ligada = false;
    await comF3(api, meVendasF10)
      .em("GET", `/commercial/customers/${IDF3.cliente}/account-history`, () => ({ status: 200, corpo: historicoConta(ligada) }))
      .em("GET", "/commercial/customers/account-candidates", { status: 200, corpo: candidatas() })
      .em("POST", `/commercial/customers/${IDF3.cliente}/account`, () => {
        ligada = true;
        return { status: 204 };
      })
      .em("GET", `/commercial/customers/${IDF3.cliente}/shared-documents`, { status: 200, corpo: partilhas() })
      .em("POST", "/documents", { status: 201, corpo: { ...arquivo()[0], documentId: IDF10B.carregado, fileName: "tabela-precos.pdf" } })
      .em("POST", `/commercial/customers/${IDF3.cliente}/shared-documents`, { status: 201, corpo: { id: "s3" } })
      .em("POST", `/commercial/customers/${IDF3.cliente}/shared-documents/${IDF10B.partilha}/revocation`, { status: 204 })
      .em("GET", "/finance/payment-claims", pag(filaComprovativos()))
      .ligar();
    await entrar(page, meVendasF10.email);
    await page.goto(`/clientes/${IDF3.cliente}`);
    await page.getByRole("link", { name: "Portal do cliente" }).click();
    await expect(page).toHaveURL(/vista=portal/);
    await expect(page.getByText("Sem conta ligada: o cliente não entra no portal.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Histórico da conta do portal" })).toContainText("desligada");
    // Os comprovativos deste cliente, pelo id na query.
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/finance/payment-claims" && p.query.includes(`customerId=${IDF3.cliente}`))).toBe(true);
    await verificar(page);

    await page.getByRole("button", { name: "Ligar conta" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Ligar" }).click();
    await expect(d.getByText("Escolha a conta.", { exact: false })).toBeVisible();
    await d.getByLabel("Conta").selectOption({ label: "compras@cliente.ao" });
    await d.getByRole("button", { name: "Ligar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/customers/${IDF3.cliente}/account`)[0]?.corpo).toEqual({ userId: IDF10B.contaCliente });
    await expect(page.getByText(/^Conta ligada/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Desligar" })).toBeVisible();

    await page.getByRole("button", { name: "Partilhar documento" }).click();
    await d.getByRole("button", { name: "Partilhar" }).click();
    await expect(d.getByText("Carregue o ficheiro.")).toBeVisible();
    await d.getByLabel("Ficheiro").setInputFiles({ name: "tabela-precos.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await expect(d.getByLabel("Título (o que o cliente vê)")).toHaveValue("tabela-precos");
    await d.getByLabel("Título (o que o cliente vê)").fill("Tabela de preços 2027");
    await d.getByRole("button", { name: "Partilhar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/customers/${IDF3.cliente}/shared-documents`)[0]?.corpo).toEqual({ documentId: IDF10B.carregado, title: "Tabela de preços 2027", category: null });

    const tabela = page.getByRole("table", { name: "Documentos partilhados" });
    await expect(tabela.getByRole("row").filter({ hasText: "Proposta antiga" })).toContainText("Revogado");
    await expect(page.getByRole("button", { name: "Revogar a partilha de Proposta antiga" })).toHaveCount(0);
    await page.getByRole("button", { name: "Revogar a partilha de Contrato 2026" }).click();
    await d.getByRole("button", { name: "Revogar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/customers/${IDF3.cliente}/shared-documents/${IDF10B.partilha}/revocation`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });

  test("Admin vê o e-mail da conta ligada; sem permissão de escrita não há botões", async ({ page, api }) => {
    await comF3(api, meAdminF10)
      .em("GET", "/identity/users", { status: 200, corpo: [...utilizadores(), { userId: IDF10B.contaCliente, email: "compras@cliente.ao", isActive: true, roles: ["Cliente"] }] })
      .em("GET", `/commercial/customers/${IDF3.cliente}/account-history`, { status: 200, corpo: historicoConta(true) })
      .em("GET", `/commercial/customers/${IDF3.cliente}/shared-documents`, { status: 200, corpo: partilhas() })
      .em("GET", "/finance/payment-claims", pag([]))
      .ligar();
    await entrar(page, meAdminF10.email);
    await page.goto(`/clientes/${IDF3.cliente}?vista=portal`);
    await expect(page.getByText("compras@cliente.ao").first()).toBeVisible();
    await expect(page.getByText("Este cliente não enviou comprovativos.")).toBeVisible();
  });
});

test.describe("arquivo de documentos", () => {
  test("Admin: categoria e período no URL, quem carregou, descarregar em anexo; RH não vê quem", async ({ page, api, violacoes }) => {
    await comF3(api, meAdminF10)
      .em("GET", "/identity/users", { status: 200, corpo: utilizadores() })
      .em("GET", "/documents", pag(arquivo()))
      .em("GET", `/documents/${IDF10B.documento}`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .ligar();
    await entrar(page, meAdminF10.email);
    await page.getByRole("link", { name: "Arquivo de documentos" }).click();
    const tabela = page.getByRole("table", { name: "Documentos" });
    await expect(tabela.getByRole("row").filter({ hasText: "contrato-2026.pdf" })).toContainText("ana@teste.local");
    await verificar(page);
    await page.getByLabel("Categoria").fill("Comprovativo de pagamento");
    await page.getByLabel("Categoria").press("Enter");
    await expect(page).toHaveURL(/categoria=Comprovativo/);
    await page.getByLabel("De", { exact: true }).fill("2026-10-01");
    await expect(page).toHaveURL(/de=2026-10-01/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/documents" && p.query.includes("category=Comprovativo") && p.query.includes("from=2026-10-01"))).toBe(true);
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar contrato-2026.pdf" }).click();
    expect((await descarga).suggestedFilename()).toBe("contrato-2026.pdf");
    expect(await violacoes()).toEqual([]);
  });

  test("RH lê o arquivo, sem a coluna de quem carregou (não lê as contas)", async ({ page, api }) => {
    await api.comConta(meRhF10).em("GET", "/documents", pag(arquivo())).ligar();
    await entrar(page, meRhF10.email);
    await page.goto("/documentos");
    await expect(page.getByRole("table", { name: "Documentos" })).toContainText("transferencia.pdf");
    await expect(page.getByRole("columnheader", { name: "Por" })).toHaveCount(0);
    expect(api.pedidos.some((p) => p.caminho === "/identity/users")).toBe(false);
  });
});
