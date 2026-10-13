/** Shells com as guardas de ambiente (§3.3). Carregados em diferido. */
import { Navigate } from "react-router";
import { sair, usePortalCliente, usePortalColaborador } from "@/features/identity/api";
import { useUtilizador } from "@/features/identity/utilizador";
import { eApiError } from "@/lib/api/problem";
import { temGestao } from "@/lib/auth/permissions";
import { AppShell } from "@/shells/AppShell";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { CarregandoPagina } from "@/ui/Layout";
import { PaginaSimples } from "./guardas";

export function ShellBackoffice() {
  const { shell } = useUtilizador();
  if (shell === "cliente") return <Navigate to="/cliente" replace />;
  if (shell === "colaborador") return <Navigate to="/eu" replace />;
  return <AppShell shell="backoffice" />;
}

export function ShellColaborador() {
  const { shell, utilizador } = useUtilizador();
  const portal = usePortalColaborador(shell !== "cliente");
  if (shell === "cliente") return <Navigate to="/cliente" replace />;
  if (portal.isPending) return <CarregandoPagina />;
  if (portal.error) {
    const semFicha = eApiError(portal.error) && portal.error.status === 403;
    return (
      <PaginaSimples>
        {semFicha ? (
          <Alert tom="info" titulo="A sua conta ainda não está ligada a uma ficha de colaborador.">
            Fale com os Recursos Humanos.
          </Alert>
        ) : (
          <ErrorPanel erro={portal.error} tentarDeNovo={() => void portal.refetch()} />
        )}
        <div className="mt-6 flex gap-2">
          {temGestao(utilizador.permissions) ? (
            <Button asChild variante="secondary">
              <a href="/">Voltar à gestão</a>
            </Button>
          ) : null}
          <Button variante="secondary" onClick={() => sair()}>
            Sair
          </Button>
        </div>
      </PaginaSimples>
    );
  }
  return <AppShell shell="colaborador" />;
}

export function ShellCliente() {
  const { shell } = useUtilizador();
  const portal = usePortalCliente(shell === "cliente");
  if (shell !== "cliente") return <Navigate to="/" replace />;
  if (portal.isPending) return <CarregandoPagina />;
  if (portal.error) {
    const semCliente = eApiError(portal.error) && [403, 404].includes(portal.error.status);
    return (
      <PaginaSimples>
        {semCliente ? (
          <Alert tom="info" titulo="Esta conta não está associada a um cliente.">
            Fale com a empresa.
          </Alert>
        ) : (
          <ErrorPanel erro={portal.error} tentarDeNovo={() => void portal.refetch()} />
        )}
        <Button variante="secondary" className="mt-6" onClick={() => sair()}>
          Sair
        </Button>
      </PaginaSimples>
    );
  }
  return <AppShell shell="cliente" />;
}
