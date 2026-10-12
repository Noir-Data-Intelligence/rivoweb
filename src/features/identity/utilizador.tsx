import { createContext, useContext, useMemo, type ReactNode } from "react";
import { pode, shellInicial, type Requisito, type Shell } from "@/lib/auth/permissions";
import type { Utilizador } from "./api";

type ContextoUtilizador = {
  readonly utilizador: Utilizador;
  readonly shell: Shell;
  readonly superAdmin: boolean;
  readonly pode: (r: Requisito) => boolean;
};

const Contexto = createContext<ContextoUtilizador | null>(null);

export function ProvedorUtilizador({ utilizador, children }: { utilizador: Utilizador; children: ReactNode }) {
  const valor = useMemo<ContextoUtilizador>(() => {
    const permissoes = new Set(utilizador.permissions);
    return {
      utilizador,
      shell: shellInicial(utilizador.roles, utilizador.permissions),
      superAdmin: utilizador.roles.includes("SuperAdmin"),
      pode: (r) => pode(permissoes, r),
    };
  }, [utilizador]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useUtilizador(): ContextoUtilizador {
  const c = useContext(Contexto);
  if (!c) throw new Error("useUtilizador fora de ProvedorUtilizador");
  return c;
}

/** Mostra os filhos só com a permissão. Ergonomia, não segurança: o backend decide. */
export function Can({ requer, children, senao = null }: { requer: Requisito; children: ReactNode; senao?: ReactNode }) {
  const { pode: podeFazer } = useUtilizador();
  return <>{podeFazer(requer) ? children : senao}</>;
}
