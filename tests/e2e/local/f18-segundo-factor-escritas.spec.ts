/**
 * Segundo factor (ADR-127) contra a API LOCAL (D1, §8.3). Preparação pela API
 * com a conta SuperAdmin local: uma conta Finance nova, só para este teste.
 * Pela interface, como essa conta: ligar o segundo factor (a chave do ecrã dá
 * o código, calculado aqui como a app o calcularia), guardar os códigos;
 * entrar com um código errado, com um de recuperação e com o da app. Como
 * SuperAdmin: «Repor segundo factor», e a conta volta a entrar só com a
 * password. Confere no servidor.
 */
import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;

/** RFC 6238 (TOTP, SHA-1, 30 s, 6 dígitos), como a app autenticadora. */
function totp(chave: string, desvio = 0): string {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of chave.replace(/[\s=]/g, "").toUpperCase()) bits += alfabeto.indexOf(c).toString(2).padStart(5, "0");
  const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000) + desvio));
  const h = createHmac("sha1", bytes).update(contador).digest();
  const o = (h[h.length - 1] ?? 0) & 0xf;
  const n = (h.readUInt32BE(o) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, "0");
}

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

async function novaPagina(browser: Browser): Promise<Page> {
  const p = await (await browser.newContext({ baseURL: FRONT_LOCAL })).newPage();
  await soLocal(p);
  return p;
}

async function passoPassword(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("F18: segundo factor — ligar, entrar com o código da app e de recuperação, repor pelo admin", async ({ page, request, browser }) => {
  test.setTimeout(240_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin): uma conta Finance só para este teste ---
  const email = `mfa-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Finance" });
  expect(c.status, JSON.stringify(c.corpo)).toBe(201);
  const userId = c.corpo.userId;
  expect((await sa("POST", `/identity/users/${userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${userId}/status`, { active: true, reason: `${marca} activar para o teste` });

  // --- Ligar, pela interface ---
  await passoPassword(page, email, PASSWORD_LOCAL);
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  await page.goto("/conta");
  await page.getByRole("button", { name: "Ligar o segundo factor" }).click();
  const chave = ((await page.getByLabel("Chave para a app").textContent()) ?? "").replace(/\s+/g, "");
  expect(chave).toMatch(/^[A-Z2-7]{16,}$/);
  await expect(page.getByRole("link", { name: "abra-a directamente na app" })).toHaveAttribute("href", /^otpauth:\/\/totp\//);
  await page.getByLabel("Código da app").fill(totp(chave, -20));
  await page.getByRole("button", { name: "Confirmar e ligar" }).click();
  // Código errado: o 400 do servidor fica no campo, e nada se liga.
  await expect(page.getByLabel("Código da app")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Guarde estes códigos agora", { exact: false })).toHaveCount(0);
  await page.getByLabel("Código da app").fill(totp(chave));
  await page.getByRole("button", { name: "Confirmar e ligar" }).click();
  await expect(page.getByText("Guarde estes códigos agora: não voltam a aparecer.")).toBeVisible();
  const codigos = await page.getByRole("list", { name: "Códigos de recuperação" }).getByRole("listitem").allTextContents();
  expect(codigos).toHaveLength(10);
  await page.getByRole("button", { name: "Já os guardei" }).click();
  await expect(page.getByText("Restam 10 códigos de recuperação por usar.")).toBeVisible();

  // --- Entrar: o login pede o código; o errado recusa, o de recuperação entra ---
  const p2 = await novaPagina(browser);
  await passoPassword(p2, email, PASSWORD_LOCAL);
  await expect(p2.getByRole("heading", { name: "Segundo factor" })).toBeVisible();
  await p2.getByLabel("Código da app").fill(totp(chave, -20));
  await p2.getByRole("button", { name: "Entrar" }).click();
  await expect(p2.getByText("Código errado. Tente de novo.")).toBeVisible();
  await p2.getByRole("button", { name: "Usar um código de recuperação" }).click();
  await p2.getByLabel("Código de recuperação").fill(codigos[0] ?? "");
  await p2.getByRole("button", { name: "Entrar" }).click();
  await p2.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  await p2.goto("/conta");
  await expect(p2.getByText("Restam 9 códigos de recuperação por usar.")).toBeVisible();

  // --- Entrar com o código da app ---
  const p3 = await novaPagina(browser);
  await passoPassword(p3, email, PASSWORD_LOCAL);
  await p3.getByLabel("Código da app").fill(totp(chave));
  await p3.getByRole("button", { name: "Entrar" }).click();
  await p3.waitForURL((u) => !u.pathname.startsWith("/entrar"));

  // --- Repor, pela interface, como SuperAdmin ---
  const p4 = await novaPagina(browser);
  await passoPassword(p4, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");
  await p4.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  await p4.goto(`/utilizadores/${userId}`);
  await p4.getByRole("button", { name: "Repor segundo factor" }).click();
  await p4.getByRole("dialog").getByLabel("Razão").fill(`${marca} perdeu o telemóvel`);
  await p4.getByRole("dialog").getByRole("button", { name: "Repor" }).click();
  await expect(p4.getByText("Segundo factor reposto. As sessões da pessoa terminaram.")).toBeVisible();

  // --- No servidor: entra só com a password ---
  const r = await request.post(`${API_LOCAL}/identity/login`, { data: { email, password: PASSWORD_LOCAL } });
  expect(r.status()).toBe(200);
  const depois = await (await request.get(`${API_LOCAL}/identity/me/mfa`, { headers: { Authorization: `Bearer ${((await r.json()) as { accessToken: string }).accessToken}` } })).json();
  expect(depois).toMatchObject({ enabled: false });
});

/**
 * Só com a API local levantada com `MFA_ENFORCED=true`. Aí o SuperAdmin
 * também fica restrito, por isso a conta Finance prepara-se antes, com a
 * obrigatoriedade desligada: `RIVO_MFA_EMAIL` e `RIVO_MFA_PASSWORD`. Entra numa
 * sessão que só serve para ligar o segundo factor; ligado, a Rivo toda.
 */
test("F18: obrigatoriedade ligada — a sessão restrita só liga o segundo factor", async ({ page }) => {
  test.skip(!process.env.RIVO_MFA_EMAIL || !process.env.RIVO_MFA_PASSWORD, "Só com a API local em MFA_ENFORCED=true e uma conta Finance preparada antes.");
  test.setTimeout(120_000);
  await soLocal(page);
  await passoPassword(page, process.env.RIVO_MFA_EMAIL ?? "", process.env.RIVO_MFA_PASSWORD ?? "");
  await expect(page.getByRole("heading", { name: "Ligue o segundo factor para continuar" })).toBeVisible();
  await page.goto("/contas");
  await expect(page.getByRole("heading", { name: "Ligue o segundo factor para continuar" })).toBeVisible();
  await page.getByRole("button", { name: "Ligar o segundo factor" }).click();
  const chave = ((await page.getByLabel("Chave para a app").textContent()) ?? "").replace(/\s+/g, "");
  await page.getByLabel("Código da app").fill(totp(chave));
  await page.getByRole("button", { name: "Confirmar e ligar" }).click();
  await page.getByRole("button", { name: "Já os guardei: continuar" }).click();
  await expect(page.getByRole("heading", { name: "Ligue o segundo factor para continuar" })).toHaveCount(0);
  await page.goto("/conta");
  await expect(page.getByText("O seu perfil é obrigado ao segundo factor: não se desliga.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Desligar" })).toHaveCount(0);
});
