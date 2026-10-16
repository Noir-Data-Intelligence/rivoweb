/**
 * F7 — portal do colaborador, com a API simulada: início com o resumo,
 * assiduidade (justificar falta), férias (saldo, pedido validado, retirar), turnos
 * (janela de 93 dias, pedir e cancelar troca), recibos e documentos
 * descarregados, declaração só depois de confirmar, pedidos internos
 * (abrir, responder, fechado sem resposta), objectivos (valor em texto, ciclo
 * fechado só de leitura), formação e bens. Axe e 360 px em todos.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { meColaborador } from "../../fixtures/identidade";
import {
  anuncios,
  bens,
  conquistas,
  documentos,
  formacao,
  IDF7,
  marcacoes,
  modelos,
  objectivos,
  pedidosFerias,
  pedidosInternos,
  recibos,
  saldos,
  trocas,
  turnos,
} from "../../fixtures/f7";

const problema = (status: number, corpo: Record<string, unknown>) => ({ status, corpo: { status, ...corpo }, cabecalhos: { "Content-Type": "application/problem+json" } });

/** Hoje e amanhã em Luanda (UTC+1), como o front os calcula. */
function diasDeTeste() {
  const agora = new Date(Date.now() + 3_600_000);
  const hoje = agora.toISOString().slice(0, 10);
  const amanha = new Date(agora.getTime() + 86_400_000).toISOString().slice(0, 10);
  return { hoje, amanha };
}

function comPortal(api: ApiSimulada): ApiSimulada {
  const { hoje, amanha } = diasDeTeste();
  return api
    .comConta(meColaborador)
    .em("GET", "/portal/me/attendance", { status: 200, corpo: marcacoes() })
    .em("GET", "/portal/me/leave", { status: 200, corpo: pedidosFerias() })
    .em("GET", "/portal/me/leave/balances", { status: 200, corpo: saldos() })
    .em("GET", "/portal/me/documents", { status: 200, corpo: documentos() })
    .em("GET", "/portal/me/payslips", { status: 200, corpo: recibos() })
    .em("GET", "/portal/me/announcements", { status: 200, corpo: anuncios() })
    .em("GET", "/portal/me/tickets", { status: 200, corpo: pedidosInternos() })
    .em("GET", "/portal/me/training", { status: 200, corpo: formacao() })
    .em("GET", "/portal/me/shifts", { status: 200, corpo: turnos(hoje, amanha) })
    .em("GET", "/portal/me/shift-change-requests", { status: 200, corpo: [] })
    .em("GET", "/portal/me/declarations", { status: 200, corpo: modelos() })
    .em("GET", "/portal/me/objectives", { status: 200, corpo: objectivos() })
    .em("GET", "/portal/me/achievements", { status: 200, corpo: conquistas() })
    .em("GET", "/portal/me/assets", { status: 200, corpo: bens() });
}

