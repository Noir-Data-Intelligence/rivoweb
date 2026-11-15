/**
 * NOVIDADES 47 a 52 contra a API LOCAL (D1, §8.3). Preparação pela API com a
 * conta SuperAdmin local: um departamento, dois cargos com autoridade, três
 * contas novas (A e B no Finance, C colaborador) com as fichas ligadas, e A
 * no cargo que aprova.
 *
 * Pela interface:
 * - SuperAdmin: a política dos adiantamentos com prazo e escalonamento (48);
 * - A: delega em B (47);
 * - B: vê o adiantamento de C na caixa por delegação e aprova-o em nome de A;
 *   a ficha mostra o prazo e «em nome de» (47, 48);
 * - C: retira o adiantamento aprovado e por pagar (49);
 * - B: anula o reembolso de uma despesa de C (52).
 * Confere no servidor.
 */
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_EMAIL, "Só com a API local e a conta SuperAdmin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
// Valor único por corrida: a política só cobre este valor e não colide com outras corridas.
const VALOR = String(10_000 + (Date.now() % 89_999));

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

async function novaPagina(browser: Browser, email: string, password: string): Promise<Page> {
  const p = await (await browser.newContext({ baseURL: FRONT_LOCAL })).newPage();
  await p.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
  await p.goto("/entrar");
  await p.getByLabel("E-mail").fill(email);
  await p.getByLabel("Password").fill(password);
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  return p;
}

