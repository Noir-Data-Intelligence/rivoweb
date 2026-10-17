/**
 * F7c (formação e turnos) contra a API LOCAL (D1, §8.3). Preparação pela API
 * (SuperAdmin): duas fichas, uma com conta Colaborador, que pede pelo portal a
 * troca de um turno. Pela interface, com a conta Admin: formação planeada
 * (lotação 1), inscrição, lotada, concluída com avaliação e certificado;
 * outra formação com inscrição cancelada e a formação cancelada; tipo de
 * turno criado e corrigido; escala de dois dias, depois substituída num dia e
 * tirada noutro; troca aprovada (o turno passa ao colega). Confere no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const dia = (n: number) => new Date(Date.now() + 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

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

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();
}

const dialogo = (page: Page) => page.getByRole("dialog");

test("F7c: formação do planeamento ao certificado; turnos, escala e troca aprovada", async ({ page, request }) => {
  test.setTimeout(240_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");
  const ad = await sessaoApi(request, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin): a Joana tem conta e pede a troca; o Rui fica com o turno.
  const email = `turnos-${sufixo.toLowerCase()}@teste.local`;
  const conta = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Colaborador" });
  expect(conta.status).toBe(201);
  expect((await sa("POST", `/identity/users/${conta.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${conta.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const joana = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Joana`, departmentId: null, userId: null, hiredOn: null });
  const rui = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Rui`, departmentId: null, userId: null, hiredOn: null });
  expect(joana.status).toBe(201);
  expect(rui.status).toBe(201);
  expect((await sa("POST", `/hr/employees/${joana.corpo.employeeId}/account`, { userId: conta.corpo.userId })).status).toBe(204);

  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");

  // --- Formação com lotação 1: inscrever, lotada, concluir.
  const curso = `${marca} Primeiros socorros`;
  await page.goto("/formacao");
  await page.getByRole("button", { name: "Planear formação" }).click();
  await dialogo(page).getByLabel("Título").fill(curso);
  await dialogo(page).getByLabel("Início").fill(dia(-2));
  await dialogo(page).getByLabel("Fim (opcional)").fill(dia(-1));
  await dialogo(page).getByLabel("Horas (opcional)").fill("7,5");
  await dialogo(page).getByLabel("Custo (opcional)").fill("150 000,00");
  await dialogo(page).getByLabel("Lotação (opcional)").fill("1");
  await dialogo(page).getByLabel("Validade do certificado em meses (opcional)").fill("24");
  await dialogo(page).getByRole("button", { name: "Planear" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("link", { name: curso }).click();
  const courseId = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Inscrever" }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Joana` });
  await dialogo(page).getByRole("button", { name: "Inscrever" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Inscrever" })).toBeDisabled();
  await page.getByRole("button", { name: `Concluir a formação de ${marca} Joana` }).click();
  await dialogo(page).getByLabel("Avaliação de 0 a 100 (opcional)").fill("87,5");
  await dialogo(page).getByLabel("N.º do certificado (opcional)").fill(`PS-${sufixo}`);
  await dialogo(page).getByRole("button", { name: "Concluir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText(`PS-${sufixo} · válido até`, { exact: false })).toBeVisible();
  const insc = await ad<{ employeeId: string; status: string; score: number; certificateNumber: string; certificateExpiresOn: string | null }[]>("GET", `/hr/training/enrolments?courseId=${courseId}`);
  expect(insc.corpo).toHaveLength(1);
  expect(insc.corpo[0]).toMatchObject({ employeeId: joana.corpo.employeeId, status: "Completed", score: 87.5, certificateNumber: `PS-${sufixo}` });
  expect(insc.corpo[0]?.certificateExpiresOn).toBeTruthy();

  // --- Outra formação: inscrição cancelada e formação cancelada.
  const outro = `${marca} Excel`;
  await page.goto("/formacao");
  await page.getByRole("button", { name: "Planear formação" }).click();
  await dialogo(page).getByLabel("Título").fill(outro);
  await dialogo(page).getByLabel("Início").fill(dia(30));
  await dialogo(page).getByRole("button", { name: "Planear" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("link", { name: outro }).click();
  const outroId = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Inscrever" }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Rui` });
  await dialogo(page).getByRole("button", { name: "Inscrever" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Cancelar a inscrição de ${marca} Rui` }).click();
  await dialogo(page).getByRole("button", { name: "Cancelar inscrição" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${marca} Rui` }).getByText("Cancelada")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar formação" }).click();
  await dialogo(page).getByRole("button", { name: "Cancelar formação" }).click();
  await expect(page.getByText("Formação cancelada: não aceita inscrições.")).toBeVisible();
  const cursos = await ad<{ courseId: string; cancelled: boolean }[]>("GET", "/hr/training/courses?includeCancelled=true");
  expect(cursos.corpo.find((c) => c.courseId === outroId)?.cancelled).toBe(true);

  // --- Tipo de turno: criar e corrigir.
  const codigo = `T${sufixo.slice(-6)}`;
  await page.goto("/turnos?vista=tipos");
  await page.getByRole("button", { name: "Novo tipo de turno" }).click();
  await dialogo(page).getByLabel("Código").fill(codigo);
  await dialogo(page).getByLabel("Nome").fill(`${marca} Noite`);
  await dialogo(page).getByLabel("Início").fill("22:00");
  await dialogo(page).getByLabel("Fim").fill("06:00");
  await dialogo(page).getByRole("button", { name: "Criar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Corrigir o turno ${marca} Noite` }).click();
  await dialogo(page).getByLabel("Nome").fill(`${marca} Noite longa`);
  await dialogo(page).getByLabel("Fim").fill("07:00");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${marca} Noite longa` })).toContainText("22:00–07:00 (dia seguinte)");
  const tipos = await ad<{ shiftTypeId: string; code: string; name: string; endsAt: string; crossesMidnight: boolean }[]>("GET", "/hr/shifts/types?includeInactive=true");
  const tipo = tipos.corpo.find((t) => t.code === codigo);
  expect(tipo).toMatchObject({ name: `${marca} Noite longa`, endsAt: "07:00:00", crossesMidnight: true });
  const outroTipo = tipos.corpo.find((t) => t.code !== codigo);

  // --- Escala: a Joana em dois dias; depois o dia 2 substituído e o dia 3 tirado.
  await page.goto(`/turnos?de=${dia(10)}&ate=${dia(13)}`);
  await page.getByRole("button", { name: "Escalar" }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Joana` });
  await dialogo(page).getByLabel("Turno").selectOption(tipo?.shiftTypeId ?? "");
  await dialogo(page).getByLabel("Primeiro dia").fill(dia(11));
  await dialogo(page).getByLabel("Último dia (opcional)").fill(dia(12));
  await dialogo(page).getByRole("button", { name: "Escalar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  const daJoana = page.getByRole("row").filter({ hasText: `${marca} Joana` });
  await expect(daJoana).toHaveCount(2);
  if (outroTipo) {
    await page.getByRole("button", { name: "Escalar" }).click();
    await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Joana` });
    await dialogo(page).getByLabel("Turno").selectOption(outroTipo.shiftTypeId);
    await dialogo(page).getByLabel("Primeiro dia").fill(dia(12));
    await dialogo(page).getByRole("button", { name: "Escalar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByText("1 turno anterior foi substituído.")).toBeVisible();
    await page.getByRole("button", { name: `Tirar ${marca} Joana da escala de ${br(dia(12))}` }).click();
    await dialogo(page).getByRole("button", { name: "Tirar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(daJoana).toHaveCount(1);
  }

  // --- Troca: a Joana pede pelo portal (API) que o Rui fique com o dia 1; o Admin aprova.
  const escala = await ad<{ assignmentId: string; day: string; employeeId: string }[]>("GET", `/hr/shifts/roster?from=${dia(11)}&to=${dia(11)}&employeeId=${joana.corpo.employeeId}`);
  const turno = escala.corpo[0];
  expect(turno?.day).toBe(dia(11));
  const eu = await sessaoApi(request, email, PASSWORD_LOCAL);
  const pedido = await eu("POST", `/portal/me/shifts/${turno?.assignmentId ?? ""}/change-requests`, { reason: `${marca} Exame`, proposedEmployeeId: rui.corpo.employeeId });
  expect(pedido.status, JSON.stringify(pedido.corpo)).toBe(201);
  await page.goto("/turnos?vista=trocas");
  await page.getByRole("button", { name: `Aprovar a troca de ${marca} Joana a ${br(dia(11))}` }).click();
  await expect(dialogo(page)).toContainText(`passa de ${marca} Joana para ${marca} Rui`);
  await dialogo(page).getByRole("button", { name: "Aprovar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  const depois = await ad<{ employeeId: string }[]>("GET", `/hr/shifts/roster?from=${dia(11)}&to=${dia(11)}&employeeId=${rui.corpo.employeeId}`);
  expect(depois.corpo).toHaveLength(1);
  const trocas = await ad<{ requesterEmployeeId: string; status: string }[]>("GET", `/hr/shifts/change-requests?requesterEmployeeId=${joana.corpo.employeeId}`);
  expect(trocas.corpo.map((t) => t.status)).toEqual(["Approved"]);

  // Arrumar: o tipo de turno só servia esta corrida.
  await ad("PUT", `/hr/shifts/types/${tipo?.shiftTypeId ?? ""}`, { code: null, name: `${marca} Noite longa`, startsAt: "22:00:00", endsAt: "07:00:00", active: false });
});
