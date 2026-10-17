/**
 * F7c (declarações, desempenho, conquistas, importação) contra a API LOCAL
 * (D1, §8.3), pela interface com a conta Admin local, numa ficha nova criada
 * pela API: modelo de declaração criado, declaração emitida (só na base local:
 * regista) e o código verificado; ciclo planeado, corrigido, com objectivo e
 * resultado-chave, valor registado, iniciado e fechado (só de leitura);
 * conquista criada e atribuída pela ficha; importação de um CSV com uma linha
 * boa e uma recusada. No fim, o modelo e a conquista ficam desactivados.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const ano = new Date().getUTCFullYear() + 5;

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

test("F7c: declaração emitida e verificada; ciclo do planeamento ao fecho; conquista atribuída; importação", async ({ page, request }) => {
  test.setTimeout(240_000);
  await soLocal(page);
  const ad = await sessaoApi(request, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  const emp = await ad<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Talento`, departmentId: null, userId: null, hiredOn: null });
  expect(emp.status).toBe(201);
  const quem = `${marca} Talento`;
  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  let templateId = "";
  let achievementId = "";
  const modeloCorpo = { name: `${marca} Trabalho`, title: "DECLARAÇÃO", body: "Declara-se que {{nome}} trabalha nesta empresa desde {{admissao}}.", selfService: false };

  try {
    // --- Declarações
    await page.goto("/declaracoes?vista=modelos");
    await page.getByRole("button", { name: "Novo modelo" }).click();
    await dialogo(page).getByLabel("Nome do modelo").fill(modeloCorpo.name);
    await dialogo(page).getByLabel("Texto").fill(modeloCorpo.body);
    await dialogo(page).getByRole("button", { name: "Criar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    const modelos = await ad<{ templateId: string; name: string }[]>("GET", "/hr/declaration-templates?includeInactive=true");
    templateId = modelos.corpo.find((m) => m.name === modeloCorpo.name)?.templateId ?? "";
    expect(templateId).not.toBe("");

    await page.goto(`/colaboradores/${emp.corpo.employeeId}?vista=declaracoes`);
    await page.getByRole("button", { name: "Emitir declaração" }).click();
    await dialogo(page).getByLabel("Modelo").selectOption(templateId);
    const pdf = page.waitForEvent("download");
    await dialogo(page).getByRole("button", { name: "Emitir e descarregar" }).click();
    expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
    await expect(dialogo(page)).toHaveCount(0);
    const emitidas = await ad<{ verificationCode: string; bySelf: boolean; templateId: string }[]>("GET", `/hr/declarations?employeeId=${emp.corpo.employeeId}`);
    expect(emitidas.corpo.map((d) => [d.templateId, d.bySelf])).toEqual([[templateId, false]]);
    const codigo = emitidas.corpo[0]?.verificationCode ?? "";
    await expect(page.getByText(codigo)).toBeVisible();
    await page.goto("/declaracoes?vista=verificar");
    await page.getByLabel("Código de verificação").fill(`${codigo.slice(0, 4)}-${codigo.slice(4, 8)}-${codigo.slice(8)}`.toLowerCase());
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.getByText("Declaração válida")).toBeVisible();
    await expect(page.getByText(quem)).toBeVisible();

    // --- Desempenho
    const ciclo = `${marca} Ciclo`;
    await page.goto("/desempenho");
    await page.getByRole("button", { name: "Planear ciclo" }).click();
    await dialogo(page).getByLabel("Nome").fill(ciclo);
    await dialogo(page).getByLabel("Início").fill(`${ano}-01-01`);
    await dialogo(page).getByLabel("Fim").fill(`${ano}-06-30`);
    await dialogo(page).getByRole("button", { name: "Planear" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    const ciclos = await ad<{ cycleId: string; name: string }[]>("GET", "/hr/performance/cycles");
    const cycleId = ciclos.corpo.find((c) => c.name === ciclo)?.cycleId ?? "";
    await page.goto(`/desempenho?ciclo=${cycleId}`);
    await page.getByRole("button", { name: "Corrigir", exact: true }).click();
    await dialogo(page).getByLabel("Fim").fill(`${ano}-12-31`);
    await dialogo(page).getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Definir objectivo" }).click();
    await dialogo(page).getByLabel("Título").fill(`${marca} Visitar clientes`);
    await dialogo(page).getByLabel("Colaborador (opcional)").selectOption({ label: quem });
    await dialogo(page).getByLabel("Peso de 1 a 100 (opcional)").fill("60");
    await dialogo(page).getByRole("button", { name: "Definir" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await page.getByRole("button", { name: `Juntar um resultado-chave a ${marca} Visitar clientes` }).click();
    await dialogo(page).getByLabel("Título").fill(`${marca} Clientes`);
    await dialogo(page).getByLabel("Meta").fill("10");
    await dialogo(page).getByRole("button", { name: "Juntar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await page.getByRole("button", { name: `Registar o valor de ${marca} Clientes` }).click();
    await dialogo(page).getByLabel("Valor actual").fill("2,5");
    await dialogo(page).getByRole("button", { name: "Registar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByText("2,5 de 10")).toBeVisible();
    await page.getByRole("button", { name: "Iniciar ciclo" }).click();
    await dialogo(page).getByRole("button", { name: "Iniciar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Fechar ciclo" }).click();
    await dialogo(page).getByRole("button", { name: "Fechar ciclo" }).click();
    await expect(page.getByText("Ciclo fechado: os objectivos são só de leitura.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Registar o valor/ })).toHaveCount(0);
    const objs = await ad<{ title: string; weight: number; ownerEmployeeId: string; progress: number; keyResults: { currentValue: number; targetValue: number }[] }[]>("GET", `/hr/performance/objectives?cycleId=${cycleId}`);
    expect(objs.corpo).toHaveLength(1);
    expect(objs.corpo[0]).toMatchObject({ title: `${marca} Visitar clientes`, weight: 60, ownerEmployeeId: emp.corpo.employeeId });
    expect(objs.corpo[0]?.keyResults.map((k) => [Number(k.currentValue), Number(k.targetValue)])).toEqual([[2.5, 10]]);
    const fechado = await ad<{ cycleId: string; status: string; endsOn: string }[]>("GET", "/hr/performance/cycles");
    expect(fechado.corpo.find((c) => c.cycleId === cycleId)).toMatchObject({ status: "Closed", endsOn: `${ano}-12-31` });

    // --- Conquistas
    const codigoC = `C${sufixo}`.slice(0, 30);
    await page.goto("/conquistas");
    await page.getByRole("button", { name: "Nova conquista" }).click();
    await dialogo(page).getByLabel("Código").fill(codigoC);
    await dialogo(page).getByLabel("Nome").fill(`${marca} Mentor`);
    await dialogo(page).getByLabel("Pontos de 0 a 10 000 (opcional)").fill("75");
    await dialogo(page).getByRole("button", { name: "Criar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    const conquistas = await ad<{ achievementId: string; code: string }[]>("GET", "/hr/achievements?includeInactive=true");
    achievementId = conquistas.corpo.find((c) => c.code === codigoC)?.achievementId ?? "";
    await page.goto(`/colaboradores/${emp.corpo.employeeId}?vista=conquistas`);
    await page.getByRole("button", { name: "Atribuir conquista" }).click();
    await dialogo(page).getByLabel("Conquista").selectOption(achievementId);
    await dialogo(page).getByLabel("Nota (opcional)").fill("Ajudou os novos.");
    await dialogo(page).getByRole("button", { name: "Atribuir" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByText("1 conquista · 75 pontos")).toBeVisible();
    await page.getByRole("button", { name: "Atribuir conquista" }).click();
    await dialogo(page).getByLabel("Conquista").selectOption(achievementId);
    await dialogo(page).getByRole("button", { name: "Atribuir" }).click();
    await expect(dialogo(page).getByText("O colaborador já tem esta conquista.")).toBeVisible();
    await dialogo(page).getByRole("button", { name: "Cancelar" }).click();

    // --- Importação
    const csv = `Nome;DataAdmissao\n${marca} Importado;2026-01-05\n${marca} Data errada;05/01/2026\n`;
    await page.goto("/colaboradores");
    await page.getByRole("button", { name: "Importar CSV" }).click();
    await dialogo(page).getByLabel("Ficheiro").setInputFiles({ name: "colaboradores.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
    await dialogo(page).getByRole("button", { name: "Importar" }).click();
    await expect(dialogo(page).getByText("1 importados, 0 duplicados, 1 recusados (de 2).")).toBeVisible();
    await expect(dialogo(page).getByText("Linha 3: Recusado", { exact: false })).toBeVisible();
    const todos = await ad<{ fullName: string }[]>("GET", "/hr/employees?page=1&pageSize=200");
    expect(todos.corpo.some((e) => e.fullName === `${marca} Importado`)).toBe(true);
  } finally {
    // Arrumar: o modelo e a conquista só serviam esta corrida.
    if (templateId) await ad("PUT", `/hr/declaration-templates/${templateId}`, { ...modeloCorpo, active: false });
    if (achievementId) await ad("PUT", `/hr/achievements/${achievementId}`, { code: null, name: `${marca} Mentor`, description: null, icon: null, points: 75, active: false });
  }
});
