/**
 * F12 (projectos) contra a API LOCAL (D1, §8.3). Preparação pela API com a
 * conta SuperAdmin local: uma conta ProjectManager e uma colaboradora. Pela
 * interface, como ProjectManager: abrir um projecto, definir o orçamento,
 * marcos (novo, alcançado, comentário), tarefas (nova atribuída pelas
 * escolhas dos projectos, B38; planear, dependência, mover no quadro,
 * concluir, cancelar), ver o Gantt, registar tempo e alocar a colaboradora
 * (sem ler os RH), juntar e descarregar um ficheiro pelo projecto (B39) e
 * fechar o projecto. Confere tudo no servidor, e que ligar um documento
 * carregado por outra conta dá 404.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;

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

const dialogo = (page: Page) => page.getByRole("dialog");

test("F12: projectos — orçamento, marcos, tarefas, quadro, dependências, Gantt e fecho", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin): uma conta ProjectManager e uma colaboradora ---
  const pessoa = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Consultora`, departmentId: null, userId: null, hiredOn: null });
  expect(pessoa.status, JSON.stringify(pessoa.corpo)).toBe(201);
  const email = `pm-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "ProjectManager" });
  expect(c.status, JSON.stringify(c.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));

  // --- Projecto e orçamento ---
  await page.getByRole("link", { name: "Projectos" }).click();
  await page.getByRole("button", { name: "Novo projecto" }).click();
  await dialogo(page).getByLabel("Nome").fill(`${marca} Implementação`);
  await dialogo(page).getByLabel("Início").fill("2026-02-01");
  await dialogo(page).getByRole("button", { name: "Abrir projecto" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Implementação`, level: 1 })).toBeVisible();
  const pid = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Definir orçamento" }).click();
  await dialogo(page).getByLabel("Valor aprovado").fill("5 000 000,5");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  // --- Marcos ---
  await page.getByRole("button", { name: "Novo marco" }).click();
  await dialogo(page).getByLabel("Nome").fill("Arranque");
  await dialogo(page).getByLabel("Data alvo").fill("2026-02-15");
  await dialogo(page).getByRole("button", { name: "Criar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Marcar alcançado: Arranque" }).click();
  await dialogo(page).getByLabel("Alcançado a").fill("2026-02-14");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Comentar Arranque" }).click();
  await dialogo(page).getByLabel("Comentário").fill("Arranque feito com o cliente.");
  await dialogo(page).getByRole("button", { name: "Comentar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Comentários em Arranque" })).toContainText("Arranque feito com o cliente.");

  // --- Tarefas ---
  await page.getByRole("link", { name: "Tarefas" }).click();
  for (const [t, prazo] of [
    ["Levantamento", "2026-02-28"],
    ["Configuração", "2026-03-31"],
    ["A cancelar", ""],
  ] as const) {
    await page.getByRole("button", { name: "Nova tarefa" }).click();
    await dialogo(page).getByLabel("Título").fill(t);
    if (prazo) await dialogo(page).getByLabel("Prazo (opcional)").fill(prazo);
    if (t === "Configuração") await dialogo(page).getByLabel("Atribuir a (opcional)").selectOption({ label: `${marca} Consultora` });
    await dialogo(page).getByRole("button", { name: "Criar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
  }
  await expect(page.getByRole("table", { name: "Tarefas" }).getByRole("row").filter({ hasText: "Configuração" })).toContainText(`${marca} Consultora`);
  await page.getByRole("button", { name: "Planear Configuração" }).click();
  await dialogo(page).getByLabel("Início (opcional)").fill("2026-03-01");
  await dialogo(page).getByLabel("Horas estimadas (opcional)").fill("24,5");
  await dialogo(page).getByLabel("Prioridade").selectOption("High");
  await dialogo(page).getByLabel("Progresso (%)").fill("20");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Dependências de Configuração" }).click();
  await dialogo(page).getByLabel("Passa a depender de").selectOption({ label: "Levantamento" });
  await dialogo(page).getByRole("button", { name: "Juntar dependência" }).click();
  await expect(dialogo(page).getByRole("list", { name: "Dependências" })).toContainText("Levantamento");
  await dialogo(page).getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Cancelar A cancelar" }).click();
  await dialogo(page).getByRole("button", { name: "Cancelar tarefa" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  // --- Quadro: Configuração para «Em curso», Levantamento para «Feita» (conclui) ---
  await page.getByRole("link", { name: "Quadro" }).click();
  await page.getByLabel("Mover Configuração para").selectOption("InProgress");
  await expect(page.getByRole("region", { name: "Em curso (1)" })).toContainText("Configuração");
  await page.getByLabel("Mover Levantamento para").selectOption("Done");
  await expect(page.getByRole("region", { name: "Feita (1)" })).toContainText("Levantamento");

  // --- Gantt ---
  await page.getByRole("link", { name: "Gantt" }).click();
  await expect(page.getByRole("table", { name: "Gantt das tarefas" }).getByRole("row").filter({ hasText: "Configuração" })).toContainText("Depende de: Levantamento");

  // --- Tempo e recursos pelas escolhas dos projectos (B38) ---
  await page.getByRole("link", { name: "Tempo", exact: true }).click();
  await page.getByRole("button", { name: "Registar tempo" }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Consultora` });
  await dialogo(page).getByLabel("Dia").fill("2026-03-02");
  await dialogo(page).getByLabel("Horas").fill("3");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Registos de tempo" })).toContainText(`${marca} Consultora`);
  await page.getByRole("link", { name: "Recursos", exact: true }).click();
  await page.getByRole("button", { name: "Alocar recurso" }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Consultora` });
  await dialogo(page).getByLabel("Início").fill("2026-02-01");
  await dialogo(page).getByRole("button", { name: "Alocar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Recursos alocados" })).toContainText(`${marca} Consultora`);

  // --- Ficheiros pelo projecto (B39): juntar e descarregar ---
  await page.getByRole("link", { name: "Ficheiros", exact: true }).click();
  await page.getByRole("button", { name: "Juntar ficheiro" }).click();
  await dialogo(page).getByLabel("Ficheiro").setInputFiles({ name: "plano.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n") });
  await expect(dialogo(page).getByText("plano.pdf")).toBeVisible();
  await dialogo(page).getByLabel("Categoria (opcional)").fill("Plano de trabalho");
  await dialogo(page).getByRole("button", { name: "Juntar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarregar plano.pdf" }).click();
  expect((await descarga).suggestedFilename()).toBe("plano.pdf");
  // Um documento carregado por outra conta não se liga (404), sem `documents.read`.
  const alheio = await request.post(`${API_LOCAL}/documents`, {
    headers: { Authorization: `Bearer ${await token(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "")}` },
    multipart: { file: { name: "alheio.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") }, category: "Projecto" },
  });
  expect(alheio.status()).toBe(201);
  const idAlheio = ((await alheio.json()) as { documentId: string }).documentId;
  const pm = await sessaoApi(request, email, PASSWORD_LOCAL);
  expect((await pm("POST", `/projects/${pid}/files`, { documentId: idAlheio, taskId: null, category: null })).status).toBe(404);
  const ficheiros = await pm<{ fileName: string; category: string }[]>("GET", `/projects/${pid}/files`);
  expect(ficheiros.corpo.map((f) => [f.fileName, f.category])).toEqual([["plano.pdf", "Plano de trabalho"]]);

  const p = await sa<{ status: string; budget: { amount: number; currency: string }; completionPercent: number; milestones: { name: string; status: string; reachedOn: string }[]; tasks: { title: string; status: string; stage: string; priority: string; estimatedHours: number; progress: number; startDate: string; assignedEmployeeId: string | null; assignedEmployeeName: string | null }[]; allocations: { resourceId: string; resourceName: string | null }[] }>("GET", `/projects/${pid}`);
  expect([Number(p.corpo.budget.amount), p.corpo.budget.currency]).toEqual([5000000.5, "AOA"]);
  expect(p.corpo.milestones.map((m) => [m.name, m.status, m.reachedOn])).toEqual([["Arranque", "Reached", "2026-02-14"]]);
  const t = Object.fromEntries(p.corpo.tasks.map((x) => [x.title, x]));
  expect([t["Levantamento"]?.status, t["A cancelar"]?.status, t["Configuração"]?.stage, t["Configuração"]?.priority, Number(t["Configuração"]?.estimatedHours), t["Configuração"]?.startDate]).toEqual(["Done", "Cancelled", "InProgress", "High", 24.5, "2026-03-01"]);
  expect([t["Configuração"]?.assignedEmployeeId, t["Configuração"]?.assignedEmployeeName]).toEqual([pessoa.corpo.employeeId, `${marca} Consultora`]);
  expect(p.corpo.allocations.map((a) => [a.resourceId, a.resourceName])).toEqual([[pessoa.corpo.employeeId, `${marca} Consultora`]]);
  const tempo = await sa<{ entries: { employeeId: string; employeeName: string | null; hours: number; day: string }[] }>("GET", `/projects/time-entries?projectId=${pid}`);
  expect(tempo.corpo.entries.map((e) => [e.employeeId, e.employeeName, Number(e.hours), e.day])).toEqual([[pessoa.corpo.employeeId, `${marca} Consultora`, 3, "2026-03-02"]]);
  // Feitas sobre as não canceladas: 1 de 2.
  expect(Number(p.corpo.completionPercent)).toBe(50);
  const comentarios = await sa<{ authorName: string; fromCustomer: boolean }[]>("GET", `/projects/${pid}/milestones/comments`);
  // Assinado com o nome da conta (ou «Equipa», se a conta não tiver nome); da equipa, não do cliente.
  expect(comentarios.corpo).toHaveLength(1);
  expect(comentarios.corpo[0]?.fromCustomer).toBe(false);
  expect(comentarios.corpo[0]?.authorName.length).toBeGreaterThan(0);

  // --- Fechar ---
  await page.getByRole("link", { name: "Resumo" }).click();
  await page.getByRole("button", { name: "Fechar projecto" }).click();
  await dialogo(page).getByLabel("Data de fecho").fill("2026-01-01");
  await dialogo(page).getByRole("button", { name: "Fechar projecto" }).click();
  await expect(dialogo(page).getByText("A data de fecho não pode ser anterior à de início.")).toBeVisible();
  await dialogo(page).getByLabel("Data de fecho").fill("2026-06-30");
  await dialogo(page).getByRole("button", { name: "Fechar projecto" }).click();
  await expect(page.getByText("Fechado a 30/06/2026", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo marco" })).toHaveCount(0);
  const f = await sa<{ status: string; endDate: string }>("GET", `/projects/${pid}`);
  expect([f.corpo.status, f.corpo.endDate]).toEqual(["Closed", "2026-06-30"]);
});
