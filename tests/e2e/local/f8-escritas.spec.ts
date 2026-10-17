/**
 * F8 (salários) contra a API LOCAL (D1, §8.3). Preparação pela API
 * (SuperAdmin): conta HR ligada a uma ficha (quem abre a folha), a conta Admin
 * ligada a uma ficha com um cargo que aprova, uma política só desta corrida
 * para `payroll.payroll_run` (as activas de corridas anteriores saem) e duas
 * fichas para a folha. Pela interface: o HR abre a folha de um mês futuro,
 * junta os dois (subsídios acima do bruto recusados), submete; o Admin aprova
 * em Aprovações; o HR vê a decisão e anexa o recibo de um colaborador.
 * Confere os valores calculados pelo servidor. A política sai no fim.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
/** Um mês futuro, sem folha de corridas anteriores (a base local acumula). */
const ano = 2040 + (Date.now() % 50);
const mes = 1 + (Date.now() % 12);
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

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

test("F8: folha aberta, preenchida, submetida, aprovada e com recibo anexado", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const adminEmail = process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
  const adminPass = process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "";
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const email = `folha-${sufixo.toLowerCase()}@teste.local`;
  const conta = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "HR" });
  expect(conta.status, JSON.stringify(conta.corpo)).toBe(201);
  expect((await sa("POST", `/identity/users/${conta.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${conta.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const ficha = async (nome: string) => {
    const r = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: nome, departmentId: null, userId: null, hiredOn: null });
    expect(r.status, nome).toBe(201);
    return r.corpo.employeeId;
  };
  const abre = await ficha(`${marca} Quem abre`);
  expect((await sa("POST", `/hr/employees/${abre}/account`, { userId: conta.corpo.userId })).status).toBe(204);
  // A conta Admin pode estar ligada a uma ficha de uma corrida anterior: desliga-se e liga-se a uma nova, com o cargo que aprova.
  const users = await sa<{ userId: string; email: string }[]>("GET", "/identity/users");
  const idAdmin = users.corpo.find((u) => u.email === adminEmail)?.userId ?? "";
  const fichas = await sa<{ employeeId: string; userId: string | null }[]>("GET", "/hr/employees?page=1&pageSize=200");
  for (const f of fichas.corpo.filter((x) => x.userId === idAdmin)) await sa("DELETE", `/hr/employees/${f.employeeId}/account`);
  const aprova = await ficha(`${marca} Quem aprova`);
  expect((await sa("POST", `/hr/employees/${aprova}/account`, { userId: idAdmin })).status).toBe(204);
  const cargo = await sa<{ positionId: string }>("POST", "/hr/positions", { name: `${marca} Aprova folhas`, hierarchyLevel: 2, grantsApprovalAuthority: true });
  expect((await sa("POST", `/hr/employees/${aprova}/positions/direct`, { positionId: cargo.corpo.positionId, effectiveFrom: null, effectiveTo: null })).status).toBe(201);
  const politicas = await sa<{ policyId: string; processType: string; isActive: boolean }[]>("GET", "/approval/policies?page=1&pageSize=200");
  for (const x of politicas.corpo.filter((x) => x.processType === "payroll.payroll_run" && x.isActive)) await sa("POST", `/approval/policies/${x.policyId}/deactivation`);
  const politica = await sa<{ policyId: string }>("POST", "/approval/policies", {
    processType: "payroll.payroll_run",
    departmentId: null,
    minimumAmount: null,
    maximumAmount: null,
    requiresBudgetCheck: false,
    steps: [{ approverPositionId: cargo.corpo.positionId, mode: "AnyApprover", slaHours: null }],
  });
  expect(politica.status, JSON.stringify(politica.corpo)).toBe(201);
  const joana = await ficha(`${marca} Joana`);
  const rui = await ficha(`${marca} Rui`);

  try {
    // --- HR: abrir, juntar, submeter ---
    await entrar(page, email, PASSWORD_LOCAL);
    await page.goto("/salarios");
    await page.getByRole("button", { name: "Abrir folha" }).click();
    await dialogo(page).getByLabel("Mês").selectOption(String(mes));
    await dialogo(page).getByLabel("Ano").fill(String(ano));
    await dialogo(page).getByRole("button", { name: "Abrir folha" }).click();
    await expect(page.getByRole("heading", { name: `Folha de ${MESES[mes - 1]} ${ano}`, level: 1 })).toBeVisible();
    const runId = page.url().split("/").pop() ?? "";

    await page.getByRole("button", { name: "Juntar colaborador" }).click();
    await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Joana` });
    await dialogo(page).getByLabel("Salário bruto (Kz)").fill("100 000");
    await dialogo(page).getByLabel("Subsídio de alimentação (opcional)").fill("120 000");
    await dialogo(page).getByRole("button", { name: "Juntar" }).click();
    await expect(dialogo(page).getByText("Os subsídios fazem parte do bruto: não podem somar mais do que ele.")).toBeVisible();
    await dialogo(page).getByLabel("Salário bruto (Kz)").fill("450 000");
    await dialogo(page).getByLabel("Subsídio de alimentação (opcional)").fill("30 000");
    await dialogo(page).getByLabel("Subsídio de transporte (opcional)").fill("20 000");
    await dialogo(page).getByRole("button", { name: "Juntar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Juntar colaborador" }).click();
    await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Rui` });
    await dialogo(page).getByLabel("Salário bruto (Kz)").fill("150 000,50");
    await dialogo(page).getByRole("button", { name: "Juntar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: `${marca} Rui` })).toContainText("150 000,50");

    const antes = await sa<{ items: { employeeId: string; grossSalary: number; foodAllowance: number; netSalary: number | null; withholdingTax: number | null; socialSecurityContribution: number | null }[] }>("GET", `/payroll/runs/${runId}`);
    const itemJoana = antes.corpo.items.find((i) => i.employeeId === joana);
    expect(itemJoana).toMatchObject({ grossSalary: 450000, foodAllowance: 30000 });
    expect(itemJoana?.netSalary).not.toBeNull();
    // Líquido = bruto − IRT − INSS (o servidor calcula; o front só mostra).
    expect(Number(itemJoana?.netSalary)).toBeCloseTo(450000 - Number(itemJoana?.withholdingTax) - Number(itemJoana?.socialSecurityContribution), 2);
    expect(antes.corpo.items.some((i) => i.employeeId === rui)).toBe(true);

    await page.getByRole("button", { name: "Submeter para aprovação" }).click();
    await dialogo(page).getByRole("button", { name: "Submeter" }).click();
    await expect(page.getByText("À espera de decisão em Aprovações.")).toBeVisible();
    await page.getByRole("button", { name: "Ver decisão" }).click();
    await expect(page.getByText("Ainda à espera de decisão em Aprovações.")).toBeVisible();
    await sair(page);

    // --- Admin: aprova em Aprovações ---
    const pedido = await sa<{ approvalRequestId: string }>("GET", `/payroll/runs/${runId}`);
    await entrar(page, adminEmail, adminPass);
    await page.goto(`/aprovacoes/${pedido.corpo.approvalRequestId}`);
    await page.getByRole("button", { name: "Aprovar" }).click();
    await dialogo(page).getByRole("button", { name: "Aprovar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await sair(page);

    // --- HR: ver decisão e anexar o recibo da Joana ---
    await entrar(page, email, PASSWORD_LOCAL);
    await page.goto(`/salarios/${runId}`);
    await page.getByRole("button", { name: "Ver decisão" }).click();
    await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Recibos de ${marca} Joana` }).click();
    await expect(dialogo(page).getByText("Sem recibo anexado.")).toBeVisible();
    await dialogo(page).getByLabel("Ficheiro do recibo").setInputFiles({ name: `recibo-${sufixo}.pdf`, mimeType: "application/pdf", buffer: PDF });
    await expect(dialogo(page).getByText(`recibo-${sufixo}.pdf`)).toBeVisible();
    await dialogo(page).getByRole("button", { name: "Anexar" }).click();
    await expect(dialogo(page).getByRole("list", { name: "Recibos anexados" })).toContainText(`recibo-${sufixo}.pdf`);

    const depois = await sa<{ status: string; closedAt: string | null; items: { itemId: string; employeeId: string }[] }>("GET", `/payroll/runs/${runId}`);
    expect(depois.corpo.status).toBe("Approved");
    expect(depois.corpo.closedAt).toBeTruthy();
    const idItem = depois.corpo.items.find((i) => i.employeeId === joana)?.itemId ?? "";
    const docs = await sa<{ fileName: string; category: string }[]>("GET", `/payroll/runs/${runId}/items/${idItem}/documents`);
    expect(docs.corpo.map((d) => [d.fileName, d.category])).toEqual([[`recibo-${sufixo}.pdf`, "Recibo de vencimento"]]);
  } finally {
    await sa("POST", `/approval/policies/${politica.corpo.policyId}/deactivation`);
  }
});
