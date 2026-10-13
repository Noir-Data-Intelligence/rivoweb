/**
 * F4 contra a API LOCAL (D1, §8.3), com dois colaboradores: quem pede e quem
 * decide. Prova a segregação (403), a decisão simultânea (409) e a aplicação
 * no módulo de origem (o cargo pendente fica em vigor).
 *
 * Preparação, toda pelo front, com o SuperAdmin: departamento, dois cargos com
 * autoridade, duas fichas, a conta admin local ligada à aprovadora, o cargo
 * aprovador atribuído directamente, e uma política só desse departamento.
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as duas contas locais.");

const marca = `[TESTE] ${Date.now().toString(36)}`;

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();
}

async function sair(page: Page) {
  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
}

async function admitir(page: Page, nome: string, departamento: string): Promise<string> {
  await page.goto("/colaboradores");
  await page.getByRole("button", { name: "Admitir colaborador" }).click();
  await page.getByLabel("Nome completo").fill(nome);
  await page.getByLabel("Departamento").selectOption({ label: departamento });
  await page.getByRole("button", { name: "Admitir", exact: true }).click();
  await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function atribuir(page: Page, ficha: string, cargo: string, directa: boolean) {
  await page.goto(ficha);
  await page.getByRole("button", { name: /Atribuir (outro )?cargo/ }).click();
  await page.getByLabel("Cargo", { exact: true }).selectOption({ label: `${cargo} (com autoridade)` });
  if (directa) await page.getByLabel("Atribuição directa, sem aprovação").check();
  await page.getByRole("dialog").getByRole("button", { name: directa ? "Atribuir" : "Enviar para aprovação" }).click();
}

test("F4: aprovação com dois colaboradores, segregação e decisão simultânea", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const adminEmail = process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
  const adminPass = process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "";
  await entrar(page, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // Departamento e cargos com autoridade
  const dep = `${marca} Departamento`;
  await page.goto("/departamentos");
  await page.getByRole("button", { name: "Novo departamento" }).click();
  await page.getByLabel("Nome").fill(dep);
  await page.getByRole("button", { name: "Criar departamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const aprovador = `${marca} Aprovador`;
  const promovido = `${marca} Coordenador`;
  await page.goto("/cargos");
  for (const nome of [aprovador, promovido]) {
    await page.getByRole("button", { name: "Novo cargo" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Nível hierárquico").fill("2");
    await page.getByLabel("Dá autoridade para aprovar").check();
    await page.getByRole("button", { name: "Criar cargo" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  // Fichas: a aprovadora (com a conta admin) e quem pede
  // A conta admin pode estar ligada a uma ficha de uma corrida anterior: desliga-se.
  const token = await page.evaluate(() => (JSON.parse(sessionStorage.getItem("rivo.sessao") ?? "{}") as { token?: string }).token ?? "");
  const h = { Authorization: `Bearer ${token}` };
  const contas = (await (await page.request.get(`${API_LOCAL}/identity/users`, { headers: h })).json()) as { userId: string; email: string }[];
  const idAdmin = contas.find((c) => c.email === adminEmail)?.userId;
  const fichas = (await (await page.request.get(`${API_LOCAL}/hr/employees?page=1&pageSize=200`, { headers: h })).json()) as { employeeId: string; userId: string | null }[];
  const ligada = fichas.find((f) => f.userId === idAdmin);
  if (ligada) {
    await page.goto(`/colaboradores/${ligada.employeeId}`);
    await page.getByRole("button", { name: "Desligar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desligar" }).click();
    await expect(page.getByRole("button", { name: "Ligar conta" })).toBeVisible();
  }

  const fichaA = await admitir(page, `${marca} Aprovadora`, dep);
  await page.getByRole("button", { name: "Desligar" }).isVisible();
  await page.getByRole("button", { name: "Ligar conta" }).click();
  const opcao = page.getByLabel("Conta", { exact: true }).locator("option", { hasText: adminEmail });
  test.skip((await opcao.count()) === 0, "A conta admin local já está ligada a outra ficha.");
  await page.getByLabel("Conta", { exact: true }).selectOption({ label: adminEmail });
  await page.getByRole("dialog").getByRole("button", { name: "Ligar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await atribuir(page, fichaA, aprovador, true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const fichaB = await admitir(page, `${marca} Requerente`, dep);

  // Política só deste departamento (a mais específica ganha)
  await page.goto("/politicas-aprovacao");
  await page.getByRole("button", { name: "Nova política" }).click();
  await page.getByLabel("Processo").selectOption("hr.position_assignment");
  await page.getByLabel("Departamento (opcional)").selectOption({ label: dep });
  await page.getByLabel("Passo 1: cargo").selectOption({ label: aprovador });
  await page.getByRole("button", { name: "Criar política" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Pedido 1: promover quem pede (vai para a aprovadora). Pedido 2: promover a
  // própria aprovadora (ela é requerente e aprovadora: BR-2).
  await atribuir(page, fichaB, promovido, false);
  await expect(page.getByText("Enviado para aprovação.")).toBeVisible();
  await atribuir(page, fichaA, promovido, false);
  await expect(page.getByText("Enviado para aprovação.")).toBeVisible();
  await sair(page);

  // A aprovadora decide
  await entrar(page, adminEmail, adminPass);
  await page.goto("/aprovacoes");
  const linhas = page.getByRole("row").filter({ hasText: "Atribuição de cargo" });
  await expect(linhas.first()).toBeVisible();

  // Segregação: o pedido em que ela é a requerente → 403 com o motivo.
  await page.goto("/aprovacoes?vista=todos");
  const proprio = page.getByRole("row").filter({ hasText: `${marca} Aprovadora` }).getByRole("link", { name: "Atribuição de cargo" }).first();
  await proprio.click();
  await expect(page.getByText("É o seu pedido.")).toBeVisible();
  // Ela ocupa o cargo aprovador, mas a interface não lhe oferece decidir…
  await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
  // …e o servidor recusa-o com o motivo (403, BR-2), se alguém o tentar.
  const idProprio = page.url().split("/").pop() ?? "";
  const tokenAdmin = await page.evaluate(() => (JSON.parse(sessionStorage.getItem("rivo.sessao") ?? "{}") as { token?: string }).token ?? "");
  const recusa = await page.request.post(`${API_LOCAL}/approval/requests/${idProprio}/decisions`, { headers: { Authorization: `Bearer ${tokenAdmin}` }, data: { action: "Approved", notes: null } });
  expect(recusa.status()).toBe(403);
  expect(((await recusa.json()) as { detail?: string }).detail).toContain("BR-2");
  await page.getByRole("button", { name: "Cancelar o pedido" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar pedido" }).click();
  await expect(page.getByText("Cancelado").first()).toBeVisible();

  // Decisão simultânea: a mesma pessoa com o pedido aberto em duas abas.
  await page.goto("/aprovacoes?vista=todos");
  await page.getByRole("row").filter({ hasText: `${marca} Requerente` }).getByRole("link", { name: "Atribuição de cargo" }).first().click();
  const urlPedido = page.url();
  const outra = await page.context().newPage();
  await soLocal(outra);
  // Cada aba tem a sua sessão (sessionStorage, D3): a segunda aba entra também.
  await entrar(outra, adminEmail, adminPass);
  await outra.goto(urlPedido);
  await expect(outra.getByRole("button", { name: "Aprovar" })).toBeVisible();
  await page.getByRole("button", { name: "Aprovar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByText("Aprovado").first()).toBeVisible();
  await outra.getByRole("button", { name: "Aprovar" }).click();
  await outra.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
  await expect(outra.getByText("Outra pessoa decidiu primeiro.")).toBeVisible();
  await expect(outra.getByText("Aprovado").first()).toBeVisible();
  await outra.close();

  // Aplicação no módulo de origem: o cargo de quem pediu está em vigor.
  await page.goto(fichaB);
  await expect(page.getByText(promovido).first()).toBeVisible();
  void browser;
});
