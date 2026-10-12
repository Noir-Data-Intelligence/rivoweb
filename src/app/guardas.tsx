/**
 * Guardas de rota (§3.2, §3.3). Esconder não protege: o backend decide sempre.
 * As guardas só evitam ecrãs vazios ou a rebentar, e não pedem dados que a
 * conta não pode ler.
 */
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useMe, useSessao } from "@/features/identity/api";
import { ProvedorUtilizador, useUtilizador } from "@/features/identity/utilizador";
import { SemAcesso } from "@/features/sistema/paginas";
import type { Requisito } from "@/lib/auth/permissions";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { CarregandoPagina, Logo } from "@/ui/Layout";

export function PaginaSimples({ children }: { children: ReactNode }) {
  return (
    <main id="conteudo" className="flex min-h-screen items-start justify-center bg-background px-4 py-10 sm:items-center">
      <div className="w-full max-w-md">
        <Logo className="mb-8" />
        {children}
      </div>
    </main>
  );
}

/** Exige sessão e carrega `/identity/me`. Sem sessão vai para o login com retorno. */
export function AreaAutenticada() {
  const sessao = useSessao();
  const me = useMe();
  const local = useLocation();

  if (sessao === null) {
    const voltar = local.pathname + local.search;
    return <Navigate to={voltar === "/" ? "/entrar" : `/entrar?voltar=${encodeURIComponent(voltar)}`} replace />;
  }
  if (me.isPending) return <CarregandoPagina />;
  if (me.error) {
    return (
      <PaginaSimples>
        <ErrorPanel erro={me.error} tentarDeNovo={() => void me.refetch()} />
      </PaginaSimples>
    );
  }
  return (
    <ProvedorUtilizador utilizador={me.data}>
      <Outlet />
    </ProvedorUtilizador>
  );
}

/** Guarda por permissão dentro de um shell (`meta.requires`). */
export function Exige({ requer, children }: { requer: Requisito; children: ReactNode }) {
  const { pode } = useUtilizador();
  return pode(requer) ? <>{children}</> : <SemAcesso />;
}
