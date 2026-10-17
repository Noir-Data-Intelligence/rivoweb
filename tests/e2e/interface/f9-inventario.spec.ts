/**
 * F9 (2.º bloco) — inventário, com a API simulada: artigos (registar
 * validado), artigo (em mão por armazém, movimentos, entrada com custo em
 * texto, saída sem deixar negativo, ajuste com motivo, transferência entre
 * armazéns diferentes, desactivar), armazéns (registar, desactivar),
 * contagens (abrir num armazém activo, contar, fechar com divergência por
 * aprovar, ver decisão, cancelar) e valorização (janela no URL). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { armazens, artigo, artigos, contagem, IDF9B, meAdminF9 } from "../../fixtures/f9";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const mov = { status: 201, corpo: { movementId: "00000000-0000-4000-8000-000000000b10", quantityOnHand: 12, quantityAtWarehouse: 10, averageCost: 2500.5 } };

function comInventario(api: ApiSimulada): ApiSimulada {
  return comF1(api, meAdminF9)
    .em("GET", "/inventory/items", pag(artigos()))
    .em("GET", `/inventory/items/${IDF9B.papel}`, { status: 200, corpo: artigo() })
    .em("GET", "/inventory/warehouses", pag(armazens()))
    .em("GET", "/inventory/counts", pag([contagem()]))
    .em("GET", `/inventory/counts/${IDF9B.contagem}`, { status: 200, corpo: contagem() })
    .em("GET", "/inventory/valuation", { status: 200, corpo: [{ itemId: IDF9B.papel, sku: "PAP-A4", name: "Papel A4", periodValue: 30006.12345 }] });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("inventário", () => {
  test("artigos: menu, lista com em mão e valor; registar validado", async ({ page, api, violacoes }) => {
    await comInventario(api).em("POST", "/inventory/items", { status: 201, corpo: { itemId: IDF9B.papel } }).ligar();
    await entrar(page);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(menu.getByRole("link", { name: "Contagens" })).toBeVisible();
    await menu.getByRole("link", { name: "Artigos" }).click();
    const linha = page.getByRole("row").filter({ hasText: "Papel A4" });
    await expect(linha).toContainText("12 resma");
    await expect(linha).toContainText("30 006,00");
    await verificar(page);
    await page.getByRole("button", { name: "Registar artigo" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Unidade").fill("");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Indique a referência (SKU).")).toBeVisible();
    await expect(d.getByText("Indique a unidade (un, kg, caixa…).")).toBeVisible();
    await d.getByLabel("Referência (SKU)").fill("PAP-A3");
    await d.getByLabel("Nome").fill("Papel A3");
    await d.getByLabel("Unidade").fill("resma");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(page).toHaveURL(new RegExp(`/artigos/${IDF9B.papel}$`));
    expect(api.escritas("POST", "/inventory/items").map((p) => p.corpo)).toEqual([{ sku: "PAP-A3", name: "Papel A3", unit: "resma" }]);
    expect(await violacoes()).toEqual([]);
  });

  test("artigo: entrada com custo em texto, saída sem deixar negativo, ajuste com motivo, transferência", async ({ page, api, violacoes }) => {
    await comInventario(api)
      .em("POST", `/inventory/items/${IDF9B.papel}/movements/receipts`, mov)
      .em("POST", `/inventory/items/${IDF9B.papel}/movements/issues`, mov)
      .em("POST", `/inventory/items/${IDF9B.papel}/movements/adjustments`, mov)
      .em("POST", `/inventory/items/${IDF9B.papel}/movements/transfers`, { status: 201, corpo: { outMovementId: "a", inMovementId: "b", quantityAtSource: 7, quantityAtDestination: 5, averageCost: 2500.5 } })
      .ligar();
    await entrar(page);
    await page.goto(`/artigos/${IDF9B.papel}`);
    await expect(page.getByRole("table", { name: "Em mão por armazém" }).getByRole("row").filter({ hasText: "CEN · Central" })).toContainText("10 resma");
    await expect(page.getByRole("table", { name: "Movimentos" })).toContainText("CEN · Central (para LOJ · Loja)");
    await verificar(page);
    const d = page.getByRole("dialog");

    await page.getByRole("button", { name: "Movimentar" }).click();
    await d.getByLabel("Armazém").selectOption(IDF9B.central);
    await expect(d.getByText("Em mão: 10 resma.")).toBeVisible();
    await d.getByLabel("Quantidade (resma)").fill("5");
    await d.getByLabel("Custo unitário (Kz)").fill("2 600,1234");
    await d.getByLabel("Data").fill("2026-10-17");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Registar movimento" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/inventory/items/${IDF9B.papel}/movements/receipts`).map((p) => p.corpo)).toEqual([{ warehouseId: IDF9B.central, quantity: "5", unitCost: "2600.1234", reason: null, occurredOn: "2026-10-17" }]);

    await page.getByRole("button", { name: "Movimentar" }).click();
    await d.getByLabel("Tipo").selectOption("saida");
    await d.getByLabel("Armazém").selectOption(IDF9B.loja);
    await d.getByLabel("Quantidade (resma)").fill("3");
    await d.getByRole("button", { name: "Registar movimento" }).click();
    await expect(d.getByText("Não há quantidade suficiente nesse armazém.")).toBeVisible();
    await d.getByLabel("Quantidade (resma)").fill("2");
    await d.getByRole("button", { name: "Registar movimento" }).click();
    await expect(d).toHaveCount(0);

    await page.getByRole("button", { name: "Movimentar" }).click();
    await d.getByLabel("Tipo").selectOption("ajuste");
    await d.getByLabel("Armazém").selectOption(IDF9B.central);
    await d.getByLabel("Variação (resma; negativa para tirar)").fill("-1");
    await d.getByRole("button", { name: "Registar movimento" }).click();
    await expect(d.getByText("Um ajuste precisa de motivo.")).toBeVisible();
    await d.getByLabel("Motivo", { exact: true }).fill("Resma molhada.");
    await d.getByRole("button", { name: "Registar movimento" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/inventory/items/${IDF9B.papel}/movements/adjustments`)[0]?.corpo).toMatchObject({ warehouseId: IDF9B.central, quantityDelta: "-1", reason: "Resma molhada." });

    await page.getByRole("button", { name: "Movimentar" }).click();
    await d.getByLabel("Tipo").selectOption("transferencia");
    await d.getByLabel("De (armazém)").selectOption(IDF9B.central);
    await d.getByLabel("Para (armazém)").selectOption(IDF9B.central);
    await d.getByLabel("Quantidade (resma)").fill("3");
    await d.getByRole("button", { name: "Registar movimento" }).click();
    await expect(d.getByText("O destino tem de ser diferente da origem.")).toBeVisible();
    await expect(d.getByLabel("Para (armazém)").locator("option", { hasText: "Antigo" })).toHaveCount(0);
    await d.getByLabel("Para (armazém)").selectOption(IDF9B.loja);
    await d.getByRole("button", { name: "Registar movimento" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/inventory/items/${IDF9B.papel}/movements/transfers`)[0]?.corpo).toMatchObject({ fromWarehouseId: IDF9B.central, toWarehouseId: IDF9B.loja, quantity: "3" });
    expect(await violacoes()).toEqual([]);
  });

  test("armazéns: registar (código em maiúsculas) e desactivar", async ({ page, api }) => {
    await comInventario(api)
      .em("POST", "/inventory/warehouses", { status: 201, corpo: { warehouseId: "00000000-0000-4000-8000-000000000b11" } })
      .em("POST", `/inventory/warehouses/${IDF9B.loja}/status`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/armazens");
    await expect(page.getByText("Antigo")).toHaveCount(0);
    await verificar(page);
    await page.getByRole("button", { name: "Registar armazém" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Código").fill("arm2");
    await d.getByLabel("Nome").fill("Armazém 2");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/inventory/warehouses").map((p) => p.corpo)).toEqual([{ code: "ARM2", name: "Armazém 2" }]);
    await page.getByRole("button", { name: "Desactivar o armazém Loja" }).click();
    await d.getByRole("button", { name: "Desactivar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/inventory/warehouses/${IDF9B.loja}/status`).map((p) => p.corpo)).toEqual([{ active: false }]);
  });

  test("contagem: contar, fechar com divergência (por aprovar), ver decisão; cancelar", async ({ page, api, violacoes }) => {
    let estado = "Open";
    let contados = false;
    await comInventario(api)
      .em("GET", `/inventory/counts/${IDF9B.contagem}`, () => ({ status: 200, corpo: contagem(estado, contados) }))
      .em("POST", "/inventory/counts", { status: 201, corpo: { countId: IDF9B.contagem } })
      .em("POST", `/inventory/counts/${IDF9B.contagem}/lines`, () => {
        contados = true;
        return { status: 201, corpo: { lineId: "l", expectedQuantity: 10, countedQuantity: 9, variance: -1 } };
      })
      .em("POST", `/inventory/counts/${IDF9B.contagem}/close`, () => {
        estado = "PendingApproval";
        return { status: 202, corpo: { generatedAdjustmentIds: null, approvalRequestId: "x", varianceValue: -2500.5, detalhe: null, estado: "PendingApproval" } };
      })
      .em("POST", `/inventory/counts/${IDF9B.contagem}/decision`, { status: 202, corpo: { generatedAdjustmentIds: null, approvalRequestId: "x", varianceValue: null, detalhe: null, estado: "PendingApproval" } })
      .em("POST", `/inventory/counts/${IDF9B.contagem}/cancellation`, () => {
        estado = "Cancelled";
        return { status: 204 };
      })
      .ligar();
    await entrar(page);
    await page.goto("/contagens");
    await page.getByRole("button", { name: "Abrir contagem" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Armazém").locator("option", { hasText: "Antigo" })).toHaveCount(0);
    await d.getByLabel("Armazém").selectOption(IDF9B.central);
    await d.getByRole("button", { name: "Abrir contagem" }).click();
    await expect(page).toHaveURL(new RegExp(`/contagens/${IDF9B.contagem}$`));
    await expect(page.getByRole("button", { name: "Fechar contagem" })).toBeDisabled();
    await verificar(page);

    await page.getByRole("button", { name: "Contar artigo" }).click();
    await expect(d.getByLabel("Artigo").locator("option", { hasText: "Toner antigo" })).toHaveCount(0);
    await d.getByLabel("Artigo").selectOption(IDF9B.papel);
    await d.getByLabel("Quantidade contada (resma)").fill("9");
    await d.getByRole("button", { name: "Registar contagem" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/inventory/counts/${IDF9B.contagem}/lines`).map((p) => p.corpo)).toEqual([{ itemId: IDF9B.papel, countedQuantity: "9" }]);
    const linha = page.getByRole("row").filter({ hasText: "PAP-A4" });
    await expect(linha).toContainText("−1");
    await expect(linha).toContainText("−2 500,50");

    await page.getByRole("button", { name: "Fechar contagem" }).click();
    await expect(d).toContainText("1 divergência");
    await d.getByRole("button", { name: "Fechar contagem" }).click();
    await expect(page.getByText("À espera de decisão em Aprovações: o stock ainda não mudou.")).toBeVisible();
    await page.getByRole("button", { name: "Ver decisão" }).click();
    await expect(page.getByText("Ainda à espera de decisão em Aprovações.")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar contagem" }).click();
    await d.getByLabel("Motivo").fill("Contagem repetida.");
    await d.getByRole("button", { name: "Cancelar contagem" }).click();
    await expect(page.getByText("Contagem cancelada", { exact: false })).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });

  test("valorização: mês corrente por omissão, total em kwanzas", async ({ page, api }) => {
    await comInventario(api).ligar();
    await entrar(page);
    await page.goto("/valorizacao?de=2026-10-01&ate=2026-10-17");
    await expect(page.getByRole("row").filter({ hasText: "Papel A4" })).toContainText("30 006,12");
    await expect(page.getByText("Total do período: 30 006,12", { exact: false })).toBeVisible();
    expect(api.pedidos.some((p) => p.caminho === "/inventory/valuation" && p.query.includes("from=2026-10-01") && p.query.includes("to=2026-10-17"))).toBe(true);
    await verificar(page);
    await page.goto("/valorizacao?de=2026-10-17&ate=2026-10-01");
    await expect(page.getByText("A data final não pode ser anterior à inicial.")).toBeVisible();
  });
});
