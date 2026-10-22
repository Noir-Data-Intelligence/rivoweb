/**
 * F12 (trabalho do projecto e portal do cliente) contra a API LOCAL (D1,
 * §8.3). Preparação pela API com a conta SuperAdmin local: um projecto com
 * uma tarefa e um marco, um colaborador, um cliente com uma conta Cliente
 * ligada. Pela interface, como Admin local (lê RH, clientes e documentos):
 * comentário e checklist na tarefa, tempo registado e apagado, linha de
 * orçamento, ficheiro junto e retirado, colaborador alocado e libertado,
 * cliente ligado e projecto mostrado no portal. Como o cliente: vê o
 * projecto e comenta o marco. Confere tudo no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas SuperAdmin e Admin locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const nif = `3${String(Date.now()).slice(-9)}`;

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
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

const dialogo = (page: Page) => page.getByRole("dialog");

test("F12: trabalho do projecto — comentários, checklist, tempo, orçamento, ficheiros, recursos, cliente e portal", async ({ page, request, browser }) => {
  test.setTimeout(400_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const proj = await sa<{ projectId: string }>("POST", "/projects", { name: `${marca} Implementação`, startDate: "2026-02-01" });
  expect(proj.status, JSON.stringify(proj.corpo)).toBe(201);
  const pid = proj.corpo.projectId;
  const tarefa = await sa<{ taskId: string }>("POST", `/projects/${pid}/tasks`, { title: "Configuração", dueDate: "2026-03-31", assignedEmployeeId: null });
  expect(tarefa.status).toBe(201);
  const marco = await sa<{ milestoneId: string }>("POST", `/projects/${pid}/milestones`, { name: "Go-live", targetDate: "2026-06-30" });
  expect(marco.status).toBe(201);
  const pessoa = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Consultora`, departmentId: null, userId: null, hiredOn: null });
  expect(pessoa.status, JSON.stringify(pessoa.corpo)).toBe(201);
  const cliente = await sa<{ customerId: string }>("POST", "/commercial/customers", { name: `${marca} Cliente`, taxId: nif, addressDetail: "Rua do Teste, 6", city: "Luanda" });
  expect(cliente.status, JSON.stringify(cliente.corpo)).toBe(201);
  const emailCliente = `cliente-p-${sufixo.toLowerCase()}@teste.local`;
  const conta = await sa<{ userId: string }>("POST", "/identity/invitations", { email: emailCliente, profile: "Cliente" });
  expect(conta.status).toBe(201);
  expect((await sa("POST", `/identity/users/${conta.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${conta.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  expect((await sa("POST", `/commercial/customers/${cliente.corpo.customerId}/account`, { userId: conta.corpo.userId })).status).toBe(204);

  // --- Admin, pela interface ---
  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  await page.goto(`/projectos/${pid}?vista=tarefas`);
  await page.getByRole("button", { name: "Comentários de Configuração" }).click();
  await dialogo(page).getByLabel("Novo comentário").fill("Tabela de IVA carregada.");
  await dialogo(page).getByRole("button", { name: "Comentar" }).click();
  await expect(dialogo(page).getByRole("list", { name: "Comentários da tarefa" })).toContainText("Tabela de IVA carregada.");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Checklist de Configuração" }).click();
  for (const passo of ["Plano de contas", "Séries"]) {
    await dialogo(page).getByLabel("Novo passo").fill(passo);
    await dialogo(page).getByRole("button", { name: "Juntar" }).click();
    await expect(dialogo(page).getByRole("list", { name: "Passos" })).toContainText(passo);
  }
  await dialogo(page).getByLabel("Plano de contas", { exact: true }).click();
  await expect(dialogo(page)).toContainText("1 de 2 feitos.");
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Tempo", exact: true }).click();
  for (const h of ["6,5", "1"]) {
    await page.getByRole("button", { name: "Registar tempo" }).click();
    await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Consultora` });
    await dialogo(page).getByLabel("Tarefa (opcional)").selectOption({ label: "Configuração" });
    await dialogo(page).getByLabel("Dia").fill("2026-10-20");
    await dialogo(page).getByLabel("Horas").fill(h);
    await dialogo(page).getByRole("button", { name: "Registar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Apagar o registo de 20/10/2026 (1,00 h)" }).click();
  await dialogo(page).getByRole("button", { name: "Apagar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  await page.getByRole("link", { name: "Orçamento", exact: true }).click();
  await page.getByRole("button", { name: "Nova linha" }).click();
  await dialogo(page).getByLabel("Categoria").fill("Mão-de-obra");
  await dialogo(page).getByLabel("Previsto em AOA").fill("1 200 000");
  await dialogo(page).getByLabel("Gasto em AOA (opcional)").fill("300 000,5");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  await page.getByRole("link", { name: "Ficheiros", exact: true }).click();
  await page.getByRole("button", { name: "Juntar ficheiro" }).click();
  await dialogo(page).getByLabel("Ficheiro").setInputFiles({ name: "acta.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n") });
  await expect(dialogo(page).getByText("acta.pdf")).toBeVisible();
  await dialogo(page).getByLabel("Categoria (opcional)").fill("Acta de arranque");
  await dialogo(page).getByRole("button", { name: "Juntar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Ficheiros do projecto" })).toContainText("acta.pdf");
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarregar acta.pdf" }).click();
  expect((await descarga).suggestedFilename()).toBe("acta.pdf");
  await page.getByRole("button", { name: "Retirar acta.pdf" }).click();
  await dialogo(page).getByLabel("Motivo").fill("Versão errada.");
  await dialogo(page).getByRole("button", { name: "Retirar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  await page.getByRole("link", { name: "Recursos", exact: true }).click();
  await page.getByRole("button", { name: "Alocar recurso" }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Consultora` });
  await dialogo(page).getByLabel("Início").fill("2026-02-01");
  await dialogo(page).getByRole("button", { name: "Alocar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Terminar a alocação de ${marca} Consultora` }).click();
  await dialogo(page).getByLabel("Termina a").fill("2026-06-30");
  await dialogo(page).getByRole("button", { name: "Terminar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  await page.getByRole("link", { name: "Cliente", exact: true }).click();
  await page.getByLabel("Ligar a um cliente").selectOption({ label: `${marca} Cliente` });
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await page.getByRole("button", { name: "Mostrar no portal do cliente" }).click();
  await expect(page.getByText("Visível", { exact: true })).toBeVisible();

  // --- Confere no servidor ---
  const coms = await sa<{ body: string }[]>("GET", `/projects/${pid}/comments?taskId=${tarefa.corpo.taskId}`);
  expect(coms.corpo.map((c) => c.body)).toEqual(["Tabela de IVA carregada."]);
  const passos = await sa<{ title: string; done: boolean }[]>("GET", `/projects/${pid}/tasks/${tarefa.corpo.taskId}/checklist`);
  expect(passos.corpo.map((x) => [x.title, x.done])).toEqual([
    ["Plano de contas", true],
    ["Séries", false],
  ]);
  const t = await sa<{ totalHours: number; entries: { hours: number; billable: boolean; employeeId: string }[] }>("GET", `/projects/time-entries?projectId=${pid}`);
  expect([Number(t.corpo.totalHours), t.corpo.entries.map((e) => [Number(e.hours), e.billable, e.employeeId])]).toEqual([6.5, [[6.5, true, pessoa.corpo.employeeId]]]);
  const orc = await sa<{ plannedTotal: number; actualTotal: number }>("GET", `/projects/${pid}/budget/lines`);
  expect([Number(orc.corpo.plannedTotal), Number(orc.corpo.actualTotal)]).toEqual([1200000, 300000.5]);
  const fs = await sa<unknown[]>("GET", `/projects/${pid}/files`);
  expect(fs.corpo).toEqual([]);
  const p = await sa<{ allocations: { resourceId: string; endsOn: string }[]; customerId: string; visibleToCustomer: boolean }>("GET", `/projects/${pid}`);
  expect([p.corpo.allocations.map((a) => [a.resourceId, a.endsOn]), p.corpo.customerId, p.corpo.visibleToCustomer]).toEqual([[[pessoa.corpo.employeeId, "2026-06-30"]], cliente.corpo.customerId, true]);

  // --- O cliente, no portal ---
  const portal = await browser.newPage({ baseURL: FRONT_LOCAL });
  await soLocal(portal);
  await entrar(portal, emailCliente, PASSWORD_LOCAL);
  await portal.getByRole("link", { name: "Projectos" }).click();
  await portal.getByRole("link", { name: `${marca} Implementação` }).click();
  await portal.getByLabel("Comentar «Go-live»").fill("Podemos antecipar?");
  await portal.getByRole("button", { name: "Comentar" }).click();
  await expect(portal.getByRole("list", { name: "Comentários em Go-live" })).toContainText("Podemos antecipar?");
  const mc = await sa<{ fromCustomer: boolean; body: string }[]>("GET", `/projects/${pid}/milestones/comments`);
  expect(mc.corpo.map((c) => [c.fromCustomer, c.body])).toEqual([[true, "Podemos antecipar?"]]);
  await portal.close();
});
