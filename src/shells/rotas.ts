/**
 * Metadados das rotas (§1.5). O menu deriva desta tabela; não há uma segunda
 * lista. Cada feature acrescenta as suas entradas aqui à medida que as fases
 * entram.
 */
import type { LucideIcon } from "lucide-react";
import { BellRing, BriefcaseBusiness, Building2, Gauge, Home, KeyRound, Settings, UserCog, Users } from "lucide-react";
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
    { caminho: "/alertas", titulo: "Alertas", icone: BellRing, requer: R["/alertas"] },
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
  ],
  colaborador: [{ caminho: "/eu", titulo: "Início", icone: Home, requer: "autenticado", exacto: true }],
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
