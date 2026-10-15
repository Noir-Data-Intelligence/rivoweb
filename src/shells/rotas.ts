/**
 * Metadados das rotas (§1.5). O menu deriva desta tabela; não há uma segunda
 * lista. Cada feature acrescenta as suas entradas aqui à medida que as fases
 * entram.
 */
import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, BellRing, CheckSquare, Coins, FileInput, HandCoins, Landmark, ReceiptText, ScrollText, TrendingUp, Truck, ListChecks, BriefcaseBusiness, Building2, FileClock, FileMinus, FileText, Gauge, Handshake, Home, Hourglass, KeyRound, Receipt, Settings, SlidersHorizontal, UserCog, Users } from "lucide-react";
import { REQUISITO_PAGINA as R } from "@/app/requisitos";
import type { Requisito, Shell } from "@/lib/auth/permissions";

export type EntradaMenu = {
  readonly caminho: string;
  readonly titulo: string;
  readonly icone: LucideIcon;
  readonly requer: Requisito;
  readonly grupo?: string;
  /** Só correspondência exacta (para `/`, `/eu`, `/cliente`). */
  readonly exacto?: boolean;
};

export const MENU: Readonly<Record<Shell, readonly EntradaMenu[]>> = {
  backoffice: [
    { caminho: "/", titulo: "Início", icone: Home, requer: "autenticado", exacto: true },
    { caminho: "/dashboard", titulo: "Dashboard executivo", icone: Gauge, requer: R["/dashboard"] },
    { caminho: "/aprovacoes", titulo: "Aprovações", icone: CheckSquare, requer: R["/aprovacoes"] },
    { caminho: "/alertas", titulo: "Alertas", icone: BellRing, requer: R["/alertas"] },
    { caminho: "/clientes", titulo: "Clientes", icone: Handshake, requer: R["/clientes"], grupo: "Vendas" },
    { caminho: "/facturas", titulo: "Facturas", icone: FileText, requer: R["/facturas"], grupo: "Vendas" },
    { caminho: "/proformas", titulo: "Pró-formas", icone: FileClock, requer: R["/proformas"], grupo: "Vendas" },
    { caminho: "/notas-credito", titulo: "Notas de crédito", icone: FileMinus, requer: R["/notas-credito"], grupo: "Vendas" },
    { caminho: "/recibos", titulo: "Recibos", icone: Receipt, requer: R["/recibos"], grupo: "Vendas" },
    { caminho: "/a-receber", titulo: "A receber", icone: Hourglass, requer: R["/a-receber"], grupo: "Vendas" },
    { caminho: "/fornecedores", titulo: "Fornecedores", icone: Truck, requer: R["/fornecedores"], grupo: "Pagamentos" },
    { caminho: "/facturas-compra", titulo: "Facturas de compra", icone: FileInput, requer: R["/facturas-compra"], grupo: "Pagamentos" },
    { caminho: "/pedidos-pagamento", titulo: "Pedidos de pagamento", icone: HandCoins, requer: R["/pedidos-pagamento"], grupo: "Pagamentos" },
    { caminho: "/despesas", titulo: "Despesas", icone: ReceiptText, requer: R["/despesas"], grupo: "Pagamentos" },
    { caminho: "/contas", titulo: "Contas bancárias", icone: Landmark, requer: R["/contas"], grupo: "Tesouraria" },
    { caminho: "/caixa-pequena", titulo: "Caixa pequena", icone: Coins, requer: R["/caixa-pequena"], grupo: "Tesouraria" },
    { caminho: "/letras", titulo: "Letras e livranças", icone: ScrollText, requer: R["/letras"], grupo: "Tesouraria" },
    { caminho: "/cambios", titulo: "Câmbios", icone: ArrowLeftRight, requer: R["/cambios"], grupo: "Tesouraria" },
    { caminho: "/fluxo-caixa", titulo: "Fluxo de caixa", icone: TrendingUp, requer: R["/fluxo-caixa"], grupo: "Tesouraria" },
    { caminho: "/colaboradores", titulo: "Colaboradores", icone: Users, requer: R["/colaboradores"], grupo: "Pessoas" },
    { caminho: "/departamentos", titulo: "Departamentos", icone: Building2, requer: R["/departamentos"], grupo: "Pessoas" },
    { caminho: "/cargos", titulo: "Cargos", icone: BriefcaseBusiness, requer: R["/cargos"], grupo: "Pessoas" },
    { caminho: "/utilizadores", titulo: "Utilizadores", icone: KeyRound, requer: R["/utilizadores"], grupo: "Administração" },
    {
      caminho: "/configuracoes",
      titulo: "Configurações",
      icone: Settings,
      requer: R["/configuracoes"],
      grupo: "Administração",
    },
    { caminho: "/facturacao", titulo: "Facturação", icone: SlidersHorizontal, requer: R["/facturacao"], grupo: "Administração" },
    { caminho: "/politicas-aprovacao", titulo: "Políticas de aprovação", icone: ListChecks, requer: R["/politicas-aprovacao"], grupo: "Administração" },
  ],
  colaborador: [
    { caminho: "/eu", titulo: "Início", icone: Home, requer: "autenticado", exacto: true },
    { caminho: "/eu/despesas", titulo: "Despesas", icone: ReceiptText, requer: "autenticado" },
  ],
  cliente: [{ caminho: "/cliente", titulo: "Início", icone: Home, requer: "autenticado", exacto: true }],
};

export const CONTA: Readonly<Record<Shell, string>> = {
  backoffice: "/conta",
  colaborador: "/eu/conta",
  cliente: "/cliente/conta",
};

export const NOTIFICACOES: Readonly<Record<Shell, string>> = {
  backoffice: "/notificacoes",
  colaborador: "/eu/notificacoes",
  cliente: "/cliente/notificacoes",
};

export const ICONE_CONTA = UserCog;
