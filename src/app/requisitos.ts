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
  // F4 — aprovações (§5.5).
  "/aprovacoes": "approval.requests.read",
  "/politicas-aprovacao": "approval.policies.read",
  // F5 — contas a pagar, despesas e tesouraria (§5.6).
  "/fornecedores": "procurement.suppliers.read",
  "/facturas-compra": "finance.payables.read",
  "/pedidos-pagamento": "finance.payables.read",
  "/despesas": "finance.expenses.read",
  "/contas": "finance.payables.read",
  "/caixa-pequena": "finance.treasury.read",
  "/letras": "finance.treasury.read",
  "/cambios": "finance.treasury.read",
  "/fluxo-caixa": { anyOf: ["finance.reports.read", "finance.treasury.read"] },
  // F6 — fiscal, contabilidade e planeamento (§5.7).
  "/fiscal": "fiscal.rates.read",
  "/relatorios": { anyOf: ["finance.ledger.read", "finance.reports.read"] },
  "/impostos": "finance.reports.read",
  "/lancamentos": "finance.ledger.read",
  "/plano-contas": "finance.ledger.read",
  "/periodos": "finance.ledger.read",
  "/regras-contabilisticas": "finance.ledger.read",
  "/centros-custo": "finance.planning.read",
  "/orcamentos": "finance.planning.read",
  "/previsoes-custos": "finance.planning.read",
  // F7b — RH do dia-a-dia (§5.8).
  "/organograma": "hr.employees.read",
  "/contratos": "hr.contracts.read",
  "/assiduidade": "hr.attendance.read",
  "/ferias": "hr.leave.read",
  "/beneficios": "hr.benefits.read",
  "/imigracao": "hr.personal_data.read",
  // F7c — recrutamento, entradas e saídas (§5.8).
  "/recrutamento": "hr.recruitment.read",
  "/entradas-saidas": "hr.lifecycle.read",
  "/anuncios": "hr.announcements.write",
  "/pedidos-internos": "hr.tickets.read",
  "/formacao": "hr.training.read",
  "/turnos": "hr.shifts.read",
  "/declaracoes": "hr.declarations.write",
  "/desempenho": "hr.performance.read",
  "/conquistas": "hr.employees.read",
  // F8 — salários (§5.9).
  "/salarios": "payroll.runs.read",
  // F9 — compras (§5.10).
  "/requisicoes": "procurement.requisitions.read",
  "/encomendas": "procurement.orders.read",
  "/recepcoes": "procurement.receipts.read",
  "/artigos": "inventory.items.read",
  "/armazens": "inventory.items.read",
  "/contagens": "inventory.items.read",
  "/valorizacao": "inventory.items.read",
  "/activos": "finance.assets.read",
  // F10 — portal do cliente: o lado da equipa (§5.13).
  "/comprovativos": "finance.receipts.read",
  "/conversas": "messaging.conversations.read",
  "/base-conhecimento": "messaging.conversations.read",
  "/documentos": "documents.read",
  // F11 — comercial avançado (§5.12).
  "/leads": "commercial.crm.read",
  "/oportunidades": "commercial.crm.read",
  "/actividades": "commercial.crm.read",
  "/relatorio-comercial": "commercial.crm.read",
  "/tipos-servico": "commercial.crm.read",
} as const satisfies Record<string, Requisito>;

/** Escrever um artigo e voltar a ele (a ficha lê-se com a permissão das conversas). */
export const REQUISITO_NOVO_ARTIGO = { allOf: ["messaging.knowledge_base.write", "messaging.conversations.read"] } as const satisfies Requisito;

/** Lançar à mão: escrever no razão e ler os diários e as contas. */
export const REQUISITO_NOVO_LANCAMENTO = { allOf: ["finance.ledger.write", "finance.ledger.read"] } as const satisfies Requisito;

/** Criar documentos: escrever facturas e escolher o cliente. */
export const REQUISITO_NOVA_FACTURA = { allOf: ["finance.invoices.write", "commercial.customers.read"] } as const satisfies Requisito;

export type PaginaProtegida = keyof typeof REQUISITO_PAGINA;
