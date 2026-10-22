/**
 * F12 (3.º bloco) — frota, com a API simulada: viaturas (inactivas no URL,
 * registar validado), ficha com manutenção (abrir, planos: agendar, concluir,
 * cancelar), atribuições (terminar; atribuir pela lista da frota, B40),
 * viagens, despesas, documentos (abertos pela viatura, B40),
 * seguros e sinistros; manutenção prevista e seguros a caducar (no URL);
 * viatura inactiva sem acções. Texto de fora nunca vira HTML.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { apolices, documentosViatura, IDF12F, meAdminFrota, meFrota, planosPrevistos, sinistros, viatura, viaturas } from "../../fixtures/f12f";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const V = `/fleet/vehicles/${IDF12F.viatura}`;
const A = `/fleet/insurance/${IDF12F.apolice}`;

function comFrota(api: ApiSimulada, me = meFrota, ficha = viatura()): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/fleet/vehicles", (route) => pag(new URL(route.request().url()).searchParams.get("includeInactive") === "true" ? viaturas() : viaturas().slice(0, 1)))
    .em("GET", V, { status: 200, corpo: ficha })
    .em("GET", `/fleet/vehicles/${IDF12F.inactiva}`, { status: 200, corpo: viaturas()[1] })
    .em("GET", `${V}/documents`, pag(documentosViatura()))
    .em("GET", "/fleet/maintenance-plans/due", pag(planosPrevistos()))
    .em("GET", "/fleet/insurance", { status: 200, corpo: apolices() })
    .em("GET", `${A}/claims`, { status: 200, corpo: sinistros() })
    .em("GET", "/fleet/lookups", { status: 200, corpo: { employees: [{ id: ID.emp1, name: "Ana Teste" }] } });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("frota", () => {
  test("AssetManager: viaturas com inactivas no URL, quem tem e a próxima manutenção; registar validado", async ({ page, api, violacoes }) => {
    await comFrota(api).em("POST", "/fleet/vehicles", { status: 201, corpo: { vehicleId: IDF12F.viatura } }).ligar();
    await entrar(page, meFrota.email);
    await page.getByRole("link", { name: "Viaturas" }).click();
    const tabela = page.getByRole("table", { name: "Viaturas" });
    const linha = tabela.getByRole("row").filter({ hasText: "LD-12-34-AB" });
    await expect(linha).toContainText("Ana Teste");
    await expect(linha).toContainText("Em atraso");
    await expect(linha).toContainText("<b>4x4</b>");
    await expect(tabela).not.toContainText("LD-99-00-ZZ");
    await page.getByLabel("Mostrar também as inactivas").click();
    await expect(page).toHaveURL(/inactivas=sim/);
    await expect(tabela.getByRole("row").filter({ hasText: "LD-99-00-ZZ" })).toContainText("Inactiva");
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/"))).toBe(false);
    await verificar(page);

    await page.getByRole("button", { name: "Nova viatura" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Indique a matrícula.")).toBeVisible();
    await d.getByLabel("Matrícula").fill(" ld-12-34-ab ");
    await d.getByLabel("Modelo").fill("Toyota Hilux");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(page).toHaveURL(new RegExp(`/frota/${IDF12F.viatura}$`));
    expect(api.escritas("POST", "/fleet/vehicles")[0]?.corpo).toEqual({ plateNumber: "LD-12-34-AB", model: "Toyota Hilux" });
    expect(await violacoes()).toEqual([]);
  });

  test("ficha: manutenção (abrir, planos), atribuição terminada, viagem e despesa", async ({ page, api, violacoes }) => {
    await comFrota(api)
      .em("POST", `${V}/maintenance`, { status: 201, corpo: { maintenanceId: "m9" } })
      .em("POST", `${V}/maintenance-plans`, { status: 201, corpo: { planId: "p9" } })
      .em("POST", `${V}/maintenance-plans/${IDF12F.plano}/cycles`, { status: 204 })
      .em("POST", `${V}/maintenance-plans/${IDF12F.plano}/cancellation`, { status: 204 })
      .em("POST", `${V}/assignments/${IDF12F.atribuicao}/closure`, { status: 204 })
      .em("POST", `${V}/trips`, { status: 201, corpo: { tripId: "v9", distance: 59.5 } })
      .em("POST", `${V}/expenses`, { status: 201, corpo: { expenseId: "d9" } })
      .ligar();
    await entrar(page, meFrota.email);
    await page.goto(`/frota/${IDF12F.viatura}`);
    await expect(page.getByRole("heading", { name: "LD-12-34-AB", level: 1 })).toBeVisible();
    await expect(page.getByText("Atribuída a").locator("..")).toContainText("Ana Teste");
    await expect(page.getByRole("table", { name: "Registos de manutenção" })).toContainText("Revisão dos 10 000 km");
    await expect(page.getByRole("table", { name: "Planos preventivos" }).getByRole("row").filter({ hasText: "Pneus" })).toContainText("Cancelado");
    await verificar(page);

    await page.getByRole("button", { name: "Enviar para manutenção" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Abrir" }).click();
    await expect(d.getByText("Descreva a manutenção.")).toBeVisible();
    await d.getByLabel("Tipo").selectOption("Preventive");
    await d.getByLabel("Início").fill("2026-03-02");
    await d.getByLabel("Descrição").fill("Travões");
    await d.getByRole("button", { name: "Abrir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/maintenance`)[0]?.corpo).toEqual({ type: "Preventive", description: "Travões", startedOn: "2026-03-02" });

    await page.getByRole("button", { name: "Novo plano" }).click();
    await d.getByLabel("Descrição").fill("Inspecção anual");
    await d.getByLabel("Intervalo em dias").fill("0");
    await d.getByRole("button", { name: "Agendar" }).click();
    await expect(d.getByText("Dias inteiros, de 1 a 9999.")).toBeVisible();
    await d.getByLabel("Intervalo em dias").fill("365");
    await d.getByLabel("Primeira data").fill("2026-06-01");
    await d.getByRole("button", { name: "Agendar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/maintenance-plans`)[0]?.corpo).toEqual({ description: "Inspecção anual", intervalDays: 365, firstDueOn: "2026-06-01" });
    await page.getByRole("button", { name: "Concluir o ciclo de Mudança de óleo" }).click();
    await d.getByLabel("Concluído a").fill("2026-03-03");
    await d.getByRole("button", { name: "Concluir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/maintenance-plans/${IDF12F.plano}/cycles`)[0]?.corpo).toEqual({ completedOn: "2026-03-03" });
    await page.getByRole("button", { name: "Cancelar o plano Mudança de óleo" }).click();
    await d.getByRole("button", { name: "Cancelar plano" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/maintenance-plans/${IDF12F.plano}/cancellation`)).toHaveLength(1);

    await page.getByRole("link", { name: "Atribuições" }).click();
    await expect(page.getByRole("button", { name: "Atribuir", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Terminar a atribuição a Ana Teste" }).click();
    await d.getByLabel("Termina a").fill("2026-01-01");
    await d.getByRole("button", { name: "Terminar" }).click();
    await expect(d.getByText("O fim não pode ser anterior ao início da atribuição.")).toBeVisible();
    await d.getByLabel("Termina a").fill("2026-03-31");
    await d.getByRole("button", { name: "Terminar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/assignments/${IDF12F.atribuicao}/closure`)[0]?.corpo).toEqual({ endedOn: "2026-03-31" });

    await page.getByRole("link", { name: "Viagens" }).click();
    await expect(page.getByRole("table", { name: "Viagens" }).getByRole("row").filter({ hasText: "Visita ao cliente" })).toContainText("Ana Teste");
    await page.getByRole("button", { name: "Registar viagem" }).click();
    await expect(d.getByLabel("Odómetro à partida (km)")).toHaveValue("12140,5");
    await d.getByLabel("Motorista (opcional)").selectOption({ label: "Ana Teste" });
    await d.getByLabel("Início").fill("2026-03-04");
    await d.getByLabel("Fim").fill("2026-03-04");
    await d.getByLabel("Odómetro à chegada (km)").fill("12100");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("O odómetro final não pode ser inferior ao inicial.")).toBeVisible();
    await d.getByLabel("Odómetro à chegada (km)").fill("12 200");
    await d.getByLabel("Motivo (opcional)").fill("Entrega");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/trips`)[0]?.corpo).toEqual({ driverId: ID.emp1, startedOn: "2026-03-04", endedOn: "2026-03-04", startOdometer: "12140.5", endOdometer: "12200", purpose: "Entrega" });

    await page.getByRole("link", { name: "Custos" }).click();
    await expect(page.getByText("Combustível").first().locator("..")).toContainText(/45\s000,00/);
    await page.getByRole("button", { name: "Registar despesa" }).click();
    await d.getByLabel("Categoria").selectOption("Parking");
    await d.getByLabel("Valor em AOA").fill("0");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Valor positivo (até 2 casas).")).toBeVisible();
    await d.getByLabel("Valor em AOA").fill("2 000,5");
    await d.getByLabel("Data").fill("2026-03-04");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/expenses`)[0]?.corpo).toEqual({ category: "Parking", amount: "2000.50", occurredOn: "2026-03-04", description: null });
    await verificar(page);
    expect(await violacoes()).toEqual([]);
  });

  test("documentos pela viatura (B40) e seguros: apólice nova, corrigida e anulada; sinistro aberto, pago e recusado", async ({ page, api, violacoes }) => {
    await comFrota(api)
      .em("POST", `${V}/documents/${IDF12F.documento}/removal`, { status: 204 })
      .em("GET", `${V}/documents/${IDF12F.documento}/content`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .em("POST", `${V}/insurance`, { status: 201, corpo: { id: "ap9" } })
      .em("PUT", A, { status: 204 })
      .em("POST", `${A}/cancellation`, { status: 204 })
      .em("POST", `${A}/claims`, { status: 201, corpo: { id: "s9" } })
      .em("POST", `${A}/claims/${IDF12F.sinistro}/settlement`, { status: 204 })
      .em("POST", `${A}/claims/${IDF12F.sinistro}/rejection`, { status: 204 })
      .ligar();
    await entrar(page, meFrota.email);
    await page.goto(`/frota/${IDF12F.viatura}?vista=documentos`);
    await expect(page.getByRole("table", { name: "Documentos da viatura" })).toContainText("livrete.pdf");
    const descargaAm = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar livrete.pdf" }).click();
    expect((await descargaAm).suggestedFilename()).toBe("livrete.pdf");
    expect(api.pedidos.some((p) => p.caminho.startsWith("/documents/") || p.caminho.startsWith("/finance/") || p.caminho.startsWith("/hr/"))).toBe(false);
    await expect(page.getByRole("button", { name: "Juntar documento" })).toBeVisible();
    await page.getByRole("button", { name: "Retirar livrete.pdf" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Retirar" }).click();
    await expect(d.getByText("Diga porque retira o documento da viatura.")).toBeVisible();
    await d.getByLabel("Motivo").fill("Livrete substituído.");
    await d.getByRole("button", { name: "Retirar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/documents/${IDF12F.documento}/removal`)[0]?.corpo).toEqual({ reason: "Livrete substituído." });

    await page.getByRole("link", { name: "Seguros", exact: true }).click();
    await expect(page.getByRole("table", { name: "Apólices" }).getByRole("row").filter({ hasText: "AUTO-2026-001" })).toContainText("70 dias para caducar");
    await verificar(page);
    await page.getByRole("button", { name: "Nova apólice" }).click();
    await d.getByRole("button", { name: "Contratar" }).click();
    await expect(d.getByText("Indique a seguradora.")).toBeVisible();
    await d.getByLabel("Seguradora").fill("Fidelidade");
    await d.getByLabel("N.º da apólice").fill("FD-9");
    await d.getByLabel("Início").fill("2027-01-01");
    await d.getByLabel("Fim").fill("2027-12-31");
    await d.getByLabel("Prémio").fill("300 000");
    await d.getByLabel("Capital seguro (opcional)").fill("18 000 000");
    await d.getByRole("button", { name: "Contratar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/insurance`)[0]?.corpo).toEqual({ insurer: "Fidelidade", policyNumber: "FD-9", coverage: null, startsOn: "2027-01-01", endsOn: "2027-12-31", premium: "300000.00", currency: "AOA", insuredValue: "18000000.00", notes: null });
    await page.getByRole("button", { name: "Corrigir a apólice AUTO-2026-001" }).click();
    await expect(d.getByLabel("Prémio")).toHaveValue("250000");
    await d.getByLabel("Prémio").fill("260 000");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", A)[0]?.corpo).toMatchObject({ insurer: "ENSA", policyNumber: "AUTO-2026-001", coverage: "Danos próprios", premium: "260000.00", insuredValue: "18000000.00" });

    await page.getByRole("button", { name: "Sinistros da apólice AUTO-2026-001" }).click();
    await expect(d.getByRole("list", { name: "Sinistros" })).toContainText("<script>x</script>");
    expect(await page.locator("[role=dialog] script").count()).toBe(0);
    await d.getByLabel("Data do sinistro").fill("2027-02-01");
    await d.getByRole("button", { name: "Abrir sinistro" }).click();
    await expect(d.getByText("O sinistro tem de ocorrer dentro da vigência da apólice.")).toBeVisible();
    await d.getByLabel("Data do sinistro").fill("2026-04-01");
    await d.getByLabel("Descrição").fill("Vidro partido");
    await d.getByLabel("Valor reclamado em AOA (opcional)").fill("40 000");
    await d.getByRole("button", { name: "Abrir sinistro" }).click();
    await expect.poll(() => api.escritas("POST", `${A}/claims`)[0]?.corpo).toEqual({ occurredOn: "2026-04-01", description: "Vidro partido", claimedAmount: "40000.00", reference: null });
    await d.getByRole("button", { name: "Pagar o sinistro de 05/03/2026" }).click();
    await expect(d.getByLabel("Valor pago em AOA")).toHaveValue("80000");
    await d.getByLabel("Valor pago em AOA").fill("75 000");
    await d.getByRole("button", { name: "Registar pagamento" }).click();
    await expect.poll(() => api.escritas("POST", `${A}/claims/${IDF12F.sinistro}/settlement`)[0]?.corpo).toEqual({ settledAmount: "75000.00" });
    await d.getByRole("button", { name: "Recusar o sinistro de 05/03/2026" }).click();
    await expect.poll(() => api.escritas("POST", `${A}/claims/${IDF12F.sinistro}/rejection`)).toHaveLength(1);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Anular a apólice AUTO-2026-001" }).click();
    await d.getByLabel("Anulada a").fill("2026-06-30");
    await d.getByRole("button", { name: "Anular apólice" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${A}/cancellation`)[0]?.corpo).toEqual({ on: "2026-06-30" });
    expect(await violacoes()).toEqual([]);
  });

  test("Admin: atribui, junta e abre documentos pela viatura, desactiva", async ({ page, api }) => {
    await comFrota(api, meAdminFrota, { ...viatura(), assignments: [] })
      .em("POST", `${V}/assignments`, { status: 201, corpo: { assignmentId: "a9" } })
      .em("POST", "/documents", { status: 201, corpo: { documentId: "00000000-0000-4000-8000-000000000f42", fileName: "inspeccao.pdf", contentType: "application/pdf", sizeInBytes: 100, category: "Frota", contentHash: "x", uploadedBy: null, uploadedAt: "2026-10-22T10:00:00Z" } })
      .em("POST", `${V}/documents`, { status: 201, corpo: { linkId: "l9" } })
      .em("GET", `${V}/documents/${IDF12F.documento}/content`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .em("POST", `${V}/deactivation`, { status: 204 })
      .ligar();
    await entrar(page, meAdminFrota.email);
    await page.goto(`/frota/${IDF12F.viatura}?vista=atribuicoes`);
    await page.getByRole("button", { name: "Atribuir", exact: true }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Atribuir" }).click();
    await expect(d.getByText("Escolha o colaborador.")).toBeVisible();
    await d.getByLabel("Colaborador").selectOption({ label: "Ana Teste" });
    await d.getByLabel("Desde").fill("2026-04-01");
    await d.getByRole("button", { name: "Atribuir" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/assignments`)[0]?.corpo).toEqual({ employeeId: ID.emp1, startedOn: "2026-04-01" });

    await page.getByRole("link", { name: "Documentos", exact: true }).click();
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar livrete.pdf" }).click();
    expect((await descarga).suggestedFilename()).toBe("livrete.pdf");
    await page.getByRole("button", { name: "Juntar documento" }).click();
    await d.getByLabel("Ficheiro").setInputFiles({ name: "inspeccao.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await expect(d.getByText("inspeccao.pdf")).toBeVisible();
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d.getByText("Indique a categoria (por exemplo, livrete ou inspecção).")).toBeVisible();
    await d.getByLabel("Categoria").fill("Inspecção");
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/documents`)[0]?.corpo).toEqual({ documentId: "00000000-0000-4000-8000-000000000f42", category: "Inspecção" });

    await page.getByRole("button", { name: "Desactivar" }).click();
    await d.getByRole("button", { name: "Desactivar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `${V}/deactivation`)).toHaveLength(1);
  });

  test("manutenção prevista e seguros a caducar com a janela no URL; viatura inactiva sem acções", async ({ page, api }) => {
    await comFrota(api).ligar();
    await entrar(page, meFrota.email);
    await page.getByRole("link", { name: "Manutenção prevista" }).click();
    await expect(page.getByRole("table", { name: "Manutenção prevista" }).getByRole("row").filter({ hasText: "Mudança de óleo" })).toContainText("Em atraso");
    await page.getByLabel("A vencer em").selectOption("60");
    await expect(page).toHaveURL(/dias=60/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/fleet/maintenance-plans/due" && p.query.includes("withinDays=60"))).toBe(true);
    await verificar(page);

    await page.getByRole("link", { name: "Seguros de frota" }).click();
    await page.getByLabel("Mostrar").selectOption("30");
    await expect(page).toHaveURL(/caducam=30/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/fleet/insurance" && p.query.includes("expiringWithinDays=30"))).toBe(true);
    await verificar(page);
    await page.getByRole("link", { name: "LD-12-34-AB" }).click();
    await expect(page).toHaveURL(new RegExp(`/frota/${IDF12F.viatura}\\?vista=seguros$`));

    await page.goto(`/frota/${IDF12F.inactiva}`);
    await expect(page.getByText("Inactiva: não recebe manutenção", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Desactivar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Enviar para manutenção" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Novo plano" })).toHaveCount(0);
  });
});
