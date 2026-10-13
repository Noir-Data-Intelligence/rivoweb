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
} satisfies Record<string, () => Modulo>;

export type NomePagina = keyof typeof PAGINAS;
