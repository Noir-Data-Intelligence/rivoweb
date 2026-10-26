/**
 * F13 (1.º bloco) — analytics e auditoria, com a API simulada: período e
 * moeda no URL, só o separador aberto se pede; tendências (receita e despesa
 * por mês com os meses vazios a zero, frota, inventário), RH e vendas; a
 * auditoria filtra por período (os últimos 7 dias por omissão, até 366) e
 * entidade (no URL), pagina, desenha os eventos por dia, mostra quem pelo
 * e-mail e o sistema quando não há conta. O Manager não vê a auditoria. Texto
 * de fora nunca vira HTML.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { analyticsRh, analyticsVendas, contasAuditoria, meAdminF13, meManagerF13, registosAuditoria, tendencias } from "../../fixtures/f13";
import { eventosPorDia } from "../../fixtures/f14";
import { diasAntes } from "../../../src/features/auditoria/regras";
import { hojeIso } from "../../../src/lib/format/data";

function comF13(api: ApiSimulada, me = meAdminF13): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/analytics/overview", (route) => ({ status: 200, corpo: tendencias(new URL(route.request().url()).searchParams.get("currency") ?? "AOA") }))
    .em("GET", "/analytics/hr", { status: 200, corpo: analyticsRh() })
    .em("GET", "/analytics/sales", { status: 200, corpo: analyticsVendas() })
    .em("GET", "/audit/entries", { status: 200, corpo: registosAuditoria(), cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": "60" } })
    .em("GET", "/audit/entries/daily-count", (route) => {
      const q = new URL(route.request().url()).searchParams;
      return { status: 200, corpo: eventosPorDia(q.get("from") ?? "", q.get("to") ?? "") };
    })
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
  test("Admin: registos com quem fez (e-mail ou sistema), período, páginas, eventos por dia e filtro por entidade no URL", async ({ page, api, violacoes }) => {
    await comF13(api).ligar();
    await entrar(page, meAdminF13.email);
    await page.getByRole("link", { name: "Auditoria" }).click();
    const hoje = hojeIso();
    const semana = diasAntes(hoje, 6);
    await expect(page.getByLabel("De", { exact: true })).toHaveValue(semana);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries" && p.query.includes(`from=${semana}`) && p.query.includes(`to=${hoje}`) && p.query.includes("page=1") && p.query.includes("pageSize=25"))).toBe(true);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries/daily-count" && p.query.includes(`from=${semana}`))).toBe(true);
    await expect(page.getByRole("heading", { name: /^178 eventos no período; o dia com mais foi / })).toBeVisible();
    await expect(page.getByRole("button", { name: "Página seguinte" })).toBeEnabled();
    const tabela = page.getByRole("table", { name: "Registos de auditoria" });
    await expect(tabela.getByRole("row").filter({ hasText: "finance.sales_invoice.issued" })).toContainText("financas@teste.local");
    await expect(tabela.getByRole("row").filter({ hasText: "hr.employee" }).first()).toContainText("Sistema");
    await expect(tabela).toContainText("<script>x</script>");
    expect(await page.locator("main script").count()).toBe(0);
    await verificar(page);

    await page.getByRole("button", { name: "Página seguinte" }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries" && p.query.includes("page=2"))).toBe(true);

    // Mais de 366 dias: recusado antes de pedir.
    const pedidos = api.pedidos.length;
    await page.getByLabel("De", { exact: true }).fill(diasAntes(hoje, 366));
    await expect(page.getByText("O período tem no máximo 366 dias.")).toBeVisible();
    await expect(page).not.toHaveURL(/pagina=/);
    expect(api.pedidos.slice(pedidos).some((p) => p.caminho.startsWith("/audit/entries"))).toBe(false);
    await page.getByLabel("De", { exact: true }).fill(diasAntes(hoje, 29));
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries/daily-count" && p.query.includes(`from=${diasAntes(hoje, 29)}`))).toBe(true);

    await page.getByLabel("Tipo de entidade").fill("finance.sales_invoice");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/tipo=finance\.sales_invoice/);
    await expect(page).toHaveURL(new RegExp(`de=${diasAntes(hoje, 29)}`));
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries" && p.query.includes("entityType=finance.sales_invoice") && p.query.includes(`from=${diasAntes(hoje, 29)}`))).toBe(true);

    await page.getByRole("button", { name: "Ver só os registos de hr.employee 00000000-0000-4000-8000-000000000b02" }).click();
    await expect(page.getByLabel("Id da entidade")).toHaveValue("00000000-0000-4000-8000-000000000b02");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/audit/entries" && p.query.includes("entityId=00000000-0000-4000-8000-000000000b02") && p.query.includes("entityType=hr.employee"))).toBe(true);
    await page.getByRole("button", { name: "Limpar" }).click();
    await expect(page).not.toHaveURL(/tipo=/);
    expect(api.escritas("POST", "/audit/entries")).toHaveLength(0);
    expect(await violacoes()).toEqual([]);
  });
});
