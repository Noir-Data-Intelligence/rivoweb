/**
 * F9 (1.º bloco) — compras, com a API simulada: requisições (nova validada com
 * linhas em texto, submeter, ver decisão, cancelar com motivo), ordem a partir
 * da aprovada (linhas da requisição, sem passar o disponível), ordem (registar
 * recepção sem passar o que falta, anular recepção, cancelar ordem com a
 * recusa do servidor), recepções, e perfis sem RH (nunca o id). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { IDF5 } from "../../fixtures/f5";
import { fornecedoresActivos, IDF9, meActivosF9, meAdminF9, meGestorF9, ordem, recepcoes, requisicao } from "../../fixtures/f9";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const problema = (status: number, detail: string) => ({ status, corpo: { status, title: "Conflito", detail }, cabecalhos: { "Content-Type": "application/problem+json" } });

function comCompras(api: ApiSimulada, me = meAdminF9): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/procurement/requisitions", pag([requisicao(), requisicao("Approved", IDF9.aprovada)]))
    .em("GET", `/procurement/requisitions/${IDF9.rascunho}`, { status: 200, corpo: requisicao() })
    .em("GET", `/procurement/requisitions/${IDF9.aprovada}`, { status: 200, corpo: requisicao("Approved", IDF9.aprovada) })
    .em("GET", "/procurement/orders", pag([ordem()]))
    .em("GET", `/procurement/orders/${IDF9.ordem}`, { status: 200, corpo: ordem(4) })
    .em("GET", "/procurement/receipts", pag(recepcoes()))
    .em("GET", "/procurement/suppliers", pag(fornecedoresActivos()));
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("compras", () => {
  test("requisições: menu, lista, nova validada com linhas em texto", async ({ page, api, violacoes }) => {
    await comCompras(api).em("POST", "/procurement/requisitions", { status: 201, corpo: { requisitionId: IDF9.rascunho, estimatedTotal: 25000, estado: "Draft" } }).ligar();
    await entrar(page);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(menu.getByRole("link", { name: "Ordens de compra" })).toBeVisible();
    await menu.getByRole("link", { name: "Requisições" }).click();
    const linha = page.getByRole("row").filter({ hasText: "Material de escritório" }).first();
    await expect(linha).toContainText("Carlos Teste · 2 linhas");
    await expect(linha).toContainText("125 000,00");
    await verificar(page);
    await page.getByRole("button", { name: "Nova requisição" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(d.getByText("Diga o que se pretende comprar e porquê", { exact: false })).toBeVisible();
    await expect(d.getByText("Indique pelo menos uma linha.")).toBeVisible();
    await d.getByLabel("Justificação").fill("Papel para o trimestre");
    await d.getByLabel("Departamento (opcional)").selectOption(ID.dep1);
    await d.getByLabel("Descrição da linha 1").fill("Papel A4");
    await d.getByLabel("Quantidade da linha 1").fill("10");
    await d.getByLabel("Preço estimado da linha 1").fill("2 500");
    await d.getByRole("button", { name: "Juntar linha" }).click();
    await d.getByLabel("Descrição da linha 2").fill("Agrafos");
    await d.getByLabel("Quantidade da linha 2").fill("2,5");
    await expect(d.getByText("Total estimado: 25 000,00", { exact: false })).toBeVisible();
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(page).toHaveURL(new RegExp(`/requisicoes/${IDF9.rascunho}$`));
    expect(api.escritas("POST", "/procurement/requisitions").map((p) => p.corpo)).toEqual([
      {
        justification: "Papel para o trimestre",
        departmentId: ID.dep1,
        currency: "AOA",
        requestedOn: null,
        lines: [
          { description: "Papel A4", quantity: "10", estimatedUnitPrice: "2500.00" },
          { description: "Agrafos", quantity: "2.5", estimatedUnitPrice: "0.00" },
        ],
        requestedByEmployeeId: null,
      },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("rascunho: submeter, ver decisão (ainda espera) e cancelar com motivo", async ({ page, api }) => {
    let estado = "Draft";
    await comCompras(api)
      .em("GET", `/procurement/requisitions/${IDF9.rascunho}`, () => ({ status: 200, corpo: requisicao(estado) }))
      .em("POST", `/procurement/requisitions/${IDF9.rascunho}/submission`, () => {
        estado = "PendingApproval";
        return { status: 202, corpo: { approvalRequestId: IDF9.aprovacao, estado: "PendingApproval" } };
      })
      .em("POST", `/procurement/requisitions/${IDF9.rascunho}/approval-outcome`, { status: 202, corpo: { estado: "PendingApproval" } })
      .em("POST", `/procurement/requisitions/${IDF9.rascunho}/cancellation`, () => {
        estado = "Cancelled";
        return { status: 204 };
      })
      .ligar();
    await entrar(page);
    await page.goto(`/requisicoes/${IDF9.rascunho}`);
    await expect(page.getByRole("row").filter({ hasText: "Toner" })).toContainText("100 000,00");
    await verificar(page);
    await page.getByRole("button", { name: "Submeter para aprovação" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Submeter" }).click();
    await expect(page.getByText("À espera de decisão em Aprovações.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir o pedido de aprovação" })).toHaveAttribute("href", `/aprovacoes/${IDF9.aprovacao}`);
    await page.getByRole("button", { name: "Ver decisão" }).click();
    await expect(page.getByText("Ainda à espera de decisão em Aprovações.")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar requisição" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Cancelar requisição" }).click();
    await expect(d.getByText("Indique o motivo.")).toBeVisible();
    await d.getByLabel("Motivo").fill("Já não é preciso.");
    await d.getByRole("button", { name: "Cancelar requisição" }).click();
    await expect(page.getByText("Requisição cancelada.")).toBeVisible();
    expect(api.escritas("POST", `/procurement/requisitions/${IDF9.rascunho}/cancellation`).map((p) => p.corpo)).toEqual([{ reason: "Já não é preciso." }]);
  });

  test("aprovada: emitir ordem com as linhas da requisição, sem passar o disponível", async ({ page, api }) => {
    await comCompras(api)
      .em("GET", "/procurement/orders", pag([]))
      .em("POST", `/procurement/requisitions/${IDF9.aprovada}/orders`, { status: 201, corpo: { purchaseOrderId: IDF9.ordem, total: 120000, estado: "Issued" } })
      .ligar();
    await entrar(page);
    await page.goto(`/requisicoes/${IDF9.aprovada}`);
    await expect(page.getByText("Ainda não há ordens de compra desta requisição.")).toBeVisible();
    await page.getByRole("button", { name: "Emitir ordem de compra" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Descrição da linha 2")).toHaveValue("Toner");
    await expect(d.getByLabel("Preço acordado da linha 1")).toHaveValue("2500,00");
    await d.getByLabel("Preço acordado da linha 1").fill("2 600");
    await d.getByRole("button", { name: "Emitir ordem" }).click();
    await expect(d.getByText("Escolha o fornecedor.")).toBeVisible();
    await expect(d.getByText(/^Passa o valor aprovado/)).toBeVisible();
    expect(api.escritas("POST", `/procurement/requisitions/${IDF9.aprovada}/orders`)).toHaveLength(0);
    await d.getByLabel("Preço acordado da linha 1").fill("2 000");
    await d.getByLabel("Fornecedor").selectOption(IDF5.fornecedor);
    await d.getByLabel("Emitida a").fill("2026-10-13");
    await d.getByLabel("Entrega esperada (opcional)").fill("2026-10-20");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Emitir ordem" }).click();
    await expect(page).toHaveURL(new RegExp(`/encomendas/${IDF9.ordem}$`));
    expect(api.escritas("POST", `/procurement/requisitions/${IDF9.aprovada}/orders`).map((p) => p.corpo)).toEqual([
      {
        supplierId: IDF5.fornecedor,
        issuedOn: "2026-10-13",
        expectedOn: "2026-10-20",
        lines: [
          { description: "Papel A4", quantity: "10", unitPrice: "2000.00" },
          { description: "Toner", quantity: "2", unitPrice: "50000.00" },
        ],
      },
    ]);
  });

  test("ordem: registar recepção sem passar o que falta; anular; cancelar mostra a recusa", async ({ page, api, violacoes }) => {
    let recebido = 4;
    await comCompras(api)
      .em("GET", `/procurement/orders/${IDF9.ordem}`, () => ({ status: 200, corpo: ordem(recebido) }))
      .em("POST", `/procurement/orders/${IDF9.ordem}/receipts`, () => {
        recebido = 10;
        return { status: 201, corpo: { goodsReceiptId: "00000000-0000-4000-8000-000000000a10", estado: "Registered" } };
      })
      .em("POST", `/procurement/receipts/${IDF9.recepcao}/cancellation`, { status: 204 })
      .em("POST", `/procurement/orders/${IDF9.ordem}/cancellation`, problema(409, "Esta ordem já tem mercadoria recebida. Anule primeiro a recepção."))
      .ligar();
    await entrar(page);
    await page.goto(`/encomendas/${IDF9.ordem}`);
    const papel = page.getByRole("table", { name: "Linhas da ordem" }).getByRole("row").filter({ hasText: "Papel A4" });
    await expect(papel).toContainText("6");
    await expect(page.getByRole("table", { name: "Recepções da ordem" })).toContainText("4 × Papel A4");
    await verificar(page);
    await page.getByRole("button", { name: "Registar recepção" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Papel A4 (faltam 6)")).toHaveValue("6");
    await d.getByLabel("Papel A4 (faltam 6)").fill("7");
    await d.getByLabel("Toner (faltam 2)").fill("");
    await d.getByRole("button", { name: "Registar recepção" }).click();
    await expect(d.getByText("Passa o que falta receber desta linha.")).toBeVisible();
    await d.getByLabel("Papel A4 (faltam 6)").fill("6");
    await d.getByLabel("Guia de remessa (opcional)").fill("GR 124");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Registar recepção" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/procurement/orders/${IDF9.ordem}/receipts`)[0]?.corpo).toMatchObject({ deliveryNote: "GR 124", lines: [{ purchaseOrderLineId: IDF9.linhaPapel, quantityReceived: "6" }], receivedByEmployeeId: null });

    await page.getByRole("button", { name: "Anular" }).click();
    await d.getByLabel("Motivo").fill("Contagem errada.");
    await d.getByRole("button", { name: "Anular recepção" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/procurement/receipts/${IDF9.recepcao}/cancellation`).map((p) => p.corpo)).toEqual([{ reason: "Contagem errada." }]);

    await page.getByRole("button", { name: "Cancelar ordem" }).click();
    await d.getByLabel("Motivo").fill("Fornecedor sem stock.");
    await d.getByRole("button", { name: "Cancelar ordem" }).click();
    await expect(d.getByText("Esta ordem já tem mercadoria recebida.", { exact: false })).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });

  test("Manager, sem RH: vê «Colaborador» e «Departamento», nunca os ids", async ({ page, api }) => {
    await comCompras(api, meGestorF9).ligar();
    await entrar(page, meGestorF9.email);
    await page.goto("/requisicoes");
    await expect(page.getByRole("row").filter({ hasText: "Material de escritório" }).first()).toContainText("Colaborador · 2 linhas");
    await expect(page.getByText(ID.emp2)).toHaveCount(0);
    await page.goto(`/requisicoes/${IDF9.rascunho}`);
    await expect(page.getByText(ID.dep1)).toHaveCount(0);
  });

  test("AssetManager: ordens e recepções, sem requisições", async ({ page, api }) => {
    await comCompras(api, meActivosF9).ligar();
    await entrar(page, meActivosF9.email);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(menu.getByRole("link", { name: "Requisições" })).toHaveCount(0);
    await page.goto(`/encomendas/${IDF9.ordem}`);
    await expect(page.getByRole("button", { name: "Registar recepção" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar ordem" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ver a requisição de origem" })).toHaveCount(0);
    await page.goto("/recepcoes");
    await expect(page.getByRole("row").filter({ hasText: "GR 123" })).toContainText("Colaborador");
  });
});
