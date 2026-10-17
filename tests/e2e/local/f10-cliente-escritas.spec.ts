/**
 * F10 (portal do cliente) contra a API LOCAL (D1, §8.3). A preparação faz-se
 * pela API com a conta SuperAdmin local: conta Cliente ligada a um cliente
 * novo, uma factura emitida (só na base local), um documento partilhado e um
 * artigo publicado para clientes. Pela interface, com a conta do cliente:
 * enviar um comprovativo (ficheiro carregado), escrever uma mensagem, abrir um
 * pedido de suporte e, depois de a equipa o fechar, avaliá-lo; descarregar o
 * documento; votar no artigo. Confere no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const nif = `9${String(Date.now()).slice(-9)}`;

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

const dialogo = (page: Page) => page.getByRole("dialog");

test("F10: portal do cliente — comprovativo, mensagem, pedido de suporte avaliado, documento e artigo", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const { chamar: sa, token } = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const email = `cliente-${sufixo.toLowerCase()}@teste.local`;
  const conta = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Cliente" });
  expect(conta.status, JSON.stringify(conta.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${conta.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${conta.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const cliente = await sa<{ customerId: string }>("POST", "/commercial/customers", { name: `${marca} Cliente`, taxId: nif, addressDetail: "Rua do Teste, 1", city: "Luanda" });
  expect(cliente.status, JSON.stringify(cliente.corpo)).toBe(201);
  const cid = cliente.corpo.customerId;
  expect((await sa("POST", `/commercial/customers/${cid}/account`, { userId: conta.corpo.userId })).status).toBe(204);
  const factura = await sa<{ invoiceId: string; number: string }>("POST", "/finance/sales-invoices", {
    customerId: cid,
    series: null,
    issuedOn: null,
    taxPointDate: null,
    currency: "AOA",
    lines: [{ description: `${marca} Consultoria`, quantity: 1, unitPrice: 100000, taxCode: "NOR" }],
  });
  expect(factura.status, JSON.stringify(factura.corpo)).toBe(201);
  const ficha = await sa<{ number: string }>("GET", `/finance/sales-invoices/${factura.corpo.invoiceId}`);
  const numero = ficha.corpo.number;
  const carregado = await request.post(`${API_LOCAL}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name: "contrato.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n") }, category: "Contratos" },
  });
  expect(carregado.status(), await carregado.text()).toBe(201);
  const { documentId } = (await carregado.json()) as { documentId: string };
  const titulo = `${marca} Contrato`;
  expect((await sa("POST", `/commercial/customers/${cid}/shared-documents`, { documentId, title: titulo, category: "Contratos" })).status).toBe(201);
  const art = await sa<{ articleId: string }>("POST", "/messaging/knowledge-base", { title: `${marca} Como pagar`, slug: null, body: "Abra Pagamentos.\nCarregue o comprovativo.", category: "Pagamentos", audience: "Customers" });
  expect(art.status, JSON.stringify(art.corpo)).toBe(201);
  expect((await sa("POST", `/messaging/knowledge-base/${art.corpo.articleId}/publication`)).status).toBe(204);

  // --- Cliente, pela interface ---
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Cliente`, level: 1 })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: numero })).toContainText("114 000,00");

  // Comprovativo de 50 000 Kz da factura.
  await page.getByRole("link", { name: `Enviar o comprovativo da factura ${numero}` }).click();
  await dialogo(page).getByLabel("Valor pago").fill("50 000");
  // S16: um executável com nome de PDF passa o filtro do front e o servidor recusa-o pelos bytes (415).
  await dialogo(page).getByLabel("Comprovativo").setInputFiles({ name: "falso.pdf", mimeType: "application/pdf", buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]) });
  await expect(dialogo(page).getByText("Formato não aceite", { exact: false })).toBeVisible();
  await dialogo(page).getByLabel("Comprovativo").setInputFiles({ name: "transferencia.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n") });
  await expect(dialogo(page).getByText("transferencia.pdf")).toBeVisible();
  await dialogo(page).getByRole("button", { name: "Enviar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: numero }).getByText("Por confirmar")).toBeVisible();
  const { chamar: cl } = await sessaoApi(request, email, PASSWORD_LOCAL);
  const claims = await cl<{ salesInvoiceId: string; amount: number; status: string }[]>("GET", "/customer-portal/me/payment-claims");
  expect(claims.corpo.map((c) => [c.salesInvoiceId, Number(c.amount), c.status])).toEqual([[factura.corpo.invoiceId, 50000, "Pending"]]);

  // Mensagem à equipa.
  await page.goto("/cliente/mensagens");
  await page.getByLabel("Nova mensagem").fill(`${marca} Bom dia.`);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByRole("region", { name: "Conversa aberta" })).toContainText(`${marca} Bom dia.`);

  // Pedido de suporte: a equipa responde e fecha; o cliente avalia.
  await page.goto("/cliente/suporte");
  await page.getByRole("button", { name: "Novo pedido" }).click();
  await dialogo(page).getByLabel("Assunto").fill(`${marca} Segunda via`);
  await dialogo(page).getByLabel("Descrição").fill("Preciso da segunda via da factura.");
  await dialogo(page).getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Segunda via`, level: 1 })).toBeVisible();
  const tid = page.url().split("/").pop() ?? "";
  expect((await sa("POST", `/messaging/conversations/${tid}/messages`, { body: "Enviada por e-mail." })).status).toBe(201);
  expect((await sa("POST", `/messaging/conversations/${tid}/closure`)).status).toBe(204);
  await page.reload();
  await expect(page.getByText("Enviada por e-mail.")).toBeVisible();
  await page.getByLabel("5 · Muito bom").check();
  await page.getByLabel("Recomendaria? (opcional)").selectOption("9");
  await page.getByRole("button", { name: "Enviar avaliação" }).click();
  await expect(page.getByText("Avaliou este atendimento com 5 em 5", { exact: false })).toBeVisible();
  const ts = await cl<{ conversationId: string; rating: { rating: number; netPromoterScore: number } | null }[]>("GET", "/customer-portal/me/tickets");
  expect(ts.corpo.find((t) => t.conversationId === tid)?.rating).toMatchObject({ rating: 5, netPromoterScore: 9 });

  // Documento partilhado e o comprovativo carregado.
  await page.goto("/cliente/documentos");
  await expect(page.getByRole("table", { name: "Ficheiros carregados" })).toContainText("transferencia.pdf");
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: `Descarregar ${titulo}` }).click();
  expect((await descarga).suggestedFilename()).toBe("contrato.pdf");

  // Artigo: abrir e votar.
  await page.goto("/cliente/ajuda");
  await page.getByRole("link", { name: `${marca} Como pagar` }).click();
  await expect(page.getByRole("article")).toContainText("Carregue o comprovativo.");
  await page.getByRole("button", { name: "Sim" }).click();
  await expect(page.getByRole("status")).toContainText("Obrigado.");
  const a = await sa<{ helpfulVotes: number; views: number }>("GET", `/messaging/knowledge-base/${art.corpo.articleId}`);
  expect(Number(a.corpo.helpfulVotes)).toBe(1);
  expect(Number(a.corpo.views)).toBe(1);

  // Extracto: a factura do ano.
  await page.goto("/cliente/extracto");
  await expect(page.getByRole("row").filter({ hasText: numero })).toContainText("Factura");

  // Arrumar: o artigo sai da ajuda e a conversa de mensagens fecha.
  await sa("POST", `/messaging/knowledge-base/${art.corpo.articleId}/archive`);
  const ms = await cl<{ conversationId: string }[]>("GET", "/customer-portal/me/messages");
  for (const m of ms.corpo) await sa("POST", `/messaging/conversations/${m.conversationId}/closure`);
});
