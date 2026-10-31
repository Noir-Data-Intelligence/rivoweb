/**
 * Tesouraria pelo banco contra a API LOCAL (backend #129, #130 e #132), pelo
 * front e com o SuperAdmin: abrir uma conta em kwanzas, depositar com a
 * data-valor de ontem (o extracto mostra essa data e diz quando se
 * registou) e as recusas, com a razão do servidor, de pagar salários e de
 * entregar o IRT de um mês sem folha lançada.
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1", "Só com a API local.");

const marca = `[TESTE] ${Date.now().toString(36)}`;

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

const ddmmaaaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

test("tesouraria pelo banco: depósito com data-valor; pagar salários e entregar ao Estado recusam com a razão", async ({ page }) => {
  test.setTimeout(180_000);
  await soLocal(page);
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();

  const conta = `${marca} Banco`;
  await page.goto("/contas");
  await page.getByRole("button", { name: "Abrir conta" }).click();
  await page.getByLabel("Nome").fill(conta);
  await page.getByLabel("Banco").fill("Banco de teste");
  await page.getByRole("dialog").getByRole("button", { name: "Abrir conta" }).click();
  await expect(page.getByRole("heading", { name: conta, level: 1 })).toBeVisible();

  const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  await page.getByRole("button", { name: "Depositar", exact: true }).click();
  await page.getByLabel(/^Valor/).fill("10 000");
  await page.getByLabel("Referência (opcional)").fill(`${marca} talão`);
  await page.getByRole("dialog").getByLabel("Data").fill(ontem);
  await page.getByRole("dialog").getByRole("button", { name: "Depositar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const linha = page.getByRole("row").filter({ hasText: "10 000,00" });
  await expect(linha).toContainText(ddmmaaaa(ontem));
  await expect(linha).toContainText("registado a");

  // Um mês sem folha lançada: o servidor recusa e o ecrã mostra porquê.
  await page.goto("/contas");
  for (const [botao, confirmar] of [
    ["Pagar salários", "Pagar"],
    ["Entregar ao Estado", "Entregar"],
  ] as const) {
    await page.getByRole("button", { name: botao }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Mês").fill("2020-01");
    const valor = await d.getByLabel("Conta").locator("option", { hasText: conta }).getAttribute("value");
    await d.getByLabel("Conta").selectOption(valor ?? "");
    await d.getByRole("button", { name: confirmar, exact: true }).click();
    await expect(d.getByRole("alert")).toBeVisible();
    await d.getByRole("button", { name: "Cancelar" }).click();
    await expect(d).toHaveCount(0);
  }
});
