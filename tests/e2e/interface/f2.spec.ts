/**
 * F2 — dashboard, notificações e alertas, com a API simulada. Verifica os
 * números mostrados contra a resposta, o que sobe à API, as secções por
 * permissão, axe, CSP e responsividade.
 */
import { kpisCompletos, meLeitorAlertas } from "../../fixtures/f2";
import { meAdminF1 } from "../../fixtures/f1";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test } from "../apoio";
import { comF2 } from "../apoio-f2";

test.describe("painel e dashboard", () => {
  test("painel: contadores, anúncio em texto simples, secções e conclusões; axe, escuro, CSP", async ({ page, api, violacoes }) => {
    await comF2(api).ligar();
    await entrar(page);
    await expect(page.getByRole("heading", { name: "Olá, Administração" })).toBeVisible();
    await expect(page.getByText("Notificações por ler")).toBeVisible();
    await expect(page.getByText("Fecho do mês")).toBeVisible();
    // O corpo do anúncio nunca é HTML (S10).
    await expect(page.getByText("<b>sem HTML</b>", { exact: false })).toBeVisible();
    // Números iguais aos da resposta, formatados em pt-AO.
    await expect(page.getByText("1 500 000,50 Kz").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Receita acima da despesa desde Setembro" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "3 admissões no período, mais em Março" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Maior valor em aberto na etapa Negociação" })).toBeVisible();
    await expect(page.getByText("75,0", { exact: false })).toBeVisible();
    // O sino mostra as por ler.
    await expect(page.getByRole("link", { name: "Notificações, 2 por ler" })).toBeVisible();
    for (const largura of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width: largura, height: 900 });
      await semScrollHorizontal(page);
    }
    await semViolacoesAxe(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await semViolacoesAxe(page);
    expect(await violacoes()).toEqual([]);
  });

  test("gráfico: ver como tabela com os mesmos números, e período no URL", async ({ page, api }) => {
    await comF2(api).ligar();
    await entrar(page);
    const cartao = page.getByRole("figure", { name: "Receita acima da despesa desde Setembro" });
    await cartao.getByRole("button", { name: "Ver como tabela" }).click();
    const linha = cartao.getByRole("row", { name: /out 2026/ });
    await expect(linha).toContainText("600 000,50 Kz");
    await expect(linha).toContainText("250 000,00 Kz");
    await semViolacoesAxe(page);
    await page.getByLabel("Período", { exact: true }).selectOption("mes");
    await expect(page).toHaveURL(/periodo=mes/);
    const kpis = api.pedidos.filter((p) => p.caminho === "/dashboard/kpis").map((p) => p.query);
    expect(kpis.some((q) => /from=\d{4}-\d{2}-01/.test(q))).toBe(true);
  });

  test("dashboard executivo: cinco números, clientes e a mesma janela nas duas rotas", async ({ page, api }) => {
    await comF2(api).ligar();
    await entrar(page);
    await page.getByRole("link", { name: "Dashboard executivo" }).first().click();
    await expect(page.getByRole("heading", { name: "Dashboard executivo" })).toBeVisible();
    await expect(page.getByText("600 000,50 Kz").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "Cliente Teste, Lda" })).toBeVisible();
    const janelas = api.pedidos.filter((p) => ["/dashboard/overview", "/dashboard/kpis"].includes(p.caminho)).map((p) => new URLSearchParams(p.query));
    const overview = janelas.find((q) => q.has("topCustomers"));
    expect(janelas.every((q) => q.get("from") === overview?.get("from") && q.get("to") === overview?.get("to"))).toBe(true);
    await semViolacoesAxe(page);
  });

  test("sem permissões de gestão: sem executivo nem secções, e /dashboard vedado", async ({ page, api }) => {
    await comF2(api, meLeitorAlertas)
      .em("GET", "/dashboard/kpis", { status: 200, corpo: { ...kpisCompletos(), sections: ["hr"], finance: null, sales: null } })
      .ligar();
    await entrar(page, "leitor@teste.local");
    await expect(page.getByRole("heading", { name: "Pessoas", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Finanças", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Dashboard executivo" })).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page.getByText("Não tem acesso", { exact: false })).toBeVisible();
    expect(api.pedidos.some((p) => p.caminho === "/dashboard/overview")).toBe(false);
  });
});

