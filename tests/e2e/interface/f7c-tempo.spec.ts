/**
 * F7c (3.º bloco) — formação e turnos na gestão, com a API simulada: formações
 * (planear validado, valores em texto, corrigir), formação (inscrever,
 * lotação, concluir com avaliação, cancelar inscrição e formação), escala
 * (janela no URL, escalar com aviso de substituídos, tirar), trocas (aprovar
 * passa ao colega) e tipos de turno (noite, código só ao criar). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { meRhF7 } from "../../fixtures/f7b";
import { cursos, escala, IDF7C3, inscricoesGestao, tiposTurno, trocasGestao } from "../../fixtures/f7c";

/** Hoje em Luanda (UTC+1), como o front o calcula. */
const hoje = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);

function comTempo(api: ApiSimulada): ApiSimulada {
  return comF1(api, meRhF7)
    .em("GET", "/hr/training/courses", { status: 200, corpo: cursos() })
    .em("GET", "/hr/training/enrolments", { status: 200, corpo: inscricoesGestao() })
    .em("GET", "/hr/shifts/types", { status: 200, corpo: tiposTurno() })
    .em("GET", "/hr/shifts/roster", { status: 200, corpo: escala(hoje()) })
    .em("GET", "/hr/shifts/change-requests", { status: 200, corpo: trocasGestao(hoje()) });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("formação e turnos", () => {
  test("formações: lista, menu, planear validado com números em texto", async ({ page, api, violacoes }) => {
    await comTempo(api).em("POST", "/hr/training/courses", { status: 201, corpo: { courseId: "00000000-0000-4000-8000-000000000996" } }).ligar();
    await entrar(page, meRhF7.email);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(menu.getByRole("link", { name: "Turnos" })).toBeVisible();
    await menu.getByRole("link", { name: "Formação" }).click();
    const linha = page.getByRole("row").filter({ hasText: "Primeiros socorros" });
    await expect(linha).toContainText("1 / 2");
    await expect(linha).toContainText("150 000,00");
    await expect(page.getByText("Excel avançado")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Planear formação" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Horas (opcional)").fill("0");
    await d.getByRole("button", { name: "Planear" }).click();
    await expect(d.getByText("Indique o título.")).toBeVisible();
    await expect(d.getByText("Indique o início.")).toBeVisible();
    await expect(d.getByText("Horas positivas (até 2 casas decimais).")).toBeVisible();
    expect(api.escritas("POST", "/hr/training/courses")).toHaveLength(0);
    await d.getByLabel("Título").fill("Segurança no trabalho");
    await d.getByLabel("Início").fill("2026-12-01");
    await d.getByLabel("Horas (opcional)").fill("7,5");
    await d.getByLabel("Custo (opcional)").fill("80 000,50");
    await d.getByLabel("Lotação (opcional)").fill("20");
    await d.getByLabel("Validade do certificado em meses (opcional)").fill("12");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Planear" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/training/courses").map((p) => p.corpo)).toEqual([
      { title: "Segurança no trabalho", provider: null, description: null, startsOn: "2026-12-01", endsOn: null, hours: "7.5", cost: "80000.50", currency: "AOA", capacity: 20, certificateValidityMonths: 12 },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("formação: inscrever, lotação, concluir com avaliação, cancelar inscrição e formação", async ({ page, api }) => {
    let inscritos = 1;
    let estado = "Enrolled";
    await comTempo(api)
      .em("GET", "/hr/training/courses", () => ({ status: 200, corpo: cursos(inscritos) }))
      .em("GET", "/hr/training/enrolments", () => ({ status: 200, corpo: inscricoesGestao(estado) }))
      .em("POST", `/hr/training/courses/${IDF7C3.curso}/enrolments`, () => {
        inscritos = 2;
        return { status: 201, corpo: { enrolmentId: "00000000-0000-4000-8000-000000000997" } };
      })
      .em("POST", `/hr/training/enrolments/${IDF7C3.inscricao}/completion`, () => {
        estado = "Completed";
        return { status: 204 };
      })
      .em("POST", `/hr/training/enrolments/${IDF7C3.inscricao}/cancellation`, { status: 204 })
      .em("POST", `/hr/training/courses/${IDF7C3.curso}/cancellation`, { status: 204 })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/formacao/${IDF7C3.curso}`);
    await expect(page.getByRole("heading", { name: "Primeiros socorros", level: 1 })).toBeVisible();
    await expect(page.getByText("24 meses")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Inscrever" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Inscrever" }).click();
    await expect(page.getByRole("dialog").getByText("Escolha o colaborador.")).toBeVisible();
    await page.getByRole("dialog").getByLabel("Colaborador").selectOption(ID.emp1);
    await page.getByRole("dialog").getByRole("button", { name: "Inscrever" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/training/courses/${IDF7C3.curso}/enrolments`).map((p) => p.corpo)).toEqual([{ employeeId: ID.emp1 }]);
    // Lotada (2 de 2): já não se inscreve.
    await expect(page.getByRole("button", { name: "Inscrever" })).toBeDisabled();

    await page.getByRole("button", { name: "Concluir a formação de Carlos Teste" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Avaliação de 0 a 100 (opcional)").fill("101");
    await d.getByRole("button", { name: "Concluir" }).click();
    await expect(d.getByText("A avaliação é de 0 a 100.")).toBeVisible();
    await d.getByLabel("Avaliação de 0 a 100 (opcional)").fill("87,5");
    await d.getByLabel("N.º do certificado (opcional)").fill("PS-001");
    await d.getByRole("button", { name: "Concluir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/hr/training/enrolments/${IDF7C3.inscricao}/completion`).map((p) => p.corpo)).toEqual([
      { completedOn: hoje(), score: "87.5", notes: null, certificateNumber: "PS-001" },
    ]);
    await expect(page.getByText("PS-001 · válido até 17/10/2028")).toBeVisible();
    await expect(page.getByRole("button", { name: /Cancelar a inscrição/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Cancelar formação" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar formação" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/training/courses/${IDF7C3.curso}/cancellation`)).toHaveLength(1);
  });

  test("formação cancelada: só leitura", async ({ page, api }) => {
    await comTempo(api).ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/formacao/${IDF7C3.cancelado}`);
    await expect(page.getByText("Formação cancelada: não aceita inscrições.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Inscrever" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Corrigir" })).toHaveCount(0);
  });

  test("escala: janela no URL e limite; escalar avisa os substituídos; tirar da escala", async ({ page, api, violacoes }) => {
    await comTempo(api)
      .em("POST", "/hr/shifts/roster", { status: 201, corpo: { assignmentId: "00000000-0000-4000-8000-000000000998", days: [{ day: "2026-11-01", assignmentId: "x1", replacedAssignmentId: "y1", replacedShiftTypeId: IDF7C3.manha }, { day: "2026-11-02", assignmentId: "x2", replacedAssignmentId: null, replacedShiftTypeId: null }] } })
      .em("DELETE", `/hr/shifts/roster/${IDF7C3.escalado}`, { status: 204 })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/turnos");
    const linha = page.getByRole("row").filter({ hasText: "Carlos Teste" });
    await expect(linha).toContainText("N · Noite");
    await expect(linha).toContainText("22:00–06:00 (dia seguinte)");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/hr/shifts/roster" && p.query.includes(`from=${hoje()}`))).toBe(true);
    await verificar(page);
    await page.goto("/turnos?de=2026-11-01&ate=2027-03-01");
    await expect(page.getByText("No máximo 94 dias.")).toBeVisible();
    expect(api.pedidos.some((p) => p.caminho === "/hr/shifts/roster" && p.query.includes("to=2027-03-01"))).toBe(false);
    await page.goto("/turnos");

    await page.getByRole("button", { name: "Escalar" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Escalar" }).click();
    await expect(d.getByText("Escolha o colaborador.")).toBeVisible();
    await expect(d.getByText("Escolha o turno.")).toBeVisible();
    await d.getByLabel("Colaborador").selectOption(ID.emp1);
    await d.getByLabel("Turno").selectOption(IDF7C3.manha);
    await d.getByLabel("Primeiro dia").fill("2026-11-01");
    await d.getByLabel("Último dia (opcional)").fill("2026-11-02");
    await expect(d.getByText("2 dias (no máximo 94).")).toBeVisible();
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Escalar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/shifts/roster").map((p) => p.corpo)).toEqual([{ employeeId: ID.emp1, shiftTypeId: IDF7C3.manha, from: "2026-11-01", to: "2026-11-02", notes: null }]);
    await expect(page.getByText("1 turno anterior foi substituído.")).toBeVisible();

    await page.getByRole("button", { name: /Tirar Carlos Teste da escala/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Tirar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("DELETE", `/hr/shifts/roster/${IDF7C3.escalado}`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });

  test("trocas: por decidir por omissão; aprovar passa o turno ao colega, com notas", async ({ page, api }) => {
    let estado = "Pending";
    await comTempo(api)
      .em("GET", "/hr/shifts/change-requests", () => ({ status: 200, corpo: estado === "Pending" ? trocasGestao(hoje()) : [] }))
      .em("POST", `/hr/shifts/change-requests/${IDF7C3.troca}/decision`, () => {
        estado = "Approved";
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/turnos?vista=trocas");
    await expect(page.getByRole("row").filter({ hasText: "Carlos Teste" })).toContainText("Ana Teste");
    expect(api.pedidos.some((p) => p.caminho === "/hr/shifts/change-requests" && p.query.includes("status=Pending"))).toBe(true);
    await verificar(page);
    await page.getByRole("button", { name: /Aprovar a troca de Carlos Teste/ }).click();
    await expect(page.getByRole("dialog")).toContainText("passa de Carlos Teste para Ana Teste");
    await page.getByRole("dialog").getByLabel("Notas (opcional)").fill("Combinado.");
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/shifts/change-requests/${IDF7C3.troca}/decision`).map((p) => p.corpo)).toEqual([{ approved: true, notes: "Combinado." }]);
    await expect(page.getByText("Nenhum pedido de troca por decidir.")).toBeVisible();
  });

  test("tipos de turno: criar o da noite (código em maiúsculas); corrigir sem mexer no código", async ({ page, api }) => {
    await comTempo(api)
      .em("POST", "/hr/shifts/types", { status: 201, corpo: { shiftTypeId: "00000000-0000-4000-8000-000000000999" } })
      .em("PUT", `/hr/shifts/types/${IDF7C3.manha}`, { status: 204 })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/turnos?vista=tipos");
    await expect(page.getByRole("row").filter({ hasText: "Noite" })).toContainText("(dia seguinte)");
    await verificar(page);
    await page.getByRole("button", { name: "Novo tipo de turno" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Início").fill("08:00");
    await d.getByLabel("Fim").fill("08:00");
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d.getByText("Indique o código.")).toBeVisible();
    await expect(d.getByText("Início e fim do turno não podem coincidir.")).toBeVisible();
    await d.getByLabel("Código").fill("ns");
    await d.getByLabel("Nome").fill("Noite de sábado");
    await d.getByLabel("Início").fill("23:00");
    await d.getByLabel("Fim").fill("07:00");
    await expect(d.getByText("Acaba no dia seguinte.", { exact: true })).toBeVisible();
    await d.getByRole("button", { name: "Criar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/shifts/types").map((p) => p.corpo)).toEqual([{ code: "NS", name: "Noite de sábado", startsAt: "23:00:00", endsAt: "07:00:00", active: true }]);

    await page.getByRole("button", { name: "Corrigir o turno Manhã" }).click();
    await expect(d.getByLabel("Código")).toBeDisabled();
    await d.getByLabel("Activo").uncheck();
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/hr/shifts/types/${IDF7C3.manha}`).map((p) => p.corpo)).toEqual([{ code: null, name: "Manhã", startsAt: "06:00:00", endsAt: "14:00:00", active: false }]);
  });
});
