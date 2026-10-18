/**
 * Metadados das rotas (§1.5). O menu deriva desta tabela; não há uma segunda
 * lista. Cada feature acrescenta as suas entradas aqui à medida que as fases
 * entram.
 */
import type { LucideIcon } from "lucide-react";
import { Archive, FolderKanban, FileBadge, PhoneCall, FileSpreadsheet, FileType, CalendarCheck, ChartPie, KanbanSquare, Tags, UserPlus, ArrowLeftRight, BadgeCheck, Library, MessagesSquare, LifeBuoy, Banknote, ClipboardCheck, ClipboardList, Package, Warehouse, DoorOpen, PackageCheck, ShoppingCart, Trophy, UserSearch, FileSignature, Gift, Network, Stamp, CalendarDays, Clock, FolderOpen, GraduationCap, Laptop, Megaphone, MessageSquare, Plane, BellRing, BookOpen, CalendarClock, CalendarRange, ChartColumn, ListTree, Percent, Scale, Target, Wallet, Workflow, CheckSquare, Coins, FileInput, HandCoins, Landmark, ReceiptText, ScrollText, TrendingUp, Truck, ListChecks, BriefcaseBusiness, Building2, FileClock, FileMinus, FileText, Gauge, Handshake, Home, Hourglass, KeyRound, Receipt, Settings, SlidersHorizontal, UserCog, Users } from "lucide-react";
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
    { caminho: "/comprovativos", titulo: "Comprovativos", icone: BadgeCheck, requer: R["/comprovativos"], grupo: "Vendas" },
    { caminho: "/a-receber", titulo: "A receber", icone: Hourglass, requer: R["/a-receber"], grupo: "Vendas" },
    { caminho: "/contratos-clientes", titulo: "Contratos de clientes", icone: FileBadge, requer: R["/contratos-clientes"], grupo: "Vendas" },
    { caminho: "/cobrancas", titulo: "Cobranças", icone: PhoneCall, requer: R["/cobrancas"], grupo: "Vendas" },
    { caminho: "/leads", titulo: "Leads", icone: UserPlus, requer: R["/leads"], grupo: "CRM" },
    { caminho: "/oportunidades", titulo: "Oportunidades", icone: KanbanSquare, requer: R["/oportunidades"], grupo: "CRM" },
    { caminho: "/propostas", titulo: "Propostas", icone: FileSpreadsheet, requer: R["/propostas"], grupo: "CRM" },
    { caminho: "/actividades", titulo: "Actividades", icone: CalendarCheck, requer: R["/actividades"], grupo: "CRM" },
    { caminho: "/relatorio-comercial", titulo: "Relatório comercial", icone: ChartPie, requer: R["/relatorio-comercial"], grupo: "CRM" },
    { caminho: "/tipos-servico", titulo: "Tipos de serviço", icone: Tags, requer: R["/tipos-servico"], grupo: "CRM" },
    { caminho: "/modelos-proposta", titulo: "Modelos de proposta", icone: FileType, requer: R["/modelos-proposta"], grupo: "CRM" },
    { caminho: "/conversas", titulo: "Conversas", icone: MessagesSquare, requer: R["/conversas"], grupo: "Apoio ao cliente" },
    { caminho: "/base-conhecimento", titulo: "Base de conhecimento", icone: Library, requer: R["/base-conhecimento"], grupo: "Apoio ao cliente" },
    { caminho: "/projectos", titulo: "Projectos", icone: FolderKanban, requer: R["/projectos"], grupo: "Projectos" },
    { caminho: "/requisicoes", titulo: "Requisições", icone: ClipboardList, requer: R["/requisicoes"], grupo: "Compras" },
    { caminho: "/encomendas", titulo: "Ordens de compra", icone: ShoppingCart, requer: R["/encomendas"], grupo: "Compras" },
    { caminho: "/recepcoes", titulo: "Recepções", icone: PackageCheck, requer: R["/recepcoes"], grupo: "Compras" },
    { caminho: "/artigos", titulo: "Artigos", icone: Package, requer: R["/artigos"], grupo: "Inventário" },
    { caminho: "/armazens", titulo: "Armazéns", icone: Warehouse, requer: R["/armazens"], grupo: "Inventário" },
    { caminho: "/contagens", titulo: "Contagens", icone: ClipboardCheck, requer: R["/contagens"], grupo: "Inventário" },
    { caminho: "/valorizacao", titulo: "Valorização do stock", icone: TrendingUp, requer: R["/valorizacao"], grupo: "Inventário" },
    { caminho: "/activos", titulo: "Activos fixos", icone: Laptop, requer: R["/activos"], grupo: "Activos" },
    { caminho: "/fornecedores", titulo: "Fornecedores", icone: Truck, requer: R["/fornecedores"], grupo: "Pagamentos" },
    { caminho: "/facturas-compra", titulo: "Facturas de compra", icone: FileInput, requer: R["/facturas-compra"], grupo: "Pagamentos" },
    { caminho: "/pedidos-pagamento", titulo: "Pedidos de pagamento", icone: HandCoins, requer: R["/pedidos-pagamento"], grupo: "Pagamentos" },
    { caminho: "/despesas", titulo: "Despesas", icone: ReceiptText, requer: R["/despesas"], grupo: "Pagamentos" },
    { caminho: "/contas", titulo: "Contas bancárias", icone: Landmark, requer: R["/contas"], grupo: "Tesouraria" },
    { caminho: "/caixa-pequena", titulo: "Caixa pequena", icone: Coins, requer: R["/caixa-pequena"], grupo: "Tesouraria" },
    { caminho: "/letras", titulo: "Letras e livranças", icone: ScrollText, requer: R["/letras"], grupo: "Tesouraria" },
    { caminho: "/cambios", titulo: "Câmbios", icone: ArrowLeftRight, requer: R["/cambios"], grupo: "Tesouraria" },
    { caminho: "/fluxo-caixa", titulo: "Fluxo de caixa", icone: TrendingUp, requer: R["/fluxo-caixa"], grupo: "Tesouraria" },
    { caminho: "/relatorios", titulo: "Relatórios financeiros", icone: ChartColumn, requer: R["/relatorios"], grupo: "Contabilidade" },
    { caminho: "/impostos", titulo: "Impostos", icone: Percent, requer: R["/impostos"], grupo: "Contabilidade" },
    { caminho: "/lancamentos", titulo: "Lançamentos", icone: BookOpen, requer: R["/lancamentos"], grupo: "Contabilidade" },
    { caminho: "/plano-contas", titulo: "Plano de contas", icone: ListTree, requer: R["/plano-contas"], grupo: "Contabilidade" },
    { caminho: "/periodos", titulo: "Períodos", icone: CalendarRange, requer: R["/periodos"], grupo: "Contabilidade" },
    { caminho: "/regras-contabilisticas", titulo: "Regras contabilísticas", icone: Workflow, requer: R["/regras-contabilisticas"], grupo: "Contabilidade" },
    { caminho: "/centros-custo", titulo: "Centros de custo", icone: Target, requer: R["/centros-custo"], grupo: "Planeamento" },
    { caminho: "/orcamentos", titulo: "Orçamentos", icone: Wallet, requer: R["/orcamentos"], grupo: "Planeamento" },
    { caminho: "/previsoes-custos", titulo: "Previsões de custos", icone: CalendarClock, requer: R["/previsoes-custos"], grupo: "Planeamento" },
    { caminho: "/colaboradores", titulo: "Colaboradores", icone: Users, requer: R["/colaboradores"], grupo: "Pessoas" },
    { caminho: "/departamentos", titulo: "Departamentos", icone: Building2, requer: R["/departamentos"], grupo: "Pessoas" },
    { caminho: "/cargos", titulo: "Cargos", icone: BriefcaseBusiness, requer: R["/cargos"], grupo: "Pessoas" },
    { caminho: "/organograma", titulo: "Organograma", icone: Network, requer: R["/organograma"], grupo: "Pessoas" },
    { caminho: "/contratos", titulo: "Contratos", icone: FileSignature, requer: R["/contratos"], grupo: "Pessoas" },
    { caminho: "/assiduidade", titulo: "Assiduidade", icone: Clock, requer: R["/assiduidade"], grupo: "Pessoas" },
    { caminho: "/turnos", titulo: "Turnos", icone: CalendarDays, requer: R["/turnos"], grupo: "Pessoas" },
    { caminho: "/ferias", titulo: "Férias e ausências", icone: Plane, requer: R["/ferias"], grupo: "Pessoas" },
    { caminho: "/beneficios", titulo: "Benefícios", icone: Gift, requer: R["/beneficios"], grupo: "Pessoas" },
    { caminho: "/imigracao", titulo: "Validades de imigração", icone: Stamp, requer: R["/imigracao"], grupo: "Pessoas" },
    { caminho: "/recrutamento", titulo: "Recrutamento", icone: UserSearch, requer: R["/recrutamento"], grupo: "Talento" },
    { caminho: "/entradas-saidas", titulo: "Entradas e saídas", icone: DoorOpen, requer: R["/entradas-saidas"], grupo: "Talento" },
    { caminho: "/formacao", titulo: "Formação", icone: GraduationCap, requer: R["/formacao"], grupo: "Talento" },
    { caminho: "/desempenho", titulo: "Desempenho", icone: Target, requer: R["/desempenho"], grupo: "Talento" },
    { caminho: "/conquistas", titulo: "Conquistas", icone: Trophy, requer: R["/conquistas"], grupo: "Talento" },
    { caminho: "/anuncios", titulo: "Anúncios", icone: Megaphone, requer: R["/anuncios"], grupo: "Serviços" },
    { caminho: "/pedidos-internos", titulo: "Pedidos internos", icone: MessageSquare, requer: R["/pedidos-internos"], grupo: "Serviços" },
    { caminho: "/declaracoes", titulo: "Declarações", icone: FileText, requer: R["/declaracoes"], grupo: "Serviços" },
    { caminho: "/salarios", titulo: "Folhas de pagamento", icone: Banknote, requer: R["/salarios"], grupo: "Salários" },
    { caminho: "/documentos", titulo: "Arquivo de documentos", icone: Archive, requer: R["/documentos"], grupo: "Administração" },
    { caminho: "/utilizadores", titulo: "Utilizadores", icone: KeyRound, requer: R["/utilizadores"], grupo: "Administração" },
    {
      caminho: "/configuracoes",
      titulo: "Configurações",
      icone: Settings,
      requer: R["/configuracoes"],
      grupo: "Administração",
    },
    { caminho: "/facturacao", titulo: "Facturação", icone: SlidersHorizontal, requer: R["/facturacao"], grupo: "Administração" },
    { caminho: "/fiscal", titulo: "Fiscal", icone: Scale, requer: R["/fiscal"], grupo: "Administração" },
    { caminho: "/politicas-aprovacao", titulo: "Políticas de aprovação", icone: ListChecks, requer: R["/politicas-aprovacao"], grupo: "Administração" },
  ],
  colaborador: [
    { caminho: "/eu", titulo: "Início", icone: Home, requer: "autenticado", exacto: true },
    { caminho: "/eu/anuncios", titulo: "Anúncios", icone: Megaphone, requer: "autenticado" },
    { caminho: "/eu/assiduidade", titulo: "Assiduidade", icone: Clock, requer: "autenticado", grupo: "O meu tempo" },
    { caminho: "/eu/ferias", titulo: "Férias e ausências", icone: Plane, requer: "autenticado", grupo: "O meu tempo" },
    { caminho: "/eu/turnos", titulo: "Turnos", icone: CalendarDays, requer: "autenticado", grupo: "O meu tempo" },
    { caminho: "/eu/recibos", titulo: "Recibos", icone: Banknote, requer: "autenticado", grupo: "Documentos" },
    { caminho: "/eu/documentos", titulo: "Documentos e declarações", icone: FolderOpen, requer: "autenticado", grupo: "Documentos" },
    { caminho: "/eu/pedidos", titulo: "Pedidos internos", icone: MessageSquare, requer: "autenticado", grupo: "Pedidos" },
    { caminho: "/eu/despesas", titulo: "Despesas", icone: ReceiptText, requer: "autenticado", grupo: "Pedidos" },
    { caminho: "/eu/formacao", titulo: "Formação", icone: GraduationCap, requer: "autenticado", grupo: "Desenvolvimento" },
    { caminho: "/eu/objectivos", titulo: "Objectivos e conquistas", icone: Target, requer: "autenticado", grupo: "Desenvolvimento" },
    { caminho: "/eu/bens", titulo: "Bens à minha guarda", icone: Laptop, requer: "autenticado", grupo: "Desenvolvimento" },
  ],
  cliente: [
    { caminho: "/cliente", titulo: "Início", icone: Home, requer: "autenticado", exacto: true },
    { caminho: "/cliente/extracto", titulo: "Extracto", icone: ScrollText, requer: "autenticado", grupo: "Contas" },
    { caminho: "/cliente/pagamentos", titulo: "Pagamentos", icone: HandCoins, requer: "autenticado", grupo: "Contas" },
    { caminho: "/cliente/documentos", titulo: "Documentos", icone: FolderOpen, requer: "autenticado", grupo: "Contas" },
    { caminho: "/cliente/mensagens", titulo: "Mensagens", icone: MessageSquare, requer: "autenticado", grupo: "Apoio" },
    { caminho: "/cliente/suporte", titulo: "Suporte", icone: LifeBuoy, requer: "autenticado", grupo: "Apoio" },
    { caminho: "/cliente/ajuda", titulo: "Ajuda", icone: BookOpen, requer: "autenticado", grupo: "Apoio" },
  ],
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
