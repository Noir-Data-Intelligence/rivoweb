/**
 * Smoke de produção no browser (§8.3). Corre contra o front publicado
 * (RIVO_FRONT_URL) com a API real, só depois de a origem estar no CORS (§9.2).
 * Qualquer pedido à API que não seja GET aborta e faz falhar o teste, excepto
 * o login e o logout.
 */
import { expect, test } from "@playwright/test";

const API = (process.env.RIVO_PROD_API_URL ?? "https://syyt.tech").replace(/\/+$/, "");
const PERMITIDOS = new Set(["POST /identity/login", "POST /identity/logout"]);

test.skip(process.env.RIVO_SMOKE_PRODUCAO !== "1", "Só com RIVO_SMOKE_PRODUCAO=1.");

test("login → ecrãs da F0 à F6 → logout, sem escritas", async ({ page }) => {
  // Percorre todos os ecrãs publicados contra produção: 30 s não chegam.
  test.setTimeout(240_000);
  const bloqueados: string[] = [];
  await page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const chave = `${req.method()} ${new URL(req.url()).pathname}`;
    if (req.method() === "GET" || req.method() === "OPTIONS" || PERMITIDOS.has(chave)) return route.continue();
    bloqueados.push(chave);
    return route.abort("blockedbyclient");
  });

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_PROD_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_PROD_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /Olá|Portal/ })).toBeVisible();

  await page.goto("/conta");
  await expect(page.getByRole("heading", { name: "Sessões activas" })).toBeVisible();

  // F1: só abre os ecrãs (leituras). Nenhum botão de escrita é carregado.
  for (const [caminho, titulo] of [
    ["/utilizadores", "Utilizadores"],
    ["/configuracoes", "Configurações"],
    ["/colaboradores", "Colaboradores"],
    ["/departamentos", "Departamentos"],
    ["/cargos", "Cargos"],
    // F2
    ["/dashboard", "Dashboard executivo"],
    ["/notificacoes", "Notificações"],
    ["/alertas", "Alertas"],
    // F3
    ["/clientes", "Clientes"],
    ["/facturas", "Facturas"],
    ["/proformas", "Pró-formas"],
    ["/notas-credito", "Notas de crédito"],
    ["/recibos", "Recibos"],
    ["/a-receber", "A receber"],
    ["/facturacao", "Configuração da facturação"],
    // F4
    ["/aprovacoes", "Aprovações"],
    ["/politicas-aprovacao", "Políticas de aprovação"],
    // F5
    ["/fornecedores", "Fornecedores"],
    ["/facturas-compra", "Facturas de compra"],
    ["/pedidos-pagamento", "Pedidos de pagamento"],
    ["/despesas", "Despesas"],
    ["/contas", "Contas bancárias"],
    ["/caixa-pequena", "Caixa pequena"],
    ["/letras", "Letras e livranças"],
    ["/cambios", "Câmbios"],
    ["/fluxo-caixa", "Fluxo de caixa"],
    // F6
    ["/fiscal", "Fiscal"],
    ["/fiscal?vista=irt", "Fiscal"],
    ["/fiscal?vista=subsidios", "Fiscal"],
    ["/relatorios", "Relatórios financeiros"],
    ["/relatorios?vista=balanco", "Relatórios financeiros"],
    ["/relatorios?vista=resultados", "Relatórios financeiros"],
    ["/relatorios?vista=antiguidade", "Relatórios financeiros"],
    ["/impostos", "Impostos"],
    ["/impostos?vista=retencoes", "Impostos"],
    ["/impostos?vista=saft", "Impostos"],
    ["/lancamentos", "Lançamentos"],
    ["/lancamentos?vista=diarios", "Lançamentos"],
    ["/plano-contas", "Plano de contas"],
    ["/plano-contas?vista=versoes", "Plano de contas"],
    ["/plano-contas?vista=reporte", "Plano de contas"],
    ["/periodos", "Períodos"],
    ["/regras-contabilisticas", "Regras contabilísticas"],
    ["/regras-contabilisticas?vista=contabilisticas", "Regras contabilísticas"],
    ["/centros-custo", "Centros de custo"],
    ["/orcamentos", "Orçamentos"],
    ["/previsoes-custos", "Previsões de custos"],
  ] as const) {
    await page.goto(caminho);
    await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }

  await page.getByRole("button", { name: /Conta de/ }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar/);

  expect(bloqueados).toEqual([]);
});
