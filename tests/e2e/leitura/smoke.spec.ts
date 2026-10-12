/**
 * Smoke de produção no browser (§8.3). Corre contra o front publicado
 * (RIVO_FRONT_URL) com a API real, só depois de a origem estar no CORS (§9.2).
 * Qualquer pedido à API que não seja GET aborta e faz falhar o teste, excepto
 * o login e o logout.
 */
import { expect, test } from "@playwright/test";

const API = (process.env.RIVO_PROD_API_URL ?? "https://syyt.tech").replace(/\/+$/, "");
const PERMITIDOS = new Set(["POST /identity/login", "POST /identity/logout"]);

test.skip(process.env.RIVO_SMOKE_PRODUCAO !== "1", "Só com RIVO_SMOKE_PRODUCAO=1.");

test("login → ecrãs da F0 → logout, sem escritas", async ({ page }) => {
  const bloqueados: string[] = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const chave = `${req.method()} ${new URL(req.url()).pathname}`;
    if (req.method() === "GET" || req.method() === "OPTIONS" || PERMITIDOS.has(chave)) return route.continue();
    bloqueados.push(chave);
    return route.abort("blockedbyclient");
  });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_PROD_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_PROD_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /Olá|Portal/ })).toBeVisible();

  await page.goto("/conta");
  await expect(page.getByRole("heading", { name: "Sessões activas" })).toBeVisible();

  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar/);

  expect(bloqueados).toEqual([]);
});
