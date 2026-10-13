/**
 * Permissão exigida por cada página do backoffice (§3.2): uma só tabela para a
 * guarda da rota e para o menu, para nunca divergirem. Uma entrada só aparece
 * no menu a quem a página serve, e a página só mostra o que essa conta pode
 * ler. Sem ícones aqui: o router (chunk inicial) importa este ficheiro.
 */
import type { Requisito } from "@/lib/auth/permissions";

/** Cartões de Configurações: a página existe para quem vê pelo menos um. */
export const CARTOES_CONFIGURACOES = {
  dadosEmpresa: "fiscal.tax_entity.read",
  governacao: { allOf: ["identity.roles.read", "approval.policies.read"] },
  correio: "identity.users.write",
} as const satisfies Record<string, Requisito>;

export const REQUISITO_PAGINA = {
  "/dashboard": "dashboard.overview.read",
  "/alertas": "alerts.alerts.read",
  "/colaboradores": "hr.employees.read",
  "/departamentos": "hr.departments.read",
  "/cargos": "hr.positions.read",
  "/utilizadores": "identity.users.read",
  "/configuracoes": { anyOf: Object.values(CARTOES_CONFIGURACOES) },
} as const satisfies Record<string, Requisito>;

export type PaginaProtegida = keyof typeof REQUISITO_PAGINA;
