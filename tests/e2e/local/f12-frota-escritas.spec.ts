/**
 * F12 (frota) contra a API LOCAL (D1, §8.3). Preparação pela API com a conta
 * SuperAdmin local: uma colaboradora e uma conta AssetManager. Pela
 * interface, como AssetManager (sem RH nem leitura do arquivo): viatura
 * registada, manutenção aberta e fechada com custo, plano agendado e
 * concluído, outro cancelado, atribuição à colaboradora (pela lista da frota,
 * B40) e terminada, viagem, despesa, documento junto, descarregado pela
 * viatura e retirado (um documento alheio dá 404), apólice contratada e
 * corrigida, sinistro pago, outro recusado, apólice anulada. Como Admin
 * local: viatura desactivada. Confere tudo no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas SuperAdmin e Admin locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const matricula = `T-${sufixo}`;

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

type Chamar = <T = unknown>(metodo: string, caminho: string, corpo?: unknown) => Promise<{ status: number; corpo: T }>;

async function token(request: APIRequestContext, email: string, password: string): Promise<string> {
  const r = await request.post(`${API_LOCAL}/identity/login`, { data: { email, password } });
  expect(r.status(), `login ${email}`).toBe(200);
  return ((await r.json()) as { accessToken: string }).accessToken;
}

async function sessaoApi(request: APIRequestContext, email: string, password: string): Promise<Chamar> {
  const accessToken = await token(request, email, password);
  return async (metodo, caminho, corpo) => {
    const x = await request.fetch(`${API_LOCAL}${caminho}`, { method: metodo, headers: { Authorization: `Bearer ${accessToken}` }, ...(corpo === undefined ? {} : { data: corpo }) });
    const texto = await x.text();
    return { status: x.status(), corpo: (texto ? JSON.parse(texto) : null) as never };
  };
}

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

async function sair(page: Page) {
  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
}

const dialogo = (page: Page) => page.getByRole("dialog");

type FichaViatura = {
  plateNumber: string;
  model: string;
  status: string;
  maintenances: { type: string; description: string; startedOn: string; endedOn: string | null; cost: number | null }[];
  assignments: { employeeId: string; employeeName: string | null; startedOn: string; endedOn: string | null }[];
  plans: { description: string; intervalDays: number; nextDueOn: string; isActive: boolean }[];
  trips: { driverId: string | null; driverName: string | null; startOdometer: number; endOdometer: number; distance: number; purpose: string | null }[];
  expenses: { category: string; amount: number; occurredOn: string; description: string | null }[];
};

test("F12: frota — viatura, manutenção, planos, atribuição, viagem, despesa, seguros, sinistros, documentos e desactivação", async ({ page, request }) => {
  test.setTimeout(400_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin): uma colaboradora e uma conta AssetManager ---
  const pessoa = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Motorista`, departmentId: null, userId: null, hiredOn: null });
  expect(pessoa.status, JSON.stringify(pessoa.corpo)).toBe(201);
  const email = `frota-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "AssetManager" });
  expect(c.status, JSON.stringify(c.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });

  // --- AssetManager, pela interface ---
  await entrar(page, email, PASSWORD_LOCAL);
  await page.getByRole("link", { name: "Viaturas" }).click();
  await page.getByRole("button", { name: "Nova viatura" }).click();
  await dialogo(page).getByLabel("Matrícula").fill(matricula.toLowerCase());
  await dialogo(page).getByLabel("Modelo").fill(`${marca} Hilux`);
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(page.getByRole("heading", { name: matricula, level: 1 })).toBeVisible();
  const vid = page.url().split("/").pop() ?? "";

  // Manutenção: aberta (a viatura fica em manutenção) e fechada com custo.
  await page.getByRole("button", { name: "Enviar para manutenção" }).click();
  await dialogo(page).getByLabel("Início").fill("2026-03-01");
  await dialogo(page).getByLabel("Descrição").fill("Travões");
  await dialogo(page).getByRole("button", { name: "Abrir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Em manutenção: feche o registo aberto", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Fechar a manutenção de 01/03/2026" }).click();
  await dialogo(page).getByLabel("Fim").fill("2026-03-03");
  await dialogo(page).getByLabel("Custo em AOA (opcional)").fill("85 000,5");
  await dialogo(page).getByRole("button", { name: "Fechar manutenção" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Em manutenção: feche o registo aberto", { exact: false })).toHaveCount(0);

  // Planos: um concluído (reagenda), outro cancelado.
  for (const [desc, dias, data] of [
    ["Mudança de óleo", "90", "2026-04-01"],
    ["Pneus", "365", "2026-05-01"],
  ] as const) {
    await page.getByRole("button", { name: "Novo plano" }).click();
    await dialogo(page).getByLabel("Descrição").fill(desc);
    await dialogo(page).getByLabel("Intervalo em dias").fill(dias);
    await dialogo(page).getByLabel("Primeira data").fill(data);
    await dialogo(page).getByRole("button", { name: "Agendar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Concluir o ciclo de Mudança de óleo" }).click();
  await dialogo(page).getByLabel("Concluído a").fill("2026-04-02");
  await dialogo(page).getByRole("button", { name: "Concluir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Cancelar o plano Pneus" }).click();
  await dialogo(page).getByRole("button", { name: "Cancelar plano" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  // Atribuição pela lista dos activos (sem RH), terminada.
  await page.getByRole("link", { name: "Atribuições" }).click();
  await page.getByRole("button", { name: "Atribuir", exact: true }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Motorista` });
  await dialogo(page).getByLabel("Desde").fill("2026-03-01");
  await dialogo(page).getByRole("button", { name: "Atribuir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Terminar a atribuição a ${marca} Motorista` }).click();
  await dialogo(page).getByLabel("Termina a").fill("2026-03-31");
  await dialogo(page).getByRole("button", { name: "Terminar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  // Viagem e despesa.
  await page.getByRole("link", { name: "Viagens" }).click();
  await page.getByRole("button", { name: "Registar viagem" }).click();
  await dialogo(page).getByLabel("Motorista (opcional)").selectOption({ label: `${marca} Motorista` });
  await dialogo(page).getByLabel("Início").fill("2026-03-04");
  await dialogo(page).getByLabel("Fim").fill("2026-03-04");
  await dialogo(page).getByLabel("Odómetro à partida (km)").fill("12 000");
  await dialogo(page).getByLabel("Odómetro à chegada (km)").fill("12 140,5");
  await dialogo(page).getByLabel("Motivo (opcional)").fill("Visita ao cliente");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Viagens" })).toContainText(`${marca} Motorista`);
  await page.getByRole("link", { name: "Custos" }).click();
  await page.getByRole("button", { name: "Registar despesa" }).click();
  await dialogo(page).getByLabel("Valor em AOA").fill("45 000");
  await dialogo(page).getByLabel("Data").fill("2026-03-04");
  await dialogo(page).getByLabel("Descrição (opcional)").fill("Gasóleo");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  // Documentos pela viatura (B40): junto, descarregado e retirado; um documento alheio dá 404.
  await page.getByRole("link", { name: "Documentos", exact: true }).click();
  await page.getByRole("button", { name: "Juntar documento" }).click();
  await dialogo(page).getByLabel("Ficheiro").setInputFiles({ name: "livrete.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n") });
  await expect(dialogo(page).getByText("livrete.pdf")).toBeVisible();
  await dialogo(page).getByLabel("Categoria").fill("Livrete");
  await dialogo(page).getByRole("button", { name: "Juntar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Documentos da viatura" })).toContainText("livrete.pdf");
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarregar livrete.pdf" }).click();
  expect((await descarga).suggestedFilename()).toBe("livrete.pdf");
  await page.getByRole("button", { name: "Retirar livrete.pdf" }).click();
  await dialogo(page).getByLabel("Motivo").fill("Livrete substituído.");
  await dialogo(page).getByRole("button", { name: "Retirar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Documentos da viatura" })).not.toContainText("livrete.pdf");
  const alheio = await request.post(`${API_LOCAL}/documents`, {
    headers: { Authorization: `Bearer ${await token(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "")}` },
    multipart: { file: { name: "alheio.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") }, category: "Frota" },
  });
  expect(alheio.status()).toBe(201);
  const am = await sessaoApi(request, email, PASSWORD_LOCAL);
  expect((await am("POST", `/fleet/vehicles/${vid}/documents`, { documentId: ((await alheio.json()) as { documentId: string }).documentId, category: "Alheio" })).status).toBe(404);

  // Seguros: apólice contratada e corrigida; um sinistro pago, outro recusado; anulada.
  await page.getByRole("link", { name: "Seguros", exact: true }).click();
  const numero = `AP-${sufixo}`;
  await page.getByRole("button", { name: "Nova apólice" }).click();
  await dialogo(page).getByLabel("Seguradora").fill(`${marca} Seguros`);
  await dialogo(page).getByLabel("N.º da apólice").fill(numero.toLowerCase());
  await dialogo(page).getByLabel("Início").fill("2026-01-01");
  await dialogo(page).getByLabel("Fim").fill("2026-12-31");
  await dialogo(page).getByLabel("Prémio").fill("250 000");
  await dialogo(page).getByRole("button", { name: "Contratar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Corrigir a apólice ${numero}` }).click();
  await dialogo(page).getByLabel("Prémio").fill("260 000,5");
  await dialogo(page).getByLabel("Capital seguro (opcional)").fill("18 000 000");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Sinistros da apólice ${numero}` }).click();
  for (const [data, desc] of [
    ["2026-03-05", "Toque no pára-choques"],
    ["2026-04-10", "Vidro partido"],
  ] as const) {
    await dialogo(page).getByLabel("Data do sinistro").fill(data);
    await dialogo(page).getByLabel("Descrição").fill(desc);
    await dialogo(page).getByLabel("Valor reclamado em AOA (opcional)").fill("80 000");
    await dialogo(page).getByRole("button", { name: "Abrir sinistro" }).click();
    await expect(dialogo(page).getByRole("list", { name: "Sinistros" })).toContainText(desc);
  }
  await dialogo(page).getByRole("button", { name: "Pagar o sinistro de 05/03/2026" }).click();
  await dialogo(page).getByLabel("Valor pago em AOA").fill("75 000");
  await dialogo(page).getByRole("button", { name: "Registar pagamento" }).click();
  await expect(dialogo(page).getByRole("listitem").filter({ hasText: "Toque no pára-choques" })).toContainText("Pago");
  await dialogo(page).getByRole("button", { name: "Recusar o sinistro de 10/04/2026" }).click();
  await expect(dialogo(page).getByRole("listitem").filter({ hasText: "Vidro partido" })).toContainText("Recusado");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Anular a apólice ${numero}` }).click();
  await dialogo(page).getByLabel("Anulada a").fill("2026-06-30");
  await dialogo(page).getByRole("button", { name: "Anular apólice" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Apólices" }).getByRole("row").filter({ hasText: numero })).toContainText("Anulada");
  await sair(page);

  // --- Admin, pela interface: desactivar ---
  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  await page.goto(`/frota/${vid}`);
  await page.getByRole("button", { name: "Desactivar" }).click();
  await dialogo(page).getByRole("button", { name: "Desactivar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Inactiva: não recebe manutenção", { exact: false })).toBeVisible();

  // --- No servidor ---
  const v = await sa<FichaViatura>("GET", `/fleet/vehicles/${vid}`);
  expect([v.corpo.plateNumber, v.corpo.status]).toEqual([matricula, "Inactive"]);
  expect(v.corpo.maintenances.map((m) => [m.type, m.description, m.startedOn, m.endedOn, Number(m.cost)])).toEqual([["Corrective", "Travões", "2026-03-01", "2026-03-03", 85000.5]]);
  const planos = Object.fromEntries(v.corpo.plans.map((p) => [p.description, [p.isActive, p.nextDueOn, Number(p.intervalDays)]]));
  expect(planos).toEqual({ "Mudança de óleo": [true, "2026-07-01", 90], Pneus: [false, "2026-05-01", 365] });
  expect(v.corpo.assignments.map((a) => [a.employeeId, a.employeeName, a.startedOn, a.endedOn])).toEqual([[pessoa.corpo.employeeId, `${marca} Motorista`, "2026-03-01", "2026-03-31"]]);
  expect(v.corpo.trips.map((t) => [t.driverId, t.driverName, Number(t.startOdometer), Number(t.endOdometer), Number(t.distance), t.purpose])).toEqual([[pessoa.corpo.employeeId, `${marca} Motorista`, 12000, 12140.5, 140.5, "Visita ao cliente"]]);
  expect(v.corpo.expenses.map((d) => [d.category, Number(d.amount), d.occurredOn, d.description])).toEqual([["Fuel", 45000, "2026-03-04", "Gasóleo"]]);
  const ap = await sa<{ policyId: string; policyNumber: string; premium: number; insuredValue: number; currency: string; coverage: string; status: string }[]>("GET", `/fleet/insurance?vehicleId=${vid}`);
  expect(ap.corpo.map((p) => [p.policyNumber, Number(p.premium), Number(p.insuredValue), p.currency, p.coverage, p.status])).toEqual([[numero, 260000.5, 18000000, "AOA", "Responsabilidade civil", "Cancelled"]]);
  const sin = await sa<{ description: string; status: string; claimedAmount: number; settledAmount: number | null }[]>("GET", `/fleet/insurance/${ap.corpo[0]?.policyId ?? ""}/claims`);
  expect(Object.fromEntries(sin.corpo.map((s) => [s.description, [s.status, Number(s.claimedAmount), s.settledAmount === null ? null : Number(s.settledAmount)]]))).toEqual({
    "Toque no pára-choques": ["Settled", 80000, 75000],
    "Vidro partido": ["Rejected", 80000, null],
  });
  const docs = await sa<unknown[]>("GET", `/fleet/vehicles/${vid}/documents?page=1&pageSize=25`);
  expect(docs.corpo).toHaveLength(0);
});
