/**
 * F9 (inventário) contra a API LOCAL (D1, §8.3), pela interface com a conta
 * Admin local: dois armazéns e um artigo novos; entrada com custo, saída (a
 * maior do que há é recusada no front), transferência e ajuste com motivo;
 * contagem com divergência fechada sem política (as políticas activas de
 * `inventory.stock_count` saem antes) — aplica o ajuste; outra contagem
 * cancelada; valorização do período. Confere no servidor; no fim, o artigo e
 * os armazéns ficam desactivados.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const hoje = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);

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

async function movimentar(page: Page, tipo: string, campos: Record<string, string>) {
  await page.getByRole("button", { name: "Movimentar" }).click();
  await dialogo(page).getByLabel("Tipo").selectOption(tipo);
  for (const [rotulo, valor] of Object.entries(campos)) {
    const campo = dialogo(page).getByLabel(rotulo, { exact: true });
    if ((await campo.evaluate((e) => e.tagName)) === "SELECT") await campo.selectOption({ label: valor });
    else await campo.fill(valor);
  }
  await dialogo(page).getByRole("button", { name: "Registar movimento" }).click();
}

test("F9: armazéns, artigo, movimentos, contagem aplicada e cancelada, valorização", async ({ page, request }) => {
  test.setTimeout(240_000);
  await soLocal(page);
  const ad = await sessaoApi(request, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");
  const politicas = await sa<{ policyId: string; processType: string; isActive: boolean }[]>("GET", "/approval/policies?page=1&pageSize=200");
  for (const x of politicas.corpo.filter((x) => x.processType === "inventory.stock_count" && x.isActive)) await sa("POST", `/approval/policies/${x.policyId}/deactivation`);
  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  const codA = `A${sufixo}`.slice(0, 20);
  const codB = `B${sufixo}`.slice(0, 20);
  const nomeA = `${codA} · ${marca} Central`;
  const nomeB = `${codB} · ${marca} Loja`;
  let itemId = "";
  const ids: string[] = [];

  try {
    // --- Armazéns
    await page.goto("/armazens");
    for (const [codigo, nome] of [
      [codA, `${marca} Central`],
      [codB, `${marca} Loja`],
    ] as const) {
      await page.getByRole("button", { name: "Registar armazém" }).click();
      await dialogo(page).getByLabel("Código").fill(codigo);
      await dialogo(page).getByLabel("Nome").fill(nome);
      await dialogo(page).getByRole("button", { name: "Registar" }).click();
      await expect(dialogo(page)).toHaveCount(0);
    }
    const ws = await ad<{ warehouseId: string; code: string }[]>("GET", "/inventory/warehouses?includeInactive=true&page=1&pageSize=200");
    const idA = ws.corpo.find((w) => w.code === codA)?.warehouseId ?? "";
    const idB = ws.corpo.find((w) => w.code === codB)?.warehouseId ?? "";
    ids.push(idA, idB);

    // --- Artigo e movimentos
    await page.goto("/artigos");
    await page.getByRole("button", { name: "Registar artigo" }).click();
    await dialogo(page).getByLabel("Referência (SKU)").fill(`SKU-${sufixo}`);
    await dialogo(page).getByLabel("Nome").fill(`${marca} Papel A4`);
    await dialogo(page).getByLabel("Unidade").fill("resma");
    await dialogo(page).getByRole("button", { name: "Registar" }).click();
    await expect(page.getByRole("heading", { name: `${marca} Papel A4`, level: 1 })).toBeVisible();
    itemId = page.url().split("/").pop() ?? "";

    await movimentar(page, "entrada", { Armazém: nomeA, "Quantidade (resma)": "10", "Custo unitário (Kz)": "2 500,5", Data: hoje });
    await expect(dialogo(page)).toHaveCount(0);
    await movimentar(page, "saida", { Armazém: nomeA, "Quantidade (resma)": "11", Data: hoje });
    await expect(dialogo(page).getByText("Não há quantidade suficiente nesse armazém.")).toBeVisible();
    await dialogo(page).getByLabel("Quantidade (resma)").fill("2");
    await dialogo(page).getByRole("button", { name: "Registar movimento" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await movimentar(page, "transferencia", { "De (armazém)": nomeA, "Para (armazém)": nomeB, "Quantidade (resma)": "3", Data: hoje });
    await expect(dialogo(page)).toHaveCount(0);
    await movimentar(page, "ajuste", { Armazém: nomeB, "Variação (resma; negativa para tirar)": "-1", Data: hoje, Motivo: "Resma molhada." });
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("table", { name: "Em mão por armazém" }).getByRole("row").filter({ hasText: nomeA })).toContainText("5 resma");
    await expect(page.getByRole("table", { name: "Em mão por armazém" }).getByRole("row").filter({ hasText: nomeB })).toContainText("2 resma");

    // --- Contagem com divergência, sem política: aplica o ajuste.
    await page.goto("/contagens");
    await page.getByRole("button", { name: "Abrir contagem" }).click();
    await dialogo(page).getByLabel("Armazém").selectOption({ label: nomeA });
    await dialogo(page).getByRole("button", { name: "Abrir contagem" }).click();
    await expect(page.getByRole("heading", { name: /^Contagem de / })).toBeVisible();
    await page.getByRole("button", { name: "Contar artigo" }).click();
    await dialogo(page).getByLabel("Artigo").selectOption({ label: `SKU-${sufixo} · ${marca} Papel A4` });
    await dialogo(page).getByLabel("Quantidade contada (resma)").fill("4");
    await dialogo(page).getByRole("button", { name: "Registar contagem" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: `SKU-${sufixo}` })).toContainText("−1");
    await page.getByRole("button", { name: "Fechar contagem" }).click();
    await dialogo(page).getByRole("button", { name: "Fechar contagem" }).click();
    await expect(page.getByText("Contagem fechada", { exact: false })).toBeVisible();

    // --- Outra contagem, cancelada.
    await page.goto("/contagens");
    await page.getByRole("button", { name: "Abrir contagem" }).click();
    await dialogo(page).getByLabel("Armazém").selectOption({ label: nomeB });
    await dialogo(page).getByRole("button", { name: "Abrir contagem" }).click();
    await page.getByRole("button", { name: "Cancelar contagem" }).click();
    await dialogo(page).getByLabel("Motivo").fill("Aberta por engano.");
    await dialogo(page).getByRole("button", { name: "Cancelar contagem" }).click();
    await expect(page.getByText("Contagem cancelada: Aberta por engano.")).toBeVisible();

    // --- Conferir no servidor.
    const it = await ad<{ quantityOnHand: number; averageCost: number; quantitiesByWarehouse: { warehouseId: string; quantityOnHand: number }[]; movements: { type: string }[] }>("GET", `/inventory/items/${itemId}`);
    expect(Number(it.corpo.quantityOnHand)).toBe(6);
    expect(Number(it.corpo.averageCost)).toBeCloseTo(2500.5, 4);
    const porArm = Object.fromEntries(it.corpo.quantitiesByWarehouse.map((q) => [q.warehouseId, Number(q.quantityOnHand)]));
    expect(porArm[idA]).toBe(4);
    expect(porArm[idB]).toBe(2);
    expect(it.corpo.movements.map((m) => m.type).sort()).toEqual(["Adjustment", "Adjustment", "Issue", "Receipt", "TransferIn", "TransferOut"]);
    const val = await ad<{ itemId: string; periodValue: number }[]>("GET", `/inventory/valuation?from=${hoje}&to=${hoje}`);
    expect(val.corpo.some((v) => v.itemId === itemId)).toBe(true);
    await page.goto(`/valorizacao?de=${hoje}&ate=${hoje}`);
    await expect(page.getByRole("row").filter({ hasText: `${marca} Papel A4` })).toBeVisible();
  } finally {
    if (itemId) await ad("POST", `/inventory/items/${itemId}/status`, { active: false });
    for (const id of ids) if (id) await ad("POST", `/inventory/warehouses/${id}/status`, { active: false });
  }
});
