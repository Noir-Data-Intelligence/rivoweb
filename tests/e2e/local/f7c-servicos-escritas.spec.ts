/**
 * F7c (anúncios e pedidos internos) contra a API LOCAL (D1, §8.3), pela
 * interface com a conta Admin local: anúncio publicado, corrigido e arquivado;
 * pedido aberto em nome de um colaborador novo (pela API), respondido,
 * atribuído, resolvido e fechado; prazo de uma categoria mudado e reposto no
 * fim. Confere tudo no servidor.
 */
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e as contas locais.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;

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

test("F7c: anúncio publicado, corrigido e arquivado; pedido interno do princípio ao fim; prazo mudado e reposto", async ({ page, request }) => {
  test.setTimeout(180_000);
  await soLocal(page);
  const ad = await sessaoApi(request, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");
  const emp = await ad<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Requerente`, departmentId: null, userId: null, hiredOn: null });
  expect(emp.status).toBe(201);
  const resp = await ad<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Responsável`, departmentId: null, userId: null, hiredOn: null });
  expect(resp.status).toBe(201);
  const slaAntes = await ad<{ category: string; responseMinutes: number; resolutionMinutes: number }[]>("GET", "/hr/tickets/sla-policies");
  const outroAntes = slaAntes.corpo.find((p) => p.category === "Other");
  await entrar(page, process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "", process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "");

  try {
    // --- Anúncio
    const titulo = `${marca} Aviso`;
    await page.goto("/anuncios");
    await page.getByRole("button", { name: "Publicar anúncio" }).click();
    await dialogo(page).getByLabel("Título").fill(titulo);
    await dialogo(page).getByLabel("Texto").fill("Linha um.\nLinha dois.");
    await dialogo(page).getByRole("button", { name: "Publicar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    await page.getByRole("button", { name: `Corrigir o anúncio ${titulo}` }).click();
    await dialogo(page).getByLabel("Título").fill(`${titulo} corrigido`);
    await dialogo(page).getByLabel("Fixar no topo").check();
    await dialogo(page).getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: `${titulo} corrigido` })).toBeVisible();
    const lista = await ad<{ announcementId: string; title: string; pinned: boolean; body: string; archived: boolean; visible: boolean }[]>("GET", "/hr/announcements/manage");
    const a = lista.corpo.find((x) => x.title === `${titulo} corrigido`);
    expect(a).toMatchObject({ pinned: true, body: "Linha um.\nLinha dois.", archived: false, visible: true });
    await page.getByRole("button", { name: `Arquivar o anúncio ${titulo} corrigido` }).click();
    await dialogo(page).getByRole("button", { name: "Arquivar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: `${titulo} corrigido` })).toHaveCount(0);
    const depois = await ad<{ announcementId: string; archived: boolean }[]>("GET", "/hr/announcements/manage");
    expect(depois.corpo.find((x) => x.announcementId === a?.announcementId)?.archived).toBe(true);

    // --- Pedido interno
    const assunto = `${marca} Declaração`;
    await page.goto("/pedidos-internos");
    await page.getByRole("button", { name: "Abrir pedido" }).click();
    await dialogo(page).getByLabel("Colaborador").selectOption({ label: `${marca} Requerente` });
    await dialogo(page).getByLabel("Assunto").fill(assunto);
    await dialogo(page).getByLabel("Categoria").selectOption("DocumentRequest");
    await dialogo(page).getByLabel("Mensagem").fill("Preciso para o banco.");
    await dialogo(page).getByRole("button", { name: "Abrir pedido" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await page.getByRole("link", { name: assunto }).click();
    await expect(page.getByText("Preciso para o banco.")).toBeVisible();
    const ticketId = page.url().split("/").pop() ?? "";
    await page.getByLabel("Responder ao colaborador").fill("Fica pronta amanhã.");
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Fica pronta amanhã.")).toBeVisible();
    await page.getByLabel("Responsável").selectOption({ label: `${marca} Responsável` });
    await page.getByRole("button", { name: "Atribuir" }).click();
    await expect(page.getByText("Atribuir põe o pedido em curso.")).toHaveCount(0);
    await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("InProgress");
    await page.getByLabel("Estado", { exact: true }).selectOption("Resolved");
    await page.getByRole("button", { name: "Mudar" }).click();
    await expect(page.getByText(/· resolvido a /)).toBeVisible();
    await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("Resolved");
    await page.getByLabel("Estado", { exact: true }).selectOption("Closed");
    await page.getByRole("button", { name: "Mudar" }).click();
    await dialogo(page).getByRole("button", { name: "Fechar pedido" }).click();
    await expect(page.getByText("Este pedido está fechado e já não recebe mensagens.")).toBeVisible();

    const t = await ad<{ status: string; assigneeEmployeeId: string; requesterEmployeeId: string; category: string; messages: { fromRequester: boolean; body: string }[]; sla: { firstResponseAt: string | null } | null; resolvedAt: string | null }>(
      "GET",
      `/hr/tickets/${ticketId}`,
    );
    expect(t.corpo).toMatchObject({ status: "Closed", assigneeEmployeeId: resp.corpo.employeeId, requesterEmployeeId: emp.corpo.employeeId, category: "DocumentRequest" });
    expect(t.corpo.messages.map((m) => [m.fromRequester, m.body])).toEqual([
      [true, "Preciso para o banco."],
      [false, "Fica pronta amanhã."],
    ]);
    expect(t.corpo.resolvedAt).toBeTruthy();
    if (t.corpo.sla) expect(t.corpo.sla.firstResponseAt).toBeTruthy();

    // --- Prazos (SLA) de «Outro»: mudar e confirmar.
    await page.goto("/pedidos-internos?vista=prazos");
    await page.getByRole("button", { name: "Definir os prazos de Outro" }).click();
    await dialogo(page).getByLabel("Responder em (horas)").fill("7,5");
    await dialogo(page).getByLabel("Resolver em (horas)").fill("70");
    await dialogo(page).getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo(page)).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: "Outro" })).toContainText("7,5 h");
    const sla = await ad<{ category: string; responseMinutes: number; resolutionMinutes: number }[]>("GET", "/hr/tickets/sla-policies");
    expect(sla.corpo.find((p) => p.category === "Other")).toMatchObject({ responseMinutes: 450, resolutionMinutes: 4200 });
  } finally {
    // Repor o prazo de «Outro» como estava (se existia).
    if (outroAntes) await ad("PUT", "/hr/tickets/sla-policies/Other", { responseMinutes: outroAntes.responseMinutes, resolutionMinutes: outroAntes.resolutionMinutes });
  }
});
