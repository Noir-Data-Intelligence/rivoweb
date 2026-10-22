/**
 * F12 (1.º bloco) — projectos, com a API simulada: lista (fechados no URL),
 * abrir validado; resumo com orçamento, marcos (novo, alcançado, comentário
 * com o nome que o cliente vê), fechar; tarefas (nova, planear, concluir,
 * dependências); quadro com «Mover para» (Feita conclui); Gantt em texto.
 * O ProjectManager vê a quem estão atribuídas e atribui pelas escolhas dos
 * projectos, sem ler os RH (B38). Texto de fora nunca vira HTML.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { comentariosMarcos, dependencias, escolhasProjecto, gantt, IDF12, meGestorProjectos, projecto, projectos, quadroProjecto } from "../../fixtures/f12";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });

function comProjectos(api: ApiSimulada, me = meGestorProjectos): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/projects", (route) => ({ ...pag(new URL(route.request().url()).searchParams.get("includeClosed") === "true" ? projectos() : projectos().slice(0, 1)) }))
    .em("GET", `/projects/${IDF12.projecto}`, { status: 200, corpo: projecto() })
    .em("GET", `/projects/${IDF12.projecto}/board`, { status: 200, corpo: quadroProjecto() })
    .em("GET", `/projects/${IDF12.projecto}/gantt`, { status: 200, corpo: gantt() })
    .em("GET", `/projects/${IDF12.projecto}/dependencies`, { status: 200, corpo: dependencias() })
    .em("GET", `/projects/${IDF12.projecto}/milestones/comments`, { status: 200, corpo: comentariosMarcos() })
    .em("GET", "/projects/lookups", { status: 200, corpo: escolhasProjecto() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("projectos", () => {
  test("ProjectManager: lista com fechados no URL, abrir validado; resumo, orçamento, marcos e comentário", async ({ page, api, violacoes }) => {
    await comProjectos(api)
      .em("POST", "/projects", { status: 201, corpo: { projectId: IDF12.projecto } })
      .em("POST", `/projects/${IDF12.projecto}/budget`, { status: 204 })
      .em("POST", `/projects/${IDF12.projecto}/milestones`, { status: 201, corpo: { milestoneId: "m9" } })
      .em("POST", `/projects/${IDF12.projecto}/milestones/${IDF12.marco2}/reached`, { status: 204 })
      .em("POST", `/projects/${IDF12.projecto}/milestones/${IDF12.marco2}/comments`, { status: 201, corpo: { id: "c9" } })
      .ligar();
    await entrar(page, meGestorProjectos.email);
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Projectos" }).click();
    const tabela = page.getByRole("table", { name: "Projectos" });
    await expect(tabela).toContainText("Implementação ERP");
    await expect(tabela).not.toContainText("Auditoria 2025");
    await page.getByLabel("Mostrar também os fechados").click();
    await expect(page).toHaveURL(/fechados=sim/);
    await expect(tabela.getByRole("row").filter({ hasText: "Auditoria 2025" })).toContainText("Fechado");
    await verificar(page);

    await page.getByRole("button", { name: "Novo projecto" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Abrir projecto" }).click();
    await expect(d.getByText("Indique o nome.")).toBeVisible();
    await d.getByLabel("Nome").fill("  Implementação ERP ");
    await d.getByLabel("Início").fill("2026-02-01");
    await d.getByRole("button", { name: "Abrir projecto" }).click();
    await expect(page).toHaveURL(new RegExp(`/projectos/${IDF12.projecto}$`));
    expect(api.escritas("POST", "/projects")[0]?.corpo).toEqual({ name: "Implementação ERP", startDate: "2026-02-01" });

    await expect(page.getByRole("progressbar", { name: "33% feito" })).toHaveAttribute("aria-valuenow", "33");
    await expect(page.getByText("1 de 3", { exact: false }).first()).toBeVisible();
    const marcos = page.getByRole("list", { name: "Marcos" });
    await expect(marcos).toContainText("alcançado 14/02/2026");
    await expect(page.getByText("<img src=x onerror=alert(1)>", { exact: false })).toBeVisible();
    expect(await page.locator("main img").count()).toBe(0);
    await verificar(page);

    await page.getByRole("button", { name: "Rever orçamento" }).click();
    await expect(d.getByLabel("Moeda")).toBeDisabled();
    await d.getByLabel("Valor aprovado").fill("6 000 000");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/budget`)[0]?.corpo).toEqual({ amount: "6000000.00", currency: "AOA" });

    await page.getByRole("button", { name: "Novo marco" }).click();
    await d.getByLabel("Nome").fill("Testes");
    await d.getByLabel("Data alvo").fill("2026-01-15");
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d.getByText("A data do marco não pode ser anterior ao início do projecto.")).toBeVisible();
    await d.getByLabel("Data alvo").fill("2026-05-15");
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/milestones`)[0]?.corpo).toEqual({ name: "Testes", targetDate: "2026-05-15" });

    await page.getByRole("button", { name: "Marcar alcançado: Go-live" }).click();
    await d.getByLabel("Alcançado a").fill("2026-06-28");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/milestones/${IDF12.marco2}/reached`)[0]?.corpo).toEqual({ reachedOn: "2026-06-28" });

    await page.getByRole("button", { name: "Comentar Go-live" }).click();
    await expect(d.getByLabel("Assinado como")).toHaveValue("Paula Projectos");
    await d.getByLabel("Comentário").fill("Entrada em produção confirmada.");
    await d.getByRole("button", { name: "Comentar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/milestones/${IDF12.marco2}/comments`)[0]?.corpo).toEqual({ body: "Entrada em produção confirmada.", authorName: "Paula Projectos" });
    expect(await violacoes()).toEqual([]);
  });

  test("tarefas: nomes e escolhas sem os RH (B38); nova atribuída, planear, concluir e dependências", async ({ page, api, violacoes }) => {
    await comProjectos(api)
      .em("POST", `/projects/${IDF12.projecto}/tasks`, { status: 201, corpo: { taskId: "t9" } })
      .em("PUT", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}`, { status: 204 })
      .em("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t2}/completion`, { status: 204 })
      .em("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}/dependencies`, { status: 201, corpo: { id: "d9" } })
      .em("DELETE", `/projects/${IDF12.projecto}/dependencies/${IDF12.dep}`, { status: 204 })
      .ligar();
    await entrar(page, meGestorProjectos.email);
    await page.goto(`/projectos/${IDF12.projecto}?vista=tarefas`);
    await expect(page.getByText("(B38)", { exact: false })).toHaveCount(0);
    const linhas = page.getByRole("table", { name: "Tarefas" });
    await expect(linhas.getByRole("row").filter({ hasText: "Configuração" })).toContainText("Ana Teste");
    await expect(linhas.getByRole("row").filter({ hasText: "Formação" })).toContainText("Ninguém");
    await expect(linhas).toContainText("<script>x</script>");
    expect(await page.locator("main script").count()).toBe(0);
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/"))).toBe(false);
    await verificar(page);

    await page.getByRole("button", { name: "Nova tarefa" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Título").fill("Migração de dados");
    await d.getByLabel("Prazo (opcional)").fill("2026-04-30");
    await d.getByLabel("Atribuir a (opcional)").selectOption({ label: "Ana Teste" });
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/tasks`)[0]?.corpo).toEqual({ title: "Migração de dados", dueDate: "2026-04-30", assignedEmployeeId: ID.emp1 });

    await page.getByRole("button", { name: "Planear Formação" }).click();
    await d.getByLabel("Início (opcional)").fill("2026-05-01");
    await d.getByLabel("Prazo (opcional)").fill("2026-04-01");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("O prazo não pode ser anterior ao início da tarefa.")).toBeVisible();
    await d.getByLabel("Prazo (opcional)").fill("2026-05-20");
    await d.getByLabel("Horas estimadas (opcional)").fill("24,5");
    await d.getByLabel("Prioridade").selectOption("Urgent");
    await d.getByLabel("Progresso (%)").fill("10");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}`)[0]?.corpo).toEqual({ title: "Formação", description: null, startDate: "2026-05-01", dueDate: "2026-05-20", estimatedHours: "24.5", priority: "Urgent", progress: 10 });

    await page.getByRole("button", { name: "Concluir Configuração" }).click();
    await d.getByRole("button", { name: "Concluir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t2}/completion`)).toHaveLength(1);

    await page.getByRole("button", { name: "Dependências de Configuração" }).click();
    await expect(d.getByRole("list", { name: "Dependências" })).toContainText("Levantamento");
    await d.getByRole("button", { name: "Tirar a dependência de Levantamento" }).click();
    await expect.poll(() => api.escritas("DELETE", `/projects/${IDF12.projecto}/dependencies/${IDF12.dep}`)).toHaveLength(1);
    await d.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "Dependências de Formação" }).click();
    await d.getByLabel("Passa a depender de").selectOption({ label: "Configuração" });
    await d.getByRole("button", { name: "Juntar dependência" }).click();
    await expect.poll(() => api.escritas("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}/dependencies`)[0]?.corpo).toEqual({ dependsOnTaskId: IDF12.t2 });
    expect(await violacoes()).toEqual([]);
  });

  test("quadro com «Mover para» (Feita conclui) e Gantt em texto", async ({ page, api, violacoes }) => {
    await comProjectos(api).em("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}/move`, { status: 204 }).ligar();
    await entrar(page, meGestorProjectos.email);
    await page.goto(`/projectos/${IDF12.projecto}?vista=quadro`);
    await expect(page.getByRole("region", { name: "Em curso (1)" })).toContainText("6,5 h registadas · 2 comentários");
    await expect(page.getByRole("region", { name: "Em curso (1)" })).toContainText("Ana Teste");
    await expect(page.getByRole("region", { name: "Feita (1)" })).toContainText("Levantamento");
    await verificar(page);
    await page.getByLabel("Mover Formação para").selectOption("Done");
    await expect.poll(() => api.escritas("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}/move`)[0]?.corpo).toEqual({ stage: "Done", boardOrder: null });

    await page.getByRole("link", { name: "Gantt" }).click();
    const g = page.getByRole("table", { name: "Gantt das tarefas" });
    await expect(g.getByRole("row").filter({ hasText: "Configuração" })).toContainText("Depende de: Levantamento");
    await expect(g.getByRole("row").filter({ hasText: "Configuração" })).toContainText("40% · 6,5 h de 16,0 h");
    await expect(g.getByRole("row").filter({ hasText: "Formação" })).toContainText("Sem datas");
    await expect(page.getByRole("list", { name: "Marcos no tempo" })).toContainText("Go-live");
    await verificar(page);
    expect(await violacoes()).toEqual([]);
  });

  test("atribuir pelas escolhas dos projectos, sem os RH (B38)", async ({ page, api }) => {
    await comProjectos(api).em("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}/assignment`, { status: 204 }).ligar();
    await entrar(page, meGestorProjectos.email);
    await page.goto(`/projectos/${IDF12.projecto}?vista=tarefas`);
    await page.getByRole("button", { name: "Atribuir Formação" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Colaborador").selectOption(ID.emp1);
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/projects/${IDF12.projecto}/tasks/${IDF12.t3}/assignment`)[0]?.corpo).toEqual({ employeeId: ID.emp1 });
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/"))).toBe(false);
  });
});
