/**
 * K4 contra a API LOCAL: política com um passo de validação (checklist) antes
 * do passo de aprovação. Quem valida responde item a item; o servidor recusa
 * «não aplicável» num item obrigatório (400) e só com tudo conforme o pedido
 * passa ao passo 2. No fim, o portal da mesma conta: benefícios, contrato e
 * dados pessoais de uma ficha acabada de admitir (vazios).
 *
 * Preparação pelo front, com o SuperAdmin: departamento, dois cargos com
 * autoridade (validação e aprovação), três fichas (a conta admin local ligada
 * a quem valida), os cargos atribuídos directamente e uma política só desse
 * departamento.
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as duas contas locais.");

const marca = `[TESTE] ${Date.now().toString(36)}`;

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

async function admitir(page: Page, nome: string, departamento: string): Promise<string> {
  await page.goto("/colaboradores");
  await page.getByRole("button", { name: "Admitir colaborador" }).click();
  await page.getByLabel("Nome completo").fill(nome);
  await page.getByLabel("Departamento").selectOption({ label: departamento });
  await page.getByRole("button", { name: "Admitir", exact: true }).click();
  await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function atribuir(page: Page, ficha: string, cargo: string, directa: boolean) {
  await page.goto(ficha);
  await page.getByRole("button", { name: /Atribuir (outro )?cargo/ }).click();
  await page.getByLabel("Cargo", { exact: true }).selectOption({ label: `${cargo} (com autoridade)` });
  if (directa) await page.getByLabel("Atribuição directa, sem aprovação").check();
  await page.getByRole("dialog").getByRole("button", { name: directa ? "Atribuir" : "Enviar para aprovação" }).click();
}

const token = (page: Page) => page.evaluate(() => (JSON.parse(sessionStorage.getItem("rivo.sessao") ?? "{}") as { token?: string }).token ?? "");

const responder = (page: Page, item: string, resposta: string) =>
  page.getByRole("group", { name: item }).locator("label").filter({ has: page.getByRole("radio", { name: resposta, exact: true }) }).click();

test("K4: validação com checklist antes da aprovação; portal do próprio", async ({ page }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const adminEmail = process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
  const adminPass = process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "";
  await entrar(page, process.env.RIVO_LOCAL_EMAIL ?? "", process.env.RIVO_LOCAL_PASSWORD ?? "");

  const dep = `${marca} Departamento`;
  await page.goto("/departamentos");
  await page.getByRole("button", { name: "Novo departamento" }).click();
  await page.getByLabel("Nome").fill(dep);
  await page.getByRole("button", { name: "Criar departamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const validador = `${marca} DAF`;
  const aprovador = `${marca} Direcção`;
  const promovido = `${marca} Coordenador`;
  await page.goto("/cargos");
  for (const nome of [validador, aprovador, promovido]) {
    await page.getByRole("button", { name: "Novo cargo" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Nível hierárquico").fill("2");
    await page.getByLabel("Dá autoridade para aprovar").check();
    await page.getByRole("button", { name: "Criar cargo" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  // A conta admin pode estar ligada a uma ficha de uma corrida anterior: desliga-se.
  const h = { Authorization: `Bearer ${await token(page)}` };
  const contas = (await (await page.request.get(`${API_LOCAL}/identity/users`, { headers: h })).json()) as { userId: string; email: string }[];
  const idAdmin = contas.find((c) => c.email === adminEmail)?.userId;
  // Todas as páginas: a base local passa das 200 fichas com as corridas anteriores.
  const fichas: { employeeId: string; userId: string | null }[] = [];
  for (let p = 1; ; p++) {
    const r = await page.request.get(`${API_LOCAL}/hr/employees?page=${String(p)}&pageSize=200`, { headers: h });
    fichas.push(...((await r.json()) as typeof fichas));
    if (fichas.length >= Number(r.headers()["x-total-count"] ?? 0)) break;
  }
  const ligada = fichas.find((f) => f.userId === idAdmin);
  if (ligada) {
    await page.goto(`/colaboradores/${ligada.employeeId}`);
    await page.getByRole("button", { name: "Desligar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desligar" }).click();
    await expect(page.getByRole("button", { name: "Ligar conta" })).toBeVisible();
  }

  const fichaV = await admitir(page, `${marca} Validadora`, dep);
  await page.getByRole("button", { name: "Ligar conta" }).click();
  const opcao = page.getByLabel("Conta", { exact: true }).locator("option", { hasText: adminEmail });
  // As contas carregam depois de o diálogo abrir: espera pela lista antes de contar.
  await expect(page.getByLabel("Conta", { exact: true }).locator("option").nth(1)).toBeAttached();
  test.skip((await opcao.count()) === 0, "A conta admin local já está ligada a outra ficha.");
  await page.getByLabel("Conta", { exact: true }).selectOption({ label: adminEmail });
  await page.getByRole("dialog").getByRole("button", { name: "Ligar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await atribuir(page, fichaV, validador, true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const fichaD = await admitir(page, `${marca} Directora`, dep);
  await atribuir(page, fichaD, aprovador, true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const fichaR = await admitir(page, `${marca} Requerente`, dep);

  // Política: passo 1 de validação (checklist), passo 2 de aprovação.
  await page.goto("/politicas-aprovacao");
  await page.getByRole("button", { name: "Nova política" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Processo").selectOption("hr.position_assignment");
  await d.getByLabel("Departamento (opcional)").selectOption({ label: dep });
  await d.getByLabel("Passo 1: tipo").selectOption("Validation");
  await d.getByLabel("Passo 1: cargo").selectOption({ label: validador });
  await d.getByLabel("Passo 1: item 1", { exact: true }).fill(`${marca} Contrato assinado`);
  await d.getByRole("button", { name: "Item", exact: true }).click();
  await d.getByLabel("Passo 1: item 2", { exact: true }).fill(`${marca} Avaliação anual`);
  await d.getByLabel("Passo 1: item 2 obrigatório").uncheck();
  await d.getByRole("button", { name: "Passo", exact: true }).click();
  await d.getByLabel("Passo 2: cargo").selectOption({ label: aprovador });
  await d.getByRole("button", { name: "Criar política" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const politica = page.getByRole("listitem").filter({ hasText: dep }).first();
  await expect(politica.getByText("Validação · 2 itens", { exact: false })).toBeVisible();

  await atribuir(page, fichaR, promovido, false);
  await expect(page.getByText("Enviado para aprovação.")).toBeVisible();
  await sair(page);

  // Quem valida: o pedido chega com o checklist do passo 1.
  await entrar(page, adminEmail, adminPass);
  await page.goto("/aprovacoes");
  const linha = page.getByRole("row").filter({ hasText: `${marca} Requerente` });
  await expect(linha.getByText("Validação")).toBeVisible();
  await linha.getByRole("link", { name: "Atribuição de cargo" }).click();
  await expect(page.getByRole("heading", { name: "A sua validação" })).toBeVisible();
  const obrigatorio = page.getByRole("group", { name: `${marca} Contrato assinado` });
  await expect(obrigatorio.getByRole("radio", { name: "N/A" })).toBeDisabled();

  // O servidor confirma as regras: N/A num obrigatório → 400.
  const idPedido = page.url().split("/").pop() ?? "";
  const tAdmin = { Authorization: `Bearer ${await token(page)}` };
  const pedido = (await (await page.request.get(`${API_LOCAL}/approval/requests/${idPedido}`, { headers: tAdmin })).json()) as { currentChecklist: { itemId: string; mandatory: boolean }[] };
  const naoAplicavel = await page.request.post(`${API_LOCAL}/approval/requests/${idPedido}/decisions`, {
    headers: tAdmin,
    data: { action: "Approved", notes: null, checklist: pedido.currentChecklist.map((i) => ({ itemId: i.itemId, response: "NotApplicable" })) },
  });
  expect(naoAplicavel.status()).toBe(400);

  await responder(page, `${marca} Contrato assinado`, "Não conforme");
  await expect(page.getByText("Há itens não conformes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar" })).toBeDisabled();
  await responder(page, `${marca} Contrato assinado`, "Conforme");
  await responder(page, `${marca} Avaliação anual`, "N/A");
  await page.getByRole("button", { name: "Validar" }).click();
  await page.getByLabel("Notas").fill("Conferido");
  await page.getByRole("dialog").getByRole("button", { name: "Validar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Passa ao passo 2 (aprovação, de outra pessoa) e o histórico guarda as respostas.
  await expect(page.getByText("Passo 2 · em curso")).toBeVisible();
  await expect(page.getByRole("heading", { name: "A sua validação" })).toHaveCount(0);
  const respostas = page.getByRole("list", { name: "Respostas ao checklist" });
  await expect(respostas.getByRole("listitem")).toHaveText([`✓${marca} Contrato assinado: Conforme`, `—${marca} Avaliação anual: N/A`]);

  // Portal da mesma conta: a ficha acabada de admitir não tem contrato nem benefícios.
  await page.goto("/eu/beneficios");
  await expect(page.getByText("Ainda não tem benefícios atribuídos. Fale com os Recursos Humanos.")).toBeVisible();
  await page.goto("/eu/contrato");
  await expect(page.getByText("Não há contrato registado. Fale com os Recursos Humanos.")).toBeVisible();
  await page.goto("/eu/dados-pessoais");
  await expect(page.getByRole("region", { name: "Dados bancários" }).getByText("—")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Pedir correcção" })).toBeVisible();
});
