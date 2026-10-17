/**
 * F7c (recrutamento, entradas e saídas) contra a API LOCAL (D1, §8.3), pela
 * interface com a conta Admin local: departamento próprio (pela API), vaga
 * aberta, candidato registado e levado pelo funil até à proposta, outro
 * rejeitado, contratação (cria a ficha), entrada iniciada a partir da
 * contratação com duas tarefas, ambas feitas e o processo concluído, vaga
 * fechada. Confere tudo no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;

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

async function avancar(page: Page, quem: string, para: string) {
  await page.getByRole("button", { name: `Passar ${quem} a ${para}` }).click();
  await dialogo(page).getByRole("button", { name: "Avançar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
}

test("F7c: vaga, funil até à contratação, entrada com tarefas concluída e vaga fechada", async ({ page, request }) => {
  test.setTimeout(180_000);
  await soLocal(page);
  const ad = await sessaoApi(request, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  const dep = await ad<{ departmentId: string }>("POST", "/hr/departments", { name: `${marca} Recrutamento`, managerId: null });
  expect(dep.status).toBe(201);
  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");

  // Vaga
  const titulo = `${marca} Analista`;
  await page.goto("/recrutamento");
  await page.getByRole("button", { name: "Abrir vaga" }).click();
  await dialogo(page).getByLabel("Título").fill(titulo);
  await dialogo(page).getByLabel("Departamento (opcional)").selectOption({ label: `${marca} Recrutamento` });
  await dialogo(page).getByLabel("N.º de vagas").fill("2");
  await dialogo(page).getByRole("button", { name: "Abrir vaga" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("link", { name: titulo }).click();
  await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();
  const openingId = page.url().split("/").pop() ?? "";

  // Dois candidatos: um vai até à contratação, o outro é rejeitado.
  const contratado = `${marca} Joana`;
  const rejeitado = `${marca} Rui`;
  for (const n of [contratado, rejeitado]) {
    await page.getByRole("button", { name: "Registar candidato" }).click();
    await dialogo(page).getByLabel("Nome completo").fill(n);
    await dialogo(page).getByRole("button", { name: "Registar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByText(n, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: `Rejeitar ${rejeitado}` }).click();
  await dialogo(page).getByRole("button", { name: "Rejeitar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: rejeitado }).getByText("Rejeitado")).toBeVisible();
  await avancar(page, contratado, "Triagem");
  await avancar(page, contratado, "Entrevista");
  await avancar(page, contratado, "Proposta");
  await page.getByRole("button", { name: `Contratar ${contratado}` }).click();
  await expect(dialogo(page).getByLabel("Departamento")).toHaveValue(dep.corpo.departmentId);
  await dialogo(page).getByRole("button", { name: "Contratar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: contratado }).getByText("Contratado")).toBeVisible();

  // Entrada, a partir da contratação.
  await page.getByRole("link", { name: `Iniciar a entrada de ${contratado}` }).click();
  const novoId = new URL(page.url()).searchParams.get("iniciar") ?? "";
  await expect(dialogo(page).getByLabel("Colaborador")).toHaveValue(novoId);
  await dialogo(page).getByLabel("Tarefa 1", { exact: true }).fill(`${marca} Entregar o portátil`);
  await dialogo(page).getByLabel("Área da tarefa 1").selectOption("it");
  await dialogo(page).getByRole("button", { name: "Juntar tarefa" }).click();
  await dialogo(page).getByLabel("Tarefa 2", { exact: true }).fill(`${marca} Assinar o contrato`);
  await dialogo(page).getByRole("button", { name: "Iniciar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByLabel("Tipo").selectOption("Onboarding");
  const cartao = page.locator("div").filter({ has: page.getByRole("link", { name: contratado }) }).filter({ hasText: "tarefas feitas" }).last();
  await expect(cartao.getByText("0 de 2 tarefas feitas")).toBeVisible();
  await cartao.getByRole("button", { name: `Marcar feita: ${marca} Entregar o portátil` }).click();
  await expect(cartao.getByText("1 de 2 tarefas feitas")).toBeVisible();
  await expect(cartao.getByText("Em curso", { exact: true })).toBeVisible();
  await cartao.getByRole("button", { name: `Marcar feita: ${marca} Assinar o contrato` }).click();
  await expect(cartao.getByText("2 de 2 tarefas feitas")).toBeVisible();
  await cartao.getByRole("button", { name: "Concluir entrada" }).click();
  await dialogo(page).getByRole("button", { name: "Concluir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(cartao.getByText("Concluído", { exact: true })).toBeVisible();

  // Fechar a vaga.
  await page.goto(`/recrutamento/${openingId}`);
  await page.getByRole("button", { name: "Fechar vaga" }).click();
  await dialogo(page).getByRole("button", { name: "Fechar vaga" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Vaga fechada: não aceita candidaturas novas.")).toBeVisible();

  // --- Conferir no servidor ---
  const vagas = await ad<{ openingId: string; status: string; vacancies: number; departmentId: string }[]>("GET", "/hr/recruitment/openings?page=1&pageSize=200");
  expect(vagas.corpo.find((v) => v.openingId === openingId)).toMatchObject({ status: "Closed", vacancies: 2, departmentId: dep.corpo.departmentId });
  const cands = await ad<{ fullName: string; stage: string; hiredEmployeeId: string | null }[]>("GET", `/hr/recruitment/candidates?openingId=${openingId}&page=1&pageSize=25`);
  expect(cands.corpo.map((c) => [c.fullName, c.stage, c.hiredEmployeeId]).sort()).toEqual(
    [
      [contratado, "Hired", novoId],
      [rejeitado, "Rejected", null],
    ].sort(),
  );
  const ficha = await ad<{ fullName: string; departmentId: string | null }>("GET", `/hr/employees/${novoId}`);
  expect(ficha.corpo).toMatchObject({ fullName: contratado, departmentId: dep.corpo.departmentId });
  const procs = await ad<{ kind: string; status: string; pendingTasks: number; tasks: { title: string; category: string; isCompleted: boolean }[] }[]>("GET", `/hr/lifecycle?employeeId=${novoId}&page=1&pageSize=25`);
  expect(procs.corpo).toHaveLength(1);
  expect(procs.corpo[0]).toMatchObject({ kind: "Onboarding", status: "Completed", pendingTasks: 0 });
  expect(procs.corpo[0]?.tasks.map((t) => [t.title, t.category, t.isCompleted])).toEqual([
    [`${marca} Entregar o portátil`, "it", true],
    [`${marca} Assinar o contrato`, "hr", true],
  ]);
});