test("F19: política com prazo e escalonamento, delegação, decisão em nome de, retirar o adiantamento, anular o reembolso", async ({ browser, request }) => {
  test.setTimeout(300_000);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const dep = await sa<{ departmentId: string }>("POST", "/hr/departments", { name: `${marca} Delegações`, managerId: null });
  expect(dep.status).toBe(201);
  const cargo = await sa<{ positionId: string }>("POST", "/hr/positions", { name: `${marca} Aprova adiantamentos`, hierarchyLevel: 2, grantsApprovalAuthority: true });
  const escala = await sa<{ positionId: string }>("POST", "/hr/positions", { name: `${marca} Escala adiantamentos`, hierarchyLevel: 1, grantsApprovalAuthority: true });
  expect([cargo.status, escala.status]).toEqual([201, 201]);
  const pessoas = { a: { perfil: "Finance", nome: `${marca} A` }, b: { perfil: "Finance", nome: `${marca} B` }, c: { perfil: "Colaborador", nome: `${marca} C` } } as const;
  const ids: Record<keyof typeof pessoas, { email: string; userId: string; employeeId: string }> = { a: { email: "", userId: "", employeeId: "" }, b: { email: "", userId: "", employeeId: "" }, c: { email: "", userId: "", employeeId: "" } };
  for (const k of ["a", "b", "c"] as const) {
    const email = `f19-${k}-${sufixo.toLowerCase()}@teste.local`;
    const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: pessoas[k].perfil });
    expect(c.status, JSON.stringify(c.corpo)).toBe(201);
    expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
    await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
    const f = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: pessoas[k].nome, departmentId: dep.corpo.departmentId, userId: null, hiredOn: null });
    expect(f.status, JSON.stringify(f.corpo)).toBe(201);
    expect((await sa("POST", `/hr/employees/${f.corpo.employeeId}/account`, { userId: c.corpo.userId })).status).toBe(204);
    ids[k] = { email, userId: c.corpo.userId, employeeId: f.corpo.employeeId };
  }
  expect((await sa("POST", `/hr/employees/${ids.a.employeeId}/positions/direct`, { positionId: cargo.corpo.positionId, effectiveFrom: null, effectiveTo: null })).status).toBe(201);

  // --- 48: a política, pela interface, como SuperAdmin ---
  const s = await novaPagina(browser, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");
  await s.goto("/politicas-aprovacao");
  await s.getByRole("button", { name: "Nova política" }).click();
  const dp = s.getByRole("dialog");
  await dp.getByLabel("Processo").selectOption("finance.salary_advance");
  await dp.getByLabel("Valor mínimo (opcional)").fill(VALOR);
  await dp.getByLabel("Valor máximo (opcional)").fill(String(Number(VALOR) + 1));
  await dp.getByLabel("Passo 1: cargo").selectOption({ label: `${marca} Aprova adiantamentos` });
  await dp.getByLabel("Prazo (h)").fill("24");
  await dp.getByLabel("Passo 1: escalar para o cargo (opcional)").selectOption({ label: `${marca} Escala adiantamentos` });
  await dp.getByRole("button", { name: "Criar política" }).click();
  await expect(dp).toHaveCount(0);
  const politicas = await sa<{ processType: string; minimumAmount: number; steps: { approverPositionId: string; slaHours: number; escalationPositionId: string | null }[] }[]>("GET", "/approval/policies");
  const politica = politicas.corpo.find((p) => p.processType === "finance.salary_advance" && Number(p.minimumAmount) === Number(VALOR));
  expect(politica?.steps[0]).toMatchObject({ approverPositionId: cargo.corpo.positionId, slaHours: 24, escalationPositionId: escala.corpo.positionId });

  // --- 47: A delega em B ---
  const a = await novaPagina(browser, ids.a.email, PASSWORD_LOCAL);
  await a.goto("/aprovacoes/delegacoes");
  await a.getByRole("button", { name: "Delegar" }).click();
  const dd = a.getByRole("dialog");
  await dd.getByLabel("Colega").selectOption({ label: pessoas.b.nome });
  const amanha = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await dd.getByLabel("Fim").fill(`${amanha}T18:00`);
  await dd.getByLabel("Motivo (opcional)").fill(`${marca} férias`);
  await dd.getByRole("button", { name: "Delegar" }).click();
  await expect(dd).toHaveCount(0);
  await expect(a.getByRole("row").filter({ hasText: pessoas.b.nome })).toContainText("Em vigor");

  // C pede um adiantamento (API): vai à política acima, à espera de A.
  const cApi = await sessaoApi(request, ids.c.email, PASSWORD_LOCAL);
  const mes = new Date();
  mes.setUTCMonth(mes.getUTCMonth() + 1);
  const pedidoAdiantamento = await cApi<{ applicationId: string }>("POST", "/portal/me/salary-advance-applications", { amount: VALOR, payrollYear: mes.getUTCFullYear(), payrollMonth: mes.getUTCMonth() + 1, reason: `${marca} propinas` });
  expect(pedidoAdiantamento.status, JSON.stringify(pedidoAdiantamento.corpo)).toBe(201);

  // --- 47 e 48: B decide em nome de A ---
  const b = await novaPagina(browser, ids.b.email, PASSWORD_LOCAL);
  await b.goto("/aprovacoes");
  const linha = b.getByRole("row").filter({ hasText: pessoas.c.nome });
  await expect(linha).toContainText(`Por delegação de ${pessoas.a.nome}`);
  await expect(linha).toContainText("Prazo:");
  await linha.getByRole("link", { name: "Adiantamento de salário" }).click();
  await expect(b.getByText(`Em nome de ${pessoas.a.nome}, que lhe delegou as aprovações.`)).toBeVisible();
  await b.getByRole("button", { name: "Aprovar" }).click();
  await b.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
  await expect(b.getByRole("dialog")).toHaveCount(0);
  await expect(b.getByText(`, em nome de ${pessoas.a.nome},`, { exact: false })).toBeVisible();

  // --- 49: C retira o adiantamento aprovado e por pagar ---
  const c = await novaPagina(browser, ids.c.email, PASSWORD_LOCAL);
  await c.goto("/eu/adiantamentos");
  const meu = c.getByRole("row").filter({ hasText: `${marca} propinas` });
  await expect(meu).toContainText("Aprovado, por pagar");
  await meu.getByRole("button", { name: /^Retirar o pedido/ }).click();
  await c.getByRole("dialog").getByRole("button", { name: "Retirar", exact: true }).click();
  await expect(c.getByRole("dialog")).toHaveCount(0);
  await expect(meu).toContainText("Retirado");
  const meus = await cApi<{ applicationId: string; status: string }[]>("GET", "/portal/me/salary-advance-applications");
  expect(meus.corpo.find((x) => x.applicationId === pedidoAdiantamento.corpo.applicationId)?.status).toBe("Withdrawn");

  // --- 52: uma despesa de C, aprovada por A e reembolsada por B; B anula o reembolso ---
  const hoje = new Date().toISOString().slice(0, 10);
  const despesa = await cApi<{ expenseId: string }>("POST", "/portal/me/expenses", { spentOn: hoje, description: `${marca} táxi`, category: "Transporte", amount: "1500", currency: "AOA", projectId: null, billable: false, receiptDocumentId: null });
  expect(despesa.status, JSON.stringify(despesa.corpo)).toBe(201);
  const aApi = await sessaoApi(request, ids.a.email, PASSWORD_LOCAL);
  const aprovada = await aApi("POST", `/finance/expenses/${despesa.corpo.expenseId}/approval`, { notes: null, expenseAccountCode: null });
  expect(aprovada.status, JSON.stringify(aprovada.corpo)).toBe(204);
  const bApi = await sessaoApi(request, ids.b.email, PASSWORD_LOCAL);
  const reembolso = await bApi("POST", `/finance/expenses/${despesa.corpo.expenseId}/reimbursement`, { on: hoje, fromAccountId: null, reference: null });
  expect(reembolso.status, JSON.stringify(reembolso.corpo)).toBe(204);
  await b.goto(`/despesas/${despesa.corpo.expenseId}`);
  await b.getByRole("button", { name: "Anular reembolso" }).click();
  const dr = b.getByRole("dialog");
  await dr.getByLabel("Motivo").fill(`${marca} o colaborador devolveu`);
  await dr.getByRole("button", { name: "Anular reembolso" }).click();
  await expect(dr).toHaveCount(0);
  await expect(b.getByText(`${marca} o colaborador devolveu`, { exact: false })).toBeVisible();
  await expect(b.getByRole("button", { name: "Marcar reembolsada" })).toBeVisible();
  const depois = await bApi<{ status: string; reimbursementCancellations: number }>("GET", `/finance/expenses/${despesa.corpo.expenseId}`);
  expect(depois.corpo).toMatchObject({ status: "Approved", reimbursementCancellations: 1 });

  // Fim: A revoga a delegação.
  await a.reload();
  await a.getByRole("button", { name: `Revogar a delegação de ${pessoas.a.nome} em ${pessoas.b.nome}` }).click();
  await a.getByRole("dialog").getByRole("button", { name: "Revogar" }).click();
  await expect(a.getByRole("dialog")).toHaveCount(0);
});
