/**
 * F13 (1.º bloco) — analytics e auditoria, com a API simulada: período e
 * moeda no URL, só o separador aberto se pede; tendências (receita e despesa
 * por mês com os meses vazios a zero, frota, inventário), RH e vendas; a
 * auditoria filtra por entidade e limite (no URL), mostra quem pelo e-mail e
 * o sistema quando não há conta. O Manager não vê a auditoria. Texto de fora
 * nunca vira HTML.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { analyticsRh, analyticsVendas, contasAuditoria, meAdminF13, meManagerF13, registosAuditoria, tendencias } from "../../fixtures/f13";

function comF13(api: ApiSimulada, me = meAdminF13): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/analytics/overview", (route) => ({ status: 200, corpo: tendencias(new URL(route.request().url()).searchParams.get("currency") ?? "AOA") }))
    .em("GET", "/analytics/hr", { status: 200, corpo: analyticsRh() })
    .em("GET", "/analytics/sales", { status: 200, corpo: analyticsVendas() })
    .em("GET", "/audit/entries", { status: 200, corpo: registosAuditoria() })
    .em("GET", "/identity/users", { status: 200, corpo: contasAuditoria() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("analytics", () => {
  test("Manager: tendências com período e moeda no URL; RH e vendas pedidos só ao abrir; sem auditoria", async ({ page, api, violacoes }) => {
    await comF13(api, meManagerF13).ligar();
    await entrar(page, meManagerF13.email);
    await expect(page.getByRole("link", { name: "Auditoria" })).toHaveCount(0);
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
    await expect(page.getByText("Quilómetros percorridos").locator("..")).toContainText(/1\s241 km/);
    await expect(page.getByText("Valor do stock hoje").locator("..")).toContainText(/3\s250\s000,00/);
    expect(api.pedidos.some((p) => p.caminho === "/analytics/hr" || p.caminho === "/analytics/sales")).toBe(false);
    await page.getByRole("button", { name: "Ver como tabela" }).first().click();
    await expect(page.getByRole("table").filter({ hasText: "Receita" }).first()).toContainText("fev");
    await verificar(page);

    await page.getByLabel("De", { exact: true }).fill("2026-01-01");
    await page.getByLabel("Moeda").selectOption("USD");
    await expect(page).toHaveURL(/moeda=USD/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/analytics/overview" && p.query.includes("currency=USD") && p.query.includes("from=2026-01-01"))).toBe(true);

    await page.getByRole("link", { name: "Recursos humanos" }).click();
    await expect(page).toHaveURL(/vista=rh/);
    await expect(page.getByLabel("Moeda")).toHaveCount(0);
    await expect(page.getByText("Atrasos no período").locator("..")).toContainText("14");
    await expect(page.getByText("Horas de formação concluídas").locator("..")).toContainText("126,5 h");
    await expect(page.getByText("Colaboradores activos").first().locator("..")).toContainText("42");
    await verificar(page);

    await page.getByRole("link", { name: "Vendas" }).click();
    await expect(page.getByRole("table", { name: "Leads por estado" }).getByRole("row").filter({ hasText: "Qualificado" })).toContainText("3");
    await expect(page.getByText("Actividades em atraso").locator("..")).toContainText("3");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/analytics/sales" && p.query.includes("currency=USD"))).toBe(true);
    await verificar(page);

    await page.getByLabel("Até", { exact: true }).fill("2025-12-31");
    await expect(page.getByText("O fim não pode ser antes do início.")).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });
});

test.describe("auditoria", () => {
  test("Admin: registos com quem fez (e-mail ou sistema), filtro por entidade e limite no URL", async ({ page, api, violacoes }) => {
    await comF13(api).ligar();
    await entrar(page, meAdminF13.email);
    await page.getByRole("link", { name: "Auditoria" }).click();
    const tabela = page.getByRole("table", { name: "Registos de auditoria" });
    await expect(tabela.getByRole("row").filter({ hasText: "finance.sales_invoice.issued" })).toContainText("financas@teste.local");
    await expect(tabela.getByRole("row").filter({ hasText: "hr.employee" }).first()).toContainText("Sistema");
    await expect(tabela).toContainText("<script>x</script>");
    expect(await page.locator("main script").count()).toBe(0);
    await verificar(page);

    await page.getByLabel("Tipo de entidade").fill("finance.sales_invoice");
    await page.getByLabel("Registos", { exact: true }).selectOption("200");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/tipo=finance\.sales_invoice/);
    await expect(page).toHaveURL(/limite=200/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries" && p.query.includes("entityType=finance.sales_invoice") && p.query.includes("limit=200"))).toBe(true);

    await page.getByRole("button", { name: "Ver só os registos de hr.employee 00000000-0000-4000-8000-000000000b02" }).click();
    await expect(page.getByLabel("Id da entidade")).toHaveValue("00000000-0000-4000-8000-000000000b02");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries" && p.query.includes("entityId=00000000-0000-4000-8000-000000000b02") && p.query.includes("entityType=hr.employee"))).toBe(true);
    await page.getByRole("button", { name: "Limpar" }).click();
    await expect(page).not.toHaveURL(/tipo=/);
    expect(api.escritas("POST", "/audit/entries")).toHaveLength(0);
    expect(await violacoes()).toEqual([]);
  });
});
