/**
 * Smoke por perfil no front publicado, com as contas de QA de produção
 * (ficheiro local fora do Git, `RIVO_QA_CONTAS`). Só leituras, login e logout:
 * qualquer outro pedido à API aborta e faz falhar o teste.
 *
 * Verifica que o menu de cada perfil é exactamente o esperado (§3.2) e que
 * cada página do menu abre sem erro.
 */
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const API = (process.env.RIVO_PROD_API_URL ?? "https://syyt.tech").replace(/\/+$/, "");
const PERMITIDOS = new Set(["POST /identity/login", "POST /identity/logout"]);

test.skip(process.env.RIVO_SMOKE_PRODUCAO !== "1" || !process.env.RIVO_QA_CONTAS, "Só com RIVO_SMOKE_PRODUCAO=1 e RIVO_QA_CONTAS.");

type Conta = { perfil: string; email: string };

function lerContas(): { password: string; contas: Conta[] } {
  const texto = readFileSync(process.env.RIVO_QA_CONTAS ?? "", "utf8").replace(/^\uFEFF/, "");
  const password = /^Password[^:]*:\s*(\S+)/m.exec(texto)?.[1] ?? "";
  const contas = [...texto.matchAll(/^(\w+)\s+(\S+@\S+)/gm)].map((m) => ({ perfil: m[1] as string, email: m[2] as string }));
  return { password, contas };
}

/** O mesmo quadro do teste unitário `menu.test.tsx`. */
const MENU_ESPERADO: Readonly<Record<string, readonly string[]>> = {
  Admin: ["Início", "Dashboard executivo", "Aprovações", "Alertas", "Clientes", "Facturas", "Pró-formas", "Notas de crédito", "Recibos", "A receber", "Fornecedores", "Facturas de compra", "Pedidos de pagamento", "Despesas", "Contas bancárias", "Caixa pequena", "Letras e livranças", "Câmbios", "Fluxo de caixa", "Relatórios financeiros", "Impostos", "Lançamentos", "Plano de contas", "Períodos", "Regras contabilísticas", "Centros de custo", "Orçamentos", "Previsões de custos", "Colaboradores", "Departamentos", "Cargos", "Organograma", "Contratos", "Assiduidade", "Férias e ausências", "Benefícios", "Validades de imigração", "Recrutamento", "Entradas e saídas", "Utilizadores", "Configurações", "Facturação", "Fiscal", "Políticas de aprovação"],
  Finance: ["Início", "Aprovações", "Alertas", "Facturas", "Pró-formas", "Notas de crédito", "Recibos", "A receber", "Fornecedores", "Facturas de compra", "Pedidos de pagamento", "Despesas", "Contas bancárias", "Caixa pequena", "Letras e livranças", "Câmbios", "Fluxo de caixa", "Relatórios financeiros", "Impostos", "Lançamentos", "Plano de contas", "Períodos", "Regras contabilísticas", "Centros de custo", "Orçamentos", "Previsões de custos", "Configurações", "Facturação", "Fiscal"],
  HR: ["Início", "Alertas", "Colaboradores", "Departamentos", "Cargos", "Organograma", "Contratos", "Assiduidade", "Férias e ausências", "Benefícios", "Validades de imigração", "Recrutamento", "Entradas e saídas"],
  Sales: ["Início", "Clientes", "Facturas", "Pró-formas", "Notas de crédito", "Recibos", "A receber", "Facturação"],
  Manager: ["Início", "Dashboard executivo", "Aprovações", "Alertas", "Fornecedores", "Facturas de compra", "Pedidos de pagamento", "Despesas", "Contas bancárias", "Centros de custo", "Orçamentos", "Previsões de custos"],
  AssetManager: ["Início", "Alertas", "Fornecedores"],
  ProjectManager: ["Início"],
  Colaborador: ["Início", "Anúncios", "Assiduidade", "Férias e ausências", "Turnos", "Recibos", "Documentos e declarações", "Pedidos internos", "Despesas", "Formação", "Objectivos e conquistas", "Bens à minha guarda"],
  Cliente: ["Início"],
};

/** Onde cada perfil entra (§3.3): os portais, apesar de `documents.write`. */
const ENTRADA: Readonly<Record<string, RegExp>> = { Colaborador: /\/eu$/, Cliente: /\/cliente$/ };

const { password, contas } = process.env.RIVO_QA_CONTAS ? lerContas() : { password: "", contas: [] as Conta[] };

for (const c of contas) {
  test(`perfil ${c.perfil}: menu certo e páginas sem erro`, async ({ page }) => {
    // O Admin percorre 37 páginas contra produção: 30 s não chegam.
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
    await page.getByLabel("E-mail").fill(c.email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    const nav = page.getByRole("navigation", { name: "Principal" }).first();
    await expect(nav).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(ENTRADA[c.perfil] ?? /\/$/);

    const ligacoes = nav.getByRole("link");
    await expect(ligacoes.first()).toBeVisible();
    const titulos = (await ligacoes.allTextContents()).map((t) => t.trim());
    expect(titulos, c.perfil).toEqual(MENU_ESPERADO[c.perfil]);

    for (const href of await ligacoes.evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""))) {
      await page.goto(href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("Não tem acesso", { exact: false })).toHaveCount(0);
      const erros = await page.getByRole("alert").allTextContents();
      expect(erros, `${c.perfil} ${href}`).toEqual([]);
    }

    await page.getByRole("button", { name: /Conta de/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar/);
    expect(bloqueados).toEqual([]);
  });
}
