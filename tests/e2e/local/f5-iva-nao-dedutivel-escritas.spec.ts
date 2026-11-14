/**
 * Corrigir o IVA não dedutível depois do registo (ADR-125) contra a API LOCAL
 * (D1, §8.3). Preparação pela API com a conta SuperAdmin local: uma factura de
 * compra de hoje, sem IVA não dedutível. Pela interface: o cliente recusa o
 * valor actual e o que passa do IVA; corrige metade, com o motivo; o aviso diz
 * onde lançou, como o servidor respondeu. Confere no servidor.
 */
import { expect, test, type APIRequestContext } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;

async function token(request: APIRequestContext): Promise<string> {
  const r = await request.post(`${API_LOCAL}/identity/login`, { data: { email: process.env.RIVO_LOCAL_EMAIL, password: process.env.RIVO_LOCAL_PASSWORD } });
  expect(r.status()).toBe(200);
  return ((await r.json()) as { accessToken: string }).accessToken;
}

test("F5: corrigir o IVA não dedutível de uma factura de compra registada", async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
  const t = await token(request);
  const hoje = new Date().toISOString().slice(0, 10);
  const r = await request.post(`${API_LOCAL}/finance/purchase-invoices`, {
    headers: { Authorization: `Bearer ${t}` },
    data: {
      supplierInvoiceNumber: `FT ${sufixo}/1`,
      supplierId: null,
      purchaseOrderId: null,
      supplierName: `${marca} Fornecedor`,
      supplierTaxId: "5417000001",
      issuedOn: hoje,
      dueOn: hoje,
      currency: "AOA",
      netTotal: "100000.00",
      taxTotal: "14000.00",
      description: `${marca} viatura ligeira`,
      expenseAccountCode: null,
      nonDeductibleTax: "0",
    },
  });
  expect(r.status(), await r.text()).toBe(201);
  const { purchaseInvoiceId } = (await r.json()) as { purchaseInvoiceId: string };

  await page.goto(`${FRONT_LOCAL}/entrar`);
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  await page.goto(`${FRONT_LOCAL}/facturas-compra/${purchaseInvoiceId}`);
  await page.getByRole("button", { name: "Corrigir IVA não dedutível" }).click();
  const d = page.getByRole("dialog");
  const campo = d.getByLabel("IVA não dedutível (AOA)");
  await expect(campo).toHaveValue("0,00");
  await d.getByLabel("Motivo").fill(`${marca} viatura ligeira: metade do IVA não se deduz`);
  await d.getByRole("button", { name: "Corrigir" }).click();
  await expect(d.getByText("É o valor actual: indique outro.")).toBeVisible();
  await campo.fill("14000,01");
  await expect(d.getByText("Não pode passar de 14 000,00", { exact: false })).toBeVisible();
  await campo.fill("7000");
  const resposta = page.waitForResponse((x) => x.url().endsWith(`/purchase-invoices/${purchaseInvoiceId}/non-deductible-tax-corrections`));
  await d.getByRole("button", { name: "Corrigir" }).click();
  const x = await resposta;
  expect(x.status(), await x.text()).toBe(200);
  const corpo = (await x.json()) as { archivalNumber: string | null; postedAs: string; notes: string[] };
  expect(corpo.archivalNumber ?? "").toMatch(/^ND1-/);
  const aviso = page.getByRole("status").filter({ hasText: "IVA não dedutível corrigido." });
  await expect(aviso).toContainText(corpo.postedAs === "Regularisation" ? "regularização com a data de hoje" : "ficou na data da factura");
  await expect(aviso).toContainText(corpo.archivalNumber ?? "");
  for (const n of corpo.notes) await expect(aviso).toContainText(n);
  await expect(page.getByText("IVA não dedutível corrigido uma vez depois do registo.")).toBeVisible();

  const depois = await (await request.get(`${API_LOCAL}/finance/purchase-invoices/${purchaseInvoiceId}`, { headers: { Authorization: `Bearer ${t}` } })).json();
  expect(Number(depois.nonDeductibleTax)).toBe(7000);
  expect(Number(depois.nonDeductibleTaxCorrections)).toBe(1);
});
