/**
 * F7c (1.º bloco) — recrutamento e entradas/saídas, com a API simulada: vagas
 * (abrir validado, fechar), funil (registar candidato, avançar um passo,
 * rejeitar, contratar da proposta com o departamento da vaga), vaga fechada
 * sem candidaturas, processos com tarefas (marcar feita, concluir só com
 * todas, iniciar exige tarefa e, na saída, o último dia). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { meRhF7 } from "../../fixtures/f7b";
import { candidatos, IDF7C, processos, vagas } from "../../fixtures/f7c";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const problema = (status: number, detail: string) => ({ status, corpo: { status, title: "Conflito", detail }, cabecalhos: { "Content-Type": "application/problem+json" } });

function comF7c(api: ApiSimulada): ApiSimulada {
  return comF1(api, meRhF7)
    .em("GET", "/hr/recruitment/openings", pag(vagas()))
    .em("GET", "/hr/recruitment/candidates", pag(candidatos()))
    .em("GET", "/hr/lifecycle", pag(processos()));
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("recrutamento e entradas/saídas", () => {
  test("menu Talento; abrir vaga validada, com o departamento e o número em inteiro", async ({ page, api, violacoes }) => {
    await comF7c(api).em("POST", "/hr/recruitment/openings", { status: 201, corpo: { openingId: "00000000-0000-4000-8000-000000000990" } }).ligar();
    await entrar(page, meRhF7.email);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(menu.getByRole("link", { name: "Entradas e saídas" })).toBeVisible();
    await menu.getByRole("link", { name: "Recrutamento" }).click();
    await expect(page.getByRole("link", { name: "Contabilista Teste" })).toHaveAttribute("href", `/recrutamento/${IDF7C.vaga}`);
    await expect(page.getByRole("row").filter({ hasText: "Motorista Teste" }).getByText("Fechada")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Abrir vaga" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("N.º de vagas").fill("0");
    await d.getByRole("button", { name: "Abrir vaga" }).click();
    await expect(d.getByText("Indique o título da vaga.")).toBeVisible();
    await expect(d.getByText("Pelo menos uma vaga (número inteiro).")).toBeVisible();
    expect(api.escritas("POST", "/hr/recruitment/openings")).toHaveLength(0);
    await d.getByLabel("Título").fill("  Técnico de redes ");
    await d.getByLabel("Departamento (opcional)").selectOption({ label: "Operações" });
    await d.getByLabel("N.º de vagas").fill("3");
    await d.getByLabel("Requisitos (opcional)").fill("CCNA.");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Abrir vaga" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/recruitment/openings").map((p) => p.corpo)).toEqual([{ title: "Técnico de redes", departmentId: ID.dep1, vacancies: 3, description: null, requirements: "CCNA." }]);
    expect(await violacoes()).toEqual([]);
  });

  test("funil: registar candidato, avançar um passo, rejeitar e contratar da proposta", async ({ page, api }) => {
    let lista = candidatos();
    await comF7c(api)
      .em("GET", "/hr/recruitment/candidates", () => pag(lista))
      .em("POST", `/hr/recruitment/openings/${IDF7C.vaga}/candidates`, { status: 201, corpo: { candidateId: "00000000-0000-4000-8000-000000000991" } })
      .em("POST", `/hr/recruitment/candidates/${IDF7C.candidato}/stage`, () => {
        lista = candidatos("Interview");
        return { status: 204 };
      })
      .em("POST", `/hr/recruitment/candidates/${IDF7C.candidatoProposta}/hire`, () => {
        lista = candidatos("Interview", "Hired");
        return { status: 201, corpo: { employeeId: IDF7C.novoColaborador } };
      })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/recrutamento/${IDF7C.vaga}`);
    await expect(page.getByRole("heading", { name: "Contabilista Teste", level: 1 })).toBeVisible();
    await expect(page.getByText("Licenciatura.")).toBeVisible();
    await verificar(page);

    await page.getByRole("button", { name: "Registar candidato" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("E-mail (opcional)").fill("sem-arroba");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Indique o nome.")).toBeVisible();
    await expect(d.getByText("E-mail inválido.")).toBeVisible();
    await d.getByLabel("Nome completo").fill("Eva Teste");
    await d.getByLabel("E-mail (opcional)").fill("eva@teste.local");
    await d.getByLabel("Data da candidatura").fill("2026-10-15");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/hr/recruitment/openings/${IDF7C.vaga}/candidates`).map((p) => p.corpo)).toEqual([{ fullName: "Eva Teste", email: "eva@teste.local", phone: null, appliedOn: "2026-10-15" }]);

    // Da triagem só se passa à entrevista; da proposta não se avança, contrata-se.
    await expect(page.getByRole("button", { name: "Passar Dora Teste a", exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: "Passar Bruno Teste a Entrevista" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Avançar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/recruitment/candidates/${IDF7C.candidato}/stage`).map((p) => p.corpo)).toEqual([{ stage: "Interview" }]);
    await expect(page.getByRole("button", { name: "Passar Bruno Teste a Proposta" })).toBeVisible();

    await page.getByRole("button", { name: "Contratar Dora Teste" }).click();
    await expect(page.getByRole("dialog").getByLabel("Departamento")).toHaveValue(ID.dep1);
    await page.getByRole("dialog").getByRole("button", { name: "Contratar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/recruitment/candidates/${IDF7C.candidatoProposta}/hire`).map((p) => p.corpo)).toEqual([{ departmentId: ID.dep1 }]);
    await expect(page.getByRole("link", { name: "Abrir a ficha de Dora Teste" })).toHaveAttribute("href", `/colaboradores/${IDF7C.novoColaborador}`);
    await expect(page.getByRole("link", { name: "Iniciar a entrada de Dora Teste" })).toHaveAttribute("href", `/entradas-saidas?iniciar=${IDF7C.novoColaborador}`);
  });

  test("rejeitar mostra a recusa do servidor; vaga fechada não aceita candidaturas", async ({ page, api }) => {
    await comF7c(api)
      .em("POST", `/hr/recruitment/candidates/${IDF7C.candidato}/stage`, problema(409, "Este candidato já saiu do funil."))
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/recrutamento/${IDF7C.vaga}`);
    await page.getByRole("button", { name: "Rejeitar Bruno Teste" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(page.getByRole("dialog").getByText("Este candidato já saiu do funil.")).toBeVisible();
    expect(api.escritas("POST", `/hr/recruitment/candidates/${IDF7C.candidato}/stage`).map((p) => p.corpo)).toEqual([{ stage: "Rejected" }]);
    await page.keyboard.press("Escape");
    await page.goto(`/recrutamento/${IDF7C.vagaFechada}`);
    await expect(page.getByText("Vaga fechada: não aceita candidaturas novas.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Registar candidato" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Fechar vaga" })).toHaveCount(0);
    await page.goto("/recrutamento/00000000-0000-4000-8000-000000000999");
    await expect(page.getByText("Vaga não encontrada.")).toBeVisible();
  });

  test("fechar uma vaga aberta", async ({ page, api }) => {
    await comF7c(api).em("POST", `/hr/recruitment/openings/${IDF7C.vaga}/closure`, { status: 204 }).ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/recrutamento/${IDF7C.vaga}`);
    await page.getByRole("button", { name: "Fechar vaga" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Fechar vaga" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/recruitment/openings/${IDF7C.vaga}/closure`)).toHaveLength(1);
  });

  test("saída: marcar a última tarefa feita e concluir; o filtro vai no URL", async ({ page, api, violacoes }) => {
    let lista = processos();
    await comF7c(api)
      .em("GET", "/hr/lifecycle", () => pag(lista))
      .em("POST", `/hr/lifecycle/${IDF7C.processo}/tasks/${IDF7C.tarefa2}/completion`, () => {
        lista = processos(true);
        return { status: 204 };
      })
      .em("POST", `/hr/lifecycle/${IDF7C.processo}/completion`, () => {
        lista = processos(true, "Completed");
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/entradas-saidas");
    await expect(page.getByText("Último dia: 31/10/2026.", { exact: false })).toBeVisible();
    await expect(page.getByText("1 de 2 tarefas feitas")).toBeVisible();
    await expect(page.getByRole("button", { name: /Concluir saída/ })).toHaveCount(0);
    await verificar(page);
    await page.getByRole("button", { name: "Marcar feita: Acerto final de contas" }).click();
    await expect(page.getByText("2 de 2 tarefas feitas")).toBeVisible();
    await page.getByRole("button", { name: "Concluir saída" }).click();
    await expect(page.getByRole("dialog")).toContainText("Carlos Teste");
    await page.getByRole("dialog").getByRole("button", { name: "Concluir" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Concluído", { exact: true })).toBeVisible();
    expect(api.escritas("POST", `/hr/lifecycle/${IDF7C.processo}/completion`)).toHaveLength(1);
    await page.getByLabel("Tipo").selectOption("Onboarding");
    await expect(page).toHaveURL(/tipo=Onboarding/);
    expect(api.pedidos.some((p) => p.caminho === "/hr/lifecycle" && p.query.includes("kind=Onboarding"))).toBe(true);
    expect(await violacoes()).toEqual([]);
  });

  test("iniciar: exige uma tarefa e, na saída, o último dia; envia só as linhas preenchidas", async ({ page, api }) => {
    await comF7c(api).em("POST", "/hr/lifecycle", { status: 201, corpo: { processId: "00000000-0000-4000-8000-000000000992" } }).ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/entradas-saidas?iniciar=${ID.emp2}`);
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Colaborador")).toHaveValue(ID.emp2);
    await d.getByLabel("Tipo").selectOption("Offboarding");
    await d.getByRole("button", { name: "Iniciar" }).click();
    await expect(d.getByText("Uma saída exige o último dia de trabalho.")).toBeVisible();
    await expect(d.getByText("Indique pelo menos uma tarefa: um processo sem tarefas não se conclui.")).toBeVisible();
    expect(api.escritas("POST", "/hr/lifecycle")).toHaveLength(0);
    await d.getByLabel("Último dia de trabalho").fill("2026-11-30");
    await d.getByLabel("Motivo (opcional)").fill("Mudança de cidade.");
    await d.getByLabel("Tarefa 1", { exact: true }).fill("Devolver o cartão");
    await d.getByLabel("Área da tarefa 1").selectOption("assets");
    await d.getByRole("button", { name: "Juntar tarefa" }).click();
    await d.getByLabel("Tarefa 2", { exact: true }).fill("Entrevista de saída");
    await d.getByLabel("Prazo da tarefa 2 (opcional)").fill("2026-11-28");
    await d.getByRole("button", { name: "Juntar tarefa" }).click();
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Iniciar" }).click();
    await expect(d).toHaveCount(0);
    await expect(page).not.toHaveURL(/iniciar=/);
    expect(api.escritas("POST", "/hr/lifecycle").map((p) => p.corpo)).toEqual([
      {
        employeeId: ID.emp2,
        kind: "Offboarding",
        lastWorkingDay: "2026-11-30",
        reason: "Mudança de cidade.",
        tasks: [
          { title: "Devolver o cartão", category: "assets", dueOn: null, description: null },
          { title: "Entrevista de saída", category: "hr", dueOn: "2026-11-28", description: null },
        ],
      },
    ]);
  });
});
