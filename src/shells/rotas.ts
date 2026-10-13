/**
 * Metadados das rotas (§1.5). O menu deriva desta tabela; não há uma segunda
 * lista. Cada feature acrescenta as suas entradas aqui à medida que as fases
 * entram.
 */
import type { LucideIcon } from "lucide-react";
import { BriefcaseBusiness, Building2, Home, KeyRound, Settings, UserCog, Users } from "lucide-react";
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
    { caminho: "/colaboradores", titulo: "Colaboradores", icone: Users, requer: "hr.employees.read", grupo: "Pessoas" },
    { caminho: "/departamentos", titulo: "Departamentos", icone: Building2, requer: "hr.departments.read", grupo: "Pessoas" },
    { caminho: "/cargos", titulo: "Cargos", icone: BriefcaseBusiness, requer: "hr.positions.read", grupo: "Pessoas" },
    { caminho: "/utilizadores", titulo: "Utilizadores", icone: KeyRound, requer: "identity.users.read", grupo: "Administração" },
    {
      caminho: "/configuracoes",
      titulo: "Configurações",
      icone: Settings,
      requer: { anyOf: ["fiscal.tax_entity.read", "identity.users.write", "approval.policies.read"] },
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

export const ICONE_CONTA = UserCog;
