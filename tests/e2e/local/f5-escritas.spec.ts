/**
 * F5 contra a API LOCAL (D1, §8.3): o ciclo do pagamento com três pessoas —
 * quem pede (Manager), quem aprova (Admin) e quem paga (Finance). Prova a
 * segregação (BR-3: quem pede não paga, quem aprova não paga), a execução só
 * depois de aprovado e o saldo da conta.
 *
 * Preparação pela API com o SuperAdmin (contas convidadas localmente, fichas
 * ligadas, cargo com autoridade, política). Os passos da F5 são pela interface.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as duas contas locais.");

const sufixo = Date.now().toString(36);
const marca = `[TESTE] ${sufixo}`;
// Password só destas contas locais de teste (nunca em produção).
const PASSWORD_LOCAL = `Local-${sufixo}-Rivo#2026`;
// Valor único por corrida: a política só cobre este valor e não colide com outras corridas.
const VALOR = String(10_000 + (Date.now() % 89_999));
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
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

test("F5: pedir, aprovar e pagar com três pessoas; quem pede e quem aprova não pagam", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const adminEmail = process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
  const adminPass = process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "";
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  // --- Preparação (API, SuperAdmin) ---
  const dep = await sa<{ departmentId: string }>("POST", "/hr/departments", { name: `${marca} Pagamentos`, managerId: null });
  expect(dep.status).toBe(201);
  const cargo = await sa<{ positionId: string }>("POST", "/hr/positions", { name: `${marca} Aprova pagamentos`, hierarchyLevel: 2, grantsApprovalAuthority: true });
  expect(cargo.status).toBe(201);

  const contas: Record<"pede" | "paga", { email: string; userId: string }> = {
    pede: { email: `pede-${sufixo}@teste.local`, userId: "" },
    paga: { email: `paga-${sufixo}@teste.local`, userId: "" },
  };
  for (const [papel, perfil] of [["pede", "Manager"], ["paga", "Finance"]] as const) {
    const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email: contas[papel].email, profile: perfil });
    expect(c.status, `convite ${perfil}`).toBe(201);
    contas[papel].userId = c.corpo.userId;
    expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
    await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  }

  // A conta admin pode estar ligada a uma ficha de uma corrida anterior: desliga-se.
  const users = await sa<{ userId: string; email: string }[]>("GET", "/identity/users");
  const idAdmin = users.corpo.find((u) => u.email === adminEmail)?.userId ?? "";
  const fichas = await sa<{ employeeId: string; userId: string | null }[]>("GET", "/hr/employees?page=1&pageSize=200");
  for (const f of fichas.corpo.filter((x) => x.userId === idAdmin)) await sa("DELETE", `/hr/employees/${f.employeeId}/account`);

  const admitir = async (nome: string, userId: string) => {
    const r = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: nome, departmentId: dep.corpo.departmentId, userId: null, hiredOn: null });
    expect(r.status, `${nome}: ${JSON.stringify(r.corpo)}`).toBe(201);
    const l = await sa("POST", `/hr/employees/${r.corpo.employeeId}/account`, { userId });
    expect(l.status, `ligar ${nome}: ${JSON.stringify(l.corpo)}`).toBe(204);
    return r.corpo.employeeId;
  };
  await admitir(`${marca} Quem pede`, contas.pede.userId);
  const aprovadora = await admitir(`${marca} Quem aprova`, idAdmin);
  await admitir(`${marca} Quem paga`, contas.paga.userId);
  expect((await sa("POST", `/hr/employees/${aprovadora}/positions/direct`, { positionId: cargo.corpo.positionId, effectiveFrom: null, effectiveTo: null })).status).toBe(201);
  const politica = await sa<{ policyId: string }>("POST", "/approval/policies", {
    processType: "finance.payment_request",
    departmentId: null,
    minimumAmount: VALOR,
    maximumAmount: String(Number(VALOR) + 1),
    requiresBudgetCheck: false,
    steps: [{ approverPositionId: cargo.corpo.positionId, mode: "AnyApprover", slaHours: null }],
  });
  expect(politica.status, JSON.stringify(politica.corpo)).toBe(201);

  // --- F5 pela interface ---
  // SuperAdmin: fornecedor, factura de compra, conta com saldo.
  const fornecedor = `${marca} Fornecedor`;
  const nif = `5${String(Date.now()).slice(-9)}`;
  const numero = `FT ${sufixo}/1`;
  const conta = `${marca} Conta`;
  await entrar(page, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.goto("/fornecedores");
  await page.getByRole("button", { name: "Novo fornecedor" }).click();
  await page.getByLabel("Nome").fill(fornecedor);
  await page.getByLabel("NIF").fill(nif);
  await page.getByLabel("IBAN").fill("AO30 0040 0000 1234 5678 9012 3");
  await page.getByRole("button", { name: "Registar fornecedor" }).click();
  await expect(page.getByRole("heading", { name: fornecedor, level: 1 })).toBeVisible();

  await page.goto("/facturas-compra");
  await page.getByRole("button", { name: "Registar factura" }).click();
  await page.getByLabel("Fornecedor", { exact: true }).selectOption({ label: `${fornecedor} · ${nif}` });
  await page.getByLabel("Número da factura").fill(numero);
  await page.getByLabel("Valor sem IVA").fill(VALOR);
  await page.getByLabel("IVA", { exact: true }).fill("0");
  await page.getByRole("dialog").getByRole("button", { name: "Registar factura" }).click();
  await expect(page.getByRole("heading", { name: numero, level: 1 })).toBeVisible();
  const urlFactura = page.url();

  const contaApi = await sa<{ accountId: string }>("POST", "/finance/accounts", { name: conta, bank: "Banco de teste", iban: null, currency: "AOA" });
  expect(contaApi.status).toBe(201);
  expect((await sa("POST", `/finance/accounts/${contaApi.corpo.accountId}/deposits`, { amount: "1000000.00", reference: marca })).status).toBe(204);
  await sair(page);

  // Manager: pede o pagamento e anexa a factura.
  await entrar(page, contas.pede.email, PASSWORD_LOCAL);
  await page.goto(urlFactura);
  await page.getByRole("button", { name: "Pedir pagamento" }).click();
  await page.getByLabel("Notas").fill(`${marca} pagamento de teste`);
  await page.getByRole("dialog").getByRole("button", { name: "Submeter pedido" }).click();
  await expect(page.getByRole("heading", { name: `Pagamento de ${numero}`, level: 1 })).toBeVisible();
  const urlPedido = page.url();
  await expect(page.getByText("Por pagar").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Executar pagamento" })).toHaveCount(0);
  await page.getByRole("button", { name: "Anexar" }).click();
  await page.getByLabel("Ficheiro").setInputFiles({ name: "factura.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByRole("dialog").getByText("factura.pdf")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Anexar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("factura.pdf")).toBeVisible();
  await sair(page);

  // Admin: aprova; depois não lhe é oferecido pagar e o servidor recusa (403).
  await entrar(page, adminEmail, adminPass);
  await page.goto("/aprovacoes");
  await page.getByRole("row").filter({ hasText: "Pedido de pagamento" }).filter({ hasText: `${marca} Quem pede` }).getByRole("link").first().click();
  await page.getByRole("button", { name: "Aprovar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Aprovado", { exact: true }).first()).toBeVisible();
  await page.goto(urlPedido);
  await expect(page.getByText("Foi você que aprovou este pagamento.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Executar pagamento" })).toHaveCount(0);
  const admin = await sessaoApi(request, adminEmail, adminPass);
  const idPedido = urlPedido.split("/").pop() ?? "";
  const recusa = await admin<{ detail?: string }>("POST", `/finance/payment-requests/${idPedido}/execution`, { bankAccountId: contaApi.corpo.accountId, executedByEmployeeId: null, method: "TB", reference: null });
  expect(recusa.status).toBe(403);
  await sair(page);

  // Quem pediu também não paga, mesmo com a permissão (o Manager não a tem: 403 por permissão).
  const pede = await sessaoApi(request, contas.pede.email, PASSWORD_LOCAL);
  expect((await pede("POST", `/finance/payment-requests/${idPedido}/execution`, { bankAccountId: contaApi.corpo.accountId, executedByEmployeeId: null, method: "TB", reference: null })).status).toBe(403);

  // Finance: executa; o saldo da conta desce o valor pago.
  await entrar(page, contas.paga.email, PASSWORD_LOCAL);
  await page.goto(urlPedido);
  await page.getByRole("button", { name: "Executar pagamento" }).click();
  await page.getByLabel("Conta de onde sai").selectOption(contaApi.corpo.accountId);
  await page.getByLabel("Referência").fill(`TRF-${sufixo}`);
  await page.getByRole("dialog").getByRole("button", { name: "Executar pagamento" }).click();
  await expect(page.getByText("Pagamento executado.")).toBeVisible();
  await expect(page.getByText("Pago", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`TRF-${sufixo}`)).toBeVisible();
  const saldo = await sa<{ accountId: string; balance: number }[]>("GET", "/finance/accounts?page=1&pageSize=200");
  expect(String(saldo.corpo.find((c) => c.accountId === contaApi.corpo.accountId)?.balance)).toBe(String(1_000_000 - Number(VALOR)));

  // Arrumar: a política só servia esta corrida.
  await sa("POST", `/approval/policies/${politica.corpo.policyId}/deactivation`);
});

test("F5: despesa submetida no portal com comprovativo, aprovada e reembolsada", async ({ page, request }) => {
  test.setTimeout(180_000);
  await soLocal(page);
  const adminEmail = process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
  const adminPass = process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "";
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");
  const email = `colab-${sufixo}@teste.local`;
  const c = await sa<{ userId: string }>("POST", "/identity/invitations", { email, profile: "Colaborador" });
  expect(c.status).toBe(201);
  expect((await sa("POST", `/identity/users/${c.corpo.userId}/password-reset`, { newPassword: PASSWORD_LOCAL })).status).toBe(204);
  await sa("POST", `/identity/users/${c.corpo.userId}/status`, { active: true, reason: `${marca} activar para o teste` });
  const ficha = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Colaborador`, departmentId: null, userId: null, hiredOn: null });
  expect(ficha.status).toBe(201);
  expect((await sa("POST", `/hr/employees/${ficha.corpo.employeeId}/account`, { userId: c.corpo.userId })).status).toBe(204);

  // Colaborador: submete no portal, com comprovativo.
  const descricao = `${marca} Táxi para o cliente`;
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/eu$/);
  await page.getByRole("navigation", { name: "Principal" }).first().getByRole("link", { name: "Despesas" }).click();
  await page.getByRole("button", { name: "Nova despesa" }).click();
  await page.getByLabel("Categoria").fill("Transporte");
  await page.getByLabel("Descrição").fill(descricao);
  await page.getByLabel("Valor").fill("7500");
  await page.getByLabel("Comprovativo (opcional)").setInputFiles({ name: "recibo.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByRole("dialog").getByText("recibo.pdf")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Submeter" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: descricao }).getByText("Por decidir")).toBeVisible();
  await sair(page);

  // Admin: aprova e reembolsa; o comprovativo descarrega (o Admin lê o arquivo).
  await entrar(page, adminEmail, adminPass);
  await page.goto("/despesas?estado=Submitted");
  await page.getByRole("link", { name: descricao }).click();
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarregar" }).click();
  expect((await descarga).suggestedFilename()).toContain("comprovativo");
  await page.getByRole("button", { name: "Aprovar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Marcar reembolsada" }).click();
  await page.getByLabel("Referência (opcional)").fill(`TRF-${sufixo}`);
  await page.getByRole("dialog").getByRole("button", { name: "Marcar reembolsada" }).click();
  await expect(page.getByText("Reembolsada", { exact: true })).toBeVisible();
  await sair(page);

  // O colaborador vê o reembolso no portal.
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD_LOCAL);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/eu$/);
  await page.getByRole("navigation", { name: "Principal" }).first().getByRole("link", { name: "Despesas" }).click();
  await expect(page.getByRole("row").filter({ hasText: descricao }).getByText("Reembolsada")).toBeVisible();
});
