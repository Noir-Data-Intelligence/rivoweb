/**
 * F7c (4.º bloco) — declarações, desempenho, conquistas e importação, com a
 * API simulada: emitir só depois de confirmar (GET que regista), modelos com
 * marcadores validados, verificar um código; ciclos (iniciar, fechar),
 * objectivos (definir, peso), resultados-chave (juntar, registar valor em
 * texto); conquistas (criar, atribuir com a recusa do servidor, classificação,
 * separador da ficha); importar colaboradores (resumo por linha). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { meRhF7 } from "../../fixtures/f7b";
import { ciclos, classificacao, conquistasDe, conquistasGestao, emitidas, IDF7C4, modelosGestao, objectivosGestao } from "../../fixtures/f7c";

const problema = (status: number, detail: string) => ({ status, corpo: { status, title: "Conflito", detail }, cabecalhos: { "Content-Type": "application/problem+json" } });

function comTalento(api: ApiSimulada): ApiSimulada {
  return comF1(api, meRhF7)
    .em("GET", "/hr/declaration-templates", { status: 200, corpo: modelosGestao() })
    .em("GET", "/hr/declarations", { status: 200, corpo: emitidas() })
    .em("GET", "/hr/performance/cycles", { status: 200, corpo: ciclos() })
    .em("GET", "/hr/performance/objectives", { status: 200, corpo: objectivosGestao() })
    .em("GET", "/hr/achievements", { status: 200, corpo: conquistasGestao() })
    .em("GET", "/hr/achievements/leaderboard", { status: 200, corpo: classificacao() })
    .em("GET", `/hr/employees/${ID.emp2}/achievements`, { status: 200, corpo: conquistasDe() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("declarações, desempenho, conquistas e importação", () => {
  test("declarações: emitir só depois de confirmar; modelos com marcadores; verificar um código", async ({ page, api, violacoes }) => {
    await comTalento(api)
      .em("GET", `/hr/employees/${ID.emp2}/declarations/${IDF7C4.modelo}`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .em("POST", "/hr/declaration-templates", { status: 201, corpo: { templateId: "00000000-0000-4000-8000-000000000969" } })
      .em("GET", "/hr/declarations/verification/AB12CD34EF56", { status: 200, corpo: emitidas()[0] })
      .ligar();
    await entrar(page, meRhF7.email);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(menu.getByRole("link", { name: "Desempenho" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Conquistas" })).toBeVisible();
    await menu.getByRole("link", { name: "Declarações" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Carlos Teste" })).toContainText("AB12CD34EF56");
    await verificar(page);

    await page.getByRole("button", { name: "Emitir declaração" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Emitir e descarregar" }).click();
    await expect(d.getByText("Escolha o colaborador.")).toBeVisible();
    // Nada se emite antes de confirmar.
    expect(api.pedidos.some((p) => p.caminho.includes("/declarations/") && p.caminho.startsWith("/hr/employees/"))).toBe(false);
    await d.getByLabel("Colaborador").selectOption(ID.emp2);
    await d.getByLabel("Modelo").selectOption(IDF7C4.modelo);
    await expect(d.getByText("Título impresso: «DECLARAÇÃO».")).toBeVisible();
    const pdf = page.waitForEvent("download");
    await d.getByRole("button", { name: "Emitir e descarregar" }).click();
    expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
    await expect(d).toHaveCount(0);

    await page.getByRole("link", { name: "Modelos" }).click();
    await page.getByRole("button", { name: "Novo modelo" }).click();
    await d.getByLabel("Nome do modelo").fill("Rendimentos");
    await d.getByLabel("Texto").fill("Declara-se que {{nome}} vive em {{morada}}.");
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d.getByText("Marcador desconhecido: {{morada}}.")).toBeVisible();
    expect(api.escritas("POST", "/hr/declaration-templates")).toHaveLength(0);
    await d.getByLabel("Texto").fill("Declara-se que {{nome}} aufere {{salario}} {{moeda}}.");
    await d.getByLabel("O próprio pode pedi-la no portal").check();
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/declaration-templates").map((p) => p.corpo)).toEqual([
      { name: "Rendimentos", title: "DECLARAÇÃO", body: "Declara-se que {{nome}} aufere {{salario}} {{moeda}}.", selfService: true, active: true },
    ]);

    await page.getByRole("link", { name: "Verificar um código" }).click();
    await page.getByLabel("Código de verificação").fill("AB12 CD34 EF56");
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.getByText("Declaração válida")).toBeVisible();
    await expect(page.getByText("O próprio (portal)")).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });

  test("desempenho: ciclo em curso por omissão; objectivo, resultado-chave e valor em texto; iniciar o planeado", async ({ page, api, violacoes }) => {
    let valor = 4;
    let planeado = "Planned";
    await comTalento(api)
      .em("GET", "/hr/performance/cycles", () => ({ status: 200, corpo: ciclos(planeado) }))
      .em("GET", "/hr/performance/objectives", () => ({ status: 200, corpo: objectivosGestao(valor) }))
      .em("POST", "/hr/performance/objectives", { status: 201, corpo: { objectiveId: "00000000-0000-4000-8000-000000000970" } })
      .em("POST", `/hr/performance/objectives/${IDF7C4.objectivo}/key-results`, { status: 201, corpo: { keyResultId: "00000000-0000-4000-8000-000000000971" } })
      .em("POST", `/hr/performance/key-results/${IDF7C4.kr}/progress`, () => {
        valor = 7;
        return { status: 204 };
      })
      .em("POST", `/hr/performance/cycles/${IDF7C4.cicloPlaneado}/activation`, () => {
        planeado = "Active";
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/desempenho");
    await expect(page.getByLabel("Ciclo")).toHaveValue(IDF7C4.ciclo);
    await expect(page.getByRole("heading", { name: "Visitar clientes" })).toBeVisible();
    await expect(page.getByText("4 de 10 clientes")).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar ciclo" })).toHaveCount(0);
    await verificar(page);

    await page.getByRole("button", { name: "Registar o valor de Clientes visitados" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Valor actual").fill("7,5x");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Número inválido (até 4 casas decimais).")).toBeVisible();
    await d.getByLabel("Valor actual").fill("7");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/hr/performance/key-results/${IDF7C4.kr}/progress`).map((p) => p.corpo)).toEqual([{ currentValue: "7" }]);
    await expect(page.getByText("7 de 10 clientes")).toBeVisible();

    await page.getByRole("button", { name: "Juntar um resultado-chave a Visitar clientes" }).click();
    await d.getByLabel("Título").fill("Propostas enviadas");
    await d.getByLabel("Meta").fill("0");
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d.getByText("A meta tem de ser diferente do ponto de partida.")).toBeVisible();
    await d.getByLabel("Meta").fill("12,5");
    await d.getByLabel("Unidade (opcional)").fill("propostas");
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/hr/performance/objectives/${IDF7C4.objectivo}/key-results`).map((p) => p.corpo)).toEqual([{ title: "Propostas enviadas", unit: "propostas", startValue: null, targetValue: "12.5" }]);

    await page.getByRole("button", { name: "Definir objectivo" }).click();
    await d.getByLabel("Título").fill("Reduzir atrasos");
    await d.getByLabel("De quem é").selectOption("departamento");
    await d.getByLabel("Departamento (opcional)").selectOption(ID.dep1);
    await d.getByLabel("Peso de 1 a 100 (opcional)").fill("30");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Definir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/performance/objectives").map((p) => p.corpo)).toEqual([
      { cycleId: IDF7C4.ciclo, title: "Reduzir atrasos", description: null, ownerEmployeeId: null, departmentId: ID.dep1, weight: 30 },
    ]);

    await page.getByLabel("Ciclo").selectOption(IDF7C4.cicloPlaneado);
    await page.getByRole("button", { name: "Iniciar ciclo" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Iniciar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/performance/cycles/${IDF7C4.cicloPlaneado}/activation`)).toHaveLength(1);
    await expect(page.getByRole("button", { name: "Iniciar ciclo" })).toHaveCount(0);
    expect(await violacoes()).toEqual([]);
  });

  test("conquistas: criar, classificação, atribuir (o servidor recusa repetida) e o separador da ficha", async ({ page, api }) => {
    let tentativas = 0;
    await comTalento(api)
      .em("POST", "/hr/achievements", { status: 201, corpo: { achievementId: "00000000-0000-4000-8000-000000000972" } })
      .em("POST", `/hr/employees/${ID.emp2}/achievements`, () => (++tentativas === 1 ? problema(409, "O colaborador já tem esta conquista.") : { status: 201, corpo: { awardId: "x" } }))
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/conquistas");
    await expect(page.getByRole("row").filter({ hasText: "Pontualidade" })).toContainText("50");
    await expect(page.getByRole("list", { name: "Classificação por pontos" })).toContainText("Carlos Teste");
    await verificar(page);
    await page.getByRole("button", { name: "Nova conquista" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Pontos de 0 a 10 000 (opcional)").fill("20000");
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d.getByText("Indique o código.")).toBeVisible();
    await expect(d.getByText("Os pontos são de 0 a 10 000.")).toBeVisible();
    await d.getByLabel("Código").fill("mentor");
    await d.getByLabel("Nome").fill("Mentor");
    await d.getByLabel("Pontos de 0 a 10 000 (opcional)").fill("100");
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/achievements").map((p) => p.corpo)).toEqual([{ code: "MENTOR", name: "Mentor", description: null, icon: null, points: 100, active: true }]);

    await page.goto(`/colaboradores/${ID.emp2}?vista=conquistas`);
    await expect(page.getByText("1 conquista · 50 pontos")).toBeVisible();
    await expect(page.getByText("«Bom trabalho.»")).toBeVisible();
    await page.getByRole("button", { name: "Atribuir conquista" }).click();
    await expect(d.getByText("Para Carlos Teste.")).toBeVisible();
    await d.getByLabel("Conquista").selectOption(IDF7C4.conquista);
    await d.getByRole("button", { name: "Atribuir" }).click();
    await expect(d.getByText("O colaborador já tem esta conquista.")).toBeVisible();
    await d.getByLabel("Nota (opcional)").fill("Outra vez.");
    await d.getByRole("button", { name: "Atribuir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/hr/employees/${ID.emp2}/achievements`).map((p) => p.corpo)).toEqual([
      { achievementId: IDF7C4.conquista, note: null },
      { achievementId: IDF7C4.conquista, note: "Outra vez." },
    ]);
  });

  test("importar colaboradores: valida o ficheiro e mostra o resumo por linha", async ({ page, api }) => {
    await comTalento(api)
      .em("POST", "/settings/import/employees", { status: 200, corpo: { totalRows: 3, imported: 1, duplicates: 1, rejected: 1, rows: [{ line: 2, outcome: 0, detail: null }, { line: 3, outcome: 1, detail: "Já existe." }, { line: 4, outcome: 2, detail: "DataAdmissao inválida." }] } })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/colaboradores");
    await page.getByRole("button", { name: "Importar CSV" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Importar" }).click();
    await expect(d.getByText("Escolha um ficheiro .csv.")).toBeVisible();
    await d.getByLabel("Ficheiro").setInputFiles({ name: "lista.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    await d.getByRole("button", { name: "Importar" }).click();
    await expect(d.getByText("O ficheiro tem de ser .csv.")).toBeVisible();
    expect(api.escritas("POST", "/settings/import/employees")).toHaveLength(0);
    await d.getByLabel("Ficheiro").setInputFiles({ name: "lista.csv", mimeType: "text/csv", buffer: Buffer.from("Nome;DataAdmissao\nAna;2026-01-05\n") });
    await d.getByRole("button", { name: "Importar" }).click();
    await expect(d.getByText("1 importados, 1 duplicados, 1 recusados (de 3).")).toBeVisible();
    await expect(d.getByText("Linha 4: Recusado · DataAdmissao inválida.")).toBeVisible();
    expect(String(api.escritas("POST", "/settings/import/employees")[0]?.corpo)).toContain('filename="lista.csv"');
  });
});
