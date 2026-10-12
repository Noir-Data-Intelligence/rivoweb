import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { APP_VERSION } from "@/lib/env";
import { Button } from "@/ui/Button";
import { EmptyState, PageHeader } from "@/ui/Layout";

export function SemAcesso() {
  return (
    <>
      <PageHeader titulo="Não tem acesso a esta área" />
      <EmptyState
        frase="A sua conta não tem permissão para ver esta página. Se precisa dela, fale com quem administra a Rivo."
        accao={
          <Button asChild variante="secondary">
            <Link to="/">Ir para o início</Link>
          </Button>
        }
      />
    </>
  );
}

export function NaoEncontrado() {
  return (
    <main id="conteudo" className="flex min-h-screen items-center justify-center bg-background px-4">
      <EmptyState
        frase="Esta página não existe."
        accao={
          <Button asChild variante="secondary">
            <Link to="/">Ir para o início</Link>
          </Button>
        }
      />
    </main>
  );
}

/** Error boundary de rota: «Recarregar», sem detalhe interno (S27). */
export function ErroDeRota() {
  const erro = useRouteError();
  const naoEncontrado = isRouteErrorResponse(erro) && erro.status === 404;
  if (naoEncontrado) return <NaoEncontrado />;
  // Um chunk que já não existe depois de um deploy novo: recarregar resolve.
  return (
    <main id="conteudo" className="flex min-h-screen items-center justify-center bg-background px-4">
      <EmptyState
        frase="Ocorreu um erro ao mostrar esta página."
        accao={
          <div className="flex flex-col items-center gap-2">
            <Button onClick={() => window.location.reload()}>Recarregar</Button>
            <p className="text-xs text-muted-foreground">
              Versão <span className="font-mono">{APP_VERSION}</span>
            </p>
          </div>
        }
      />
    </main>
  );
}
