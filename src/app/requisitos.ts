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
  // F3 — clientes e facturação (§5.4).
  "/clientes": "commercial.customers.read",
  "/facturas": "finance.invoices.read",
  "/proformas": "finance.invoices.read",
  "/notas-credito": "finance.invoices.read",
  "/recibos": "finance.receipts.read",
  "/a-receber": "finance.invoices.read",
  "/facturacao": { anyOf: ["finance.invoices.read", "fiscal.rates.read"] },
} as const satisfies Record<string, Requisito>;

/** Criar documentos: escrever facturas e escolher o cliente. */
export const REQUISITO_NOVA_FACTURA = { allOf: ["finance.invoices.write", "commercial.customers.read"] } as const satisfies Requisito;

export type PaginaProtegida = keyof typeof REQUISITO_PAGINA;
