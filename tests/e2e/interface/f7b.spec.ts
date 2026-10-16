/**
 * F7b — RH do dia-a-dia, com a API simulada: organograma; contratos (o tipo
 * manda na data de fim, salário em texto); assiduidade (anomalias, marcar
 * ponto, falta); férias (pedir em nome, retirar, ver decisão, direito em
 * texto); benefícios (catálogo, aderir, cancelar); ficha com separadores por
 * permissão; dados pessoais só a pedido, mascarados, gravados por inteiro;
 * validades de imigração; documentos da ficha. Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { documento } from "../../fixtures/f5";
import { adesoes, ausencias, beneficios, contratos, dadosPessoais, documentosFicha, IDF7B, imigracao, marcacoes, meLeitorRh, meRhF7, organograma, saldos } from "../../fixtures/f7b";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });

function comF7b(api: ApiSimulada, me = meRhF7): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/hr/org-chart", { status: 200, corpo: organograma() })
    .em("GET", "/hr/contracts", pag(contratos()))
    .em("GET", "/hr/attendance", pag(marcacoes()))
    .em("GET", "/hr/leave", pag(ausencias()))
    .em("GET", "/hr/leave/balances", { status: 200, corpo: saldos() })
    .em("GET", "/hr/benefits", pag(beneficios()))
    .em("GET", "/hr/benefits/enrolments", pag(adesoes()))
    .em("GET", "/hr/immigration", { status: 200, corpo: [imigracao()] })
    .em("GET", `/hr/employees/${ID.emp2}/documents`, { status: 200, corpo: documentosFicha() })
    .em("GET", `/hr/employees/${ID.emp2}/personal-data`, { status: 200, corpo: dadosPessoais() })
    .em("GET", `/hr/employees/${ID.emp2}/immigration`, { status: 200, corpo: imigracao() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("RH do dia-a-dia", () => {
  test("organograma e menu de Pessoas do perfil HR", async ({ page, api, violacoes }) => {
    await comF7b(api).ligar();
    await entrar(page, meRhF7.email);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    for (const n of ["Organograma", "Contratos", "Assiduidade", "Férias e ausências", "Benefícios", "Validades de imigração"]) await expect(menu.getByRole("link", { name: n })).toBeVisible();
    await menu.getByRole("link", { name: "Organograma" }).click();
    await expect(page.getByRole("heading", { name: "Operações" })).toBeVisible();
    await expect(page.getByText("responsável: Ana Teste")).toBeVisible();
    await expect(page.getByRole("link", { name: "Carlos Teste" })).toHaveAttribute("href", `/colaboradores/${ID.emp2}`);
    await verificar(page);
    expect(await violacoes()).toEqual([]);
  });

  test("contratos: o tipo manda na data de fim; salário em texto; cessar com data", async ({ page, api }) => {
    await comF7b(api)
      .em("POST", "/hr/contracts", { status: 201, corpo: { contractId: "00000000-0000-4000-8000-000000000890" } })
      .em("POST", `/hr/contracts/${IDF7B.contrato}/termination`, { status: 204 })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/contratos");
    await expect(page.getByRole("link", { name: "Carlos Teste" })).toBeVisible();
    await expect(page.getByText("450 000,00 Kz")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Celebrar contrato" }).click();
    await page.getByRole("dialog").getByLabel("Colaborador").selectOption(ID.emp1);
    await page.getByLabel("Tipo").selectOption("FixedTerm");
    await page.getByLabel("Salário mensal").fill("0");
    await page.getByRole("dialog").getByRole("button", { name: "Celebrar" }).click();
    await expect(page.getByText("Um contrato a termo ou de prestação de serviços exige data de fim.")).toBeVisible();
    await expect(page.getByText("O salário tem de ser maior que zero.")).toBeVisible();
    await page.getByLabel("Início").fill("2026-11-01");
    await page.getByLabel(/^Fim/).fill("2027-04-30");
    await page.getByLabel("Salário mensal").fill("520 000,5");
    await page.getByRole("dialog").getByRole("button", { name: "Celebrar" }).dblclick();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/hr/contracts").map((p) => p.corpo)).toEqual([
      { employeeId: ID.emp1, type: "FixedTerm", startsOn: "2026-11-01", endsOn: "2027-04-30", monthlySalary: "520000.50", currency: "AOA", notes: null },
    ]);
    await page.getByRole("button", { name: "Cessar o contrato iniciado a 01/03/2026" }).click();
    await page.getByLabel("Último dia").fill("2026-10-31");
    await page.getByRole("dialog").getByRole("button", { name: "Cessar contrato" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/contracts/${IDF7B.contrato}/termination`).map((p) => p.corpo)).toEqual([{ on: "2026-10-31" }]);
  });

  test("assiduidade: só anomalias na query; marcar ponto e registar falta", async ({ page, api }) => {
    await comF7b(api)
      .em("POST", "/hr/attendance/clock", { status: 200, corpo: { recordId: IDF7B.marcacao, movimento: "entrada", at: "2026-10-16T07:58:00+00:00" } })
      .em("POST", "/hr/attendance/absences", { status: 201, corpo: { recordId: IDF7B.falta } })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/assiduidade");
    await expect(page.getByText("Os últimos 30 dias.")).toBeVisible();
    await expect(page.getByText("8,25")).toBeVisible();
    await verificar(page);
    await page.getByLabel("Só anomalias").click();
    await expect(page.getByLabel("Só anomalias")).toBeChecked();
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/hr/attendance" && p.query.includes("anomaliesOnly=true"))).toBe(true);
    await page.getByRole("button", { name: "Marcar ponto" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Marcar" }).click();
    await expect(page.getByText("Escolha o colaborador.")).toBeVisible();
    await page.getByRole("dialog").getByLabel("Colaborador").selectOption(ID.emp1);
    await page.getByRole("dialog").getByRole("button", { name: "Marcar" }).click();
    await expect(page.getByText("Entrada registada às 08:58.")).toBeVisible();
    expect(api.escritas("POST", "/hr/attendance/clock").map((p) => p.corpo)).toEqual([{ employeeId: ID.emp1, day: null, late: false }]);
    await page.getByRole("button", { name: "Registar falta" }).click();
    await page.getByRole("dialog").getByLabel("Colaborador").selectOption(ID.emp2);
    await page.getByLabel("Dia").fill("2026-10-14");
    await page.getByLabel("Justificação (opcional)").fill("Doença.");
    await page.getByRole("dialog").getByRole("button", { name: "Registar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/hr/attendance/absences").map((p) => p.corpo)).toEqual([{ employeeId: ID.emp2, day: "2026-10-14", justification: "Doença." }]);
  });

  test("férias: ver decisão ainda por tomar, retirar, pedir em nome e definir o direito", async ({ page, api }) => {
    let lista = ausencias();
    await comF7b(api)
      .em("GET", "/hr/leave", () => pag(lista))
      .em("POST", `/hr/leave/${IDF7B.ausencia}/approval-outcome`, { status: 202, corpo: { estado: "Pending", detalhe: "Ainda à espera de decisão." } })
      .em("POST", `/hr/leave/${IDF7B.ausencia}/cancellation`, () => {
        lista = ausencias("Cancelled");
        return { status: 204 };
      })
      .em("POST", "/hr/leave", { status: 202, corpo: { leaveId: "00000000-0000-4000-8000-000000000891", estado: "Pending", detalhe: null } })
      .em("PUT", `/hr/employees/${ID.emp2}/leave-entitlements/2026/Annual`, { status: 204 })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/ferias");
    await expect(page.getByRole("cell", { name: "01/12/2026 a 05/12/2026" })).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Ver a decisão do pedido de 01/12/2026" }).click();
    await expect(page.getByText("Ainda à espera de decisão.")).toBeVisible();
    await page.getByRole("button", { name: "Retirar o pedido de 01/12/2026" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Retirar pedido" }).click();
    await expect(page.getByText("Retirado")).toBeVisible();
    await page.getByRole("button", { name: "Pedir ausência" }).click();
    await page.getByRole("dialog").getByLabel("Colaborador").selectOption(ID.emp1);
    await page.getByLabel("Tipo").selectOption("Sick");
    await page.getByLabel("Primeiro dia").fill("2026-10-20");
    await page.getByLabel("Último dia").fill("2026-10-21");
    await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/hr/leave").map((p) => p.corpo)).toEqual([{ employeeId: ID.emp1, type: "Sick", startsOn: "2026-10-20", endsOn: "2026-10-21", reason: null }]);
    await page.getByRole("link", { name: "Saldos" }).click();
    await expect(page.getByText("Sem direito definido")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Definir o direito de Carlos Teste" }).click();
    await page.getByLabel("Dias de direito").fill("22");
    await page.getByLabel("Transitados (opcional)").fill("2,5");
    await page.getByRole("dialog").getByRole("button", { name: "Gravar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("PUT", `/hr/employees/${ID.emp2}/leave-entitlements/2026/Annual`).map((p) => p.corpo)).toEqual([{ days: "22", carriedOverDays: "2.5", notes: null }]);
  });

  test("benefícios: nomes do catálogo nas adesões, aderir só a activos, criar e cancelar", async ({ page, api }) => {
    await comF7b(api)
      .em("POST", "/hr/benefits/enrolments", { status: 201, corpo: { enrolmentId: "00000000-0000-4000-8000-000000000892" } })
      .em("POST", `/hr/benefits/enrolments/${IDF7B.adesao}/cancellation`, { status: 204 })
      .em("POST", "/hr/benefits", { status: 201, corpo: { benefitId: "00000000-0000-4000-8000-000000000893" } })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/beneficios");
    await expect(page.getByRole("cell", { name: "Seguro de saúde", exact: true })).toBeVisible();
    await expect(page.getByText("25 000,00 Kz")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Aderir a um benefício" }).click();
    await expect(page.getByLabel("Benefício", { exact: true }).locator("option")).toHaveText(["Escolha…", "Seguro de saúde"]);
    await page.getByRole("dialog").getByLabel("Colaborador").selectOption(ID.emp1);
    await page.getByLabel("Benefício", { exact: true }).selectOption(IDF7B.beneficio);
    await page.getByLabel("Início").fill("2026-11-01");
    await page.getByRole("dialog").getByRole("button", { name: "Aderir" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/hr/benefits/enrolments").map((p) => p.corpo)).toEqual([{ employeeId: ID.emp1, benefitId: IDF7B.beneficio, startsOn: "2026-11-01" }]);
    await page.getByRole("button", { name: "Cancelar a adesão a Seguro de saúde" }).click();
    await page.getByLabel("Data de fim").fill("2026-12-31");
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar adesão" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/benefits/enrolments/${IDF7B.adesao}/cancellation`).map((p) => p.corpo)).toEqual([{ on: "2026-12-31" }]);
    await page.getByRole("link", { name: "Catálogo" }).click();
    await expect(page.getByText("Descontinuado")).toBeVisible();
    await page.getByRole("button", { name: "Novo benefício" }).click();
    await page.getByLabel("Nome").fill("Cartão de refeição");
    await page.getByLabel("Tipo").fill(" Alimentacao ");
    await page.getByRole("dialog").getByRole("button", { name: "Criar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/hr/benefits").map((p) => p.corpo)).toEqual([{ name: "Cartão de refeição", kind: "alimentacao", monthlyValue: "0.00", currency: "AOA", description: null }]);
  });

  test("ficha: dados pessoais só a pedido, mascarados, e gravados por inteiro", async ({ page, api, violacoes }) => {
    await comF7b(api).em("PUT", `/hr/employees/${ID.emp2}/personal-data`, { status: 204 }).ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/colaboradores/${ID.emp2}`);
    const vistas = page.getByRole("navigation", { name: "Ficha" });
    await expect(vistas.getByRole("link")).toHaveText(["Resumo", "Dados pessoais", "Documentos", "Contratos", "Férias", "Assiduidade", "Benefícios"]);
    await vistas.getByRole("link", { name: "Dados pessoais" }).click();
    await expect(page.getByRole("button", { name: "Ver dados pessoais" })).toBeVisible();
    expect(api.pedidos.filter((p) => p.caminho.endsWith("/personal-data") || p.caminho.endsWith("/immigration"))).toHaveLength(0);
    await page.getByRole("button", { name: "Ver dados pessoais" }).click();
    await expect(page.getByText("•••• 0123")).toBeVisible();
    await expect(page.getByText("AO06004000001234567890123")).toHaveCount(0);
    await expect(page.getByText("O próximo documento caduca a 05/11/2026 (20 dias).")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Mostrar IBAN" }).click();
    await expect(page.getByText("AO06004000001234567890123")).toBeVisible();
    await page.getByRole("button", { name: "Esconder IBAN" }).click();
    await expect(page.getByText("AO06004000001234567890123")).toHaveCount(0);
    await page.getByRole("button", { name: "Corrigir" }).first().click();
    await page.getByRole("dialog").getByLabel("IBAN").fill("AO06 0040 0000 1234 5678 9012 4");
    await page.getByRole("dialog").getByLabel("País").fill("A1");
    await page.getByRole("dialog").getByRole("button", { name: "Gravar" }).click();
    await expect(page.getByText("IBAN inválido: confirme os dígitos de controlo.")).toBeVisible();
    await expect(page.getByText("Duas letras (código ISO do país).")).toBeVisible();
    await page.getByRole("dialog").getByLabel("IBAN").fill("AO06 0040 0000 1234 5678 9012 3");
    await page.getByRole("dialog").getByLabel("País").fill("ao");
    await page.getByRole("dialog").getByLabel("Cidade").fill("");
    await page.getByRole("dialog").getByRole("button", { name: "Gravar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("PUT", `/hr/employees/${ID.emp2}/personal-data`).map((p) => p.corpo)).toEqual([
      { ...dadosPessoais(), employeeId: undefined, updatedAt: undefined, iban: "AO06 0040 0000 1234 5678 9012 3", country: "ao", city: null },
    ].map((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))));
    expect(await violacoes()).toEqual([]);
  });

  test("ficha: quem só lê colaboradores vê o resumo e os documentos", async ({ page, api }) => {
    await comF7b(api, meLeitorRh).ligar();
    await entrar(page, meLeitorRh.email);
    await page.goto(`/colaboradores/${ID.emp2}?vista=dados-pessoais`);
    await expect(page.getByRole("navigation", { name: "Ficha" }).getByRole("link")).toHaveText(["Resumo", "Documentos"]);
    // A vista pedida sem acesso cai no resumo.
    await expect(page.getByRole("heading", { name: "Dados", exact: true })).toBeVisible();
    expect(api.pedidos.filter((p) => p.caminho.endsWith("/personal-data"))).toHaveLength(0);
  });

  test("ficha › documentos: anexar (carregar e ligar), descarregar e retirar com motivo", async ({ page, api }) => {
    await comF7b(api)
      .em("POST", "/documents", { status: 201, corpo: { ...documento("bi-carlos.pdf"), documentId: IDF7B.novoDocumento, category: "Bilhete de identidade" } })
      .em("POST", `/hr/employees/${ID.emp2}/documents`, { status: 201, corpo: { linkId: "00000000-0000-4000-8000-000000000894" } })
      .em("POST", `/hr/employees/${ID.emp2}/documents/${IDF7B.documento}/removal`, { status: 204 })
      .em("GET", `/documents/${IDF7B.documento}`, { status: 200, bruto: { conteudo: "%PDF-1.7", tipo: "application/pdf" } })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/colaboradores/${ID.emp2}?vista=documentos`);
    await expect(page.getByText("contrato-carlos.pdf")).toBeVisible();
    await verificar(page);
    const [d] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descarregar contrato-carlos.pdf" }).click()]);
    expect(d.suggestedFilename()).toBe("contrato-carlos.pdf");
    await page.getByRole("button", { name: "Anexar documento" }).click();
    await page.getByLabel("Categoria").fill("Bilhete de identidade");
    await page.getByLabel("Ficheiro").setInputFiles({ name: "bi-carlos.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await expect(page.getByRole("dialog").getByText("bi-carlos.pdf")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Anexar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/employees/${ID.emp2}/documents`).map((p) => p.corpo)).toEqual([{ documentId: IDF7B.novoDocumento, category: "Bilhete de identidade" }]);
    await page.getByRole("button", { name: "Retirar" }).click();
    await page.getByLabel("Motivo (opcional)").fill("Substituído.");
    await page.getByRole("dialog").getByRole("button", { name: "Retirar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/employees/${ID.emp2}/documents/${IDF7B.documento}/removal`).map((p) => p.corpo)).toEqual([{ reason: "Substituído." }]);
  });

  test("validades de imigração: 90 dias por omissão, todos sem filtro", async ({ page, api }) => {
    await comF7b(api).ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/imigracao");
    await expect(page.getByRole("link", { name: "Carlos Teste" })).toHaveAttribute("href", `/colaboradores/${ID.emp2}?vista=dados-pessoais`);
    await expect(page.getByRole("cell", { name: "Passaporte" })).toBeVisible();
    await expect(page.getByText("20 dias")).toBeVisible();
    expect(api.pedidos.find((p) => p.caminho === "/hr/immigration")?.query).toBe("?expiringWithinDays=90");
    await expect(page.getByText("CB123456")).toHaveCount(0);
    await verificar(page);
    await page.getByRole("link", { name: "Todos" }).click();
    await expect.poll(() => api.pedidos.filter((p) => p.caminho === "/hr/immigration").map((p) => p.query)).toContain("");
  });
});
