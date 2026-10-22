/**
 * F12 (2.º bloco) — trabalho do projecto e portal do cliente, com a API
 * simulada: comentários e checklist de tarefa; tempo, recursos e cliente com
 * os nomes e as escolhas dos projectos (o ProjectManager regista, aloca e
 * liga sem ler os RH, a frota ou os clientes, B38); orçamento por linhas;
 * ficheiros (juntar e abrir só com os documentos, B39); visibilidade no portal; registo de tempo global; o cliente vê e comenta os
 * marcos. Texto de fora nunca vira HTML.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { meCliente } from "../../fixtures/f10";
import {
  checklist,
  comentariosMarcos,
  comentariosTarefa,
  dependencias,
  escolhasProjecto,
  ficheirosProjecto,
  gantt,
  IDF12,
  meAdminF12,
  meGestorProjectos,
  orcamentoLinhas,
  projecto,
  projectos,
  projectosCliente,
  quadroProjecto,
  tempo,
  visibilidade,
} from "../../fixtures/f12";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "200", "X-Total-Count": String(itens.length) } });

function comTrabalho(api: ApiSimulada, me = meGestorProjectos, comCliente = false): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/projects", pag(projectos()))
    .em("GET", `/projects/${IDF12.projecto}`, { status: 200, corpo: { ...projecto(), allocations: [{ allocationId: "a1", kind: "Employee", resourceId: ID.emp1, resourceName: "Ana Teste", startsOn: "2026-02-01", endsOn: null }] } })
    .em("GET", `/projects/${IDF12.projecto}/board`, { status: 200, corpo: quadroProjecto() })
    .em("GET", `/projects/${IDF12.projecto}/gantt`, { status: 200, corpo: gantt() })
    .em("GET", `/projects/${IDF12.projecto}/dependencies`, { status: 200, corpo: dependencias() })
    .em("GET", `/projects/${IDF12.projecto}/milestones/comments`, { status: 200, corpo: comentariosMarcos() })
    .em("GET", `/projects/${IDF12.projecto}/comments`, { status: 200, corpo: comentariosTarefa() })
    .em("GET", `/projects/${IDF12.projecto}/tasks/${IDF12.t2}/checklist`, { status: 200, corpo: checklist() })
    .em("GET", "/projects/time-entries", { status: 200, corpo: tempo() })
    .em("GET", `/projects/${IDF12.projecto}/budget/lines`, { status: 200, corpo: orcamentoLinhas() })
    .em("GET", `/projects/${IDF12.projecto}/files`, { status: 200, corpo: ficheirosProjecto() })
    .em("GET", `/projects/${IDF12.projecto}/customer-visibility`, { status: 200, corpo: visibilidade(comCliente) })
    .em("GET", "/projects/lookups", { status: 200, corpo: escolhasProjecto() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("trabalho do projecto", () => {
  test("ProjectManager: comentários e checklist de tarefa; regista tempo, aloca e liga o cliente sem ler os RH, a frota ou os clientes (B38); orçamento por linhas", async ({ page, api, violacoes }) => {
    await comTrabalho(api)
      .em("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t2}/comments`, { status: 201, corpo: { id: "c9" } })
      .em("POST", `/projects/${IDF12.projecto}/checklist/i2/toggle`, { status: 204 })
      .em("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t2}/checklist`, { status: 201, corpo: { id: "i9" } })
      .em("DELETE", `/projects/${IDF12.projecto}/checklist/i1`, { status: 204 })
      .em("POST", `/projects/${IDF12.projecto}/budget/lines`, { status: 201, corpo: { id: "l9" } })
      .em("PUT", `/projects/${IDF12.projecto}/budget/lines/l1`, { status: 204 })
      .em("DELETE", `/projects/${IDF12.projecto}/budget/lines/l1`, { status: 204 })
      .em("POST", `/projects/${IDF12.projecto}/time-entries`, { status: 201, corpo: { id: "e9" } })
      .em("POST", `/projects/${IDF12.projecto}/allocations`, { status: 201, corpo: { id: "a9" } })
      .em("PUT", `/projects/${IDF12.projecto}/customer-visibility`, { status: 204 })
      .ligar();
    await entrar(page, meGestorProjectos.email);
    await page.goto(`/projectos/${IDF12.projecto}?vista=tarefas`);
    await page.getByRole("button", { name: "Comentários de Configuração" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByRole("list", { name: "Comentários da tarefa" })).toContainText("<script>x</script>");
    await expect(d.getByRole("list", { name: "Comentários da tarefa" })).toContainText("Paula Projectos ·");
    expect(await page.locator("[role=dialog] script").count()).toBe(0);
    await d.getByRole("button", { name: "Comentar" }).click();
    await expect(d.getByText("Escreva o comentário.")).toBeVisible();
    await d.getByLabel("Novo comentário").fill("Tabela de IVA carregada.");
    await d.getByRole("button", { name: "Comentar" }).click();
    await expect.poll(() => api.escritas("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t2}/comments`)[0]?.corpo).toEqual({ body: "Tabela de IVA carregada." });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Checklist de Configuração" }).click();
    await expect(d).toContainText("1 de 2 feitos.");
    await d.getByLabel("Séries de facturação", { exact: true }).click();
    await expect.poll(() => api.escritas("POST", `/projects/${IDF12.projecto}/checklist/i2/toggle`)[0]?.corpo).toEqual({ done: true });
    await d.getByLabel("Novo passo").fill("Utilizadores");
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect.poll(() => api.escritas("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t2}/checklist`)[0]?.corpo).toEqual({ title: "Utilizadores" });
    await d.getByRole("button", { name: "Tirar o passo Plano de contas" }).click();
    await expect.poll(() => api.escritas("DELETE", `/projects/${IDF12.projecto}/checklist/i1`)).toHaveLength(1);
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Tempo", exact: true }).click();
    await expect(page.getByText("22,50 h").first()).toBeVisible();
    await expect(page.getByRole("table", { name: "Registos de tempo" }).getByRole("row").filter({ hasText: "Configuração inicial" })).toContainText("Ana Teste");
    await expect(page.getByRole("list", { name: "Horas por colaborador" })).toContainText("Ana Teste");
    await verificar(page);
    await page.getByRole("button", { name: "Registar tempo" }).click();
    await d.getByLabel("Colaborador").selectOption({ label: "Ana Teste" });
    await d.getByLabel("Dia").fill("2026-10-20");
    await d.getByLabel("Horas").fill("2");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/time-entries`)[0]?.corpo).toEqual({ employeeId: ID.emp1, taskId: null, day: "2026-10-20", hours: "2", description: null, billable: true });

    await page.getByRole("link", { name: "Recursos", exact: true }).click();
    await expect(page.getByRole("table", { name: "Recursos alocados" }).getByRole("row").filter({ hasText: "Ana Teste" })).toContainText("Em curso");
    await page.getByRole("button", { name: "Alocar recurso" }).click();
    await d.getByLabel("Tipo").selectOption({ label: "Viatura" });
    await d.getByLabel("Viatura").selectOption({ label: "LD-12-34-AB · Toyota Hilux" });
    await d.getByLabel("Início").fill("2026-03-01");
    await d.getByRole("button", { name: "Alocar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/allocations`)[0]?.corpo).toEqual({ kind: 1, resourceId: IDF12.viatura, startsOn: "2026-03-01" });

    await page.getByRole("link", { name: "Orçamento", exact: true }).click();
    await expect(page.getByText("O previsto nas linhas passa o orçamento aprovado.")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Nova linha" }).click();
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("Indique a categoria.")).toBeVisible();
    await d.getByLabel("Categoria").fill("Deslocações");
    await d.getByLabel("Previsto em AOA").fill("250 000");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/budget/lines`)[0]?.corpo).toEqual({ category: "Deslocações", description: null, plannedAmount: "250000.00", actualAmount: null });
    await page.getByRole("button", { name: "Corrigir a linha Mão-de-obra" }).click();
    await d.getByLabel("Gasto em AOA (opcional)").fill("1 500 000");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/projects/${IDF12.projecto}/budget/lines/l1`)[0]?.corpo).toMatchObject({ category: "Mão-de-obra", plannedAmount: "5500000.00", actualAmount: "1500000.00" });
    await page.getByRole("button", { name: "Apagar a linha Mão-de-obra" }).click();
    await d.getByRole("button", { name: "Apagar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("DELETE", `/projects/${IDF12.projecto}/budget/lines/l1`)).toHaveLength(1);

    await page.getByRole("link", { name: "Ficheiros", exact: true }).click();
    await expect(page.getByText("Juntar e abrir ficheiros pede acesso aos documentos", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Descarregar/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Cliente", exact: true }).click();
    await page.getByLabel("Ligar a um cliente").selectOption({ label: "Cliente Teste, Lda" });
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect.poll(() => api.escritas("PUT", `/projects/${IDF12.projecto}/customer-visibility`)[0]?.corpo).toEqual({ customerId: "00000000-0000-4000-8000-000000000701", visible: false });
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/") || p.caminho.startsWith("/commercial/customers") || p.caminho.startsWith("/fleet/"))).toBe(false);
    expect(await violacoes()).toEqual([]);
  });

  test("Admin: regista e apaga tempo, junta e retira ficheiros, aloca, liga o cliente e mostra no portal", async ({ page, api, violacoes }) => {
    await comTrabalho(api, meAdminF12)
      .em("POST", `/projects/${IDF12.projecto}/time-entries`, { status: 201, corpo: { id: "e9" } })
      .em("DELETE", `/projects/${IDF12.projecto}/time-entries/e1`, { status: 204 })
      .em("POST", "/documents", { status: 201, corpo: { documentId: "00000000-0000-4000-8000-000000000e42", fileName: "acta.pdf", contentType: "application/pdf", sizeInBytes: 100, category: "Projecto", contentHash: "x", uploadedBy: null, uploadedAt: "2026-10-22T10:00:00Z" } })
      .em("POST", `/projects/${IDF12.projecto}/files`, { status: 201, corpo: { id: "f9" } })
      .em("POST", `/projects/${IDF12.projecto}/files/f1/removal`, { status: 204 })
      .em("GET", "/documents/00000000-0000-4000-8000-000000000e41", { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .em("POST", `/projects/${IDF12.projecto}/allocations/a1/end`, { status: 204 })
      .em("PUT", `/projects/${IDF12.projecto}/customer-visibility`, { status: 204 })
      .ligar();
    await entrar(page, meAdminF12.email);
    await page.goto(`/projectos/${IDF12.projecto}?vista=tempo`);
    await expect(page.getByRole("list", { name: "Horas por colaborador" })).toContainText("Ana Teste");
    await page.getByRole("button", { name: "Registar tempo" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Colaborador").selectOption(ID.emp1);
    await d.getByLabel("Tarefa (opcional)").selectOption({ label: "Configuração" });
    await d.getByLabel("Dia").fill("2026-10-20");
    await d.getByLabel("Horas").fill("25");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Horas entre 0 e 24 (até 2 casas decimais).")).toBeVisible();
    await d.getByLabel("Horas").fill("7,5");
    await d.getByLabel("Facturável").uncheck();
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/time-entries`)[0]?.corpo).toEqual({ employeeId: ID.emp1, taskId: IDF12.t2, day: "2026-10-20", hours: "7.5", description: null, billable: false });
    await page.getByRole("button", { name: "Apagar o registo de 05/03/2026 (6,50 h)" }).click();
    await d.getByRole("button", { name: "Apagar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("DELETE", `/projects/${IDF12.projecto}/time-entries/e1`)).toHaveLength(1);

    await page.getByRole("link", { name: "Ficheiros", exact: true }).click();
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar Caderno de encargos" }).click();
    // Sem nome do ficheiro na vista (B39), o browser completa o nome à sua maneira (espaços ou «_», com a extensão).
    expect((await descarga).suggestedFilename()).toMatch(/^Caderno[ _]de[ _]encargos/);
    await page.getByRole("button", { name: "Juntar ficheiro" }).click();
    await d.getByLabel("Ficheiro").setInputFiles({ name: "acta.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await expect(d.getByText("acta.pdf")).toBeVisible();
    await d.getByLabel("Categoria (opcional)").fill("Acta de arranque");
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/files`)[0]?.corpo).toEqual({ documentId: "00000000-0000-4000-8000-000000000e42", taskId: null, category: "Acta de arranque" });
    await page.getByRole("button", { name: "Retirar Caderno de encargos" }).click();
    await d.getByRole("button", { name: "Retirar" }).click();
    await expect(d.getByText("Diga porque retira o ficheiro do projecto.")).toBeVisible();
    await d.getByLabel("Motivo").fill("Versão errada.");
    await d.getByRole("button", { name: "Retirar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/files/f1/removal`)[0]?.corpo).toEqual({ reason: "Versão errada." });

    await page.getByRole("link", { name: "Recursos", exact: true }).click();
    await expect(page.getByRole("table", { name: "Recursos alocados" })).toContainText("Ana Teste");
    await page.getByRole("button", { name: "Terminar a alocação de Ana Teste" }).click();
    await d.getByLabel("Termina a").fill("2026-06-30");
    await d.getByRole("button", { name: "Terminar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/allocations/a1/end`)[0]?.corpo).toEqual({ endsOn: "2026-06-30" });

    await page.getByRole("link", { name: "Cliente", exact: true }).click();
    await page.getByLabel("Ligar a um cliente").selectOption({ label: "Cliente Teste, Lda" });
    await page.getByRole("button", { name: "Guardar cliente" }).click();
    await expect.poll(() => api.escritas("PUT", `/projects/${IDF12.projecto}/customer-visibility`)[0]?.corpo).toEqual({ customerId: "00000000-0000-4000-8000-000000000701", visible: false });
    expect(await violacoes()).toEqual([]);
  });

  test("com cliente ligado, mostrar no portal; registo de tempo global com o período no URL", async ({ page, api }) => {
    await comTrabalho(api, meGestorProjectos, true).em("PUT", `/projects/${IDF12.projecto}/customer-visibility`, { status: 204 }).ligar();
    await entrar(page, meGestorProjectos.email);
    await page.goto(`/projectos/${IDF12.projecto}?vista=cliente`);
    await expect(page.getByRole("definition").filter({ hasText: "Cliente Teste, Lda" })).toBeVisible();
    await page.getByRole("button", { name: "Mostrar no portal do cliente" }).click();
    await expect.poll(() => api.escritas("PUT", `/projects/${IDF12.projecto}/customer-visibility`)[0]?.corpo).toEqual({ customerId: "00000000-0000-4000-8000-000000000701", visible: true });

    await page.getByRole("link", { name: "Registo de tempo" }).click();
    await expect(page.getByRole("list", { name: "Horas por projecto" })).toContainText("Implementação ERP");
    await page.getByLabel("De", { exact: true }).fill("2026-03-01");
    await expect(page).toHaveURL(/de=2026-03-01/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/projects/time-entries" && p.query.includes("from=2026-03-01"))).toBe(true);
    await verificar(page);
  });
});

test.describe("portal do cliente", () => {
  test("o cliente vê os projectos, os marcos com os comentários (texto) e comenta", async ({ page, api, violacoes }) => {
    await api
      .comConta(meCliente)
      .em("GET", "/customer-portal/me", { status: 200, corpo: { customerId: "x", customerName: "Cliente Teste, Lda", from: "2026-10-01", to: "2026-10-22", currency: "AOA", netRevenue: 0, outstanding: 0, invoices: [] } })
      .em("GET", "/customer-portal/me/projects", { status: 200, corpo: projectosCliente() })
      .em("GET", `/customer-portal/me/projects/${IDF12.projecto}`, { status: 200, corpo: projectosCliente()[0] })
      .em("POST", `/customer-portal/me/projects/${IDF12.projecto}/milestones/${IDF12.marco2}/comments`, { status: 201, corpo: { commentId: "pc1" } })
      .ligar();
    await entrar(page, meCliente.email);
    await page.getByRole("link", { name: "Projectos" }).click();
    await expect(page.getByRole("list", { name: "Projectos" })).toContainText("Próximo marco: Go-live, a 30/06/2026");
    await verificar(page);
    await page.getByRole("link", { name: "Implementação ERP" }).click();
    await expect(page.getByRole("list", { name: "Comentários em Arranque" })).toContainText("<img src=x onerror=alert(1)>");
    expect(await page.locator("main img").count()).toBe(0);
    await page.getByRole("button", { name: "Comentar" }).nth(1).click();
    await expect(page.getByText("Escreva o comentário.")).toBeVisible();
    await page.getByLabel("Comentar «Go-live»").fill("Podemos antecipar?");
    await page.getByRole("button", { name: "Comentar" }).nth(1).click();
    await expect.poll(() => api.escritas("POST", `/customer-portal/me/projects/${IDF12.projecto}/milestones/${IDF12.marco2}/comments`)[0]?.corpo).toEqual({ body: "Podemos antecipar?" });
    await verificar(page);
    expect(await violacoes()).toEqual([]);
  });
});
