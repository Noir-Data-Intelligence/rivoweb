/**
 * F11 (propostas) contra a API LOCAL (D1, §8.3). Preparação pela API com a
 * conta SuperAdmin local: uma conta Sales, um cliente e um tipo de serviço.
 * Pela interface, como Sales: um modelo; uma proposta a partir dele (o texto
 * vem preenchido), linhas do catálogo e livre, tirar uma, corrigir, PDF,
 * enviar e aceitar; outra recusada com notas. Confere no servidor (texto,
 * totais, estados, versões).
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const nif = `6${String(Date.now()).slice(-9)}`;

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

const dialogo = (page: Page) => page.getByRole("dialog");

test("F11: propostas — modelo, linhas, correcção, envio, aceite e recusa", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const email = `sales-p-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Sales" });
  expect(c.status, JSON.stringify(c.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const cliente = await sa<{ customerId: string }>("POST", "/commercial/customers", { name: `${marca} Cliente`, taxId: nif, addressDetail: "Rua do Teste, 4", city: "Luanda" });
  expect(cliente.status, JSON.stringify(cliente.corpo)).toBe(201);
  const codigo = `P${sufixo}`.slice(0, 30);
  expect((await sa("POST", "/commercial/service-types", { code: codigo, name: `${marca} Auditoria`, description: null, unitPrice: 25000, currency: "AOA", active: true })).status).toBe(201);

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));

  // --- Modelo ---
  await page.goto("/modelos-proposta");
  await page.getByRole("button", { name: "Novo modelo" }).click();
  await dialogo(page).getByLabel("Nome").fill(`${marca} Padrão`);
  await dialogo(page).getByLabel("Texto").fill("Exmos. {{cliente}},\n\nSegue a proposta «{{titulo}}», válida até {{validade}}.");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  // --- Proposta a partir do modelo ---
  await page.goto("/propostas");
  await page.getByRole("button", { name: "Nova proposta" }).click();
  await dialogo(page).getByLabel("Título").fill(`${marca} Auditoria 2027`);
  await dialogo(page).getByLabel("Cliente", { exact: true }).selectOption({ label: `${marca} Cliente` });
  await dialogo(page).getByLabel("Válida até (opcional)").fill("2099-11-30");
  await dialogo(page).getByLabel("Modelo (opcional)").selectOption({ label: `${marca} Padrão` });
  await dialogo(page).getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Auditoria 2027`, level: 1 })).toBeVisible();
  const pid = page.url().split("/").pop() ?? "";
  await expect(page.getByText(`Exmos. ${marca} Cliente,`, { exact: false })).toBeVisible();
  await expect(page.getByText("válida até 2099-11-30", { exact: false })).toBeVisible();

  // Linha do catálogo (descrição e preço do serviço), linha livre com desconto, e uma a tirar.
  await page.getByRole("button", { name: "Acrescentar linha" }).click();
  await dialogo(page).getByLabel("Serviço (opcional)").selectOption({ label: `${codigo} · ${marca} Auditoria · 25\u00A0000,00 Kz` });
  await dialogo(page).getByLabel("Quantidade").fill("2,5");
  await dialogo(page).getByRole("button", { name: "Acrescentar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  for (const [desc, q, pr, d] of [
    ["Horas extra", "3", "12 500,5", "7,5"],
    ["A tirar", "1", "10", ""],
  ] as const) {
    await page.getByRole("button", { name: "Acrescentar linha" }).click();
    await dialogo(page).getByLabel("Descrição").fill(desc);
    await dialogo(page).getByLabel("Quantidade").fill(q);
    await dialogo(page).getByLabel("Preço unitário em AOA").fill(pr);
    if (d) await dialogo(page).getByLabel("Desconto (%)").fill(d);
    await dialogo(page).getByRole("button", { name: "Acrescentar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Tirar a linha A tirar" }).click();
  await expect(page.getByRole("table", { name: "Linhas da proposta" })).not.toContainText("A tirar");
  // 2,5 × 25 000 + 3 × 12 500,50 × 0,925 = 62 500 + 34 688,89
  await expect(page.getByText("Total: 97\u00A0188,89 Kz")).toBeVisible();

  await page.getByRole("button", { name: "Corrigir" }).click();
  await dialogo(page).getByLabel("Notas (opcional)").fill("Preços sem IVA.");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);

  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF" }).click();
  expect((await descarga).suggestedFilename()).toMatch(/^PROP-\d{8}-[0-9A-F]{6}\.pdf$/);

  await page.getByRole("button", { name: "Marcar como enviada" }).click();
  await dialogo(page).getByRole("button", { name: "Enviada" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Cliente aceitou" }).click();
  await dialogo(page).getByLabel("Notas (opcional)").fill("Assinado a 18/10.");
  await dialogo(page).getByRole("button", { name: "Aceite" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Aceite pelo cliente.")).toBeVisible();

  const p = await sa<{ status: string; total: number; notes: string; decisionNotes: string; body: string; lines: { description: string; total: number }[] }>("GET", `/commercial/proposals/${pid}`);
  expect(p.corpo).toMatchObject({ status: "Accepted", notes: "Preços sem IVA.", decisionNotes: "Assinado a 18/10." });
  expect(Number(p.corpo.total)).toBe(97188.89);
  expect(p.corpo.lines.map((l) => [l.description, Number(l.total)])).toEqual([
    [`${marca} Auditoria`, 62500],
    ["Horas extra", 34688.89],
  ]);
  expect(p.corpo.body).toContain(`Exmos. ${marca} Cliente,`);
  const vs = await sa<{ reason: string }[]>("GET", `/commercial/proposals/${pid}/versions`);
  expect(vs.corpo.map((v) => v.reason).sort()).toEqual(["revised", "sent"]);

  // --- Outra proposta, recusada ---
  await page.goto("/propostas");
  await page.getByRole("button", { name: "Nova proposta" }).click();
  await dialogo(page).getByLabel("Título").fill(`${marca} Formação`);
  await dialogo(page).getByLabel("Cliente", { exact: true }).selectOption({ label: `${marca} Cliente` });
  await dialogo(page).getByLabel("Moeda").selectOption("USD");
  await dialogo(page).getByRole("button", { name: "Criar rascunho" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Formação`, level: 1 })).toBeVisible();
  const pid2 = page.url().split("/").pop() ?? "";
  await expect(page.getByRole("button", { name: "Marcar como enviada" })).toBeDisabled();
  await page.getByRole("button", { name: "Acrescentar linha" }).click();
  await dialogo(page).getByLabel("Descrição").fill("Formação");
  await dialogo(page).getByLabel("Preço unitário em USD").fill("1 500");
  await dialogo(page).getByRole("button", { name: "Acrescentar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Marcar como enviada" }).click();
  await dialogo(page).getByRole("button", { name: "Enviada" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Cliente recusou" }).click();
  await dialogo(page).getByLabel("Notas (opcional)").fill("Fora do orçamento.");
  await dialogo(page).getByRole("button", { name: "Recusada" }).click();
  await expect(page.getByText("Recusada pelo cliente.")).toBeVisible();
  const p2 = await sa<{ status: string; currency: string; total: number }>("GET", `/commercial/proposals/${pid2}`);
  expect([p2.corpo.status, p2.corpo.currency, Number(p2.corpo.total)]).toEqual(["Rejected", "USD", 1500]);
});
