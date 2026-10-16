/**
 * F7 (portal do colaborador) contra a API LOCAL (D1, §8.3). A preparação faz-se
 * pela API com a conta SuperAdmin local: conta Colaborador ligada a uma ficha
 * nova, direito de férias, turno escalado, ciclo de avaliação com objectivo e
 * resultado-chave, anúncio. Tudo o resto pela interface, com a conta do
 * colaborador: justificar falta, pedir e retirar férias (B25), pedir e cancelar troca de
 * turno, abrir e responder a um pedido interno, registar progresso, emitir uma
 * declaração (só na base local).
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;

/** Datas em Luanda (UTC+1), como o front as calcula. */
const dia = (n: number) => new Date(Date.now() + 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const hoje = dia(0);
const ano = Number(hoje.slice(0, 4));

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

test("F7: portal do colaborador — falta, férias, troca de turno, pedido interno, progresso e declaração", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const email = `portal-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Colaborador" });
  expect(c.status).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const ficha = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Portal`, departmentId: null, userId: null, hiredOn: null });
  expect(ficha.status).toBe(201);
  const eu = ficha.corpo.employeeId;
  expect((await sa("POST", `/hr/employees/${eu}/account`, { userId: c.corpo.userId })).status).toBe(204);
  expect((await sa("PUT", `/hr/employees/${eu}/leave-entitlements/${ano}/Annual`, { days: 22, carriedOverDays: 0, notes: marca })).status).toBe(204);
  const tipo = await sa<{ shiftTypeId: string }>("POST", "/hr/shifts/types", { code: `Q${sufixo.slice(-5)}`, name: `${marca} Manhã`, startsAt: "06:00:00", endsAt: "14:00:00", active: true });
  expect(tipo.status, JSON.stringify(tipo.corpo)).toBe(201);
  const escala = await sa("POST", "/hr/shifts/roster", { employeeId: eu, shiftTypeId: tipo.corpo.shiftTypeId, from: dia(1), to: dia(2), notes: null });
  expect(escala.status, JSON.stringify(escala.corpo)).toBe(201);
  const ciclo = await sa<{ cycleId: string }>("POST", "/hr/performance/cycles", { name: `${marca} Ciclo`, startsOn: `${ano}-01-01`, endsOn: `${ano}-12-31` });
  expect(ciclo.status).toBe(201);
  expect((await sa("POST", `/hr/performance/cycles/${ciclo.corpo.cycleId}/activation`)).status).toBe(204);
  const obj = await sa<{ objectiveId: string }>("POST", "/hr/performance/objectives", { cycleId: ciclo.corpo.cycleId, title: `${marca} Objectivo`, description: null, ownerEmployeeId: eu, departmentId: null, weight: 50 });
  expect(obj.status).toBe(201);
  const titulo = `${marca} Clientes visitados`;
  expect((await sa("POST", `/hr/performance/objectives/${obj.corpo.objectiveId}/key-results`, { title: titulo, unit: null, startValue: 0, targetValue: 10 })).status).toBe(201);
  const modelo = { name: `${marca} Declaração`, title: "DECLARAÇÃO", body: "Declara-se, para os devidos efeitos, que o colaborador trabalha nesta empresa.", selfService: true, active: true };
  const tpl = await sa<{ templateId: string }>("POST", "/hr/declaration-templates", modelo);
  expect(tpl.status, JSON.stringify(tpl.corpo)).toBe(201);
  const anuncio = `${marca} Anúncio fixado`;
  expect((await sa("POST", "/hr/announcements", { title: anuncio, body: "Teste do portal.", departmentId: null, pinned: true, publishedAt: null, expiresAt: null })).status).toBe(201);

  // --- Colaborador, pela interface ---
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/eu$/);
  await expect(page.getByText("22 dias")).toBeVisible();
  await expect(page.getByRole("heading", { name: anuncio })).toBeVisible();
  await expect(page.getByText(br(dia(1)))).toBeVisible();

  // Assiduidade: falta de ontem, justificada.
  await page.goto(`/eu/assiduidade?de=${dia(-7)}&ate=${hoje}`);
  await page.getByRole("button", { name: "Justificar uma falta" }).click();
  await page.getByLabel("Dia").fill(dia(-1));
  await page.getByLabel("Justificação").fill(`${marca} Consulta médica`);
  await page.getByRole("dialog").getByRole("button", { name: "Justificar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: br(dia(-1)) }).getByText("Falta justificada")).toBeVisible();

  // Férias: pedido daqui a 60 dias; vai a aprovação ou o servidor explica porque não.
  const de = dia(60);
  const ate = dia(62);
  await page.goto("/eu/ferias");
  await expect(page.getByText("dias por gozar")).toBeVisible();
  await page.getByRole("button", { name: "Pedir ausência" }).click();
  await page.getByLabel("Primeiro dia").fill(de);
  await page.getByLabel("Último dia").fill(ate);
  await page.getByLabel("Motivo (opcional)").fill(marca);
  const enviarFerias = page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" });
  // Base local: as políticas de férias que corridas anteriores deixaram activas
  // saem, para o desfecho não depender delas. Sem política, o servidor recusa e
  // o ecrã mostra porquê; com uma (e um ocupante no cargo), vai a aprovação.
  const politicas = await sa<{ policyId: string; processType: string; isActive: boolean }[]>("GET", "/approval/policies?page=1&pageSize=200");
  for (const x of politicas.corpo.filter((x) => x.processType === "hr.leave_request" && x.isActive)) await sa("POST", `/approval/policies/${x.policyId}/deactivation`);
  await enviarFerias.click();
  await expect(page.getByRole("dialog").getByText(/Nenhuma política de aprovação corresponde a 'hr.leave_request'/)).toBeVisible();
  const cargo = await sa<{ positionId: string }>("POST", "/hr/positions", { name: `${marca} Aprova férias`, hierarchyLevel: 2, grantsApprovalAuthority: true });
  expect(cargo.status).toBe(201);
  const aprovador = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Aprovador`, departmentId: null, userId: null, hiredOn: null });
  expect(aprovador.status).toBe(201);
  expect((await sa("POST", `/hr/employees/${aprovador.corpo.employeeId}/positions/direct`, { positionId: cargo.corpo.positionId, effectiveFrom: null, effectiveTo: null })).status).toBe(201);
  const politica = await sa<{ policyId: string }>("POST", "/approval/policies", {
    processType: "hr.leave_request",
    departmentId: null,
    minimumAmount: null,
    maximumAmount: null,
    requiresBudgetCheck: false,
    steps: [{ approverPositionId: cargo.corpo.positionId, mode: "AnyApprover", slaHours: null }],
  });
  expect(politica.status, JSON.stringify(politica.corpo)).toBe(201);
  await enviarFerias.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${br(de)} a ${br(ate)}` }).getByText("Por decidir")).toBeVisible();
  await sa("POST", `/approval/policies/${politica.corpo.policyId}/deactivation`);
  // B25: o próprio retira o pedido por decidir.
  await page.getByRole("button", { name: `Retirar o pedido de ${br(de)}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Retirar pedido" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${br(de)} a ${br(ate)}` }).getByText("Retirado")).toBeVisible();

  // Turnos: pedir troca do turno de amanhã e cancelar.
  await page.goto("/eu/turnos");
  await page.getByRole("button", { name: `Pedir troca do turno de ${br(dia(1))}` }).click();
  await page.getByLabel("Motivo").fill(`${marca} Exame`);
  await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Troca pedida")).toBeVisible();
  await page.getByRole("button", { name: `Cancelar o pedido de troca de ${br(dia(1))}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar pedido" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${marca} Exame` }).getByText("Cancelada")).toBeVisible();

  // Pedido interno: abrir e responder.
  const assunto = `${marca} Acesso à VPN`;
  await page.goto("/eu/pedidos");
  await page.getByRole("button", { name: "Novo pedido" }).click();
  await page.getByLabel("Assunto").fill(assunto);
  await page.getByLabel("Área").selectOption("It");
  await page.getByLabel("Pedido", { exact: true }).fill("Preciso de acesso à VPN.");
  await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("heading", { name: assunto, level: 1 })).toBeVisible();
  await page.getByLabel("Responder").fill("Para hoje, se possível.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText("Para hoje, se possível.")).toBeVisible();

  // Objectivos: 4,5 de 10.
  await page.goto("/eu/objectivos");
  await page.getByRole("button", { name: `Registar o valor de ${titulo}` }).click();
  await page.getByLabel("Valor actual").fill("4,5");
  await page.getByRole("dialog").getByRole("button", { name: "Registar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/^4,5 de 10/)).toBeVisible();

  // Declaração: emite e regista (só na base local).
  await page.goto("/eu/documentos");
  await page.getByRole("button", { name: `Emitir a ${modelo.name}` }).click();
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("dialog").getByRole("button", { name: "Emitir e descarregar" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // --- Conferir no servidor ---
  const trocas = await sa<{ status: string; reason: string }[]>("GET", `/hr/shifts/change-requests?requesterEmployeeId=${eu}`);
  expect(trocas.corpo.map((t) => [t.reason, t.status])).toEqual([[`${marca} Exame`, "Cancelled"]]);
  const ferias = await sa<{ startsOn: string; status: string }[]>("GET", `/hr/leave?employeeId=${eu}`);
  expect(ferias.corpo.map((f) => [f.startsOn, f.status])).toEqual([[de, "Cancelled"]]);
  const emitidas = await sa<{ templateId: string; bySelf: boolean; verificationCode: string }[]>("GET", `/hr/declarations?employeeId=${eu}`);
  expect(emitidas.corpo.map((d) => [d.templateId, d.bySelf])).toEqual([[tpl.corpo.templateId, true]]);
  expect(emitidas.corpo[0]?.verificationCode).toBeTruthy();
  // Arrumar: o modelo só servia esta corrida.
  await sa("PUT", `/hr/declaration-templates/${tpl.corpo.templateId}`, { ...modelo, active: false });
});
