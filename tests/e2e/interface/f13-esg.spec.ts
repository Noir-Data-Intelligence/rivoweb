/**
 * F13 (2.º bloco) — ESG, com a API simulada: relatório do ano (no URL) por
 * pilar com a pontuação; indicadores (definir validado com o factor e a
 * fonte, corrigir e desactivar), medições do mês (lista com o convertido,
 * registar); iniciativas (planear, corrigir o progresso, concluir, cancelar;
 * o responsável pelo nome na vista e pelos colaboradores de `/esg/lookups`, B41). Texto de fora nunca vira HTML.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { escolhasEsg, IDF13, indicadoresEsg, iniciativasEsg, meManagerF13, medicoesEsg, relatorioEsg } from "../../fixtures/f13";

function comEsg(api: ApiSimulada, me = meManagerF13): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/esg/indicators", { status: 200, corpo: indicadoresEsg() })
    .em("GET", "/esg/measurements", { status: 200, corpo: medicoesEsg() })
    .em("GET", "/esg/initiatives", { status: 200, corpo: iniciativasEsg() })
    .em("GET", "/esg/lookups", { status: 200, corpo: escolhasEsg() })
    .em("GET", "/esg/report", (route) => ({ status: 200, corpo: relatorioEsg(Number(new URL(route.request().url()).searchParams.get("year"))) }));
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("esg", () => {
  test("Manager: relatório por pilar com o ano no URL; indicadores definidos, corrigidos e medidos", async ({ page, api, violacoes }) => {
    await comEsg(api)
      .em("POST", "/esg/indicators", { status: 201, corpo: { id: "i9" } })
      .em("PUT", `/esg/indicators/${IDF13.gasoleo}`, { status: 204 })
      .em("POST", `/esg/indicators/${IDF13.gasoleo}/measurements`, { status: 201, corpo: { id: "m9" } })
      .ligar();
    await entrar(page, meManagerF13.email);
    await page.getByRole("link", { name: "ESG" }).click();
    await expect(page.getByText("Pontuação global").locator("..")).toContainText("50,0");
    const amb = page.getByRole("table", { name: "Indicadores Ambiental" });
    await expect(amb.getByRole("row").filter({ hasText: "ENV-01" })).toContainText("Sim");
    await expect(amb).toContainText("kgCO2e");
    await expect(page.getByRole("table", { name: "Indicadores Social" }).getByRole("row").filter({ hasText: "SOC-01" })).toContainText("Sem meta");
    const anoAnterior = String(new Date().getFullYear() - 1);
    await page.getByLabel("Ano").selectOption(anoAnterior);
    await expect(page).toHaveURL(new RegExp(`ano=${anoAnterior}`));
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/esg/report" && p.query.includes(`year=${anoAnterior}`))).toBe(true);
    await verificar(page);

    await page.getByRole("link", { name: "Indicadores" }).click();
    const tabela = page.getByRole("table", { name: "Indicadores" });
    await expect(tabela.getByRole("row").filter({ hasText: "GOV-09" })).toContainText("Desactivado");
    await expect(tabela).toContainText("<b>por pessoa</b>");
    await expect(tabela.getByRole("row").filter({ hasText: "ENV-01" })).toContainText("litros → kgCO2e");
    await verificar(page);

    await page.getByRole("button", { name: "Novo indicador" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Código").fill("env-02");
    await d.getByLabel("Nome").fill("Electricidade");
    await d.getByLabel("Unidade").fill("kWh");
    await d.getByLabel("Factor de conversão (opcional)").fill("0,5");
    await d.getByRole("button", { name: "Definir" }).click();
    await expect(d.getByText("Com factor, indique a fonte (de onde vem o valor).")).toBeVisible();
    await d.getByLabel("Unidade convertida").fill("kgCO2e");
    await d.getByLabel("Fonte do factor").fill("Contrato com a distribuidora");
    await d.getByLabel("Meta anual (opcional)").fill("10 000");
    await d.getByLabel("No ano conta").selectOption("Average");
    await d.getByRole("button", { name: "Definir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/esg/indicators")[0]?.corpo).toEqual({
      code: "ENV-02",
      name: "Electricidade",
      pillar: "Environmental",
      category: null,
      unit: "kWh",
      aggregation: "Average",
      direction: "LowerIsBetter",
      annualTarget: "10000",
      conversionFactor: "0.5",
      convertedUnit: "kgCO2e",
      factorSource: "Contrato com a distribuidora",
      active: true,
    });

    await page.getByRole("button", { name: "Corrigir o indicador ENV-01" }).click();
    await expect(d.getByLabel("Código")).toBeDisabled();
    await d.getByLabel("Activo (recebe medições)").click();
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/esg/indicators/${IDF13.gasoleo}`)[0]?.corpo).toMatchObject({ code: "ENV-01", annualTarget: "30000", conversionFactor: "2.68", active: false });

    await page.getByRole("button", { name: "Medições de ENV-01" }).click();
    const med = d.getByRole("table", { name: "Medições" });
    await expect(med.getByRole("row").filter({ hasText: "2026" })).toContainText(/3\s?216/);
    await expect(med).toContainText("<script>x</script>");
    expect(await page.locator("[role=dialog] script").count()).toBe(0);
    await d.getByLabel("Mês").selectOption("2");
    await d.getByLabel("Ano", { exact: true }).last().fill("2026");
    await d.getByLabel("Valor em litros").fill("-5");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Valor não negativo, até 4 casas decimais.")).toBeVisible();
    await d.getByLabel("Valor em litros").fill("1 250,75");
    await d.getByLabel("Fonte (opcional)").fill("Facturas");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect.poll(() => api.escritas("POST", `/esg/indicators/${IDF13.gasoleo}/measurements`)[0]?.corpo).toEqual({ period: "2026-02-01", value: "1250.75", source: "Facturas", notes: null });
    expect(await violacoes()).toEqual([]);
  });

  test("Manager: iniciativas planeadas, corrigidas, concluídas e canceladas; o responsável sem os RH (B41)", async ({ page, api, violacoes }) => {
    await comEsg(api)
      .em("POST", "/esg/initiatives", { status: 201, corpo: { id: "n9" } })
      .em("PUT", `/esg/initiatives/${IDF13.solar}`, { status: 204 })
      .em("POST", `/esg/initiatives/${IDF13.solar}/completion`, { status: 204 })
      .em("POST", `/esg/initiatives/${IDF13.solar}/cancellation`, { status: 204 })
      .ligar();
    await entrar(page, meManagerF13.email);
    await page.goto("/esg?vista=iniciativas");
    const tabela = page.getByRole("table", { name: "Iniciativas" });
    await expect(tabela.getByRole("row").filter({ hasText: "Painéis solares" })).toContainText("ENV-01 · Gasóleo da frota");
    await expect(tabela.getByRole("row").filter({ hasText: "Painéis solares" })).toContainText("Joana <b>Antiga</b>");
    await expect(tabela.getByRole("row").filter({ hasText: "Código de conduta" })).toContainText("Concluída");
    await expect(tabela.getByRole("row").filter({ hasText: "Código de conduta" })).toContainText("Ninguém");
    expect(api.pedidos.some((p) => p.caminho === "/esg/lookups")).toBe(false);
    await expect(page.getByRole("button", { name: "Corrigir a iniciativa Código de conduta" })).toHaveCount(0);
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/"))).toBe(false);
    await verificar(page);

    await page.getByRole("button", { name: "Nova iniciativa" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Responsável (opcional)").locator("option", { hasText: "Joana" })).toHaveCount(0);
    await d.getByLabel("Responsável (opcional)").selectOption({ label: "Ana Sustentável" });
    await d.getByLabel("Título").fill("Reciclagem");
    await d.getByLabel("Pilar").selectOption("Social");
    await d.getByLabel("Indicador (opcional)").selectOption({ label: "SOC-01 · Horas de formação <b>por pessoa</b>" });
    await expect(d.getByLabel("Indicador (opcional)").locator("option", { hasText: "GOV-09" })).toHaveCount(0);
    await d.getByLabel("Início (opcional)").fill("2026-06-01");
    await d.getByLabel("Fim (opcional)").fill("2026-05-01");
    await d.getByRole("button", { name: "Planear" }).click();
    await expect(d.getByText("A iniciativa não pode acabar antes de começar.")).toBeVisible();
    await d.getByLabel("Fim (opcional)").fill("2026-12-31");
    await d.getByLabel("Orçamento (opcional)").fill("150 000,5");
    await d.getByRole("button", { name: "Planear" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/esg/initiatives")[0]?.corpo).toEqual({ title: "Reciclagem", pillar: "Social", description: null, indicatorId: IDF13.formacao, ownerEmployeeId: IDF13.ana, startsOn: "2026-06-01", endsOn: "2026-12-31", budget: "150000.50", currency: "AOA", progress: 0 });

    await page.getByRole("button", { name: "Corrigir a iniciativa Painéis solares" }).click();
    await expect(d.getByLabel("Progresso (%)")).toHaveValue("20");
    await expect(d.getByLabel("Responsável (opcional)")).toHaveValue(IDF13.antiga);
    await d.getByLabel("Progresso (%)").fill("60");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/esg/initiatives/${IDF13.solar}`)[0]?.corpo).toMatchObject({ title: "Painéis solares", progress: 60, budget: "2500000.00", indicatorId: IDF13.gasoleo, ownerEmployeeId: IDF13.antiga });

    await page.getByRole("button", { name: "Concluir a iniciativa Painéis solares" }).click();
    await d.getByRole("button", { name: "Concluir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/esg/initiatives/${IDF13.solar}/completion`)).toHaveLength(1);
    await page.getByRole("button", { name: "Cancelar a iniciativa Painéis solares" }).click();
    await d.getByRole("button", { name: "Cancelar iniciativa" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/esg/initiatives/${IDF13.solar}/cancellation`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });
});
