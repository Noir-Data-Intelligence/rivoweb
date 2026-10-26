/**
 * Auditoria interna (backend #119), com a API simulada: cartões do topo (a
 * conformidade sem achados é «—»), auditorias com filtros, planear (os
 * lookups só com o formulário aberto); no detalhe, as fases uma de cada vez
 * («Fechar» parado com achados por resolver), os PUT com o registo inteiro,
 * a separação de funções (403) com o aviso certo, aceitar o risco, um plano
 * novo, o histórico e cancelar. O Manager só lê (sem botões nem lookups);
 * quem não tem a permissão não vê o menu e o URL dá «sem acesso».
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { meManagerF13 } from "../../fixtures/f13";
import { achadosF14, auditoriasF14, detalheF14, historicoF14, IDF14, meAdminF14, meManagerF14, opcoesF14, planosF14, resumoF14 } from "../../fixtures/f14";

function comAuditoriaInterna(api: ApiSimulada, me = meAdminF14): ApiSimulada {
  let a = comF1(api, me)
    .em("GET", "/internal-audit/overview", { status: 200, corpo: resumoF14() })
    .em("GET", "/internal-audit/audits", (route) => {
      const estado = new URL(route.request().url()).searchParams.get("status");
      return { status: 200, corpo: auditoriasF14().filter((x) => !estado || x.status === estado) };
    })
    .em("GET", "/internal-audit/findings", { status: 200, corpo: achadosF14() })
    .em("GET", "/internal-audit/action-plans", { status: 200, corpo: planosF14() })
    .em("GET", "/internal-audit/lookups", { status: 200, corpo: opcoesF14() });
  for (const id of [IDF14.relatorio, IDF14.campo, IDF14.fechada]) {
    a = a.em("GET", `/internal-audit/audits/${id}`, { status: 200, corpo: detalheF14(id) }).em("GET", `/internal-audit/audits/${id}/history`, { status: 200, corpo: id === IDF14.relatorio ? historicoF14() : [] });
  }
  return a;
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

const menu = (page: Page) => page.getByRole("navigation", { name: "Principal" });

test.describe("auditoria interna", () => {
  test("Admin: cartões, auditorias com filtro, planear (lookups só ao abrir) e abrir o detalhe", async ({ page, api, violacoes }) => {
    await comAuditoriaInterna(api).em("POST", "/internal-audit/audits", { status: 201, corpo: { id: IDF14.campo } }).ligar();
    await entrar(page, meAdminF14.email);
    await menu(page).getByRole("link", { name: "Auditoria interna" }).click();
    await expect(page.getByRole("heading", { name: "Auditoria interna", level: 1 })).toBeVisible();
    await expect(page.getByText("Conformidade", { exact: true }).locator("..")).toContainText("—");
    await expect(page.getByText("Planos atrasados", { exact: true }).locator("..")).toContainText("1");
    const tabela = page.getByRole("table", { name: "Auditorias" });
    await expect(tabela.getByRole("row").filter({ hasText: "AUD-2026-002" })).toContainText("Relatório");
    await expect(tabela.getByRole("row").filter({ hasText: "AUD-2026-002" })).toContainText("2 de 2");
    await expect(tabela).toContainText("Compras <b>2026</b>");
    expect(api.pedidos.some((p) => p.caminho === "/internal-audit/lookups")).toBe(false);
    await verificar(page);

    await page.getByLabel("Fase").selectOption("Closed");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/internal-audit/audits" && p.query.includes("status=Closed"))).toBe(true);
    await expect(tabela.getByRole("row")).toHaveCount(2);
    await page.getByLabel("Fase").selectOption("");

    await page.getByRole("button", { name: "Nova auditoria" }).click();
    const d = page.getByRole("dialog");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/internal-audit/lookups")).toBe(true);
    await d.getByRole("button", { name: "Planear" }).click();
    await expect(d.getByText("Indique o título.")).toBeVisible();
    await expect(d.getByText("Escolha o departamento auditado.")).toBeVisible();
    await d.getByLabel("Título").fill("  Caixa pequena  ");
    await d.getByLabel("Departamento auditado").selectOption({ label: "Compras" });
    await d.getByLabel("Responsável").selectOption({ label: "Ana Auditora" });
    await d.getByLabel("Início previsto").fill("2026-11-01");
    await d.getByLabel("Fim previsto").fill("2026-10-01");
    await d.getByRole("button", { name: "Planear" }).click();
    await expect(d.getByText("O fim não pode ser antes do início.")).toBeVisible();
    await d.getByLabel("Fim previsto").fill("2026-11-30");
    await d.getByLabel("Risco").selectOption("Low");
    await d.getByRole("button", { name: "Planear" }).click();
    await expect(page).toHaveURL(new RegExp(`/auditoria-interna/${IDF14.campo}$`));
    expect(api.escritas("POST", "/internal-audit/audits")[0]?.corpo).toEqual({
      title: "Caixa pequena",
      objectives: null,
      scope: null,
      departmentId: IDF14.compras,
      ownerEmployeeId: IDF14.ana,
      plannedStart: "2026-11-01",
      plannedEnd: "2026-11-30",
      riskRating: "Low",
      status: null,
      cancellationReason: null,
    });
    await expect(page.getByRole("heading", { name: "AUD-2026-003 · Caixa pequena" })).toBeVisible();
    await expect(page.getByText("Sem achados registados.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo achado" })).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });

  test("Admin: detalhe com fases, separação de funções, risco aceite, plano novo, histórico e cancelar", async ({ page, api, violacoes }) => {
    await comAuditoriaInterna(api)
      .em("PUT", `/internal-audit/audits/${IDF14.relatorio}`, { status: 204 })
      .em("PUT", `/internal-audit/findings/${IDF14.achado2}`, (route) =>
        (route.request().postDataJSON() as { status: string }).status === "Closed"
          ? { status: 403, corpo: { title: "Forbidden", status: 403, detail: "Quem é responsável por um plano de acção do achado não o pode fechar nem aceitar o risco." }, cabecalhos: { "Content-Type": "application/problem+json" } }
          : { status: 204 },
      )
      .em("POST", `/internal-audit/findings/${IDF14.achado2}/action-plans`, { status: 201, corpo: { id: "p9" } })
      .ligar();
    await entrar(page, meAdminF14.email);
    await page.goto(`/auditoria-interna/${IDF14.relatorio}`);
    await expect(page.getByRole("heading", { name: "AUD-2026-002 · Compras <b>2026</b>" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar" })).toHaveCount(0);
    const fecharAuditoria = page.getByRole("button", { name: "Fechar", exact: true }).first();
    await expect(fecharAuditoria).toBeDisabled();
    await expect(page.getByText("Para fechar, todos os achados têm de estar fechados ou com o risco aceite (2 por resolver).")).toBeVisible();

    const a1 = page.getByRole("region", { name: "Achado 1" });
    const a2 = page.getByRole("region", { name: "Achado 2" });
    await expect(a1.getByRole("button", { name: "Fechar", exact: true })).toBeDisabled();
    await expect(a1.getByRole("table", { name: "Planos de acção do achado 1" }).getByRole("row").filter({ hasText: "Formar os compradores" })).toContainText("Atrasado");
    await expect(a2).toContainText("Fornecedor <script>x</script> sem contrato");
    expect(await page.locator("main script").count()).toBe(0);
    const historico = page.getByRole("list", { name: "Histórico da auditoria" });
    await expect(historico.getByRole("listitem")).toHaveCount(3);
    await expect(historico.getByRole("listitem").nth(1)).toContainText("Achado registado");
    await expect(historico.getByRole("listitem").nth(1)).toContainText("Achado 2");
    await expect(historico.getByRole("listitem").nth(1)).toContainText("Sistema");
    await expect(historico.getByRole("listitem").nth(2)).toContainText("Formar os compradores");
    await verificar(page);

    // Voltar ao campo: o registo inteiro, com o estado novo.
    await page.getByRole("button", { name: "Voltar a em curso" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Voltar a em curso" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("PUT", `/internal-audit/audits/${IDF14.relatorio}`)[0]?.corpo).toEqual({
      title: "Compras <b>2026</b>",
      objectives: "Rever as compras acima de 1 milhão",
      scope: null,
      departmentId: IDF14.compras,
      ownerEmployeeId: IDF14.ana,
      plannedStart: "2026-11-01",
      plannedEnd: "2026-11-30",
      riskRating: "High",
      status: "InProgress",
      cancellationReason: null,
    });

    // Separação de funções: o 403 com o aviso certo.
    await a2.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Fechar achado" }).click();
    await expect(page.getByRole("dialog").getByText("Quem executa um plano não pode fechar o achado.")).toBeVisible();
    expect(api.escritas("PUT", `/internal-audit/findings/${IDF14.achado2}`)[0]?.corpo).toMatchObject({ description: "Fornecedor <script>x</script> sem contrato", severity: "Medium", status: "Closed" });
    await page.keyboard.press("Escape");

    // Aceitar o risco exige o motivo.
    await a2.getByRole("button", { name: "Aceitar o risco" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aceitar o risco" }).click();
    await expect(page.getByRole("dialog").getByText("Indique o motivo.")).toBeVisible();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Fornecedor único no país");
    await page.getByRole("dialog").getByRole("button", { name: "Aceitar o risco" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("PUT", `/internal-audit/findings/${IDF14.achado2}`).at(-1)?.corpo).toEqual({
      description: "Fornecedor <script>x</script> sem contrato",
      severity: "Medium",
      controlRef: null,
      recommendation: null,
      status: "AcceptedRisk",
      resolutionNotes: "Fornecedor único no país",
    });

    // Plano novo: nasce pendente.
    await a2.getByRole("button", { name: "Novo plano" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Acção").fill("Assinar contrato");
    await d.getByLabel("Responsável").selectOption({ label: "Rui Compras" });
    await d.getByLabel("Prazo").fill("2026-12-15");
    await d.getByRole("button", { name: "Criar plano" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/internal-audit/findings/${IDF14.achado2}/action-plans`)[0]?.corpo).toEqual({ action: "Assinar contrato", ownerEmployeeId: IDF14.rui, dueDate: "2026-12-15", status: null });

    // Cancelar com motivo.
    await page.getByRole("button", { name: "Cancelar auditoria" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill("Reestruturação do departamento");
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar auditoria" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("PUT", `/internal-audit/audits/${IDF14.relatorio}`).at(-1)?.corpo).toMatchObject({ status: "Cancelled", cancellationReason: "Reestruturação do departamento", title: "Compras <b>2026</b>" });
    expect(await violacoes()).toEqual([]);
  });

  test("Admin: achados e planos com filtros; encerrada sem botões", async ({ page, api, violacoes }) => {
    await comAuditoriaInterna(api).ligar();
    await entrar(page, meAdminF14.email);
    await page.goto("/auditoria-interna?vista=achados");
    const achados = page.getByRole("table", { name: "Achados" });
    await expect(achados.getByRole("row").filter({ hasText: "Compras sem três cotações" })).toContainText("Crítico");
    await expect(achados.getByRole("row").filter({ hasText: "Compras sem três cotações" })).toContainText("1 de 2");
    await page.getByLabel("Gravidade").selectOption("Critical");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/internal-audit/findings" && p.query.includes("severity=Critical"))).toBe(true);
    await verificar(page);

    await page.getByRole("link", { name: "Planos de acção" }).click();
    const planos = page.getByRole("table", { name: "Planos de acção" });
    await expect(planos.getByRole("row").filter({ hasText: "Formar os compradores" })).toContainText("Atrasado");
    await page.getByLabel("Só os atrasados").check();
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/internal-audit/action-plans" && p.query.includes("overdue=true"))).toBe(true);
    await verificar(page);

    await page.goto(`/auditoria-interna/${IDF14.fechada}`);
    await expect(page.getByRole("heading", { name: "AUD-2026-001 · Inventário" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Corrigir" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cancelar auditoria" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Novo achado" })).toHaveCount(0);
    expect(await violacoes()).toEqual([]);
  });

  test("Manager: só leitura, sem botões de escrita e sem pedir os lookups", async ({ page, api, violacoes }) => {
    await comAuditoriaInterna(api, meManagerF14).ligar();
    await entrar(page, meManagerF14.email);
    await menu(page).getByRole("link", { name: "Auditoria interna" }).click();
    await expect(page.getByRole("table", { name: "Auditorias" }).getByRole("row").filter({ hasText: "AUD-2026-002" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova auditoria" })).toHaveCount(0);
    await page.getByRole("link", { name: "AUD-2026-002" }).click();
    await expect(page.getByRole("region", { name: "Achado 1" })).toBeVisible();
    for (const nome of ["Voltar a em curso", "Corrigir", "Cancelar auditoria", "Novo achado", "Novo plano", "Aceitar o risco"]) await expect(page.getByRole("button", { name: nome })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Fechar", exact: true })).toHaveCount(0);
    await verificar(page);
    expect(api.pedidos.some((p) => p.caminho === "/internal-audit/lookups")).toBe(false);
    expect(await violacoes()).toEqual([]);
  });

  test("sem a permissão: sem entrada no menu e o URL directo dá «sem acesso»", async ({ page, api, violacoes }) => {
    await comAuditoriaInterna(api, meManagerF13).ligar();
    await entrar(page, meManagerF13.email);
    await expect(menu(page).getByRole("link", { name: "Auditoria interna" })).toHaveCount(0);
    await page.goto("/auditoria-interna");
    await expect(page.getByRole("heading", { name: "Não tem acesso a esta área" })).toBeVisible();
    expect(api.pedidos.some((p) => p.caminho.startsWith("/internal-audit"))).toBe(false);
    expect(await violacoes()).toEqual([]);
  });
});
