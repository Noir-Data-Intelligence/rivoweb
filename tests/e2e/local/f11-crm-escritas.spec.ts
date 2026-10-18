/**
 * F11 (CRM) contra a API LOCAL (D1, §8.3). Preparação pela API com a conta
 * SuperAdmin local: uma conta Sales. Pela interface, como Sales: registar um
 * lead, marcá-lo contactado, convertê-lo num cliente novo com oportunidade;
 * na oportunidade, registar uma actividade, mudar de etapa, corrigir e
 * ganhar; outra oportunidade perdida com motivo; um lead desqualificado; um
 * tipo de serviço registado e desactivado. Confere tudo no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const nif = `7${String(Date.now()).slice(-9)}`;

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

test("F11: CRM — lead convertido, oportunidade ganha e perdida, actividade, tipo de serviço", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin): uma conta Sales ---
  const email = `sales-${sufixo.toLowerCase()}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Sales" });
  expect(c.status, JSON.stringify(c.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));

  // --- Lead: registar, contactado, converter em cliente novo com oportunidade ---
  await page.goto("/leads");
  await page.getByRole("button", { name: "Novo lead" }).click();
  await dialogo(page).getByLabel("Nome de quem contactar").fill(`${marca} Marta`);
  await dialogo(page).getByLabel("Empresa (opcional)").fill(`${marca} Lopes Lda`);
  await dialogo(page).getByLabel("E-mail (opcional)").fill(`marta-${sufixo.toLowerCase()}@lopes.ao`);
  await dialogo(page).getByLabel("Origem (opcional)").fill("Feira");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Marta`, level: 1 })).toBeVisible();
  const lid = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Marcar contactado" }).click();
  await expect(page.getByText("Contactado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Converter em cliente" }).click();
  await dialogo(page).getByLabel("NIF").fill(nif);
  await dialogo(page).getByLabel("Morada de facturação").fill("Rua do Teste, 3");
  await dialogo(page).getByLabel("Cidade").fill("Luanda");
  await dialogo(page).getByLabel("Título da oportunidade").fill(`${marca} Auditoria`);
  await dialogo(page).getByLabel("Valor estimado (opcional)").fill("1 500 000");
  await dialogo(page).getByRole("button", { name: "Converter" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Convertido.", { exact: true })).toBeVisible();
  const lead = await sa<{ status: string; convertedCustomerId: string; convertedOpportunityId: string }>("GET", `/commercial/leads/${lid}`);
  expect(lead.corpo.status).toBe("Converted");
  const cliente = await sa<{ name: string; taxId: string; contactPerson: string }>("GET", `/commercial/customers/${lead.corpo.convertedCustomerId}`);
  expect(cliente.corpo).toMatchObject({ name: `${marca} Lopes Lda`, taxId: nif, contactPerson: `${marca} Marta` });

  // --- Oportunidade: actividade, etapa, corrigir, ganhar ---
  await page.getByRole("link", { name: "Ver a oportunidade" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Auditoria`, level: 1 })).toBeVisible();
  const oid = lead.corpo.convertedOpportunityId;
  await page.getByRole("button", { name: "Registar actividade" }).click();
  await dialogo(page).getByLabel("Tipo").selectOption("Meeting");
  await dialogo(page).getByLabel("Quando").fill("2026-10-20T09:30");
  await dialogo(page).getByLabel("Assunto").fill(`${marca} Reunião`);
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Actividades" })).toContainText(`${marca} Reunião`);
  await page.getByLabel("Etapa", { exact: true }).selectOption("Negotiation");
  await expect(page.getByText("Negociação", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Corrigir" }).click();
  await dialogo(page).getByLabel("Probabilidade (%)").fill("70");
  await dialogo(page).getByLabel("Valor estimado").fill("1 750 000,25");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Marcar feita: ${marca} Reunião` }).click();
  await expect(page.getByRole("table", { name: "Actividades" }).getByText("Feita")).toBeVisible();
  await page.getByRole("button", { name: "Marcar como ganha" }).click();
  await dialogo(page).getByRole("button", { name: "Ganha" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Ganha", { exact: true }).first()).toBeVisible();
  const o = await sa<{ stage: string; probability: number; estimatedValue: number }>("GET", `/commercial/opportunities/${oid}`);
  expect([o.corpo.stage, Number(o.corpo.probability), Number(o.corpo.estimatedValue)]).toEqual(["Won", 100, 1750000.25]);
  const hist = await sa<{ toStage: string }[]>("GET", `/commercial/opportunities/${oid}/history`);
  expect(hist.corpo.map((h) => h.toStage).sort()).toEqual(["Negotiation", "Prospecting", "Won"]);
  const acts = await sa<{ subject: string; done: boolean; scheduledAt: string }[]>("GET", `/commercial/activities?opportunityId=${oid}`);
  expect(acts.corpo.map((a) => [a.subject, a.done, new Date(a.scheduledAt).toISOString()])).toEqual([[`${marca} Reunião`, true, "2026-10-20T08:30:00.000Z"]]);

  // --- Outra oportunidade, perdida com motivo ---
  await page.goto("/oportunidades");
  await page.getByRole("button", { name: "Nova oportunidade" }).click();
  await dialogo(page).getByLabel("Título").fill(`${marca} Formação`);
  await dialogo(page).getByLabel("Cliente").selectOption({ label: `${marca} Lopes Lda` });
  await dialogo(page).getByLabel("Valor estimado").fill("300 000");
  await dialogo(page).getByLabel("Moeda").selectOption("USD");
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Formação`, level: 1 })).toBeVisible();
  const oid2 = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Marcar como perdida" }).click();
  await dialogo(page).getByLabel("Motivo").fill(`${marca} Sem orçamento.`);
  await dialogo(page).getByRole("button", { name: "Perdida" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  const o2 = await sa<{ stage: string; lostReason: string; currency: string; probability: number }>("GET", `/commercial/opportunities/${oid2}`);
  expect(o2.corpo).toMatchObject({ stage: "Lost", lostReason: `${marca} Sem orçamento.`, currency: "USD" });

  // --- Lead desqualificado ---
  await page.goto("/leads");
  await page.getByRole("button", { name: "Novo lead" }).click();
  await dialogo(page).getByLabel("Nome de quem contactar").fill(`${marca} Rui`);
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Rui`, level: 1 })).toBeVisible();
  const lid2 = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: "Desqualificar" }).click();
  await dialogo(page).getByLabel("Motivo").fill(`${marca} Fora do perfil.`);
  await dialogo(page).getByRole("button", { name: "Desqualificar" }).click();
  await expect(page.getByText("Desqualificado.", { exact: true })).toBeVisible();
  const l2 = await sa<{ status: string; disqualificationReason: string }>("GET", `/commercial/leads/${lid2}`);
  expect(l2.corpo).toMatchObject({ status: "Disqualified", disqualificationReason: `${marca} Fora do perfil.` });

  // --- Tipo de serviço: registar e desactivar ---
  const codigo = `T${sufixo}`.slice(0, 30);
  await page.goto("/tipos-servico");
  await page.getByRole("button", { name: "Novo tipo de serviço" }).click();
  await dialogo(page).getByLabel("Código").fill(codigo);
  await dialogo(page).getByLabel("Nome").fill(`${marca} Consultoria`);
  await dialogo(page).getByLabel("Preço unitário").fill("25 000,50");
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Corrigir ${marca} Consultoria` }).click();
  await dialogo(page).getByLabel("Activo (aparece nas propostas novas)").uncheck();
  await dialogo(page).getByRole("button", { name: "Guardar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  const ts = await sa<{ code: string; unitPrice: number; active: boolean }[]>("GET", "/commercial/service-types?includeInactive=true");
  const t = ts.corpo.find((x) => x.code === codigo);
  expect([Number(t?.unitPrice), t?.active]).toEqual([25000.5, false]);

  // --- Relatório: a oportunidade ganha conta no período ---
  await page.goto("/relatorio-comercial");
  await expect(page.getByText("Ganhas no período")).toBeVisible();
});
