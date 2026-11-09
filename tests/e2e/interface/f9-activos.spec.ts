/**
 * F9 (3.º bloco) — activos fixos, com a API simulada: lista (filtros no URL),
 * registar validado com valores em texto, correr a amortização (resultado),
 * activo (plano, corrigir só sem amortização registada, abater), manutenção
 * (agendar, concluir), custódia (entregar, devolver; sem RH, o porquê) e
 * seguros (registar, cancelar; a caducar). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { clientes, IDF3, pautas, series } from "../../fixtures/f3";
import { activos, apolices, custodias, fichaActivo, IDF9C, meActivosF9, meAdminF9 } from "../../fixtures/f9";

function comActivos(api: ApiSimulada, me = meAdminF9): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/finance/assets", { status: 200, corpo: activos() })
    .em("GET", `/finance/assets/${IDF9C.portatil}`, { status: 200, corpo: fichaActivo() })
    .em("GET", "/finance/assets/maintenance", { status: 200, corpo: fichaActivo().maintenance })
    .em("GET", "/finance/assets/custody", { status: 200, corpo: custodias() })
    .em("GET", "/finance/assets/insurance", { status: 200, corpo: apolices() })
    .em("GET", "/finance/assets/lookups", { status: 200, corpo: { employees: [{ id: ID.emp1, name: "Ana Teste" }] } })
    .em("GET", "/finance/planning/cost-centres", { status: 200, corpo: [], cabecalhos: { "X-Page": "1", "X-Page-Size": "200", "X-Total-Count": "0" } })
    .em("GET", "/procurement/suppliers", { status: 200, corpo: [], cabecalhos: { "X-Page": "1", "X-Page-Size": "200", "X-Total-Count": "0" } });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("activos fixos", () => {
  test("lista, registar validado com valores em texto, correr a amortização", async ({ page, api, violacoes }) => {
    await comActivos(api)
      .em("POST", "/finance/assets", { status: 201, corpo: { id: IDF9C.portatil, number: "AF-003" } })
      .em("POST", "/finance/assets/depreciation-runs", { status: 200, corpo: { month: "2026-10-01", recorded: 30, alreadyRecorded: 1, total: 666666.6, skipped: ["AF-009: abatido"], journalEntryId: "00000000-0000-4000-8000-000000000f11", ledgerNote: "2 activos sem conta do PGC não lançaram." } })
      .ligar();
    await entrar(page);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await menu.getByRole("link", { name: "Activos fixos" }).click();
    const linha = page.getByRole("row").filter({ hasText: "Portátil Dell" });
    await expect(linha).toContainText("827 777,78");
    await expect(page.getByRole("row").filter({ hasText: "Cadeira antiga" }).getByText("Abatido")).toBeVisible();
    await verificar(page);
    await page.getByLabel("Estado").selectOption("Disposed");
    await expect(page).toHaveURL(/estado=Disposed/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/finance/assets" && p.query.includes("status=Disposed"))).toBe(true);

    await page.getByRole("button", { name: "Registar activo" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Custo de aquisição").fill("0");
    await d.getByLabel("Vida útil (meses)").fill("0");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Indique o nome.")).toBeVisible();
    await expect(d.getByText("Custo positivo (até 2 casas decimais).")).toBeVisible();
    await expect(d.getByText("De 1 a 1200 meses.")).toBeVisible();
    await d.getByLabel("Nome").fill("Impressora");
    await d.getByLabel("Categoria (opcional)").fill("Equipamento informático");
    await d.getByLabel("Adquirido a").fill("2026-10-01");
    await d.getByLabel("Custo de aquisição").fill("300 000,50");
    await d.getByLabel("Valor residual (opcional)").fill("10 000");
    await d.getByLabel("Método de amortização").selectOption("DecliningBalance");
    await d.getByLabel("Vida útil (meses)").fill("48");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Quotas decrescentes exigem a taxa anual", { exact: false })).toBeVisible();
    await d.getByLabel("Taxa anual (%)").fill("25");
    // Só contas de movimento: o abate credita a conta do bem (a 11.2 e a 11.3 são agregadoras).
    const opcoes = d.getByLabel("Conta do PGC (opcional)").locator("option");
    await expect(opcoes).toHaveCount(19);
    await expect(opcoes.filter({ hasText: "11.2.3 Instalações" })).toHaveCount(1);
    await expect(opcoes.filter({ hasText: /^11\.[23] / })).toHaveCount(0);
    await d.getByLabel("Conta do PGC (opcional)").selectOption("11.5");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(page).toHaveURL(new RegExp(`/activos/${IDF9C.portatil}$`));
    expect(api.escritas("POST", "/finance/assets")[0]?.corpo).toMatchObject({
      code: null,
      name: "Impressora",
      category: "Equipamento informático",
      acquiredOn: "2026-10-01",
      acquisitionCost: "300000.50",
      residualValue: "10000.00",
      currency: "AOA",
      method: "DecliningBalance",
      usefulLifeMonths: 48,
      annualRate: "25",
      totalUnits: null,
      ledgerAccountCode: "11.5",
    });

    await page.goto("/activos");
    await page.getByRole("button", { name: "Correr amortização" }).click();
    await d.getByLabel("Mês").fill("2026-10");
    await d.getByRole("button", { name: "Correr" }).click();
    await expect(d.getByText("30 activos amortizados, 1 já registados", { exact: false })).toBeVisible();
    await expect(d.getByText("Saltados: AF-009: abatido")).toBeVisible();
    // Lançou no razão; a ligação ao lançamento só aparece a quem lê o razão (este perfil não lê).
    await expect(d.getByText("Lançado no razão.")).toBeVisible();
    await expect(d.getByRole("link", { name: "Ver o lançamento" })).toHaveCount(0);
    await expect(d.getByText("2 activos sem conta do PGC não lançaram.")).toBeVisible();
    expect(api.escritas("POST", "/finance/assets/depreciation-runs").map((p) => p.corpo)).toEqual([{ month: "2026-10-01", unitsUsed: null }]);
    expect(await violacoes()).toEqual([]);
  });

  test("activo: plano registado e previsto; sem corrigir depois de amortizar; abater", async ({ page, api }) => {
    await comActivos(api)
      .em("POST", `/finance/assets/${IDF9C.portatil}/disposal`, { status: 200, corpo: { assetId: IDF9C.portatil, journalEntryId: null, ledgerNote: "O activo não tem conta do PGC: o abate não lançou no razão." } })
      .ligar();
    await entrar(page);
    await page.goto(`/activos/${IDF9C.portatil}`);
    await expect(page.getByRole("table", { name: "Plano de amortização" }).getByRole("row").filter({ hasText: "Março 2026" })).toContainText("Registada");
    await expect(page.getByRole("table", { name: "Plano de amortização" }).getByRole("row").filter({ hasText: "Abril 2026" })).toContainText("Prevista");
    await expect(page.getByRole("button", { name: "Corrigir", exact: true })).toHaveCount(0);
    await expect(page.getByText("Já tem amortização registada: o plano não se corrige.")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Abater" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Data do abate").fill("2026-03-10");
    await d.getByRole("button", { name: "Abater" }).click();
    await expect(d.getByText("O abate é depois da aquisição.")).toBeVisible();
    await d.getByLabel("Data do abate").fill("2026-10-17");
    await d.getByLabel("Valor de venda (opcional)").fill("120 000");
    await d.getByLabel("Motivo (opcional)").fill("Vendido.");
    await d.getByRole("button", { name: "Abater" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/assets/${IDF9C.portatil}/disposal`).map((p) => p.corpo)).toEqual([{ on: "2026-10-17", value: "120000.00", reason: "Vendido." }]);
    // O abate ficou gravado; a nota do razão fica à vista na ficha (ADR-096).
    await expect(page.getByText("O abate ficou gravado, mas não lançou no razão.")).toBeVisible();
    await expect(page.getByText("O activo não tem conta do PGC: o abate não lançou no razão.")).toBeVisible();
  });

  test("vender pela factura (ADR-107): só com a conta do PGC; FR de bens com uma linha na moeda do activo; abre a factura", async ({ page, api, violacoes }) => {
    const FACTURA = "00000000-0000-4000-8000-000000000c91";
    const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "200", "X-Total-Count": String(itens.length) } });
    // Sem conta do PGC: não se vende pela factura, e a ficha diz porquê.
    await comActivos(api).ligar();
    await entrar(page);
    await page.goto(`/activos/${IDF9C.portatil}`);
    await expect(page.getByText("Para vender este bem pela factura, indique primeiro a conta do PGC", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vender pela factura" })).toHaveCount(0);

    const ficha = fichaActivo();
    api
      .em("GET", `/finance/assets/${IDF9C.portatil}`, { status: 200, corpo: { ...ficha, asset: { ...ficha.asset, ledgerAccountCode: "11.5" } } })
      .em("GET", "/commercial/customers", pag(clientes()))
      .em("GET", "/finance/series", pag(series()))
      .em("GET", "/fiscal/tax-rates", pag(pautas()))
      .em("GET", "/finance/bank-accounts", pag([]))
      .em("POST", "/finance/sales-invoices", { status: 201, corpo: { invoiceId: FACTURA, number: "FR S001/9" } });
    await page.reload();
    await page.getByRole("button", { name: "Vender pela factura" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Descrição")).toHaveValue("Venda de Portátil Dell (AF-001)");
    await d.getByRole("button", { name: "Emitir factura" }).click();
    await expect(d.getByText("Preço de venda maior que zero, até 2 casas.")).toBeVisible();
    await d.getByLabel("Cliente").selectOption(IDF3.cliente);
    await d.getByLabel("Tipo").selectOption("FR");
    await d.getByRole("button", { name: "Emitir factura" }).click();
    await expect(d.getByText("Uma factura-recibo é paga no acto: indique o meio.")).toBeVisible();
    await d.getByLabel("Meio de pagamento").selectOption("NU");
    await d.getByLabel("Data da factura").fill("2026-10-20");
    await d.getByLabel("Preço de venda sem IVA (AOA)").fill("600 000");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Emitir factura" }).click();
    await expect(page).toHaveURL(new RegExp(`/facturas/${FACTURA}$`));
    expect(api.escritas("POST", "/finance/sales-invoices").map((p) => p.corpo)).toEqual([
      {
        customerId: IDF3.cliente,
        series: null,
        issuedOn: "2026-10-20",
        taxPointDate: null,
        currency: "AOA",
        documentType: "FR",
        dueDate: null,
        paymentTerms: null,
        withholdingRate: null,
        paymentMethod: "NU",
        referencedInvoiceId: null,
        bankAccountId: null,
        fixedAssetId: IDF9C.portatil,
        lines: [{ description: "Venda de Portátil Dell (AF-001)", quantity: "1", unitPrice: "600000.00", taxCode: "NOR", kind: "Goods" }],
      },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("activo sem amortização registada: corrigir envia tudo", async ({ page, api }) => {
    await comActivos(api)
      .em("GET", `/finance/assets/${IDF9C.portatil}`, { status: 200, corpo: fichaActivo(false) })
      .em("PUT", `/finance/assets/${IDF9C.portatil}`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto(`/activos/${IDF9C.portatil}`);
    await page.getByRole("button", { name: "Corrigir", exact: true }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Custo de aquisição")).toHaveValue("850000");
    await d.getByLabel("Vida útil (meses)").fill("48");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/finance/assets/${IDF9C.portatil}`)[0]?.corpo).toMatchObject({ code: "AF-001", name: "Portátil Dell", acquisitionCost: "850000.00", residualValue: "50000.00", usefulLifeMonths: 48, currency: "AOA" });
  });

  test("manutenção, custódia e seguros do activo", async ({ page, api, violacoes }) => {
    let aberta = true;
    await comActivos(api)
      .em("GET", "/finance/assets/custody", () => ({ status: 200, corpo: custodias(aberta) }))
      .em("POST", `/finance/assets/${IDF9C.portatil}/maintenance`, { status: 201, corpo: { id: "m2" } })
      .em("POST", `/finance/assets/maintenance/${IDF9C.manutencao}/completion`, { status: 204 })
      .em("POST", `/finance/assets/custody/${IDF9C.custodia}/return`, () => {
        aberta = false;
        return { status: 204 };
      })
      .em("POST", `/finance/assets/${IDF9C.portatil}/custody`, { status: 201, corpo: { id: "c2" } })
      .em("POST", `/finance/assets/${IDF9C.portatil}/insurance`, { status: 201, corpo: { id: "p2" } })
      .em("POST", `/finance/assets/insurance/${IDF9C.apolice}/cancellation`, { status: 204 })
      .ligar();
    await entrar(page);
    const d = page.getByRole("dialog");
    await page.goto(`/activos/${IDF9C.portatil}?vista=manutencao`);
    await page.getByRole("button", { name: "Agendar manutenção" }).click();
    await d.getByLabel("Tipo").selectOption("Inspection");
    await d.getByLabel("Descrição").fill("Inspecção anual");
    await d.getByLabel("Data").fill("2026-12-01");
    await d.getByLabel("Custo estimado em AOA (opcional)").fill("15 000");
    await d.getByRole("button", { name: "Agendar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/assets/${IDF9C.portatil}/maintenance`).map((p) => p.corpo)).toEqual([{ kind: "Inspection", description: "Inspecção anual", scheduledOn: "2026-12-01", provider: null, estimatedCost: "15000.00" }]);
    await page.getByRole("button", { name: "Concluir a manutenção de 05/11/2026" }).click();
    await d.getByLabel("Custo final em AOA (opcional)").fill("12 500");
    await d.getByRole("button", { name: "Concluir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/assets/maintenance/${IDF9C.manutencao}/completion`)[0]?.corpo).toMatchObject({ cost: "12500.00" });

    await page.goto(`/activos/${IDF9C.portatil}?vista=custodia`);
    await expect(page.getByRole("button", { name: "Entregar a um colaborador" })).toHaveCount(0);
    await page.getByRole("button", { name: "Registar a devolução de Carlos Teste" }).click();
    await d.getByLabel("Devolvido a").fill("2026-03-01");
    await d.getByRole("button", { name: "Registar devolução" }).click();
    await expect(d.getByText("A devolução não pode ser anterior à entrega.")).toBeVisible();
    await d.getByLabel("Devolvido a").fill("2026-10-17");
    await d.getByLabel("Estado na devolução (opcional)").fill("Bom");
    await d.getByRole("button", { name: "Registar devolução" }).click();
    await expect(d).toHaveCount(0);
    await page.getByRole("button", { name: "Entregar a um colaborador" }).click();
    await d.getByLabel("Colaborador").selectOption(ID.emp1);
    await d.getByRole("button", { name: "Entregar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/assets/${IDF9C.portatil}/custody`)[0]?.corpo).toMatchObject({ employeeId: ID.emp1 });

    await page.goto(`/activos/${IDF9C.portatil}?vista=seguros`);
    await expect(page.getByRole("row").filter({ hasText: "AP-77" })).toContainText("Em vigor · 75 dias");
    await verificar(page);
    await page.getByRole("button", { name: "Registar apólice" }).click();
    await d.getByLabel("Seguradora").fill("Fidelidade");
    await d.getByLabel("N.º da apólice").fill("FD-1");
    await d.getByLabel("Fim").fill("2027-10-16");
    await d.getByLabel("Prémio em AOA").fill("50 000");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/assets/${IDF9C.portatil}/insurance`)[0]?.corpo).toMatchObject({ insurer: "Fidelidade", policyNumber: "FD-1", endsOn: "2027-10-16", premium: "50000.00", currency: "AOA" });
    await page.getByRole("button", { name: "Cancelar a apólice AP-77" }).click();
    await d.getByRole("button", { name: "Cancelar apólice" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/assets/insurance/${IDF9C.apolice}/cancellation`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });

  test("AssetManager sem RH: entrega pela lista dos activos (B31), sem pedir nada aos RH; seguros a caducar", async ({ page, api }) => {
    await comActivos(api, meActivosF9)
      .em("GET", "/finance/assets/custody", { status: 200, corpo: custodias(false) })
      .em("POST", `/finance/assets/${IDF9C.portatil}/custody`, { status: 201, corpo: { id: "c2" } })
      .ligar();
    await entrar(page, meActivosF9.email);
    await page.goto(`/activos/${IDF9C.portatil}?vista=custodia`);
    await page.getByRole("button", { name: "Entregar a um colaborador" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Colaborador").selectOption({ label: "Ana Teste" });
    await d.getByRole("button", { name: "Entregar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/finance/assets/${IDF9C.portatil}/custody`)[0]?.corpo).toMatchObject({ employeeId: ID.emp1 });
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/"))).toBe(false);
    await page.goto("/activos?vista=seguros");
    await expect(page.getByRole("row").filter({ hasText: "AP-77" })).toContainText("em 75 dias");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/finance/assets/insurance" && p.query.includes("expiringWithinDays=90"))).toBe(true);
  });
});