test.describe("notificações", () => {
  test("lista, marcar uma e todas como lidas, só por ler", async ({ page, api }) => {
    await comF2(api)
      .em("POST", "/notifications/00000000-0000-4000-8000-000000000401/read", { status: 204 })
      .em("POST", "/notifications/read-all", { status: 200, corpo: { marcadas: 1 } })
      .ligar();
    await entrar(page);
    await page.getByRole("link", { name: "Notificações, 2 por ler" }).click();
    await expect(page.getByRole("heading", { name: "Notificações", level: 1 })).toBeVisible();
    await expect(page.getByText("Perfil de acesso atribuído")).toBeVisible();
    await page.getByRole("button", { name: "Marcar como lida" }).first().click();
    await expect.poll(() => api.escritas("POST", "/notifications/00000000-0000-4000-8000-000000000401/read").length).toBe(1);
    await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
    await expect(page.getByText("1 notificação marcada como lida.")).toBeVisible();
    await page.getByLabel("Só as por ler").click();
    await expect(page.getByLabel("Só as por ler")).toBeChecked();
    await expect(page).toHaveURL(/por-ler=1/);
    expect(api.pedidos.some((p) => p.caminho === "/notifications/me" && p.query.includes("unreadOnly=true") && p.query.includes("pageSize=25"))).toBe(true);
    await semViolacoesAxe(page);
  });

  test("preferência de e-mail na minha conta", async ({ page, api }) => {
    let email = true;
    await comF2(api)
      .em("GET", "/notifications/me/preferences", () => ({ status: 200, corpo: { emailEnabled: email, inAppAlwaysOn: true, alwaysByEmail: ["UserInvited", "PasswordRecovery"] } }))
      .em("PUT", "/notifications/me/preferences", (route) => {
        email = (route.request().postDataJSON() as { emailEnabled: boolean }).emailEnabled;
        return { status: 204 };
      })
      .ligar();
    await entrar(page);
    await page.goto("/conta");
    const caixa = page.getByLabel("Receber também por e-mail");
    await expect(caixa).toBeChecked();
    await caixa.uncheck();
    await expect(page.getByText("Preferência guardada.")).toBeVisible();
    expect(api.escritas("PUT", "/notifications/me/preferences").map((p) => p.corpo)).toEqual([{ emailEnabled: false }]);
  });
});

test.describe("alertas", () => {
  test("eventos: valor formatado e resolver com confirmação", async ({ page, api }) => {
    await comF2(api).em("POST", "/alerts/events/00000000-0000-4000-8000-000000000601/resolution", { status: 204 }).ligar();
    await entrar(page);
    await page.goto("/alertas");
    await expect(page.getByText("FT 2026/17 vencida")).toBeVisible();
    await expect(page.getByText("120 000,00 Kz")).toBeVisible();
    await page.getByRole("button", { name: "Resolver" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Resolver" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/alerts/events/00000000-0000-4000-8000-000000000601/resolution")).toHaveLength(1);
    await semViolacoesAxe(page);
  });

  test("regras: criar valida e envia o pedido certo; avaliar mostra o resultado", async ({ page, api }) => {
    await comF2(api)
      .em("POST", "/alerts/rules", { status: 201, corpo: { ruleId: "00000000-0000-4000-8000-000000000502" } })
      .em("POST", "/alerts/evaluation", { status: 200, corpo: { rulesEvaluated: 2, raised: 1, autoResolved: 0, notified: 1, errors: [] } })
      .ligar();
    await entrar(page);
    await page.goto("/alertas?vista=regras");
    await expect(page.getByText("Facturas vencidas há pelo menos 30 dias")).toBeVisible();
    await page.getByRole("button", { name: "Nova regra" }).click();
    await page.getByRole("button", { name: "Criar regra" }).click();
    await expect(page.getByText("Dê um nome à regra.")).toBeVisible();
    await page.getByLabel("Nome").fill("Documentos a caducar");
    await page.getByLabel("O que vigiar").selectOption("IdentityDocumentsExpiring");
    await page.getByLabel("Antecedência (dias)").fill("400");
    await page.getByRole("button", { name: "Criar regra" }).click();
    await expect(page.getByText("No máximo 365 dias.")).toBeVisible();
    await page.getByLabel("Antecedência (dias)").fill("60");
    await page.getByLabel("ana@teste.local").check();
    await page.getByRole("button", { name: "Criar regra" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/alerts/rules").map((p) => p.corpo)).toEqual([
      { name: "Documentos a caducar", kind: "IdentityDocumentsExpiring", thresholdDays: 60, recipients: [meAdminF1.userId, "00000000-0000-4000-8000-000000000021"], sendEmail: false, active: null },
    ]);
    await page.getByRole("button", { name: "Avaliar agora" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Avaliar" }).click();
    await expect(page.getByText("2 regras avaliadas: 1 alerta novo", { exact: false })).toBeVisible();
  });

  test("só leitura: sem resolver nem criar regras", async ({ page, api }) => {
    await comF2(api, meLeitorAlertas).ligar();
    await entrar(page, "leitor@teste.local");
    await page.goto("/alertas");
    await expect(page.getByText("FT 2026/17 vencida")).toBeVisible();
    await expect(page.getByRole("button", { name: "Resolver" })).toHaveCount(0);
    await page.goto("/alertas?vista=regras");
    await expect(page.getByText("Cobranças")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nova regra" })).toHaveCount(0);
  });
});
