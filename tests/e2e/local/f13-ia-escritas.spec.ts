/**
 * F13 (IA) contra a API LOCAL (D1, §8.3), que não tem chaves: nenhum pedido
 * pago sai (nem seria possível). Como Admin local: a configuração mostra os
 * fornecedores sem chave (não se escolhem) e guardar é recusado pelo servidor
 * com o motivo; o assistente e o registo de factura de compra não oferecem
 * nada da IA. Confere no servidor que a configuração não mudou.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e a conta Admin local.");

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

async function ler(request: APIRequestContext, caminho: string): Promise<unknown> {
  const r = await request.post(`${API_LOCAL}/identity/login`, { data: { email: process.env.RIVO_LOCAL_ADMIN_EMAIL, password: process.env.RIVO_LOCAL_ADMIN_PASSWORD } });
  const { accessToken } = (await r.json()) as { accessToken: string };
  return (await request.get(`${API_LOCAL}${caminho}`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();
}

test("F13: IA sem chaves — configuração recusada pelo servidor, nenhum botão pago", async ({ page, request }) => {
  await soLocal(page);
  const antes = await ler(request, "/ai/provider");
  expect((await ler(request, "/ai/status")) as { enabled: boolean }).toMatchObject({ enabled: false });
  const pagos: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && new URL(r.url()).pathname.startsWith("/ai/")) pagos.push(r.url());
  });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));

  await page.getByRole("link", { name: "Inteligência artificial" }).click();
  await expect(page.getByText("Desligadas")).toBeVisible();
  await expect(page.getByRole("table", { name: "Fornecedores de IA" }).getByRole("row").filter({ hasText: "Anthropic" })).toContainText("Sem chave");
  await expect(page.getByLabel("Fornecedor activo").locator("option", { hasText: "OpenAI" })).toBeDisabled();
  await page.getByLabel("Se o activo falhar, recorrer ao outro").click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Não foi possível concluir.")).toBeVisible();

  await page.goto("/assistente");
  await expect(page.getByText("As funcionalidades de IA não estão ligadas neste servidor.")).toBeVisible();
  await page.goto("/facturas-compra");
  await page.getByRole("button", { name: "Registar factura" }).click();
  await expect(page.getByRole("dialog").getByLabel("Número da factura")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ler com IA" })).toHaveCount(0);

  expect(pagos).toEqual([]);
  expect(await ler(request, "/ai/provider")).toEqual(antes);
});
