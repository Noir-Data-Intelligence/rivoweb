/**
 * O menu só mostra o que a conta pode abrir (§3.2). Verificado contra o
 * catálogo real de perfis (`tests/fixtures/catalogo-perfis.json`, lido de
 * `GET /settings/overview` na API local a 2026-10-13, código igual ao de
 * produção). SuperAdmin = Admin + `hr.positions.assign_direct`.
 */
import { isValidElement, type ReactElement } from "react";
import type { RouteObject } from "react-router";
import { describe, expect, it } from "vitest";
import { REQUISITO_PAGINA } from "@/app/requisitos";
import { Exige } from "@/app/guardas";
import { rotas } from "@/app/router";
import { pode, shellInicial } from "@/lib/auth/permissions";
import { MENU } from "@/shells/rotas";
import catalogo from "../fixtures/catalogo-perfis.json";

const perfis: { name: string; permissions: string[] }[] = [
  ...catalogo,
  { name: "SuperAdmin", permissions: [...(catalogo.find((p) => p.name === "Admin")?.permissions ?? []), "hr.positions.assign_direct"] },
];

function menuDe(perfil: { name: string; permissions: string[] }): string[] {
  const set = new Set(perfil.permissions);
  const shell = shellInicial([perfil.name], perfil.permissions);
  return MENU[shell].filter((e) => pode(set, e.requer)).map((e) => e.titulo);
}

function guardas(lista: RouteObject[], prefixo = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const r of lista) {
    const caminho = r.path ? (r.path.startsWith("/") ? r.path : `${prefixo.replace(/\/$/, "")}/${r.path}`) : prefixo;
    const el = r.element as ReactElement<{ requer?: unknown }> | undefined;
    if (isValidElement(el) && el.type === Exige) out.set(caminho, el.props.requer);
    if (r.children) for (const [k, v] of guardas(r.children, caminho)) out.set(k, v);
  }
  return out;
}

describe("menu por perfil (§3.2)", () => {
  it("cada entrada do menu exige o mesmo que a guarda da sua página", () => {
    const g = guardas(rotas);
    for (const e of MENU.backoffice.filter((x) => x.caminho !== "/")) {
      expect(e.requer, e.caminho).toBe(REQUISITO_PAGINA[e.caminho as keyof typeof REQUISITO_PAGINA]);
      expect(g.get(e.caminho), e.caminho).toBe(e.requer);
    }
    // As páginas de detalhe herdam a guarda da lista.
    expect(g.get("/utilizadores/:userId")).toBe(REQUISITO_PAGINA["/utilizadores"]);
    expect(g.get("/colaboradores/:employeeId")).toBe(REQUISITO_PAGINA["/colaboradores"]);
  });

  it("cada perfil real vê só as entradas que pode abrir", () => {
    const visto = Object.fromEntries(perfis.map((p) => [p.name, menuDe(p)]));
    expect(visto).toEqual({
      Admin: ["Início", "Dashboard executivo", "Aprovações", "Alertas", "Clientes", "Facturas", "Pró-formas", "Notas de crédito", "Recibos", "A receber", "Fornecedores", "Facturas de compra", "Pedidos de pagamento", "Despesas", "Contas bancárias", "Caixa pequena", "Letras e livranças", "Câmbios", "Fluxo de caixa", "Relatórios financeiros", "Impostos", "Lançamentos", "Plano de contas", "Períodos", "Regras contabilísticas", "Centros de custo", "Orçamentos", "Previsões de custos", "Colaboradores", "Departamentos", "Cargos", "Organograma", "Contratos", "Assiduidade", "Turnos", "Férias e ausências", "Benefícios", "Validades de imigração", "Recrutamento", "Entradas e saídas", "Formação", "Anúncios", "Pedidos internos", "Utilizadores", "Configurações", "Facturação", "Fiscal", "Políticas de aprovação"],
      SuperAdmin: ["Início", "Dashboard executivo", "Aprovações", "Alertas", "Clientes", "Facturas", "Pró-formas", "Notas de crédito", "Recibos", "A receber", "Fornecedores", "Facturas de compra", "Pedidos de pagamento", "Despesas", "Contas bancárias", "Caixa pequena", "Letras e livranças", "Câmbios", "Fluxo de caixa", "Relatórios financeiros", "Impostos", "Lançamentos", "Plano de contas", "Períodos", "Regras contabilísticas", "Centros de custo", "Orçamentos", "Previsões de custos", "Colaboradores", "Departamentos", "Cargos", "Organograma", "Contratos", "Assiduidade", "Turnos", "Férias e ausências", "Benefícios", "Validades de imigração", "Recrutamento", "Entradas e saídas", "Formação", "Anúncios", "Pedidos internos", "Utilizadores", "Configurações", "Facturação", "Fiscal", "Políticas de aprovação"],
      AssetManager: ["Início", "Alertas", "Fornecedores"],
      Cliente: ["Início"],
      Colaborador: ["Início", "Anúncios", "Assiduidade", "Férias e ausências", "Turnos", "Recibos", "Documentos e declarações", "Pedidos internos", "Despesas", "Formação", "Objectivos e conquistas", "Bens à minha guarda"],
      Finance: ["Início", "Aprovações", "Alertas", "Facturas", "Pró-formas", "Notas de crédito", "Recibos", "A receber", "Fornecedores", "Facturas de compra", "Pedidos de pagamento", "Despesas", "Contas bancárias", "Caixa pequena", "Letras e livranças", "Câmbios", "Fluxo de caixa", "Relatórios financeiros", "Impostos", "Lançamentos", "Plano de contas", "Períodos", "Regras contabilísticas", "Centros de custo", "Orçamentos", "Previsões de custos", "Configurações", "Facturação", "Fiscal"],
      HR: ["Início", "Alertas", "Colaboradores", "Departamentos", "Cargos", "Organograma", "Contratos", "Assiduidade", "Turnos", "Férias e ausências", "Benefícios", "Validades de imigração", "Recrutamento", "Entradas e saídas", "Formação", "Anúncios", "Pedidos internos"],
      Manager: ["Início", "Dashboard executivo", "Aprovações", "Alertas", "Fornecedores", "Facturas de compra", "Pedidos de pagamento", "Despesas", "Contas bancárias", "Centros de custo", "Orçamentos", "Previsões de custos"],
      ProjectManager: ["Início"],
      Sales: ["Início", "Clientes", "Facturas", "Pró-formas", "Notas de crédito", "Recibos", "A receber", "Facturação"],
    });
  });

  it("Colaborador e Cliente vão para os portais, apesar de documents.write (§3.3)", () => {
    const de = (n: string) => perfis.find((p) => p.name === n)?.permissions ?? [];
    expect(shellInicial(["Colaborador"], de("Colaborador"))).toBe("colaborador");
    expect(shellInicial(["Cliente"], de("Cliente"))).toBe("cliente");
    expect(shellInicial(["ProjectManager"], de("ProjectManager"))).toBe("backoffice");
  });

  it("Configurações só aparece a quem vê pelo menos um cartão", () => {
    const so = (...p: string[]) => pode(new Set(p), REQUISITO_PAGINA["/configuracoes"]);
    expect(so("approval.policies.read")).toBe(false);
    expect(so("identity.roles.read")).toBe(false);
    expect(so("identity.roles.read", "approval.policies.read")).toBe(true);
    expect(so("fiscal.tax_entity.read")).toBe(true);
    expect(so("identity.users.write")).toBe(true);
  });
});
