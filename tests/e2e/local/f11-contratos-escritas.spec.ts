/**
 * F11 (contratos e cobranças) contra a API LOCAL (D1, §8.3). Preparação pela
 * API com a conta SuperAdmin local: uma conta Sales, um cliente e uma factura
 * já vencida (só na base local). Pela interface, como Sales: registar um
 * contrato, activá-lo, renová-lo, aditá-lo (valor e fim), anexar um ficheiro,
 * suspender, reactivar e terminar; na factura vencida, uma promessa de
 * pagamento; o separador «Comercial» do cliente. Confere no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const nif = `4${String(Date.now()).slice(-9)}`;

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

type Chamar = <T = unknown>(metodo: string, caminho: string, corpo?: unknown) => Promise<{ status: number; corpo: T }>;

async function sessaoApi(request: APIRequestContext, email: string, password: string): Promise<Chamar> {
  const r = await request.post(`${API_LOCAL}/identity/login`, { data: { email, password } });
  expect(r.status(), `login ${email}`).toBe(200);
  const { accessToken } = (await r.json()) as { accessToken: string };
  return async (metodo, caminho, corpo) => {
    const x = await request.fetch(`${API_LOCAL}${caminho}`, { method: metodo, headers: { Authorization: `Bearer ${accessToken}` }, ...(corpo === undefined ? {} : { data: corpo }) });
    const texto = await x.text();
    return { status: x.status(), corpo: (texto ? JSON.parse(texto) : null) as never };
  };
}

const dialogo = (page: Page) => page.getByRole("dialog");

test("F11: contratos e cobranças — ciclo de vida, aditamento, anexo, promessa de pagamento", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const email = `sales-c-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Sales" });
  expect(c.status, JSON.stringify(c.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const cliente = await sa<{ customerId: string }>("POST", "/commercial/customers", { name: `${marca} Cliente`, taxId: nif, addressDetail: "Rua do Teste, 5", city: "Luanda" });
  expect(cliente.status, JSON.stringify(cliente.corpo)).toBe(201);
  const cid = cliente.corpo.customerId;
  const factura = await sa<{ invoiceId: string }>("POST", "/finance/sales-invoices", {
    customerId: cid,
    series: null,
    // Emitida no início do mês e vencida há dias (só na base local).
    issuedOn: "2026-10-01",
    taxPointDate: null,
    currency: "AOA",
    dueDate: "2026-10-05",
    lines: [{ description: `${marca} Serviço`, quantity: 1, unitPrice: 50000, taxCode: "NOR" }],
  });
  expect(factura.status, JSON.stringify(factura.corpo)).toBe(201);
  const numero = (await sa<{ number: string }>("GET", `/finance/sales-invoices/${factura.corpo.invoiceId}`)).corpo.number;

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));

  // --- Contrato: registar, activar, renovar, aditar, anexar, suspender, reactivar, terminar ---
  const ref = `CT-${sufixo}`;
  await page.goto("/contratos-clientes");
  await page.getByRole("button", { name: "Novo contrato" }).click();
  await dialogo(page).getByLabel("Referência").fill(ref);
  await dialogo(page).getByLabel("Cliente").selectOption({ label: `${marca} Cliente` });
  await dialogo(page).getByLabel("Título").fill(`${marca} Manutenção`);
  await dialogo(page).getByLabel("Início").fill("2026-01-01");
  await dialogo(page).getByLabel("Fim (opcional)").fill("2026-12-31");
  await dialogo(page).getByLabel("Valor (opcional)").fill("1 200 000");
  await dialogo(page).getByLabel("SLA de resposta (horas, opcional)").fill("4");
  await dialogo(page).getByLabel("Aviso de renovação (dias, opcional)").fill("30");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Manutenção`, level: 1 })).toBeVisible();
  const kid = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Activar" }).click();
  await dialogo(page).getByRole("button", { name: "Activar" }).click();
  await expect(page.getByText("Activo", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Renovar" }).click();
  await dialogo(page).getByLabel("Novo fim").fill("2027-12-31");
  await dialogo(page).getByRole("button", { name: "Renovar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Novo aditamento" }).click();
  await dialogo(page).getByLabel("Descrição").fill("Mais horas e prazo.");
  await dialogo(page).getByLabel("Variação do valor em AOA (opcional)").fill("250 000,50");
  await dialogo(page).getByLabel("Novo fim (opcional)").fill("2028-06-30");
  await dialogo(page).getByRole("button", { name: "Registar aditamento" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Aditamentos" })).toContainText("Mais horas e prazo.");
  await page.getByRole("button", { name: "Anexar ficheiro" }).click();
  await dialogo(page).getByLabel("Ficheiro").setInputFiles({ name: "contrato.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n") });
  await expect(dialogo(page).getByText("contrato.pdf")).toBeVisible();
  await dialogo(page).getByRole("button", { name: "Anexar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Anexos" })).toContainText("Contrato assinado");
  await page.getByRole("button", { name: "Suspender" }).click();
  await dialogo(page).getByRole("button", { name: "Suspender" }).click();
  await expect(page.getByText("Suspenso", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Activar" }).click();
  await dialogo(page).getByRole("button", { name: "Activar" }).click();
  await expect(page.getByText("Activo", { exact: true })).toBeVisible();
  const k = await sa<{ status: string; value: number; endsOn: string; slaResponseHours: number }>("GET", `/commercial/contracts/${kid}`);
  expect([k.corpo.status, Number(k.corpo.value), k.corpo.endsOn, Number(k.corpo.slaResponseHours)]).toEqual(["Active", 1450000.5, "2028-06-30", 4]);
  const ads = await sa<{ number: number; previousEndsOn: string }[]>("GET", `/commercial/contracts/${kid}/amendments`);
  expect(ads.corpo.map((a) => [Number(a.number), a.previousEndsOn])).toEqual([[1, "2027-12-31"]]);
  const docs = await sa<{ category: string }[]>("GET", `/commercial/contracts/${kid}/documents`);
  expect(docs.corpo.map((d) => d.category)).toEqual(["Contrato assinado"]);
  await page.getByRole("button", { name: "Terminar" }).click();
  await dialogo(page).getByLabel("Motivo").fill(`${marca} Mudou de fornecedor.`);
  await dialogo(page).getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByText("Terminado a", { exact: false })).toBeVisible();
  const kt = await sa<{ status: string; terminationReason: string }>("GET", `/commercial/contracts/${kid}`);
  expect(kt.corpo).toMatchObject({ status: "Terminated", terminationReason: `${marca} Mudou de fornecedor.` });

  // --- Cobrança: promessa de pagamento sobre a factura vencida ---
  await page.goto("/cobrancas");
  await page.getByRole("button", { name: `Registar acção sobre ${numero}` }).click();
  await dialogo(page).getByLabel("Tipo").selectOption("PaymentPromise");
  await dialogo(page).getByLabel("Quando").fill("2026-10-18T10:15");
  await dialogo(page).getByLabel("O que foi feito ou combinado").fill(`${marca} Paga na sexta.`);
  await dialogo(page).getByLabel("Valor prometido em AOA").fill("57 000");
  await dialogo(page).getByLabel("Data prometida").fill("2026-10-24");
  await dialogo(page).getByLabel("Próximo contacto (opcional)").fill("2026-10-27");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  const acs = await sa<{ salesInvoiceId: string; kind: string; promisedAmount: number; occurredAt: string; nextFollowUpOn: string }[]>("GET", `/commercial/collections/actions?customerId=${cid}`);
  expect(acs.corpo.map((a) => [a.salesInvoiceId, a.kind, Number(a.promisedAmount), new Date(a.occurredAt).toISOString(), a.nextFollowUpOn])).toEqual([
    [factura.corpo.invoiceId, "PaymentPromise", 57000, "2026-10-18T09:15:00.000Z", "2026-10-27"],
  ]);
  await page.getByRole("link", { name: "Acções" }).click();
  await expect(page.getByRole("table", { name: "Acções de cobrança" })).toContainText(`${marca} Paga na sexta.`);

  // --- O separador «Comercial» do cliente ---
  await page.goto(`/clientes/${cid}?vista=comercial`);
  await expect(page.getByRole("list", { name: "Contratos" })).toContainText(ref);
  await expect(page.getByRole("list", { name: "Acções de cobrança" })).toContainText("Promessa de pagamento");
});
