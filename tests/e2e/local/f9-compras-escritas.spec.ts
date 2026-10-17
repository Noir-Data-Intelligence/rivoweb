/**
 * F9 (compras) contra a API LOCAL (D1, §8.3). Preparação pela API
 * (SuperAdmin): conta Manager ligada a uma ficha (requisita e encomenda), a
 * conta Admin ligada a uma ficha com um cargo que aprova, política só desta
 * corrida para `procurement.purchase_requisition` (as activas saem) e um
 * fornecedor. Pela interface: o Manager abre a requisição e submete; o Admin
 * aprova; o Manager vê a decisão e emite a ordem (acima do aprovado é
 * recusado no front); o Admin regista uma recepção parcial, anula-a, regista
 * de novo, e a ordem com mercadoria não se cancela. Confere no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;

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

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();
}

async function sair(page: Page) {
  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
}

const dialogo = (page: Page) => page.getByRole("dialog");

test("F9: requisição aprovada, ordem emitida, recepção registada e anulada", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const adminEmail = process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
  const adminPass = process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "";
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const email = `compras-${sufixo.toLowerCase()}@teste.local`;
  const conta = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Manager" });
  expect(conta.status, JSON.stringify(conta.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${conta.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${conta.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const ficha = async (nome: string) => {
    const r = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: nome, departmentId: null, userId: null, hiredOn: null });
    expect(r.status, nome).toBe(201);
    return r.corpo.employeeId;
  };
  const pede = await ficha(`${marca} Quem pede`);
  expect((await sa("POST", `/hr/employees/${pede}/account`, { userId: conta.corpo.userId })).status).toBe(204);
  const users = await sa<{ userId: string; email: string }[]>("GET", "/identity/users");
  const idAdmin = users.corpo.find((u) => u.email === adminEmail)?.userId ?? "";
  const fichas = await sa<{ employeeId: string; userId: string | null }[]>("GET", "/hr/employees?page=1&pageSize=200");
  for (const f of fichas.corpo.filter((x) => x.userId === idAdmin)) await sa("DELETE", `/hr/employees/${f.employeeId}/account`);
  const aprova = await ficha(`${marca} Quem aprova`);
  expect((await sa("POST", `/hr/employees/${aprova}/account`, { userId: idAdmin })).status).toBe(204);
  const cargo = await sa<{ positionId: string }>("POST", "/hr/positions", { name: `${marca} Aprova compras`, hierarchyLevel: 2, grantsApprovalAuthority: true });
  expect((await sa("POST", `/hr/employees/${aprova}/positions/direct`, { positionId: cargo.corpo.positionId, effectiveFrom: null, effectiveTo: null })).status).toBe(201);
  const politicas = await sa<{ policyId: string; processType: string; isActive: boolean }[]>("GET", "/approval/policies?page=1&pageSize=200");
  for (const x of politicas.corpo.filter((x) => x.processType === "procurement.purchase_requisition" && x.isActive)) await sa("POST", `/approval/policies/${x.policyId}/deactivation`);
  const politica = await sa<{ policyId: string }>("POST", "/approval/policies", {
    processType: "procurement.purchase_requisition",
    departmentId: null,
    minimumAmount: null,
    maximumAmount: null,
    requiresBudgetCheck: false,
    steps: [{ approverPositionId: cargo.corpo.positionId, mode: "AnyApprover", slaHours: null }],
  });
  expect(politica.status, JSON.stringify(politica.corpo)).toBe(201);
  const fornecedor = `${marca} Papelaria`;
  const nif = `5${String(Date.now()).slice(-9)}`;
  expect((await sa("POST", "/procurement/suppliers", { name: fornecedor, taxId: nif, iban: null, email: null, phone: null })).status).toBe(201);

  try {
    // --- Manager: requisição ---
    const justificacao = `${marca} Material de escritório`;
    await entrar(page, email, PASSWORD_LOCAL);
    await page.goto("/requisicoes");
    await page.getByRole("button", { name: "Nova requisição" }).click();
    await dialogo(page).getByLabel("Justificação").fill(justificacao);
    await dialogo(page).getByLabel("Descrição da linha 1").fill("Papel A4");
    await dialogo(page).getByLabel("Quantidade da linha 1").fill("10");
    await dialogo(page).getByLabel("Preço estimado da linha 1").fill("2 500");
    await dialogo(page).getByRole("button", { name: "Juntar linha" }).click();
    await dialogo(page).getByLabel("Descrição da linha 2").fill("Toner");
    await dialogo(page).getByLabel("Quantidade da linha 2").fill("2");
    await dialogo(page).getByLabel("Preço estimado da linha 2").fill("50 000");
    await dialogo(page).getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(page.getByRole("heading", { name: justificacao, level: 1 })).toBeVisible();
    const requisitionId = page.url().split("/").pop() ?? "";
    await page.getByRole("button", { name: "Submeter para aprovação" }).click();
    await dialogo(page).getByRole("button", { name: "Submeter" }).click();
    await expect(page.getByText("À espera de decisão em Aprovações.")).toBeVisible();
    // B29: o Manager (sem RH) vê o próprio nome como requisitante.
    await expect(page.getByText(`${marca} Quem pede`, { exact: false })).toBeVisible();
    await sair(page);

    // --- Admin: aprova ---
    const r1 = await sa<{ approvalRequestId: string; estimatedTotal: number }>("GET", `/procurement/requisitions/${requisitionId}`);
    expect(Number(r1.corpo.estimatedTotal)).toBe(125000);
    await entrar(page, adminEmail, adminPass);
    await page.goto(`/aprovacoes/${r1.corpo.approvalRequestId}`);
    await page.getByRole("button", { name: "Aprovar" }).click();
    await dialogo(page).getByRole("button", { name: "Aprovar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await sair(page);

    // --- Manager: ver decisão e emitir a ordem ---
    await entrar(page, email, PASSWORD_LOCAL);
    await page.goto(`/requisicoes/${requisitionId}`);
    await page.getByRole("button", { name: "Ver decisão" }).click();
    await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Emitir ordem de compra" }).click();
    await dialogo(page).getByLabel("Fornecedor").selectOption({ label: `${fornecedor} · ${nif}` });
    // As linhas vêm pela ordem em que foram escritas (B30).
    await expect(dialogo(page).getByLabel("Descrição da linha 1")).toHaveValue("Papel A4");
    await dialogo(page).getByLabel("Preço acordado da linha 1").fill("3 000");
    await dialogo(page).getByRole("button", { name: "Emitir ordem" }).click();
    await expect(dialogo(page).getByText(/^Passa o valor aprovado/)).toBeVisible();
    await dialogo(page).getByLabel("Preço acordado da linha 1").fill("2 000");
    await dialogo(page).getByRole("button", { name: "Emitir ordem" }).click();
    await expect(page.getByRole("heading", { name: `Ordem a ${fornecedor}`, level: 1 })).toBeVisible();
    const ordemId = page.url().split("/").pop() ?? "";
    await sair(page);

    // --- Admin: recepções ---
    await entrar(page, adminEmail, adminPass);
    await page.goto(`/encomendas/${ordemId}`);
    await page.getByRole("button", { name: "Registar recepção" }).click();
    await dialogo(page).getByLabel("Papel A4 (faltam 10)").fill("4");
    await dialogo(page).getByLabel("Toner (faltam 2)").fill("");
    await dialogo(page).getByLabel("Guia de remessa (opcional)").fill(`GR-${sufixo}`);
    await dialogo(page).getByRole("button", { name: "Registar recepção" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("table", { name: "Recepções da ordem" })).toContainText("4 × Papel A4");
    // B29: quem recebeu, pelo nome.
    await expect(page.getByRole("table", { name: "Recepções da ordem" })).toContainText(`${marca} Quem aprova`);
    await page.getByRole("button", { name: "Anular" }).click();
    await dialogo(page).getByLabel("Motivo").fill("Contagem errada.");
    await dialogo(page).getByRole("button", { name: "Anular recepção" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("table", { name: "Recepções da ordem" }).getByText("Anulada")).toBeVisible();
    await page.getByRole("button", { name: "Registar recepção" }).click();
    await expect(dialogo(page).getByLabel("Papel A4 (faltam 10)")).toHaveValue("10");
    await dialogo(page).getByRole("button", { name: "Registar recepção" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByText("Recebida", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registar recepção" })).toHaveCount(0);

    // --- Conferir no servidor ---
    const o = await sa<{ status: string; total: number; fullyReceived: boolean; requisitionId: string; lines: { description: string; quantityReceived: number; unitPrice: number }[] }>("GET", `/procurement/orders/${ordemId}`);
    expect(o.corpo).toMatchObject({ status: "Issued", fullyReceived: true, requisitionId });
    expect(Number(o.corpo.total)).toBe(120000);
    expect(o.corpo.lines.map((l) => [l.description, Number(l.quantityReceived), Number(l.unitPrice)])).toEqual([
      ["Papel A4", 10, 2000],
      ["Toner", 2, 50000],
    ]);
    const rs = await sa<{ status: string; deliveryNote: string | null }[]>("GET", `/procurement/receipts?purchaseOrderId=${ordemId}&page=1&pageSize=25`);
    expect(rs.corpo.map((r) => r.status).sort()).toEqual(["Cancelled", "Registered"]);
    // Com mercadoria recebida, a ordem não se cancela (o servidor recusa e o front mostra).
    await page.getByRole("button", { name: "Cancelar ordem" }).click();
    await dialogo(page).getByLabel("Motivo").fill("Teste de recusa.");
    await dialogo(page).getByRole("button", { name: "Cancelar ordem" }).click();
    await expect(dialogo(page).getByText("já tem mercadoria recebida", { exact: false })).toBeVisible();
  } finally {
    await sa("POST", `/approval/policies/${politica.corpo.policyId}/deactivation`);
  }
});
