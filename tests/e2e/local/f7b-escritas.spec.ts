/**
 * F7b (RH do dia-a-dia) contra a API LOCAL (D1, §8.3), pela interface com a
 * conta Admin local, numa ficha nova criada pela API (SuperAdmin): contrato
 * celebrado e cessado, ponto marcado (entrada e saída) e falta, direito a
 * férias, pedido em nome do colaborador e retirado, benefício criado, adesão e
 * cancelamento, dados pessoais (IBAN mascarado) e imigração (validade na lista
 * de validades), documento anexado e retirado.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const dia = (n: number) => new Date(Date.now() + 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const ano = Number(dia(0).slice(0, 4));
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

/** IBAN angolano válido (ISO 13616), único por corrida. */
function ibanDeTeste(): string {
  const bban = `0040${String(Date.now()).slice(-13).padStart(17, "0")}`;
  const resto = [...`${bban}102400`].reduce((r, c) => (r * 10 + Number(c)) % 97, 0);
  return `AO${String(98 - resto).padStart(2, "0")}${bban}`;
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

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();
}

const dialogo = (page: Page) => page.getByRole("dialog");

test("F7b: ficha completa — contrato, assiduidade, férias, benefícios, dados pessoais, imigração e documentos", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const sa = await sessaoApi(request, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");
  const nome = `${marca} Ficha`;
  const ficha = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: nome, departmentId: null, userId: null, hiredOn: null });
  expect(ficha.status).toBe(201);
  const eu = ficha.corpo.employeeId;

  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  await page.goto(`/colaboradores/${eu}`);
  await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();
  const vistas = page.getByRole("navigation", { name: "Ficha" });

  // Contrato a termo, depois cessado.
  await vistas.getByRole("link", { name: "Contratos" }).click();
  await page.getByRole("button", { name: "Celebrar contrato" }).click();
  await dialogo(page).getByLabel("Tipo").selectOption("FixedTerm");
  await dialogo(page).getByLabel("Início").fill(dia(-30));
  await dialogo(page).getByLabel(/^Fim/).fill(dia(335));
  await dialogo(page).getByLabel("Salário mensal").fill("450 000");
  await dialogo(page).getByRole("button", { name: "Celebrar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("450 000,00 Kz")).toBeVisible();
  await page.getByRole("button", { name: `Cessar o contrato iniciado a ${br(dia(-30))}` }).click();
  await dialogo(page).getByLabel("Último dia").fill(dia(0));
  await dialogo(page).getByRole("button", { name: "Cessar contrato" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Cessado")).toBeVisible();

  // Assiduidade: entrada e saída de hoje; falta de anteontem.
  await vistas.getByRole("link", { name: "Assiduidade" }).click();
  await page.getByRole("button", { name: "Marcar ponto" }).click();
  await dialogo(page).getByRole("button", { name: "Marcar" }).click();
  await expect(page.getByText(/^Entrada registada às/)).toBeVisible();
  await page.getByRole("button", { name: "Marcar ponto" }).click();
  await dialogo(page).getByRole("button", { name: "Marcar" }).click();
  await expect(page.getByText(/^Saída registada às/)).toBeVisible();
  await page.getByRole("button", { name: "Registar falta" }).click();
  await dialogo(page).getByLabel("Dia").fill(dia(-2));
  await dialogo(page).getByRole("button", { name: "Registar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: br(dia(-2)) }).getByText("Falta", { exact: true })).toBeVisible();

  // Férias: direito, pedido em nome (com política e ocupante só para esta corrida) e retirado.
  const politicas = await sa<{ policyId: string; processType: string; isActive: boolean }[]>("GET", "/approval/policies?page=1&pageSize=200");
  for (const x of politicas.corpo.filter((x) => x.processType === "hr.leave_request" && x.isActive)) await sa("POST", `/approval/policies/${x.policyId}/deactivation`);
  const cargo = await sa<{ positionId: string }>("POST", "/hr/positions", { name: `${marca} Aprova férias`, hierarchyLevel: 2, grantsApprovalAuthority: true });
  const aprovador = await sa<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Aprovador`, departmentId: null, userId: null, hiredOn: null });
  expect((await sa("POST", `/hr/employees/${aprovador.corpo.employeeId}/positions/direct`, { positionId: cargo.corpo.positionId, effectiveFrom: null, effectiveTo: null })).status).toBe(201);
  const politica = await sa<{ policyId: string }>("POST", "/approval/policies", {
    processType: "hr.leave_request",
    departmentId: null,
    minimumAmount: null,
    maximumAmount: null,
    requiresBudgetCheck: false,
    steps: [{ approverPositionId: cargo.corpo.positionId, mode: "AnyApprover", slaHours: null }],
  });
  expect(politica.status, JSON.stringify(politica.corpo)).toBe(201);
  await vistas.getByRole("link", { name: "Férias" }).click();
  await page.getByRole("button", { name: "Definir direito" }).click();
  await dialogo(page).getByLabel("Dias de direito").fill("22");
  await dialogo(page).getByLabel("Transitados (opcional)").fill("2,5");
  await dialogo(page).getByRole("button", { name: "Gravar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "24,5" })).toBeVisible();
  await page.getByRole("button", { name: "Pedir ausência" }).click();
  await dialogo(page).getByLabel("Primeiro dia").fill(dia(90));
  await dialogo(page).getByLabel("Último dia").fill(dia(91));
  await dialogo(page).getByRole("button", { name: "Enviar pedido" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.getByRole("button", { name: `Ver a decisão do pedido de ${br(dia(90))}` }).click();
  await expect(page.getByText("O processo ainda não foi decidido.")).toBeVisible();
  await page.getByRole("button", { name: `Retirar o pedido de ${br(dia(90))}` }).click();
  await dialogo(page).getByRole("button", { name: "Retirar pedido" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Retirado")).toBeVisible();
  await sa("POST", `/approval/policies/${politica.corpo.policyId}/deactivation`);

  // Benefício novo no catálogo; adesão na ficha e cancelamento.
  const beneficio = `${marca} Seguro`;
  await page.goto("/beneficios?vista=catalogo");
  await page.getByRole("button", { name: "Novo benefício" }).click();
  await dialogo(page).getByLabel("Nome").fill(beneficio);
  await dialogo(page).getByLabel("Tipo").fill("saude");
  await dialogo(page).getByLabel("Valor mensal").fill("15 000");
  await dialogo(page).getByRole("button", { name: "Criar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await page.goto(`/colaboradores/${eu}?vista=beneficios`);
  await page.getByRole("button", { name: "Aderir a um benefício" }).click();
  await dialogo(page).getByLabel("Benefício", { exact: true }).selectOption({ label: beneficio });
  await dialogo(page).getByLabel("Início").fill(dia(0));
  await dialogo(page).getByRole("button", { name: "Aderir" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("15 000,00 Kz")).toBeVisible();
  await page.getByRole("button", { name: `Cancelar a adesão a ${beneficio}` }).click();
  await dialogo(page).getByLabel("Data de fim").fill(dia(30));
  await dialogo(page).getByRole("button", { name: "Cancelar adesão" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText(`Cancelada a ${br(dia(30))}`)).toBeVisible();

  // Dados pessoais e imigração.
  const iban = ibanDeTeste();
  await page.goto(`/colaboradores/${eu}?vista=dados-pessoais`);
  await page.getByRole("button", { name: "Ver dados pessoais" }).click();
  await expect(page.getByText("Ainda sem dados pessoais registados.")).toBeVisible();
  await page.getByRole("button", { name: "Corrigir" }).first().click();
  await dialogo(page).getByLabel("IBAN").fill(iban);
  await dialogo(page).getByLabel("País").fill("ao");
  await dialogo(page).getByLabel("Cidade").fill("Luanda");
  await dialogo(page).getByRole("button", { name: "Gravar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText(`•••• ${iban.slice(-4)}`)).toBeVisible();
  await expect(page.getByText(iban)).toHaveCount(0);
  await page.getByRole("button", { name: "Corrigir" }).nth(1).click();
  await dialogo(page).getByLabel("N.º do passaporte").fill(`P${sufixo}`);
  await dialogo(page).getByLabel("Validade do passaporte").fill(dia(20));
  await dialogo(page).getByRole("button", { name: "Gravar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText(/O próximo documento caduca a/)).toBeVisible();
  await page.goto("/imigracao?vista=30");
  await expect(page.getByRole("link", { name: nome })).toBeVisible();

  // Documento anexado e retirado.
  await page.goto(`/colaboradores/${eu}?vista=documentos`);
  await page.getByRole("button", { name: "Anexar documento" }).click();
  await dialogo(page).getByLabel("Categoria").fill("Contrato");
  await dialogo(page).getByLabel("Ficheiro").setInputFiles({ name: `contrato-${sufixo}.pdf`, mimeType: "application/pdf", buffer: PDF });
  await expect(dialogo(page).getByText(`contrato-${sufixo}.pdf`)).toBeVisible();
  await dialogo(page).getByRole("button", { name: "Anexar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText(`contrato-${sufixo}.pdf`)).toBeVisible();
  await page.getByRole("button", { name: "Retirar" }).click();
  await dialogo(page).getByLabel("Motivo (opcional)").fill(marca);
  await dialogo(page).getByRole("button", { name: "Retirar" }).click();
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByText("Sem documentos anexados.")).toBeVisible();

  // --- Conferir no servidor ---
  const contratos = await sa<{ status: string; endsOn: string }[]>("GET", `/hr/contracts?employeeId=${eu}`);
  expect(contratos.corpo.map((c) => [c.status, c.endsOn])).toEqual([["Terminated", dia(0)]]);
  const saldos = await sa<{ type: string; entitled: number; carriedOver: number }[]>("GET", `/hr/leave/balances?year=${ano}&employeeId=${eu}`);
  expect(saldos.corpo.find((s) => s.type === "Annual")).toMatchObject({ entitled: 22, carriedOver: 2.5 });
  const pessoais = await sa<{ iban: string; country: string; city: string }>("GET", `/hr/employees/${eu}/personal-data`);
  expect(pessoais.corpo).toMatchObject({ iban, country: "AO", city: "Luanda" });
});