async function verificarPagina(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("portal do colaborador", () => {
  test("início: férias por gozar, próximo turno, pedidos em aberto e anúncios (fixado primeiro)", async ({ page, api, violacoes }) => {
    await comPortal(api).ligar();
    await entrar(page, meColaborador.email);
    await expect(page.getByRole("heading", { name: "Olá, Colaborador", level: 1 })).toBeVisible();
    await expect(page.getByText("25 dias")).toBeVisible();
    await expect(page.getByRole("link", { name: "Manhã, 06:00–14:00" })).toBeVisible();
    await expect(page.getByText("Pedidos em aberto")).toBeVisible();
    const titulos = page.getByRole("region", { name: "Anúncios recentes" }).getByRole("heading");
    await expect(titulos).toHaveText(["Jantar de fim de ano", "Manutenção dos servidores"]);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    for (const nome of ["Assiduidade", "Férias e ausências", "Turnos", "Recibos", "Documentos e declarações", "Pedidos internos", "Despesas", "Formação", "Objectivos e conquistas", "Bens à minha guarda", "Anúncios"]) {
      await expect(menu.getByRole("link", { name: nome })).toBeVisible();
    }
    await verificarPagina(page);
    expect(await violacoes()).toEqual([]);
  });

  test("assiduidade: janela no URL, falta justificada a partir da linha", async ({ page, api }) => {
    await comPortal(api).em("POST", "/portal/me/attendance/justification", { status: 200, corpo: { recordId: IDF7.marcacaoFalta } }).ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/assiduidade?de=2026-10-01&ate=2026-10-16");
    await expect(page.getByRole("cell", { name: "12/10/2026" })).toBeVisible();
    expect(api.pedidos.find((p) => p.caminho === "/portal/me/attendance")?.query).toBe("?from=2026-10-01&to=2026-10-16");
    await expect(page.getByText("8,55")).toBeVisible();
    await verificarPagina(page);
    await page.getByRole("button", { name: "Justificar a falta de 09/10/2026" }).click();
    await expect(page.getByLabel("Dia")).toHaveValue("2026-10-09");
    await page.getByRole("dialog").getByRole("button", { name: "Justificar" }).click();
    await expect(page.getByText("Escreva a justificação.")).toBeVisible();
    await page.getByLabel("Justificação").fill("  Consulta médica.  ");
    await page.getByRole("dialog").getByRole("button", { name: "Justificar" }).dblclick();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/portal/me/attendance/justification").map((p) => p.corpo)).toEqual([{ day: "2026-10-09", justification: "Consulta médica." }]);
    // Janela invertida: avisa e não pede.
    await page.goto("/eu/assiduidade?de=2026-10-16&ate=2026-10-01");
    await expect(page.getByText("A data final não pode ser anterior à inicial.")).toBeVisible();
    expect(api.pedidos.filter((p) => p.caminho === "/portal/me/attendance" && p.query.includes("from=2026-10-16"))).toHaveLength(0);
  });

  test("férias: saldo do ano, pedido validado e o conflito do servidor à vista", async ({ page, api }) => {
    let tentativas = 0;
    await comPortal(api)
      .em("POST", "/portal/me/leave", () => (++tentativas === 1 ? { status: 409, corpo: { erro: "Já tem uma ausência nesse período." } } : { status: 202, corpo: { leaveId: "00000000-0000-4000-8000-000000000790" } }))
      .ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/ferias");
    await expect(page.getByText("dias por gozar")).toBeVisible();
    await expect(page.getByRole("cell", { name: "22/11/2026 a 01/12/2026" })).toBeVisible();
    await verificarPagina(page);
    await page.getByRole("button", { name: "Pedir ausência" }).click();
    await page.getByLabel("Primeiro dia").fill("2026-12-10");
    await page.getByLabel("Último dia").fill("2026-12-08");
    await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByText("O último dia não pode ser anterior ao primeiro.")).toBeVisible();
    expect(api.escritas("POST", "/portal/me/leave")).toHaveLength(0);
    await page.getByLabel("Último dia").fill("2026-12-12");
    await expect(page.getByText("3 dias de calendário.")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByRole("dialog").getByText("Já tem uma ausência nesse período.")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/portal/me/leave").map((p) => p.corpo)).toEqual([
      { type: "Annual", startsOn: "2026-12-10", endsOn: "2026-12-12", reason: null },
      { type: "Annual", startsOn: "2026-12-10", endsOn: "2026-12-12", reason: null },
    ]);
  });

  test("férias: retirar um pedido por decidir; o já decidido não se retira (B25)", async ({ page, api }) => {
    let lista = pedidosFerias();
    let tentativas = 0;
    await comPortal(api)
      .em("GET", "/portal/me/leave", () => ({ status: 200, corpo: lista }))
      .em("POST", `/portal/me/leave/${IDF7.ferias}/cancellation`, () => {
        if (++tentativas === 1) return problema(409, { title: "Conflito", detail: "Só um pedido pendente pode ser retirado." });
        lista = pedidosFerias("Cancelled");
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/ferias");
    await page.getByRole("button", { name: "Retirar o pedido de 22/11/2026" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("Férias, 22/11/2026 a 01/12/2026.", { exact: false })).toBeVisible();
    await semViolacoesAxe(page);
    await dialogo.getByRole("button", { name: "Retirar pedido" }).click();
    await expect(dialogo.getByText("Só um pedido pendente pode ser retirado.")).toBeVisible();
    await dialogo.getByRole("button", { name: "Retirar pedido" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Retirar o pedido/ })).toHaveCount(0);
    expect(api.escritas("POST", `/portal/me/leave/${IDF7.ferias}/cancellation`)).toHaveLength(2);
  });

  test("turnos: janela até 93 dias, pedir troca sem colega e cancelar", async ({ page, api }) => {
    const { amanha } = diasDeTeste();
    let lista = trocas(amanha);
    await comPortal(api)
      .em("GET", "/portal/me/shift-change-requests", () => ({ status: 200, corpo: lista }))
      .em("POST", `/portal/me/shifts/${IDF7.turno}/change-requests`, { status: 201, corpo: { requestId: "00000000-0000-4000-8000-000000000791" } })
      .em("POST", `/portal/me/shift-change-requests/${IDF7.troca}/cancellation`, () => {
        lista = trocas(amanha, "Cancelled");
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/turnos");
    await expect(page.getByRole("cell", { name: /Manhã/ })).toBeVisible();
    // O turno com troca pedida não volta a oferecer o pedido.
    await expect(page.getByText("Troca pedida")).toBeVisible();
    await verificarPagina(page);
    await page.getByRole("button", { name: /^Pedir troca do turno de/ }).click();
    await expect(page.getByText("Se já combinou com um colega, diga quem no motivo.")).toBeVisible();
    await page.getByLabel("Motivo").fill("Exame na faculdade.");
    await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/portal/me/shifts/${IDF7.turno}/change-requests`).map((p) => p.corpo)).toEqual([{ reason: "Exame na faculdade.", proposedEmployeeId: null }]);
    await page.getByRole("button", { name: /^Cancelar o pedido de troca de/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar pedido" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Cancelada")).toBeVisible();
    await page.goto("/eu/turnos?de=2026-10-01&ate=2027-01-03");
    await expect(page.getByText("No máximo 93 dias.")).toBeVisible();
  });

  test("recibos e documentos descarregam; a declaração só se emite depois de confirmar", async ({ page, api }) => {
    await comPortal(api)
      .em("GET", `/portal/me/payslips/${IDF7.recibo}/document`, { status: 200, bruto: { conteudo: "%PDF-1.7", tipo: "application/pdf" } })
      .em("GET", `/portal/me/documents/${IDF7.documento}`, { status: 200, bruto: { conteudo: "%PDF-1.7", tipo: "application/pdf" } })
      .em("GET", `/portal/me/declarations/${IDF7.modelo}`, { status: 200, bruto: { conteudo: "%PDF-1.7", tipo: "application/pdf" } })
      .ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/recibos");
    await expect(page.getByText("Setembro de 2026", { exact: true })).toBeVisible();
    await expect(page.getByText("388 429,00 Kz")).toBeVisible();
    await expect(page.getByText("Inclui alimentação 35 000,00 Kz · transporte 30 000,00 Kz")).toBeVisible();
    await verificarPagina(page);
    const [recibo] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descarregar o recibo de Setembro de 2026" }).click()]);
    expect(recibo.suggestedFilename()).toBe("recibo-2026-09.pdf");

    await page.goto("/eu/documentos");
    await expect(page.getByText("contrato-2026.pdf")).toBeVisible();
    await expect(page.getByText("178 KB")).toBeVisible();
    await verificarPagina(page);
    const [doc] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descarregar contrato-2026.pdf" }).click()]);
    expect(doc.suggestedFilename()).toBe("contrato-2026.pdf");
    await page.getByRole("button", { name: "Emitir a Declaração de vínculo" }).click();
    await expect(page.getByRole("dialog")).toContainText("fica registada");
    expect(api.pedidos.filter((p) => p.caminho === `/portal/me/declarations/${IDF7.modelo}`)).toHaveLength(0);
    const [declaracao] = await Promise.all([page.waitForEvent("download"), page.getByRole("dialog").getByRole("button", { name: "Emitir e descarregar" }).click()]);
    expect(declaracao.suggestedFilename()).toMatch(/^Declaração[ _]de[ _]vínculo\.pdf$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.pedidos.filter((p) => p.caminho === `/portal/me/declarations/${IDF7.modelo}`)).toHaveLength(1);
  });

  test("recibo sem PDF disponível explica o motivo do servidor", async ({ page, api }) => {
    await comPortal(api).em("GET", `/portal/me/payslips/${IDF7.recibo}/document`, problema(404, { title: "Not Found", detail: "Recibo não disponível." })).ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/recibos");
    await page.getByRole("button", { name: "Descarregar o recibo de Setembro de 2026" }).click();
    await expect(page.getByText("Recibo não disponível.")).toBeVisible();
  });

  test("pedidos internos: abrir leva à conversa, responder, e o fechado não aceita mensagens", async ({ page, api }) => {
    const novo = "00000000-0000-4000-8000-000000000792";
    let lista = pedidosInternos();
    await comPortal(api)
      .em("GET", "/portal/me/tickets", () => ({ status: 200, corpo: lista }))
      .em("POST", "/portal/me/tickets", () => {
        lista = [{ ticketId: novo, subject: "Acesso à VPN", category: "It", priority: "High", status: "Open", openedAt: "2026-10-16T09:00:00+00:00", resolvedAt: null, messages: [{ messageId: "00000000-0000-4000-8000-000000000793", fromMe: true, body: "Preciso de acesso à VPN.", sentAt: "2026-10-16T09:00:00+00:00" }] }, ...lista];
        return { status: 201, corpo: { ticketId: novo } };
      })
      .em("POST", `/portal/me/tickets/${novo}/messages`, { status: 201, corpo: { messageId: "00000000-0000-4000-8000-000000000794" } })
      .ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/pedidos");
    await expect(page.getByRole("link", { name: "Monitor adicional" })).toBeVisible();
    await verificarPagina(page);
    await page.getByRole("button", { name: "Novo pedido" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByText("Escolha a quem se dirige.")).toBeVisible();
    await page.getByLabel("Assunto").fill("Acesso à VPN");
    await page.getByLabel("Área").selectOption("It");
    await page.getByLabel("Prioridade").selectOption("High");
    await page.getByLabel("Pedido", { exact: true }).fill("Preciso de acesso à VPN.");
    await page.getByRole("dialog").getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page).toHaveURL(new RegExp(`/eu/pedidos/${novo}$`));
    expect(api.escritas("POST", "/portal/me/tickets").map((p) => p.corpo)).toEqual([{ subject: "Acesso à VPN", category: "It", priority: "High", body: "Preciso de acesso à VPN." }]);
    await expect(page.getByRole("heading", { name: "Acesso à VPN", level: 1 })).toBeVisible();
    await verificarPagina(page);
    await page.getByLabel("Responder").fill("Para hoje, se possível.");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByLabel("Responder")).toHaveValue("");
    expect(api.escritas("POST", `/portal/me/tickets/${novo}/messages`).map((p) => p.corpo)).toEqual([{ body: "Para hoje, se possível." }]);
    await page.goto(`/eu/pedidos/${IDF7.pedidoFechado}`);
    await expect(page.getByText("Este pedido está fechado e já não recebe mensagens.")).toBeVisible();
    await expect(page.getByLabel("Responder")).toHaveCount(0);
  });

  test("objectivos: valor em texto para a API; ciclo fechado só de leitura; conquistas", async ({ page, api }) => {
    await comPortal(api).em("POST", `/portal/me/objectives/key-results/${IDF7.resultado}/progress`, { status: 204 }).ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/objectivos");
    await expect(page.getByText("Concluir a certificação profissional")).toBeVisible();
    await expect(page.getByText("Pontualidade exemplar")).toBeVisible();
    await expect(page.getByText("1 conquista, 50 pontos.")).toBeVisible();
    await verificarPagina(page);
    await expect(page.getByRole("button", { name: "Registar o valor de Horas até à primeira resposta" })).toHaveCount(0);
    await page.getByRole("button", { name: "Registar o valor de Grau de cumprimento" }).click();
    await expect(page.getByLabel("Valor actual (%)")).toHaveValue("35");
    await page.getByLabel("Valor actual (%)").fill("42,123456");
    await page.getByRole("dialog").getByRole("button", { name: "Registar" }).click();
    await expect(page.getByText("Número inválido (até 4 casas decimais).")).toBeVisible();
    await page.getByLabel("Valor actual (%)").fill("42,5");
    await page.getByRole("dialog").getByRole("button", { name: "Registar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/portal/me/objectives/key-results/${IDF7.resultado}/progress`).map((p) => p.corpo)).toEqual([{ currentValue: "42.5" }]);
  });

  test("formação, bens e anúncios", async ({ page, api }) => {
    await comPortal(api).ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/formacao");
    await expect(page.getByText("CFK-2026-118")).toBeVisible();
    await expect(page.getByText("a 19/05/2026 · nota 17,5")).toBeVisible();
    await verificarPagina(page);
    await page.goto("/eu/bens");
    await expect(page.getByRole("cell", { name: "AF-0018" })).toBeVisible();
    await verificarPagina(page);
    await page.goto("/eu/anuncios");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Jantar de fim de ano", "Manutenção dos servidores"]);
    await verificarPagina(page);
  });
});
