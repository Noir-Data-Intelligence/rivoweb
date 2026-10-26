/**
 * Auditoria interna contra a API LOCAL (backend #119), o ciclo inteiro pelo
 * front: planear, iniciar, dois achados, um plano (o achado passa a «em
 * correcção»; só fecha com o plano concluído), aceitar o risco do outro,
 * passar a relatório e fechar. No fim, a trilha (#122) mostra os eventos da
 * auditoria no período, com o gráfico por dia.
 *
 * Preparação pelo front, com o SuperAdmin: um departamento e duas fichas
 * (quem conduz e quem executa o plano).
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1", "Só com a API local.");

const marca = `[TESTE] ${Date.now().toString(36)}`;

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

async function admitir(page: Page, nome: string, departamento: string) {
  await page.goto("/colaboradores");
  await page.getByRole("button", { name: "Admitir colaborador" }).click();
  await page.getByLabel("Nome completo").fill(nome);
  await page.getByLabel("Departamento").selectOption({ label: departamento });
  await page.getByRole("button", { name: "Admitir", exact: true }).click();
  await expect(page.getByRole("heading", { name: nome, level: 1 })).toBeVisible();
}

const confirmar = async (page: Page, botao: string, confirmar = botao) => {
  await page.getByRole("button", { name: botao, exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: confirmar, exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

test("auditoria interna: do plano ao fecho; a trilha do período", async ({ page }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();

  const dep = `${marca} Departamento`;
  await page.goto("/departamentos");
  await page.getByRole("button", { name: "Novo departamento" }).click();
  await page.getByLabel("Nome").fill(dep);
  await page.getByRole("button", { name: "Criar departamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await admitir(page, `${marca} Auditora`, dep);
  await admitir(page, `${marca} Executor`, dep);

  // Planear: nasce planeada, com número do ano, e abre o detalhe.
  await page.goto("/auditoria-interna");
  await page.getByRole("button", { name: "Nova auditoria" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Título").fill(`${marca} Compras`);
  await d.getByLabel("Departamento auditado").selectOption({ label: dep });
  await d.getByLabel("Responsável").selectOption({ label: `${marca} Auditora` });
  await d.getByLabel("Início previsto").fill("2026-11-01");
  await d.getByLabel("Fim previsto").fill("2026-11-30");
  await d.getByLabel("Risco").selectOption("High");
  await d.getByRole("button", { name: "Planear" }).click();
  await expect(page).toHaveURL(/\/auditoria-interna\/[0-9a-f-]{36}$/);
  const auditId = new URL(page.url()).pathname.split("/").pop() ?? "";
  await expect(page.getByRole("heading", { name: new RegExp(`^AUD-\\d{4}-\\d{3} · ${marca.replace(/[[\]]/g, "\\$&")} Compras$`) })).toBeVisible();
  await expect(page.getByText("Os achados registam-se depois de iniciar a auditoria.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo achado" })).toHaveCount(0);

  await confirmar(page, "Iniciar");
  await expect(page.getByText("Em curso").first()).toBeVisible();

  // Dois achados.
  for (const [texto, gravidade] of [[`${marca} Sem três cotações`, "Critical"], [`${marca} Fornecedor sem contrato`, "Low"]] as const) {
    await page.getByRole("button", { name: "Novo achado" }).click();
    await page.getByRole("dialog").getByLabel("Descrição").fill(texto);
    await page.getByRole("dialog").getByLabel("Gravidade").selectOption(gravidade);
    await page.getByRole("dialog").getByRole("button", { name: "Registar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const a1 = page.getByRole("region", { name: "Achado 1" });
  const a2 = page.getByRole("region", { name: "Achado 2" });
  await expect(a1).toContainText("Sem três cotações");
  await expect(a1).toContainText("Aberto");

  // O primeiro plano passa o achado a «em correcção»; só fecha com o plano concluído.
  await a1.getByRole("button", { name: "Novo plano" }).click();
  await page.getByRole("dialog").getByLabel("Acção").fill(`${marca} Rever o procedimento`);
  await page.getByRole("dialog").getByLabel("Responsável").selectOption({ label: `${marca} Executor` });
  await page.getByRole("dialog").getByLabel("Prazo").fill("2026-12-15");
  await page.getByRole("dialog").getByRole("button", { name: "Criar plano" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(a1).toContainText("Em correcção");
  await expect(a1.getByRole("button", { name: "Fechar", exact: true })).toBeDisabled();
  await a1.getByRole("button", { name: `Corrigir o plano ${marca} Rever o procedimento` }).click();
  await page.getByRole("dialog").getByLabel("Estado").selectOption("Done");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(a1.getByRole("table")).toContainText("Concluído");
  await a1.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Fechar achado" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(a1).toContainText("Fechado");
  await expect(a1.getByRole("button", { name: "Novo plano" })).toHaveCount(0);

  // O outro: aceitar o risco, com o motivo.
  await a2.getByRole("button", { name: "Aceitar o risco" }).click();
  await page.getByRole("dialog").getByLabel("Motivo").fill("Fornecedor único");
  await page.getByRole("dialog").getByRole("button", { name: "Aceitar o risco" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(a2).toContainText("Risco aceite");
  await expect(a2).toContainText("Fornecedor único");

  // Relatório e fecho.
  await confirmar(page, "Passar a relatório");
  await expect(page.getByRole("button", { name: "Fechar", exact: true }).first()).toBeEnabled();
  await confirmar(page, "Fechar", "Fechar auditoria");
  await expect(page.getByText("Fechada").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Corrigir" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancelar auditoria" })).toHaveCount(0);
  const historico = page.getByRole("list", { name: "Histórico da auditoria" });
  await expect(historico.getByRole("listitem").first()).toContainText("Auditoria planeada");
  await expect(historico).toContainText("Plano de acção criado");
  await expect(historico).toContainText("Estado do achado alterado");

  // A lista e os cartões.
  await page.goto("/auditoria-interna?vista=achados");
  await expect(page.getByRole("table", { name: "Achados" }).getByRole("row").filter({ hasText: `${marca} Fornecedor sem contrato` })).toContainText("Risco aceite");
  await expect(page.getByText("Conformidade", { exact: true }).locator("..")).not.toContainText("—");

  // A trilha do período: os eventos desta auditoria e o gráfico por dia.
  await page.goto(`/auditoria?tipo=internalaudit.audit&id=${auditId}`);
  const trilha = page.getByRole("table", { name: "Registos de auditoria" });
  await expect(trilha.getByRole("row").filter({ hasText: "internalaudit.audit.planned" })).toBeVisible();
  await expect(trilha.getByRole("row").filter({ hasText: "internalaudit.audit.status_changed" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /eventos? no período; o dia com mais foi/ })).toBeVisible();
});
