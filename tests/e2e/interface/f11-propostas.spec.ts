/**
 * F11 (2.º bloco) — propostas e modelos, com a API simulada: lista (estado no
 * URL), nova com modelo (o texto fica para o servidor), linha com serviço do
 * catálogo na moeda da proposta e linha livre com o total previsto, tirar,
 * corrigir, enviar, decidir (aceite/recusada com notas), PDF em anexo,
 * versões; texto como texto; o Manager só lê.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF3 } from "../apoio-f3";
import { IDF3 } from "../../fixtures/f3";
import { escolhasComerciais, IDF11, IDF11P, leads, meGestorF11, meVendasF11, modelos, oportunidades, propostas, servicos, versoes } from "../../fixtures/f11";

/** Como o servidor: sem `includeInactive=true`, só os activos. */
const inactivos = (url: string) => new URL(url).searchParams.get("includeInactive") === "true";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "200", "X-Total-Count": String(itens.length) } });

function comPropostas(api: ApiSimulada, me = meVendasF11): ApiSimulada {
  return comF3(api, me)
    .em("GET", "/commercial/leads", pag(leads()))
    .em("GET", "/commercial/lookups", { status: 200, corpo: escolhasComerciais() })
    .em("GET", "/commercial/opportunities", pag(oportunidades()))
    .em("GET", "/commercial/proposals", pag(propostas()))
    .em("GET", `/commercial/proposals/${IDF11P.rascunho}`, { status: 200, corpo: propostas()[0] })
    .em("GET", `/commercial/proposals/${IDF11P.enviada}`, { status: 200, corpo: propostas()[1] })
    .em("GET", `/commercial/proposals/${IDF11P.rascunho}/versions`, { status: 200, corpo: versoes() })
    .em("GET", `/commercial/proposals/${IDF11P.enviada}/versions`, { status: 200, corpo: [] })
    .em("GET", "/commercial/proposal-templates", (route) => ({ status: 200, corpo: modelos().filter((m) => m.active || inactivos(route.request().url())) }))
    .em("GET", "/commercial/service-types", (route) => ({
      status: 200,
      corpo: [...servicos(), { serviceTypeId: "00000000-0000-4000-8000-000000000b33", code: "USD1", name: "Em dólares", description: null, unitPrice: 100, currency: "USD", active: true }].filter((t) => t.active || inactivos(route.request().url())),
    }));
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("propostas", () => {
  test("Sales: lista com estado no URL; nova com modelo deixa o texto para o servidor", async ({ page, api, violacoes }) => {
    await comPropostas(api).em("POST", "/commercial/proposals", { status: 201, corpo: { proposalId: IDF11P.rascunho } }).ligar();
    await entrar(page, meVendasF11.email);
    await page.getByRole("link", { name: "Propostas", exact: true }).click();
    const tabela = page.getByRole("table", { name: "Propostas" });
    await expect(tabela.getByRole("row").filter({ hasText: "Auditoria 2027" })).toContainText("Cliente Teste, Lda");
    await expect(tabela.getByRole("row").filter({ hasText: "Consultoria fiscal" })).toContainText("Marta Lopes (Lopes & Filhos)");
    await expect(tabela.getByRole("row").filter({ hasText: "Consultoria fiscal" })).toContainText("4 500,00 USD");
    await verificar(page);
    await page.getByLabel("Estado").selectOption("Sent");
    await expect(page).toHaveURL(/estado=Sent/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/commercial/proposals" && p.query.includes("status=Sent"))).toBe(true);

    await page.getByRole("button", { name: "Nova proposta" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Criar rascunho" }).click();
    await expect(d.getByText("Indique o título.")).toBeVisible();
    await expect(d.getByText("Escolha o cliente.")).toBeVisible();
    await d.getByLabel("Título").fill("Auditoria 2027");
    await d.getByLabel("Cliente", { exact: true }).selectOption({ label: "Cliente Teste, Lda" });
    // Só as oportunidades abertas deste cliente.
    await expect(d.getByLabel("Oportunidade (opcional)").locator("option")).toHaveText(["Nenhuma", "Auditoria 2027", "Formação em Excel"]);
    await d.getByLabel("Oportunidade (opcional)").selectOption({ label: "Auditoria 2027" });
    await d.getByLabel("Modelo (opcional)").selectOption({ label: "Proposta padrão" });
    await expect(d.getByLabel("Modelo (opcional)").locator("option")).toHaveCount(2);
    await d.getByLabel("Válida até (opcional)").fill("2099-11-30");
    await d.getByRole("button", { name: "Criar rascunho" }).click();
    await expect(page).toHaveURL(new RegExp(`/propostas/${IDF11P.rascunho}$`));
    expect(api.escritas("POST", "/commercial/proposals")[0]?.corpo).toEqual({
      title: "Auditoria 2027",
      customerId: IDF3.cliente,
      leadId: null,
      opportunityId: IDF11.op1,
      currency: "AOA",
      validUntil: "2099-11-30",
      templateId: IDF11P.modelo,
      body: null,
      notes: null,
    });
    expect(await violacoes()).toEqual([]);
  });

  test("rascunho: linhas (serviço da mesma moeda, livre com total previsto), tirar, corrigir, enviar; PDF e versões", async ({ page, api, violacoes }) => {
    await comPropostas(api)
      .em("POST", `/commercial/proposals/${IDF11P.rascunho}/lines`, { status: 201, corpo: { lineId: "l9" } })
      .em("DELETE", `/commercial/proposals/${IDF11P.rascunho}/lines/${IDF11P.linha2}`, { status: 204 })
      .em("PUT", `/commercial/proposals/${IDF11P.rascunho}`, { status: 204 })
      .em("POST", `/commercial/proposals/${IDF11P.rascunho}/sending`, { status: 204 })
      .em("GET", `/commercial/proposals/${IDF11P.rascunho}/document`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.goto(`/propostas/${IDF11P.rascunho}`);
    await expect(page.getByRole("heading", { name: "Auditoria 2027", level: 1 })).toBeVisible();
    const linhas = page.getByRole("table", { name: "Linhas da proposta" });
    await expect(linhas.getByRole("row").nth(1)).toContainText("Horas de auditoria");
    await expect(linhas.getByRole("row").nth(1)).toContainText("7,5%");
    // A posição das linhas vem do servidor (B36).
    await expect(linhas.getByRole("row").nth(2).getByRole("cell").first()).toHaveText("2");
    await expect(page.getByText("Total: 34 688,89 Kz")).toBeVisible();
    await expect(page.getByText("<img src=x onerror=alert(1)>", { exact: false })).toBeVisible();
    expect(await page.locator("main img").count()).toBe(0);
    const v = page.getByRole("list", { name: "Versões da proposta" }).getByRole("listitem");
    await expect(v.nth(0)).toContainText("Versão 2 · Envio");
    await v.nth(1).getByText(/^Versão 1/).click();
    await expect(v.nth(1)).toContainText("Horas de auditoria");
    await verificar(page);

    await page.getByRole("button", { name: "Acrescentar linha" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Serviço (opcional)").locator("option")).toHaveText(["Nenhum (linha livre)", /^AUD · Auditoria/]);
    await d.getByLabel("Serviço (opcional)").selectOption({ index: 1 });
    await d.getByLabel("Quantidade").fill("2,5");
    await expect(d.getByText("Total da linha: 62 500,00 Kz")).toBeVisible();
    await d.getByRole("button", { name: "Acrescentar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/proposals/${IDF11P.rascunho}/lines`)[0]?.corpo).toEqual({ serviceTypeId: IDF11.servico, description: null, quantity: "2.5", unitPrice: null, discountPercent: null });
    await page.getByRole("button", { name: "Acrescentar linha" }).click();
    await d.getByRole("button", { name: "Acrescentar" }).click();
    await expect(d.getByText("Indique a descrição (ou escolha um serviço).")).toBeVisible();
    await d.getByLabel("Descrição").fill("Horas extra");
    await d.getByLabel("Quantidade").fill("3");
    await d.getByLabel("Preço unitário em AOA").fill("12 500,5");
    await d.getByLabel("Desconto (%)").fill("7,5");
    await expect(d.getByText("Total da linha: 34 688,89 Kz")).toBeVisible();
    await d.getByRole("button", { name: "Acrescentar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/proposals/${IDF11P.rascunho}/lines`)[1]?.corpo).toEqual({ serviceTypeId: null, description: "Horas extra", quantity: "3", unitPrice: "12500.50", discountPercent: "7.5" });
    await page.getByRole("button", { name: "Tirar a linha Deslocação" }).click();
    await expect.poll(() => api.escritas("DELETE", `/commercial/proposals/${IDF11P.rascunho}/lines/${IDF11P.linha2}`)).toHaveLength(1);

    await page.getByRole("button", { name: "Corrigir" }).click();
    await d.getByLabel("Título").fill("Auditoria 2027 (revista)");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/commercial/proposals/${IDF11P.rascunho}`)[0]?.corpo).toMatchObject({ title: "Auditoria 2027 (revista)", customerId: IDF3.cliente, opportunityId: IDF11.op1, currency: "AOA", templateId: null });

    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDF" }).click();
    expect((await descarga).suggestedFilename()).toBe("PROP-20261015-A1B2C3.pdf");
    await page.getByRole("button", { name: "Marcar como enviada" }).click();
    await expect(d).toContainText("34 688,89 Kz");
    await d.getByRole("button", { name: "Enviada" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/proposals/${IDF11P.rascunho}/sending`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });

  test("enviada: cliente recusou com notas; sem corrigir nem linhas", async ({ page, api }) => {
    await comPropostas(api).em("POST", `/commercial/proposals/${IDF11P.enviada}/rejection`, { status: 204 }).ligar();
    await entrar(page, meVendasF11.email);
    await page.goto(`/propostas/${IDF11P.enviada}`);
    await expect(page.getByRole("button", { name: "Corrigir" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Acrescentar linha" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Marta Lopes (Lopes & Filhos)" })).toHaveAttribute("href", `/leads/${IDF11.lead}`);
    await page.getByRole("button", { name: "Cliente recusou" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Notas (opcional)").fill("Preço acima do orçamento.");
    await d.getByRole("button", { name: "Recusada" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/commercial/proposals/${IDF11P.enviada}/rejection`)[0]?.corpo).toEqual({ notes: "Preço acima do orçamento." });
  });

  test("Manager lê propostas e modelos, sem botões", async ({ page, api }) => {
    await comPropostas(api, meGestorF11).ligar();
    await entrar(page, meGestorF11.email);
    await page.goto(`/propostas/${IDF11P.rascunho}`);
    await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Corrigir" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Marcar como enviada" })).toHaveCount(0);
    await page.goto("/modelos-proposta");
    await expect(page.getByRole("table", { name: "Modelos de proposta" })).toContainText("Proposta padrão");
    await expect(page.getByRole("button", { name: "Novo modelo" })).toHaveCount(0);
  });
});

test.describe("modelos", () => {
  test("novo validado e corrigir para desactivar", async ({ page, api, violacoes }) => {
    await comPropostas(api)
      .em("POST", "/commercial/proposal-templates", { status: 201, corpo: { templateId: "m9" } })
      .em("PUT", `/commercial/proposal-templates/${IDF11P.modelo}`, { status: 204 })
      .ligar();
    await entrar(page, meVendasF11.email);
    await page.getByRole("link", { name: "Modelos de proposta" }).click();
    await expect(page.getByRole("row").filter({ hasText: "Modelo antigo" })).toContainText("Inactivo");
    await verificar(page);
    await page.getByRole("button", { name: "Novo modelo" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("Escreva o texto do modelo.")).toBeVisible();
    await d.getByLabel("Nome").fill("Formação");
    await d.getByLabel("Texto").fill("Exmos. {{cliente}},\n\nProposta «{{titulo}}».");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/commercial/proposal-templates")[0]?.corpo).toEqual({ name: "Formação", body: "Exmos. {{cliente}},\n\nProposta «{{titulo}}».", active: true });
    await page.getByRole("button", { name: "Corrigir Proposta padrão" }).click();
    await d.getByLabel("Activo (aparece nas propostas novas)").uncheck();
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/commercial/proposal-templates/${IDF11P.modelo}`)[0]?.corpo).toMatchObject({ name: "Proposta padrão", active: false });
    expect(await violacoes()).toEqual([]);
  });
});
