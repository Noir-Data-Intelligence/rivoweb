/**
 * Carregadores das páginas da área autenticada, num módulo carregado em
 * diferido. Cada `import()` deixa no chunk onde está o caminho do ficheiro e a
 * lista dos chunks partilhados; com dezenas de páginas, isso pesava no chunk
 * inicial (§1.5). Aqui, o chunk inicial só tem uma importação: a deste módulo.
 */
import type { ComponentType } from "react";

type Modulo = Promise<{ default: ComponentType }>;
const de = <T,>(p: Promise<T>, escolher: (m: T) => ComponentType): Modulo => p.then((m) => ({ default: escolher(m) }));

export const PAGINAS = {
  // Shells e páginas comuns
  shellBackoffice: () => de(import("./shells"), (m) => m.ShellBackoffice),
  shellColaborador: () => de(import("./shells"), (m) => m.ShellColaborador),
  shellCliente: () => de(import("./shells"), (m) => m.ShellCliente),
  inicioColaborador: () => de(import("@/features/inicio/paginas"), (m) => m.InicioColaborador),
  inicioCliente: () => de(import("@/features/inicio/paginas"), (m) => m.InicioCliente),
  minhaConta: () => import("@/features/identity/pages/MinhaConta"),
  notificacoes: () => import("@/features/notificacoes/pages/Notificacoes"),
  // F2
  painel: () => import("@/features/dashboard/pages/Painel"),
  executivo: () => import("@/features/dashboard/pages/Executivo"),
  alertas: () => import("@/features/alertas/pages/Alertas"),
  // F1
  utilizadores: () => import("@/features/administracao/pages/Utilizadores"),
  utilizador: () => import("@/features/administracao/pages/Utilizador"),
  configuracoes: () => import("@/features/administracao/pages/Configuracoes"),
  colaboradores: () => import("@/features/rh/pages/Colaboradores"),
  colaborador: () => import("@/features/rh/pages/Colaborador"),
  departamentos: () => import("@/features/rh/pages/Departamentos"),
  cargos: () => import("@/features/rh/pages/Cargos"),
  // F3
  clientes: () => import("@/features/clientes/pages/Clientes"),
  cliente: () => import("@/features/clientes/pages/Cliente"),
  facturas: () => import("@/features/facturacao/pages/Facturas"),
  rascunho: () => import("@/features/facturacao/pages/Rascunho"),
  factura: () => import("@/features/facturacao/pages/Factura"),
  proformas: () => de(import("@/features/facturacao/pages/Proformas"), (m) => m.ListaProformas),
  novaProforma: () => de(import("@/features/facturacao/pages/Proformas"), (m) => m.NovaProforma),
  notasCredito: () => de(import("@/features/facturacao/pages/NotasCredito"), (m) => m.ListaNotasCredito),
  notaCredito: () => de(import("@/features/facturacao/pages/NotasCredito"), (m) => m.FichaNotaCredito),
  recibos: () => de(import("@/features/facturacao/pages/Recibos"), (m) => m.ListaRecibos),
  recibo: () => de(import("@/features/facturacao/pages/Recibos"), (m) => m.FichaRecibo),
  aReceber: () => import("@/features/facturacao/pages/AReceber"),
  configuracaoFacturacao: () => import("@/features/facturacao/pages/Configuracao"),
  // F4
  aprovacoes: () => import("@/features/aprovacoes/pages/Caixa"),
  pedidoAprovacao: () => import("@/features/aprovacoes/pages/Pedido"),
  politicas: () => import("@/features/aprovacoes/pages/Politicas"),
  // F5
  fornecedores: () => import("@/features/pagar/pages/Fornecedores"),
  fornecedor: () => import("@/features/pagar/pages/Fornecedor"),
  facturasCompra: () => import("@/features/pagar/pages/FacturasCompra"),
  facturaCompra: () => import("@/features/pagar/pages/FacturaCompra"),
  pedidosPagamento: () => import("@/features/pagar/pages/PedidosPagamento"),
  pedidoPagamento: () => import("@/features/pagar/pages/PedidoPagamento"),
  despesas: () => import("@/features/despesas/pages/Despesas"),
  despesa: () => import("@/features/despesas/pages/Despesa"),
  minhasDespesas: () => import("@/features/despesas/pages/MinhasDespesas"),
  contas: () => import("@/features/tesouraria/pages/Contas"),
  conta: () => import("@/features/tesouraria/pages/Conta"),
  caixaPequena: () => import("@/features/tesouraria/pages/CaixaPequena"),
  fundoCaixa: () => import("@/features/tesouraria/pages/FundoCaixa"),
  letras: () => import("@/features/tesouraria/pages/Letras"),
  letra: () => import("@/features/tesouraria/pages/Letra"),
  cambios: () => import("@/features/tesouraria/pages/Cambios"),
  fluxoCaixa: () => import("@/features/tesouraria/pages/FluxoCaixa"),
} satisfies Record<string, () => Modulo>;

export type NomePagina = keyof typeof PAGINAS;
