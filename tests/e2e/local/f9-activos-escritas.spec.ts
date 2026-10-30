/**
 * F9 (activos fixos) contra a API LOCAL (D1, §8.3), pela interface com a conta
 * Admin local: activo registado (adquirido em Jan/2020) e amortizado no mês
 * seguinte (o primeiro do plano) pela corrida mensal — depois não se corrige; outro activo corrigido antes de
 * amortizar e abatido; manutenção agendada e concluída; entregue a um
 * colaborador novo e devolvido; apólice registada e cancelada. Confere no
 * servidor. Só a base local: a corrida aplica-se aos activos em uso.
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

async function registar(page: Page, nome: string, codigo: string) {
  await page.goto("/activos");
  await page.getByRole("button", { name: "Registar activo" }).click();
  await dialogo(page).getByLabel("Nome").fill(nome);
  await dialogo(page).getByLabel("Código (opcional)").fill(codigo);
  await dialogo(page).getByLabel("Categoria (opcional)").fill(`${marca} Teste`);
  await dialogo(page).getByLabel("Adquirido a").fill("2020-01-10");
  await dialogo(page).getByLabel("Custo de aquisição").fill("360 000");
  await dialogo(page).getByLabel("Vida útil (meses)").fill("36");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();
  return page.url().split("/").pop() ?? "";
}

test("F9: activo amortizado, outro corrigido e abatido; manutenção, custódia e seguro", async ({ page, request }) => {
  test.setTimeout(240_000);
  await soLocal(page);
  const ad = await sessaoApi(request, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  const emp = await ad<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Guarda`, departmentId: null, userId: null, hiredOn: null });
  expect(emp.status).toBe(201);
  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  const codA = `T${sufixo}A`;
  const codB = `T${sufixo}B`;

  // --- Activo A: amortizado em Fev/2020 (por omissão, o plano começa no mês seguinte à aquisição).
  const idA = await registar(page, `${marca} Portátil`, codA);
  await expect(page.getByRole("button", { name: "Corrigir", exact: true })).toBeVisible();
  await page.goto("/activos");
  await page.getByRole("button", { name: "Correr amortização" }).click();
  await dialogo(page).getByLabel("Mês").fill("2020-02");
  await dialogo(page).getByRole("button", { name: "Correr" }).click();
  await expect(dialogo(page).getByText(/^\d+ activos? amortizados?/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto(`/activos/${idA}`);
  await expect(page.getByRole("table", { name: "Plano de amortização" }).getByRole("row").filter({ hasText: "Fevereiro 2020" })).toContainText("Registada");
  await expect(page.getByRole("button", { name: "Corrigir", exact: true })).toHaveCount(0);
  const a = await ad<{ asset: { accumulatedDepreciation: number; netBookValue: number }; schedule: { month: string; amount: number; recorded: boolean }[] }>("GET", `/finance/assets/${idA}`);
  expect(a.corpo.schedule.find((l) => l.month === "2020-02-01")?.recorded).toBe(true);
  expect(Number(a.corpo.asset.accumulatedDepreciation)).toBe(10000);

  // --- Activo B: corrigido antes de amortizar, depois abatido.
  const idB = await registar(page, `${marca} Cadeira`, codB);
  await page.getByRole("button", { name: "Corrigir", exact: true }).click();
  await dialogo(page).getByLabel("Vida útil (meses)").fill("60");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Abater" }).click();
  await dialogo(page).getByLabel("Valor de venda (opcional)").fill("5 000");
  await dialogo(page).getByLabel("Motivo (opcional)").fill("Partida.");
  await dialogo(page).getByRole("button", { name: "Abater" }).click();
  await expect(page.getByText("Abatido a", { exact: false })).toBeVisible();
  const b = await ad<{ asset: { usefulLifeMonths: number; status: string; disposalValue: number; disposalReason: string } }>("GET", `/finance/assets/${idB}`);
  expect(b.corpo.asset).toMatchObject({ usefulLifeMonths: 60, status: "Disposed", disposalReason: "Partida." });
  expect(Number(b.corpo.asset.disposalValue)).toBe(5000);

  // --- Manutenção do A.
  await page.goto(`/activos/${idA}?vista=manutencao`);
  await page.getByRole("button", { name: "Agendar manutenção" }).click();
  await dialogo(page).getByLabel("Descrição").fill(`${marca} Limpeza`);
  await dialogo(page).getByLabel("Data").fill("2026-11-05");
  await dialogo(page).getByRole("button", { name: "Agendar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Concluir a manutenção de 05/11/2026" }).click();
  await dialogo(page).getByLabel("Custo final em AOA (opcional)").fill("12 500");
  await dialogo(page).getByRole("button", { name: "Concluir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${marca} Limpeza` }).getByText("Concluída")).toBeVisible();

  // --- Custódia do A.
  await page.goto(`/activos/${idA}?vista=custodia`);
  await page.getByRole("button", { name: "Entregar a um colaborador" }).click();
  await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Guarda` });
  await dialogo(page).getByLabel("Entregue a").fill("2026-10-01");
  await dialogo(page).getByRole("button", { name: "Entregar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Registar a devolução de ${marca} Guarda` }).click();
  await dialogo(page).getByLabel("Devolvido a").fill("2026-10-15");
  await dialogo(page).getByLabel("Estado na devolução (opcional)").fill("Bom");
  await dialogo(page).getByRole("button", { name: "Registar devolução" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  const cs = await ad<{ employeeId: string; returnedOn: string | null; conditionOnReturn: string | null }[]>("GET", `/finance/assets/custody?assetId=${idA}&openOnly=false`);
  expect(cs.corpo.map((c) => [c.employeeId, c.returnedOn, c.conditionOnReturn])).toEqual([[emp.corpo.employeeId, "2026-10-15", "Bom"]]);

  // --- Seguro do A.
  await page.goto(`/activos/${idA}?vista=seguros`);
  await page.getByRole("button", { name: "Registar apólice" }).click();
  await dialogo(page).getByLabel("Seguradora").fill(`${marca} Seguros`);
  await dialogo(page).getByLabel("N.º da apólice").fill(`AP-${sufixo}`);
  await dialogo(page).getByLabel("Início").fill("2026-01-01");
  await dialogo(page).getByLabel("Fim").fill("2026-12-31");
  await dialogo(page).getByLabel("Prémio em AOA").fill("45 000");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Cancelar a apólice AP-${sufixo}` }).click();
  await dialogo(page).getByRole("button", { name: "Cancelar apólice" }).click();
  await expect(page.getByRole("row").filter({ hasText: `AP-${sufixo}` }).getByText("Cancelada")).toBeVisible();
  const ps = await ad<{ policyNumber: string; cancelled: boolean; premium: number }[]>("GET", `/finance/assets/insurance?assetId=${idA}`);
  expect(ps.corpo.map((p) => [p.policyNumber, p.cancelled, Number(p.premium)])).toEqual([[`AP-${sufixo}`, true, 45000]]);

  // Arrumar: o activo A sai de uso para as próximas corridas.
  await ad("POST", `/finance/assets/${idA}/disposal`, { on: null, value: null, reason: `${marca} fim do teste` });
});
