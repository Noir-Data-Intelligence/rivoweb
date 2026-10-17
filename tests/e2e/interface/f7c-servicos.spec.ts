/**
 * F7c (2.º bloco) — anúncios e pedidos internos na gestão, com a API simulada:
 * anúncios (fases, publicar validado com datas de Luanda, corrigir mantendo a
 * hora original, arquivar), fila de pedidos (filtros no URL, prazo fora),
 * abrir em nome, pedido (responder, atribuir, mudar estado, fechar só com
 * confirmação, fechado só de leitura) e prazos (SLA em horas). Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { meRhF7 } from "../../fixtures/f7b";
import { anunciosGestao, IDF7C2, pedidosGestao, politicasSla } from "../../fixtures/f7c";

const problema = (status: number, detail: string) => ({ status, corpo: { status, title: "Conflito", detail }, cabecalhos: { "Content-Type": "application/problem+json" } });

function comServicos(api: ApiSimulada): ApiSimulada {
  return comF1(api, meRhF7)
    .em("GET", "/hr/announcements/manage", { status: 200, corpo: anunciosGestao() })
    .em("GET", "/hr/tickets", { status: 200, corpo: pedidosGestao() })
    .em("GET", `/hr/tickets/${IDF7C2.pedido}`, { status: 200, corpo: pedidosGestao()[0] })
    .em("GET", `/hr/tickets/${IDF7C2.fechado}`, { status: 200, corpo: { ...pedidosGestao()[1], messages: [] } })
    .em("GET", "/hr/tickets/sla-policies", { status: 200, corpo: politicasSla() });
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("anúncios e pedidos internos", () => {
  test("anúncios: fases, publicar validado e agendado, corrigir mantém a hora, arquivar", async ({ page, api, violacoes }) => {
    await comServicos(api)
      .em("POST", "/hr/announcements", { status: 201, corpo: { announcementId: "00000000-0000-4000-8000-000000000993" } })
      .em("PUT", `/hr/announcements/${IDF7C2.anuncio}`, { status: 204 })
      .em("POST", `/hr/announcements/${IDF7C2.anuncio}/archive`, { status: 204 })
      .ligar();
    await entrar(page, meRhF7.email);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await menu.getByRole("link", { name: "Anúncios" }).click();
    await expect(page.getByRole("heading", { name: "Encerramento para inventário" })).toBeVisible();
    await expect(page.getByText("Agendado")).toBeVisible();
    await expect(page.getByText("Aviso antigo")).toHaveCount(0);
    await page.getByLabel("Mostrar os arquivados").check();
    await expect(page.getByText("Aviso antigo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Corrigir o anúncio Aviso antigo" })).toHaveCount(0);
    await verificar(page);

    await page.getByRole("button", { name: "Publicar anúncio" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Publicar a (opcional)").fill("2026-12-01");
    await d.getByLabel("Deixa de aparecer a (opcional)").fill("2026-12-01");
    await d.getByRole("button", { name: "Publicar" }).click();
    await expect(d.getByText("Indique o título.")).toBeVisible();
    await expect(d.getByText("Escreva o texto do anúncio.")).toBeVisible();
    await expect(d.getByText("Tem de expirar depois do dia de publicação.")).toBeVisible();
    expect(api.escritas("POST", "/hr/announcements")).toHaveLength(0);
    await d.getByLabel("Título").fill("Natal");
    await d.getByLabel("Texto").fill("Jantar a 20.\nTragam a família.");
    await d.getByLabel("Deixa de aparecer a (opcional)").fill("2026-12-21");
    await d.getByLabel("Fixar no topo").check();
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Publicar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/announcements").map((p) => p.corpo)).toEqual([
      { title: "Natal", body: "Jantar a 20.\nTragam a família.", departmentId: null, pinned: true, publishedAt: "2026-12-01T00:00:00+01:00", expiresAt: "2026-12-21T00:00:00+01:00" },
    ]);

    await page.getByRole("button", { name: "Corrigir o anúncio Encerramento para inventário" }).click();
    await expect(d.getByLabel("Departamento (opcional)")).toHaveValue(ID.dep1);
    await d.getByLabel("Título").fill("Encerramento para inventário anual");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", `/hr/announcements/${IDF7C2.anuncio}`).map((p) => p.corpo)).toEqual([
      { title: "Encerramento para inventário anual", body: "Dia 31 o armazém fecha às 14h.", departmentId: ID.dep1, pinned: true, publishedAt: "2026-10-01T08:00:00+01:00", expiresAt: null },
    ]);

    await page.getByRole("button", { name: "Arquivar o anúncio Encerramento para inventário" }).click();
    await d.getByRole("button", { name: "Arquivar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/hr/announcements/${IDF7C2.anuncio}/archive`)).toHaveLength(1);
    expect(await violacoes()).toEqual([]);
  });

  test("fila: prazo fora à vista, filtros no URL; abrir em nome de um colaborador", async ({ page, api }) => {
    await comServicos(api).em("POST", "/hr/tickets", { status: 201, corpo: { ticketId: "00000000-0000-4000-8000-000000000994" } }).ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/pedidos-internos");
    const linha = page.getByRole("row").filter({ hasText: "Declaração de rendimentos" });
    await expect(linha.getByText("Resposta fora do prazo")).toBeVisible();
    await expect(linha.getByText("Carlos Teste · Pedido de documento")).toBeVisible();
    await verificar(page);
    await page.getByLabel("Estado").selectOption("Open");
    await expect(page).toHaveURL(/estado=Open/);
    await page.getByLabel("Categoria").selectOption("DocumentRequest");
    await expect(page).toHaveURL(/categoria=DocumentRequest/);
    await expect(page).toHaveURL(/estado=Open/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/hr/tickets" && p.query.includes("status=Open") && p.query.includes("category=DocumentRequest"))).toBe(true);

    await page.getByRole("button", { name: "Abrir pedido" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Abrir pedido" }).click();
    await expect(d.getByText("Escolha o colaborador.")).toBeVisible();
    await expect(d.getByText("Indique o assunto.")).toBeVisible();
    await expect(d.getByText("Escreva a mensagem.")).toBeVisible();
    await d.getByLabel("Colaborador").selectOption(ID.emp2);
    await d.getByLabel("Assunto").fill("Cartão de acesso");
    await d.getByLabel("Categoria").selectOption("Facilities");
    await d.getByLabel("Prioridade").selectOption("Urgent");
    await d.getByLabel("Mensagem").fill("Perdeu o cartão.");
    await d.getByRole("button", { name: "Abrir pedido" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/hr/tickets").map((p) => p.corpo)).toEqual([{ requesterEmployeeId: ID.emp2, subject: "Cartão de acesso", category: "Facilities", priority: "Urgent", body: "Perdeu o cartão." }]);
  });

  test("pedido: responder, atribuir, resolver; fechar só com confirmação", async ({ page, api, violacoes }) => {
    let estado = "Open";
    let respondido = false;
    await comServicos(api)
      .em("GET", `/hr/tickets/${IDF7C2.pedido}`, () => ({ status: 200, corpo: pedidosGestao(estado, respondido)[0] }))
      .em("POST", `/hr/tickets/${IDF7C2.pedido}/messages`, () => {
        respondido = true;
        return { status: 201, corpo: { messageId: "00000000-0000-4000-8000-000000000995" } };
      })
      .em("POST", `/hr/tickets/${IDF7C2.pedido}/assignment`, () => {
        estado = "InProgress";
        return { status: 204 };
      })
      .em("POST", `/hr/tickets/${IDF7C2.pedido}/status`, (r) => {
        estado = (r.request().postDataJSON() as { status: string }).status;
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/pedidos-internos/${IDF7C2.pedido}`);
    await expect(page.getByText("Preciso para o banco.")).toBeVisible();
    await expect(page.getByText("Ainda não")).toBeVisible();
    await verificar(page);
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Escreva a mensagem.")).toBeVisible();
    await page.getByLabel("Responder ao colaborador").fill("Fica pronta amanhã.");
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Fica pronta amanhã.")).toBeVisible();
    expect(api.escritas("POST", `/hr/tickets/${IDF7C2.pedido}/messages`).map((p) => p.corpo)).toEqual([{ body: "Fica pronta amanhã." }]);

    await page.getByLabel("Responsável").selectOption(ID.emp1);
    await page.getByRole("button", { name: "Atribuir" }).click();
    await expect(page.getByText("Atribuir põe o pedido em curso.")).toHaveCount(0);
    await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("InProgress");
    expect(api.escritas("POST", `/hr/tickets/${IDF7C2.pedido}/assignment`).map((p) => p.corpo)).toEqual([{ assigneeEmployeeId: ID.emp1 }]);

    await page.getByLabel("Estado", { exact: true }).selectOption("Closed");
    await page.getByRole("button", { name: "Mudar" }).click();
    await expect(page.getByRole("dialog")).toContainText("não se reabre");
    await page.getByRole("button", { name: "Cancelar" }).click();
    expect(api.escritas("POST", `/hr/tickets/${IDF7C2.pedido}/status`)).toHaveLength(0);
    await page.getByLabel("Estado", { exact: true }).selectOption("Resolved");
    await page.getByRole("button", { name: "Mudar" }).click();
    await expect(page.getByText(/· resolvido a /)).toBeVisible();
    await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("Resolved");
    expect(api.escritas("POST", `/hr/tickets/${IDF7C2.pedido}/status`).map((p) => p.corpo)).toEqual([{ status: "Resolved" }]);
    expect(await violacoes()).toEqual([]);
  });

  test("pedido fechado: só leitura; a recusa do servidor aparece", async ({ page, api }) => {
    await comServicos(api).em("POST", `/hr/tickets/${IDF7C2.pedido}/assignment`, problema(409, "O pedido está fechado.")).ligar();
    await entrar(page, meRhF7.email);
    await page.goto(`/pedidos-internos/${IDF7C2.fechado}`);
    await expect(page.getByText("Este pedido está fechado e já não recebe mensagens.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar resposta" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Atribuir" })).toHaveCount(0);
    // Corrida: fechado por outra pessoa entretanto.
    await page.goto(`/pedidos-internos/${IDF7C2.pedido}`);
    await page.getByLabel("Responsável").selectOption(ID.emp1);
    await page.getByRole("button", { name: "Atribuir" }).click();
    await expect(page.getByText("O pedido está fechado.")).toBeVisible();
  });

  test("prazos (SLA): em horas, a resolução não mais curta; categoria sem prazo", async ({ page, api }) => {
    await comServicos(api).em("PUT", "/hr/tickets/sla-policies/It", { status: 204 }).em("PUT", "/hr/tickets/sla-policies/Finance", { status: 204 }).ligar();
    await entrar(page, meRhF7.email);
    await page.goto("/pedidos-internos?vista=prazos");
    const it = page.getByRole("row").filter({ hasText: "Informática" });
    await expect(it).toContainText("1 h");
    await expect(it).toContainText("8 h");
    await expect(page.getByRole("row").filter({ hasText: "Finanças" })).toContainText("Sem prazo");
    await verificar(page);
    await page.getByRole("button", { name: "Definir os prazos de Informática" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Responder em (horas)")).toHaveValue("1");
    await d.getByLabel("Responder em (horas)").fill("10");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d.getByText("A resolução não pode ter prazo mais curto do que a resposta.")).toBeVisible();
    await d.getByLabel("Responder em (horas)").fill("0,5");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", "/hr/tickets/sla-policies/It").map((p) => p.corpo)).toEqual([{ responseMinutes: 30, resolutionMinutes: 480 }]);
    await page.getByRole("button", { name: "Definir os prazos de Finanças" }).click();
    await d.getByLabel("Responder em (horas)").fill("8");
    await d.getByLabel("Resolver em (horas)").fill("48");
    await d.getByRole("button", { name: "Guardar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("PUT", "/hr/tickets/sla-policies/Finance").map((p) => p.corpo)).toEqual([{ responseMinutes: 480, resolutionMinutes: 2880 }]);
  });
});
