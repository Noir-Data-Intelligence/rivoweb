/**
 * F11 (1.º bloco) — CRM, com a API simulada: leads (estado no URL, registar
 * validado, avançar, desqualificar, converter em cliente novo, NIF repetido),
 * oportunidades (quadro com «Mover para», lista com a etapa no URL, ficha com
 * histórico, perder com motivo, ganhar só com cliente), actividades (hora de
 * Luanda), tipos de serviço e relatório. O Manager só lê. Nunca um id no ecrã.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF3 } from "../apoio-f3";
import { IDF3 } from "../../fixtures/f3";
import { actividades, escolhasComerciais, historico, IDF11, leads, meGestorF11, meVendasF11, oportunidades, quadro, relatorio, servicos } from "../../fixtures/f11";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "200", "X-Total-Count": String(itens.length) } });

function comCrm(api: ApiSimulada, me = meVendasF11): ApiSimulada {
  return comF3(api, me)
    .em("GET", "/commercial/leads", pag(leads()))
    .em("GET", `/commercial/leads/${IDF11.lead}`, { status: 200, corpo: leads()[0] })
    .em("GET", `/commercial/leads/${IDF11.leadConvertido}`, { status: 200, corpo: leads()[1] })
    .em("GET", "/commercial/lookups", { status: 200, corpo: escolhasComerciais() })
    .em("GET", "/commercial/opportunities", pag(oportunidades()))
    .em("GET", "/commercial/opportunities/board", { status: 200, corpo: quadro() })
    .em("GET", `/commercial/opportunities/${IDF11.op1}`, { status: 200, corpo: oportunidades()[0] })
    .em("GET", `/commercial/opportunities/${IDF11.opLead}`, { status: 200, corpo: oportunidades()[2] })
    .em("GET", `/commercial/opportunities/${IDF11.op1}/history`, { status: 200, corpo: historico() })
    .em("GET", `/commercial/opportunities/${IDF11.opLead}/history`, { status: 200, corpo: [] })
    .em("GET", "/commercial/activities", pag(actividades()))
    .em("GET", "/commercial/service-types", { status: 200, corpo: servicos() })
    .em("GET", "/commercial/crm/report", { status: 200, corpo: relatorio() })
    .em("GET", "/commercial/proposals", pag([]));
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

/** Nenhum id de cliente, lead, oportunidade ou pessoa à vista. */
async function semIds(page: Page) {
  const texto = await page.locator("main").innerText();
  expect(texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
}

test.describe("leads", () => {
  test("Sales: estado no URL, registar validado, avançar, desqualificar; notas como texto", async ({ page, api, violacoes }) => {
    await comCrm(api)
      .em("POST", "/commercial/leads", { status: 201, corpo: { leadId: IDF11.lead } })
      .em("POST", `/commercial/leads/${IDF11.lead}/status`, { status: 204 })
      .em("POST", `/commercial/leads/${IDF11.lead}/disqualification`, { status: 204 })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.getByRole("link", { name: "Leads" }).click();
    await expect(page.getByRole("table", { name: "Leads" })).toContainText("Lopes & Filhos");
    await verificar(page);
    await page.getByLabel("Estado").selectOption("New");
    await expect(page).toHaveURL(/estado=New/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/commercial/leads" && p.query.includes("status=New"))).toBe(true);

    await page.getByRole("button", { name: "Novo lead" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("E-mail (opcional)").fill("nao-e-email");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d.getByText("Indique o nome de quem contactar.")).toBeVisible();
    await expect(d.getByText("E-mail inválido.")).toBeVisible();
    expect(api.escritas("POST", "/commercial/leads")).toHaveLength(0);
    await d.getByLabel("Nome de quem contactar").fill("  Marta Lopes ");
    await d.getByLabel("E-mail (opcional)").fill("marta@lopes.ao");
    await d.getByLabel("Origem (opcional)").fill("Feira");
    // O responsável escolhe-se da lista do comercial, sem ler os RH (B35).
    await d.getByLabel("Responsável (opcional)").selectOption({ label: "Joana Vendas" });
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(page).toHaveURL(new RegExp(`/leads/${IDF11.lead}$`));
    expect(api.escritas("POST", "/commercial/leads")[0]?.corpo).toEqual({ name: "Marta Lopes", company: null, email: "marta@lopes.ao", phone: null, source: "Feira", ownerEmployeeId: IDF11.dono, notes: null });
    expect(api.pedidos.some((p) => p.caminho.startsWith("/hr/"))).toBe(false);

    await expect(page.getByText("<script>alert(1)</script>", { exact: false })).toBeVisible();
    expect(await page.locator("main script").count()).toBe(0);
    // O nome do responsável vem da vista (B35); nunca o id.
    await expect(page.getByText("Joana Vendas").first()).toBeVisible();
    await semIds(page);
    await verificar(page);
    await page.getByRole("button", { name: "Marcar contactado" }).click();
    await expect.poll(() => api.escritas("POST", `/commercial/leads/${IDF11.lead}/status`)[0]?.corpo).toEqual({ status: "Contacted" });
    await page.getByRole("button", { name: "Desqualificar" }).click();
    await d.getByRole("button", { name: "Desqualificar" }).click();
    await expect(d.getByText("Indique o motivo.")).toBeVisible();
    await d.getByLabel("Motivo").fill("Sem orçamento.");
    await d.getByRole("button", { name: "Desqualificar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/leads/${IDF11.lead}/disqualification`)[0]?.corpo).toEqual({ reason: "Sem orçamento." });
    expect(await violacoes()).toEqual([]);
  });

  test("converter em cliente novo com oportunidade; NIF repetido explica o caminho", async ({ page, api }) => {
    let vez = 0;
    await comCrm(api)
      .em("POST", `/commercial/leads/${IDF11.lead}/conversion`, () => {
        vez += 1;
        return vez === 1 ? { status: 409, corpo: { title: "Conflito", status: 409, detail: "Já existe um cliente com este NIF — converta para esse cliente." } } : { status: 200, corpo: { customerId: IDF3.cliente, opportunityId: IDF11.novaOp } };
      })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.goto(`/leads/${IDF11.lead}`);
    await page.getByRole("button", { name: "Converter em cliente" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Converter" }).click();
    await expect(d.getByText("Indique o NIF do novo cliente.")).toBeVisible();
    await d.getByLabel("NIF").fill("5417000000");
    await d.getByLabel("Morada de facturação").fill("Rua Direita, 10");
    await d.getByLabel("Cidade").fill("Luanda");
    await d.getByLabel("Valor estimado (opcional)").fill("2 500 000");
    await d.getByRole("button", { name: "Converter" }).click();
    await expect(d.getByText("Já existe um cliente com este NIF", { exact: false }).first()).toBeVisible();
    await expect(d.getByText("escolha «Cliente já registado»", { exact: false })).toBeVisible();
    expect(api.escritas("POST", `/commercial/leads/${IDF11.lead}/conversion`)[0]?.corpo).toEqual({
      customerId: null,
      taxId: "5417000000",
      addressDetail: "Rua Direita, 10",
      city: "Luanda",
      country: "AO",
      opportunityTitle: "Lopes & Filhos",
      estimatedValue: "2500000.00",
      currency: "AOA",
    });
    await d.getByLabel("Cliente já registado").check();
    await d.getByLabel("Cliente registado").selectOption({ index: 1 });
    await d.getByRole("button", { name: "Converter" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/leads/${IDF11.lead}/conversion`)[1]?.corpo).toMatchObject({ customerId: IDF3.cliente, taxId: null, opportunityTitle: "Lopes & Filhos" });
  });
});

test.describe("oportunidades", () => {
  test("Sales: quadro com totais por moeda e «Mover para»; lista paginada pelo servidor, com a etapa no URL", async ({ page, api, violacoes }) => {
    await comCrm(api).em("POST", `/commercial/opportunities/${IDF11.op2}/stage`, { status: 204 }).ligar();
    await entrar(page, meVendasF11.email);
    await page.getByRole("link", { name: "Oportunidades" }).click();
    const proposta = page.getByRole("region", { name: "Proposta (1)" });
    await expect(proposta).toContainText("Auditoria 2027");
    await expect(proposta).toContainText("Cliente Teste, Lda");
    await expect(proposta).toContainText("ponderado");
    await expect(page.getByRole("region", { name: "Qualificação (1)" })).toContainText("Marta Lopes (Lopes & Filhos)");
    await expect(page.getByRole("region", { name: "Prospecção (1)" })).toContainText("USD");
    await semIds(page);
    await verificar(page);
    await page.getByLabel("Mover Formação em Excel para").selectOption("Negotiation");
    await expect.poll(() => api.escritas("POST", `/commercial/opportunities/${IDF11.op2}/stage`)[0]?.corpo).toEqual({ stage: "Negotiation", boardOrder: null });

    await page.getByRole("link", { name: "Lista" }).click();
    // A ordem é a do servidor (B35), pedida por páginas.
    const linhas = page.getByRole("table", { name: "Oportunidades" }).getByRole("row");
    await expect(linhas.nth(1)).toContainText("Auditoria 2027");
    await expect(linhas.nth(3)).toContainText("Marta Lopes (Lopes & Filhos)");
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/commercial/opportunities" && p.query.includes("page=1"))).toBe(true);
    await page.getByLabel("Etapa").selectOption("Won");
    await expect(page).toHaveURL(/etapa=Won/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/commercial/opportunities" && p.query.includes("stage=Won"))).toBe(true);
    expect(await violacoes()).toEqual([]);
  });

  test("ficha: histórico, corrigir pede a probabilidade, perder com motivo, actividade à hora de Luanda", async ({ page, api, violacoes }) => {
    await comCrm(api)
      .em("PUT", `/commercial/opportunities/${IDF11.op1}`, { status: 204 })
      .em("POST", `/commercial/opportunities/${IDF11.op1}/lost`, { status: 204 })
      .em("POST", "/commercial/activities", { status: 201, corpo: { activityId: "a9" } })
      .em("POST", `/commercial/activities/${IDF11.act2}/completion`, { status: 204 })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.goto(`/oportunidades/${IDF11.op1}`);
    await expect(page.getByRole("heading", { name: "Auditoria 2027", level: 1 })).toBeVisible();
    const etapas = page.getByRole("list", { name: "Histórico das etapas" }).getByRole("listitem");
    await expect(etapas.nth(0)).toContainText("Prospecção");
    await expect(etapas.nth(2)).toContainText("Qualificação → Proposta");
    await expect(etapas.nth(2)).toContainText("3,5 dias na anterior");
    await semIds(page);
    await verificar(page);

    await page.getByRole("button", { name: "Corrigir" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Probabilidade (%)").fill("");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("Entre 0 e 100.")).toBeVisible();
    await d.getByLabel("Probabilidade (%)").fill("60");
    await d.getByLabel("Valor estimado").fill("1 200 000,50");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/commercial/opportunities/${IDF11.op1}`)[0]?.corpo).toMatchObject({ customerId: IDF3.cliente, leadId: null, estimatedValue: "1200000.50", probability: 60, ownerEmployeeId: IDF11.dono });

    await page.getByRole("button", { name: "Registar actividade" }).click();
    await d.getByLabel("Tipo").selectOption("Meeting");
    await d.getByLabel("Quando").fill("2026-10-20T09:30");
    await d.getByLabel("Assunto").fill("Apresentar a proposta");
    await d.getByRole("button", { name: "Registar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/commercial/activities")[0]?.corpo).toEqual({
      kind: "Meeting",
      subject: "Apresentar a proposta",
      notes: null,
      scheduledAt: "2026-10-20T09:30:00+01:00",
      done: false,
      leadId: null,
      opportunityId: IDF11.op1,
      customerId: null,
      ownerEmployeeId: null,
    });
    await page.getByRole("button", { name: "Marcar feita: Reunião de proposta" }).click();
    await expect.poll(() => api.escritas("POST", `/commercial/activities/${IDF11.act2}/completion`)).toHaveLength(1);

    await page.getByRole("button", { name: "Marcar como perdida" }).click();
    await d.getByLabel("Motivo").fill("Escolheram outro.");
    await d.getByRole("button", { name: "Perdida" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/opportunities/${IDF11.op1}/lost`)[0]?.corpo).toEqual({ reason: "Escolheram outro." });
    expect(await violacoes()).toEqual([]);
  });

  test("de um lead: não se ganha sem converter, e o porquê", async ({ page, api }) => {
    await comCrm(api).ligar();
    await entrar(page, meVendasF11.email);
    await page.goto(`/oportunidades/${IDF11.opLead}`);
    await expect(page.getByText("converta primeiro o lead em cliente", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Marcar como ganha" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Abrir o lead" })).toHaveAttribute("href", `/leads/${IDF11.lead}`);
  });

  test("Manager: lê o quadro e o relatório com os nomes (B35), sem botões nem ligação aos clientes", async ({ page, api, violacoes }) => {
    await comCrm(api, meGestorF11).ligar();
    await entrar(page, meGestorF11.email);
    await page.goto("/oportunidades");
    await expect(page.getByRole("region", { name: "Proposta (1)" })).toContainText("Auditoria 2027");
    await expect(page.getByRole("region", { name: "Proposta (1)" })).toContainText("Cliente Teste, Lda");
    await expect(page.getByRole("region", { name: "Proposta (1)" }).getByRole("link", { name: "Cliente Teste, Lda" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nova oportunidade" })).toHaveCount(0);
    await expect(page.getByLabel(/^Mover /)).toHaveCount(0);
    expect(api.pedidos.some((p) => p.caminho === "/commercial/customers")).toBe(false);
    await semIds(page);

    await page.getByRole("link", { name: "Relatório comercial" }).click();
    await expect(page.getByText("Taxa de ganho")).toBeVisible();
    await expect(page.getByRole("table", { name: "Funil por etapa" })).toContainText("Prospecção");
    await expect(page.getByRole("table", { name: "Previsão por mês" })).toContainText("2026");
    await expect(page.getByRole("table", { name: "Leads por estado" })).toContainText("Convertido");
    await expect(page.getByRole("table", { name: "Desempenho por responsável" })).toContainText("Sem responsável");
    await expect(page.getByRole("table", { name: "Desempenho por responsável" })).toContainText("Joana Vendas");
    await semIds(page);
    await verificar(page);
    await page.getByLabel("Moeda").selectOption("USD");
    await expect(page).toHaveURL(/moeda=USD/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/commercial/crm/report" && p.query.includes("currency=USD"))).toBe(true);
    expect(await violacoes()).toEqual([]);
  });
});

test.describe("actividades e tipos de serviço", () => {
  test("actividades por fazer com o que referem; tipos de serviço: novo e corrigir com o preço em texto", async ({ page, api, violacoes }) => {
    await comCrm(api)
      .em("POST", "/commercial/service-types", { status: 201, corpo: { serviceTypeId: "s2" } })
      .em("PUT", `/commercial/service-types/${IDF11.servico}`, { status: 204 })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.getByRole("link", { name: "Actividades" }).click();
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/commercial/activities" && p.query.includes("done=false"))).toBe(true);
    const tabela = page.getByRole("table", { name: "Actividades" });
    await expect(tabela.getByRole("row").filter({ hasText: "Ligar à Marta" })).toContainText("Atrasada");
    await expect(tabela.getByRole("link", { name: "Marta Lopes (Lopes & Filhos)" })).toHaveAttribute("href", `/leads/${IDF11.lead}`);
    await expect(tabela.getByRole("link", { name: "Oportunidade · Cliente Teste, Lda" })).toHaveAttribute("href", `/oportunidades/${IDF11.op1}`);
    await verificar(page);

    await page.getByRole("link", { name: "Tipos de serviço" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Serviço antigo" })).toContainText("Inactivo");
    await page.getByRole("button", { name: "Novo tipo de serviço" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("Indique o código.")).toBeVisible();
    await d.getByLabel("Código").fill("FORM");
    await d.getByLabel("Nome").fill("Formação");
    await d.getByLabel("Preço unitário").fill("150 000");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/commercial/service-types")[0]?.corpo).toEqual({ code: "FORM", name: "Formação", description: null, unitPrice: "150000.00", currency: "AOA", active: true });
    await page.getByRole("button", { name: "Corrigir Auditoria" }).click();
    await expect(d.getByLabel("Código")).toBeDisabled();
    await d.getByLabel("Activo (aparece nas propostas novas)").uncheck();
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/commercial/service-types/${IDF11.servico}`)[0]?.corpo).toMatchObject({ code: "AUD", unitPrice: "25000.00", active: false });
    expect(await violacoes()).toEqual([]);
  });
});
