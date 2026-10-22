/**
 * F13 (ESG) contra a API LOCAL (D1, §8.3). Preparação pela API com a conta
 * SuperAdmin local: uma conta Manager e uma colaboradora. Pela interface,
 * como Manager: indicador com factor de conversão e meta, duas medições (uma
 * corrigida ao repetir o mês), o relatório do ano com o valor convertido;
 * iniciativa planeada com a colaboradora responsável (sem ler os RH, B41),
 * corrigida e concluída, outra cancelada; indicador desactivado. Confere
 * tudo no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const codigo = `T${sufixo}`.slice(0, 30);
const ano = new Date().getFullYear();

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

test("F13: ESG — indicador, medições, relatório, iniciativas", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const pessoa = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Sustentabilidade`, departmentId: null, userId: null, hiredOn: null });
  expect(pessoa.status, JSON.stringify(pessoa.corpo)).toBe(201);
  const email = `gestao-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Manager" });
  expect(c.status, JSON.stringify(c.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });

  // --- Manager: indicador e medições ---
  await entrar(page, email, PASSWORD_LOCAL);
  await page.getByRole("link", { name: "ESG" }).click();
  await page.getByRole("link", { name: "Indicadores" }).click();
  await page.getByRole("button", { name: "Novo indicador" }).click();
  await dialogo(page).getByLabel("Código").fill(codigo.toLowerCase());
  await dialogo(page).getByLabel("Nome").fill(`${marca} Gasóleo`);
  await dialogo(page).getByLabel("Unidade").fill("litros");
  await dialogo(page).getByLabel("Meta anual (opcional)").fill("5 000");
  await dialogo(page).getByLabel("Factor de conversão (opcional)").fill("2,68");
  await dialogo(page).getByLabel("Unidade convertida").fill("kgCO2e");
  await dialogo(page).getByLabel("Fonte do factor").fill("Inventário interno");
  await dialogo(page).getByRole("button", { name: "Definir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Medições de ${codigo}` }).click();
  for (const [mes, valor] of [
    ["1", "100"],
    ["2", "999"],
    ["2", "150,5"],
  ] as const) {
    await dialogo(page).getByLabel("Mês").selectOption(mes);
    await dialogo(page).getByLabel("Ano", { exact: true }).last().fill(String(ano));
    await dialogo(page).getByLabel("Valor em litros").fill(valor);
    await dialogo(page).getByRole("button", { name: "Registar" }).click();
    await expect(dialogo(page).getByLabel("Valor em litros")).toHaveValue("");
  }
  await expect(dialogo(page).getByRole("table", { name: "Medições" }).getByRole("row")).toHaveCount(3);
  await page.keyboard.press("Escape");

  // Relatório: soma convertida (250,5 × 2,68 = 671,34), meta cumprida (menos é melhor).
  await page.getByRole("link", { name: "Relatório", exact: true }).click();
  await expect(page.getByRole("table", { name: "Indicadores Ambiental" }).getByRole("row").filter({ hasText: codigo })).toContainText("671,34 kgCO2e");

  // --- Manager: iniciativas ---
  await page.getByRole("link", { name: "Iniciativas" }).click();
  for (const titulo of [`${marca} Painéis`, `${marca} Cancelar`]) {
    await page.getByRole("button", { name: "Nova iniciativa" }).click();
    await dialogo(page).getByLabel("Título").fill(titulo);
    await dialogo(page).getByLabel("Indicador (opcional)").selectOption({ label: `${codigo} · ${marca} Gasóleo` });
    await dialogo(page).getByLabel("Orçamento (opcional)").fill("2 500 000");
    if (titulo.endsWith("Painéis")) await dialogo(page).getByLabel("Responsável (opcional)").selectOption({ label: `${marca} Sustentabilidade` });
    await dialogo(page).getByRole("button", { name: "Planear" }).click();
    await expect(dialogo(page)).toHaveCount(0);
  }
  await expect(page.getByRole("table", { name: "Iniciativas" }).getByRole("row").filter({ hasText: `${marca} Painéis` })).toContainText(`${marca} Sustentabilidade`);
  await page.getByRole("button", { name: `Corrigir a iniciativa ${marca} Painéis` }).click();
  await dialogo(page).getByLabel("Progresso (%)").fill("40");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Iniciativas" }).getByRole("row").filter({ hasText: `${marca} Painéis` })).toContainText("Em curso");
  await page.getByRole("button", { name: `Concluir a iniciativa ${marca} Painéis` }).click();
  await dialogo(page).getByRole("button", { name: "Concluir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Cancelar a iniciativa ${marca} Cancelar` }).click();
  await dialogo(page).getByRole("button", { name: "Cancelar iniciativa" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  // Desactivar.
  await page.getByRole("link", { name: "Indicadores" }).click();
  await page.getByRole("button", { name: `Corrigir o indicador ${codigo}` }).click();
  await dialogo(page).getByLabel("Activo (recebe medições)").click();
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Indicadores" }).getByRole("row").filter({ hasText: codigo })).toContainText("Desactivado");

  // --- No servidor ---
  const inds = await sa<{ indicatorId: string; code: string; annualTarget: number; conversionFactor: number; convertedUnit: string; factorSource: string; isActive: boolean }[]>("GET", "/esg/indicators?includeInactive=true");
  const ind = inds.corpo.find((i) => i.code === codigo);
  expect([Number(ind?.annualTarget), Number(ind?.conversionFactor), ind?.convertedUnit, ind?.factorSource, ind?.isActive]).toEqual([5000, 2.68, "kgCO2e", "Inventário interno", false]);
  const med = await sa<{ period: string; value: number; reportedValue: number }[]>("GET", `/esg/measurements?indicatorId=${ind?.indicatorId ?? ""}&from=${ano}-01-01&to=${ano}-12-31`);
  expect(med.corpo.map((m) => [m.period, Number(m.value), Number(m.reportedValue)])).toEqual([
    [`${ano}-01-01`, 100, 268],
    [`${ano}-02-01`, 150.5, 403.34],
  ]);
  const inis = await sa<{ title: string; status: string; progress: number; budget: number; indicatorId: string | null; ownerEmployeeId: string | null; ownerName: string | null }[]>("GET", "/esg/initiatives");
  const por = Object.fromEntries(inis.corpo.filter((x) => x.title.startsWith(marca)).map((x) => [x.title, [x.status, Number(x.progress), x.budget === null ? null : Number(x.budget), x.indicatorId === ind?.indicatorId, x.ownerEmployeeId, x.ownerName]]));
  expect(por).toEqual({
    [`${marca} Painéis`]: ["Completed", 100, 2500000, true, pessoa.corpo.employeeId, `${marca} Sustentabilidade`],
    [`${marca} Cancelar`]: ["Cancelled", 0, 2500000, true, null, null],
  });
});
