/**
 * Metadados das rotas (§1.5). O menu deriva desta tabela; não há uma segunda
 * lista. Cada feature acrescenta as suas entradas aqui à medida que as fases
 * entram.
 */
import type { LucideIcon } from "lucide-react";
import { Home, UserCog } from "lucide-react";
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
  backoffice: [{ caminho: "/", titulo: "Início", icone: Home, requer: "autenticado", exacto: true }],
  colaborador: [{ caminho: "/eu", titulo: "Início", icone: Home, requer: "autenticado", exacto: true }],
  cliente: [{ caminho: "/cliente", titulo: "Início", icone: Home, requer: "autenticado", exacto: true }],
};

export const CONTA: Readonly<Record<Shell, string>> = {
  backoffice: "/conta",
  colaborador: "/eu/conta",
  cliente: "/cliente/conta",
};

export const ICONE_CONTA = UserCog;
