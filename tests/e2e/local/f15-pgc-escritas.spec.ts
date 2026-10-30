/**
 * Contabilidade pelo PGC contra a API LOCAL (backend #125 e #126), pelo
 * front e com o SuperAdmin: carregar o PGC (repetir não duplica), o Balanço
 * e a DR nos modelos do decreto, e simular o lançamento do histórico do mês
 * corrente (sem gravar). Não apura o IVA nem fecha o exercício: são
 * lançamentos que não se apagam.
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1", "Só com a API local.");

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

test("PGC: carregar o plano, demonstrações oficiais e simular o histórico", async ({ page }) => {
  test.setTimeout(180_000);
  await soLocal(page);
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();

  // Carregar duas vezes: a segunda não cria contas.
  await page.goto("/plano-contas");
  const d = page.getByRole("dialog");
  for (const vez of [1, 2]) {
    await page.getByRole("button", { name: "Carregar o PGC" }).click();
    await d.getByRole("button", { name: "Carregar", exact: true }).click();
    await expect(d.getByText("PGC carregado.")).toBeVisible({ timeout: 60_000 });
    if (vez === 2) await expect(d.getByRole("definition").first()).toHaveText("0");
    await d.getByRole("button", { name: "Fechar", exact: true }).first().click();
    await expect(d).toHaveCount(0);
  }
  await page.getByLabel("Procurar").fill("34.5.6.1");
  await expect(page.getByRole("cell", { name: "34.5.6.1", exact: true })).toBeVisible();

  const ano = new Date().getUTCFullYear();
  await page.goto(`/relatorios?vista=balanco-pgc&ano=${ano}`);
  await expect(page.getByText(`Balanço em 31/12/${ano}`)).toBeVisible();
  await expect(page.getByText("Valores expressos em", { exact: false })).toBeVisible();
  await expect(page.getByRole("table", { name: `Balanço do ano de ${ano}` }).getByRole("row")).not.toHaveCount(1);
  await page.goto(`/relatorios?vista=resultados-pgc&ano=${ano}&unidade=1`);
  await expect(page.getByText("Valores expressos em", { exact: false })).toBeVisible();

  // Simular não grava: o resultado diz o que lançaria.
  await page.goto(`/periodos?ano=${ano}`);
  const cartao = page.getByRole("heading", { name: "Lançar o histórico" }).locator("..");
  await cartao.getByRole("button", { name: /^Simular / }).click();
  await expect(page.getByRole("region", { name: "Resultado da simulação" }).getByText("nada foi gravado", { exact: false })).toBeVisible({ timeout: 60_000 });
});
