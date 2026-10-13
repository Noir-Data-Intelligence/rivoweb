/**
 * Escritas da F2 contra a API LOCAL em Docker (D1, §8.3), num browser real.
 * Mesmo enquadramento de f1-escritas.spec.ts: nada sai de localhost.
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1", "Só com RIVO_ESCRITAS_LOCAL=1 e a API local de pé.");

const marca = `[TESTE] ${new Date().toISOString().slice(0, 19).replace("T", " ")} ${Math.random().toString(36).slice(2, 6)}`;

async function soLocal(page: Page, fora: string[]) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL)) return route.continue();
    fora.push(url);
    return route.abort("blockedbyclient");
  });
}

test("F2 de ponta a ponta na base local", async ({ page }) => {
  test.setTimeout(180_000);
  const fora: string[] = [];
  await soLocal(page, fora);
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();

  // Painel e executivo com dados reais da base local (sem erros).
  await expect(page.getByText("Notificações por ler")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard executivo" })).toBeVisible();
  await expect(page.getByText("Receita", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);

  // Regra: criar (a própria conta como destinatária), rever, avaliar.
  await page.goto("/alertas?vista=regras");
  await page.getByRole("button", { name: "Nova regra" }).click();
  await page.getByLabel("Nome").fill(`${marca} Documentos`);
  await page.getByLabel("O que vigiar").selectOption("IdentityDocumentsExpiring");
  await page.getByLabel("Antecedência (dias)").fill("365");
  await page.getByRole("button", { name: "Criar regra" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(`${marca} Documentos`)).toBeVisible();

  await page.getByRole("button", { name: `Rever ${marca} Documentos` }).click();
  await page.getByLabel("Antecedência (dias)").fill("200");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: `${marca} Documentos` })).toContainText("Documentos de identificação a caducar em 200 dias");

  await page.getByRole("button", { name: "Avaliar agora" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Avaliar" }).click();
  await expect(page.getByText(/regras avaliadas/)).toBeVisible();

  // Desactivar a regra de teste para não continuar a gerar alertas.
  await page.getByRole("button", { name: `Rever ${marca} Documentos` }).click();
  await page.getByLabel("Regra activa").uncheck();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Eventos: resolver um, se houver abertos.
  await page.goto("/alertas");
  const resolver = page.getByRole("button", { name: "Resolver" });
  await page.getByRole("table", { name: "Alertas" }).waitFor();
  console.log(`alertas abertos: ${await resolver.count()}`);
  if ((await resolver.count()) > 0) {
    const antes = await resolver.count();
    await resolver.first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Resolver" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(resolver).toHaveCount(antes - 1);
  }

  // Uma notificação garantida: juntar o perfil «Vendas» à conta admin local
  // avisa essa conta. Depois entra-se como ela para a ler.
  const emailAdmin = process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
  if (emailAdmin) {
    await page.goto("/utilizadores");
    await page.getByRole("link", { name: emailAdmin, exact: true }).click();
    const vendas = page.getByRole("listitem").filter({ hasText: "Vendas" });
    await expect(page.getByLabel("Juntar perfil")).toBeEnabled();
    // Retirar e voltar a dar: cada corrida gera uma notificação nova.
    if (await vendas.count()) {
      await vendas.getByRole("button", { name: "Retirar" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Retirar perfil" }).click();
      await expect(vendas).toHaveCount(0);
    }
    await page.getByLabel("Juntar perfil").selectOption("Sales");
    await page.getByRole("button", { name: "Atribuir" }).click();
    await expect(vendas).toBeVisible();
    await page.getByRole("button", { name: /Conta de/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    // Depois de sair de propósito, o login não guarda a página anterior.
    await expect(page).toHaveURL(/\/entrar$/);
    await page.getByLabel("E-mail").fill(emailAdmin);
    await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();
  }

  // Notificações: marcar uma e depois todas.
  await page.goto("/notificacoes");
  await expect(page.getByRole("heading", { name: "Notificações", level: 1 })).toBeVisible();
  const marcar = page.getByRole("button", { name: "Marcar como lida" });
  await page.waitForLoadState("networkidle");
  console.log(`notificações por ler: ${await marcar.count()}`);
  if (emailAdmin) expect(await marcar.count()).toBeGreaterThan(0);
  if ((await marcar.count()) > 0) {
    const antes = await marcar.count();
    await marcar.first().click();
    await expect(marcar).toHaveCount(antes - 1);
  }
  if (await page.getByRole("button", { name: "Marcar todas como lidas" }).isVisible()) {
    await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
    await expect(page.getByText(/marcadas? como lidas?\./)).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Notificações", exact: true })).toBeVisible();

  // Preferência de e-mail: trocar e repor.
  await page.goto("/conta");
  const caixa = page.getByLabel("Receber também por e-mail");
  const inicial = await caixa.isChecked();
  await caixa.click();
  await expect(page.getByText("Preferência guardada.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Receber também por e-mail")).toBeChecked({ checked: !inicial });
  await page.getByLabel("Receber também por e-mail").click();
  await expect(page.getByText("Preferência guardada.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Receber também por e-mail")).toBeChecked({ checked: inicial });

  expect(fora).toEqual([]);
});
