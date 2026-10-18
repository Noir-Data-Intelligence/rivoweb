/**
 * F10 (2.º bloco, o lado da equipa) contra a API LOCAL (D1, §8.3). Preparação
 * pela API com a conta SuperAdmin local: uma conta Cliente por ligar, um
 * cliente com uma factura (só na base local) e uma conta Sales. Pela
 * interface, como Sales: ligar a conta do cliente, partilhar um ficheiro,
 * responder e fechar um pedido de suporte, escrever, publicar e arquivar um
 * artigo; a fila de comprovativos sem decidir. Como Admin: descarregar,
 * confirmar (regista o recibo) e rejeitar comprovativos, ler o arquivo e
 * revogar a partilha. Confere no servidor. B33: o Sales não partilha um
 * ficheiro que não carregou (404).
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas SuperAdmin e Admin locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const nif = `9${String(Date.now()).slice(-9)}`;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n");

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

type Chamar = <T = unknown>(metodo: string, caminho: string, corpo?: unknown) => Promise<{ status: number; corpo: T }>;

async function sessaoApi(request: APIRequestContext, email: string, password: string): Promise<{ chamar: Chamar; token: string }> {
  const r = await request.post(`${API_LOCAL}/identity/login`, { data: { email, password } });
  expect(r.status(), `login ${email}`).toBe(200);
  const { accessToken } = (await r.json()) as { accessToken: string };
  const chamar: Chamar = async (metodo, caminho, corpo) => {
    const x = await request.fetch(`${API_LOCAL}${caminho}`, { method: metodo, headers: { Authorization: `Bearer ${accessToken}` }, ...(corpo === undefined ? {} : { data: corpo }) });
    const texto = await x.text();
    return { status: x.status(), corpo: (texto ? JSON.parse(texto) : null) as never };
  };
  return { chamar, token: accessToken };
}

async function carregar(request: APIRequestContext, token: string, nome: string, categoria: string): Promise<string> {
  const r = await request.post(`${API_LOCAL}/documents`, { headers: { Authorization: `Bearer ${token}` }, multipart: { file: { name: nome, mimeType: "application/pdf", buffer: PDF }, category: categoria } });
  expect(r.status(), await r.text()).toBe(201);
  return ((await r.json()) as { documentId: string }).documentId;
}

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

const dialogo = (page: Page) => page.getByRole("dialog");

test("F10: o lado da equipa — conta e partilha no cliente, suporte, artigos, comprovativos e arquivo", async ({ page, request, browser }) => {
  test.setTimeout(400_000);
  await soLocal(page);
  const { chamar: sa, token: tokenSa } = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const nova = async (perfil: string) => {
    const email = `${perfil.toLowerCase()}-${sufixo.toLowerCase()}@teste.local`;
    const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: perfil });
    expect(c.status, `convite ${perfil}: ${JSON.stringify(c.corpo)}`).toBe(201);
    expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
    await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
    return { email, userId: c.corpo.userId };
  };
  const contaCliente = await nova("Cliente");
  const contaVendas = await nova("Sales");
  const cliente = await sa<{ customerId: string }>("POST", "/commercial/customers", { name: `${marca} Cliente`, taxId: nif, addressDetail: "Rua do Teste, 1", city: "Luanda" });
  expect(cliente.status, JSON.stringify(cliente.corpo)).toBe(201);
  const cid = cliente.corpo.customerId;
  const factura = await sa<{ invoiceId: string }>("POST", "/finance/sales-invoices", {
    customerId: cid,
    series: null,
    issuedOn: null,
    taxPointDate: null,
    currency: "AOA",
    lines: [{ description: `${marca} Consultoria`, quantity: 1, unitPrice: 100000, taxCode: "NOR" }],
  });
  expect(factura.status, JSON.stringify(factura.corpo)).toBe(201);
  const numero = (await sa<{ number: string }>("GET", `/finance/sales-invoices/${factura.corpo.invoiceId}`)).corpo.number;
  const alheio = await carregar(request, tokenSa, "recibo-vencimento.pdf", "Recibo de vencimento");

  // --- Sales, pela interface: a conta e a partilha na ficha do cliente ---
  await entrar(page, contaVendas.email, PASSWORD_LOCAL);
  await page.goto(`/clientes/${cid}?vista=portal`);
  await expect(page.getByText("Sem conta ligada: o cliente não entra no portal.")).toBeVisible();
  await page.getByRole("button", { name: "Ligar conta" }).click();
  await dialogo(page).getByLabel("Conta").selectOption({ label: contaCliente.email });
  await dialogo(page).getByRole("button", { name: "Ligar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desligar" })).toBeVisible();
  const hist = await sa<{ userId: string; unlinkedOn: string | null }[]>("GET", `/commercial/customers/${cid}/account-history`);
  expect(hist.corpo.map((h) => [h.userId, h.unlinkedOn])).toEqual([[contaCliente.userId, null]]);

  await page.getByRole("button", { name: "Partilhar documento" }).click();
  await dialogo(page).getByLabel("Ficheiro").setInputFiles({ name: "tabela-precos.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(dialogo(page).getByText("tabela-precos.pdf")).toBeVisible();
  await dialogo(page).getByLabel("Título (o que o cliente vê)").fill(`${marca} Tabela de preços`);
  await dialogo(page).getByRole("button", { name: "Partilhar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Documentos partilhados" })).toContainText(`${marca} Tabela de preços`);

  // B33: o Sales não partilha um ficheiro que não carregou (o mesmo 404 de «não existe»).
  const { chamar: vd } = await sessaoApi(request, contaVendas.email, PASSWORD_LOCAL);
  const roubo = await vd("POST", `/commercial/customers/${cid}/shared-documents`, { documentId: alheio, title: `${marca} alheio`, category: null });
  expect(roubo.status).toBe(404);

  // --- O cliente (API): dois comprovativos e um pedido de suporte ---
  const { chamar: cl, token: tokenCl } = await sessaoApi(request, contaCliente.email, PASSWORD_LOCAL);
  const doc1 = await carregar(request, tokenCl, "transferencia-1.pdf", "Comprovativo de pagamento");
  const doc2 = await carregar(request, tokenCl, "transferencia-2.pdf", "Comprovativo de pagamento");
  const hoje = new Date().toISOString().slice(0, 10);
  for (const [documentId, amount, notes] of [
    [doc1, "60000", `${marca} primeira`],
    [doc2, "10000", `${marca} segunda`],
  ] as const) {
    const r = await cl("POST", "/customer-portal/me/payment-claims", { salesInvoiceId: factura.corpo.invoiceId, amount, paidOn: hoje, documentId, notes });
    expect(r.status, JSON.stringify(r.corpo)).toBe(201);
  }
  const ticket = await cl<{ conversationId: string }>("POST", "/customer-portal/me/tickets", { subject: `${marca} Segunda via`, body: "Preciso da segunda via." });
  expect(ticket.status, JSON.stringify(ticket.corpo)).toBe(201);
  const tid = ticket.corpo.conversationId;

  // --- Sales: responder e fechar o pedido ---
  await page.goto("/conversas?tipo=Ticket");
  await page.getByRole("row").filter({ hasText: `${marca} Segunda via` }).getByRole("link").click();
  await expect(page.getByRole("heading", { name: `${marca} Segunda via`, level: 1 })).toBeVisible();
  await expect(page.getByText(`Pedido de suporte · ${marca} Cliente`, { exact: false })).toBeVisible();
  await page.getByLabel("Responder ao cliente").fill("Enviada por e-mail.\nObrigado.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("Enviada por e-mail.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Fechar o pedido" }).click();
  await dialogo(page).getByRole("button", { name: "Fechar o pedido" }).click();
  await expect(page.getByText("Fechada: já não recebe respostas.")).toBeVisible();
  const conv = await sa<{ status: string; messages: { sender: string; body: string }[] }>("GET", `/messaging/conversations/${tid}`);
  expect(conv.corpo.status).toBe("Closed");
  expect(conv.corpo.messages.map((m) => [m.sender, m.body])).toEqual([
    ["Customer", "Preciso da segunda via."],
    ["Employee", "Enviada por e-mail.\nObrigado."],
  ]);

  // --- Sales: artigo escrito, publicado e arquivado ---
  await page.goto("/base-conhecimento/novo");
  await page.getByLabel("Título").fill(`${marca} Como pedir a segunda via`);
  await page.getByLabel("Categoria (opcional)").fill("Facturação");
  await page.getByLabel("Texto").fill("Abra Suporte.\n\nIndique o número da factura.");
  await page.getByRole("button", { name: "Guardar rascunho" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Como pedir a segunda via`, level: 1 })).toBeVisible();
  const aid = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Publicar" }).click();
  await dialogo(page).getByRole("button", { name: "Publicar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Publicado", { exact: true })).toBeVisible();
  const publicado = await cl<{ slug: string; title: string }[]>("GET", "/customer-portal/me/knowledge-base");
  expect(publicado.corpo.some((a) => a.title === `${marca} Como pedir a segunda via`)).toBe(true);
  await page.getByRole("button", { name: "Arquivar" }).click();
  await dialogo(page).getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText("Arquivado", { exact: true })).toBeVisible();
  const art = await sa<{ status: string; body: string; category: string; views: number }>("GET", `/messaging/knowledge-base/${aid}`);
  expect(art.corpo).toMatchObject({ status: "Archived", body: "Abra Suporte.\n\nIndique o número da factura.", category: "Facturação" });
  // Abrir o artigo na equipa não conta visualização.
  expect(Number(art.corpo.views)).toBe(0);

  // --- Sales: a fila de comprovativos, sem decidir ---
  await page.goto("/comprovativos");
  const filaVendas = page.getByRole("table", { name: "Comprovativos" });
  await expect(filaVendas).toContainText(`${marca} primeira`);
  await expect(page.getByRole("button", { name: /^Confirmar o pagamento/ })).toHaveCount(0);

  // --- Admin, pela interface: descarregar, confirmar, rejeitar; arquivo; revogar ---
  const admin = await browser.newPage({ baseURL: FRONT_LOCAL });
  await soLocal(admin);
  await entrar(admin, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  await admin.goto("/comprovativos");
  const nome = `${marca} Cliente`;
  const descarga = admin.waitForEvent("download");
  await admin.getByRole("row").filter({ hasText: `${marca} primeira` }).getByRole("button", { name: `Descarregar o comprovativo de ${nome} (transferencia-1.pdf)` }).click();
  expect((await descarga).suggestedFilename()).toBe("transferencia-1.pdf");
  await admin.getByRole("row").filter({ hasText: `${marca} primeira` }).getByRole("button", { name: `Confirmar o pagamento de ${nome} (${numero})` }).click();
  await dialogo(admin).getByRole("button", { name: "Confirmar e registar o recibo" }).click();
  await expect(dialogo(admin)).toHaveCount(0);
  await expect(admin.getByRole("link", { name: "Ver o recibo registado" })).toBeVisible();
  await admin.getByRole("row").filter({ hasText: `${marca} segunda` }).getByRole("button", { name: `Rejeitar o comprovativo de ${nome} (${numero})` }).click();
  await dialogo(admin).getByLabel("Motivo").fill(`${marca} O valor não entrou na conta.`);
  await dialogo(admin).getByRole("button", { name: "Rejeitar" }).click();
  await expect(dialogo(admin)).toHaveCount(0);
  const meus = await cl<{ amount: number; status: string; rejectionReason: string | null }[]>("GET", "/customer-portal/me/payment-claims");
  expect(meus.corpo.map((c) => [Number(c.amount), c.status, c.rejectionReason]).sort()).toEqual([
    [10000, "Rejected", `${marca} O valor não entrou na conta.`],
    [60000, "Confirmed", null],
  ]);
  const saldo = await sa<{ outstanding: number }>("GET", `/finance/sales-invoices/${factura.corpo.invoiceId}/balance`);
  expect(Number(saldo.corpo.outstanding)).toBe(54000);
  await admin.getByRole("link", { name: "Ver o recibo registado" }).click();
  await expect(admin.getByRole("list", { name: "Facturas liquidadas" })).toContainText(numero);

  await admin.goto(`/documentos?categoria=${encodeURIComponent("Partilhado com cliente")}`);
  await expect(admin.getByRole("table", { name: "Documentos" })).toContainText("tabela-precos.pdf");

  await admin.goto(`/clientes/${cid}?vista=portal`);
  await expect(admin.getByText(contaCliente.email).first()).toBeVisible();
  await admin.getByRole("button", { name: `Revogar a partilha de ${marca} Tabela de preços` }).click();
  await dialogo(admin).getByRole("button", { name: "Revogar" }).click();
  await expect(dialogo(admin)).toHaveCount(0);
  const partilhados = await cl<unknown[]>("GET", "/customer-portal/me/documents");
  expect(partilhados.corpo).toEqual([]);
  await admin.close();
});
