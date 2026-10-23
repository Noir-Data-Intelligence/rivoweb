import { ArrowLeft, Home } from "lucide-react";
import { isRouteErrorResponse, Link, useLocation, useNavigate, useRouteError } from "react-router";
import { LayoutPublico } from "@/features/identity/components/LayoutPublico";
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

/** 404 no desenho dos ecrãs públicos (painel da marca com «404» e o formulário ao lado). */
export function NaoEncontrado() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <LayoutPublico
      titulo="Página não encontrada"
      comEscudo={false}
      descricao={
        <>
          Esta página não existe. O endereço <code className="break-all rounded bg-muted px-1 font-mono text-xs">{pathname}</code> não existe ou foi removido.
        </>
      }
      destaque={
        <>
          <p className="text-6xl font-bold leading-none tracking-tight">
            4<span className="bg-[image:var(--marca-gradiente-rivo)] bg-clip-text text-transparent">0</span>4
          </p>
          <p className="mt-6 max-w-md text-lg text-[var(--entrada-painel-suave)]">A página que procura não foi encontrada ou foi movida.</p>
        </>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild tamanho="lg" className="bg-[image:var(--marca-gradiente-rivo)] text-white hover:opacity-90">
          <Link to="/">
            <Home strokeWidth={1.75} aria-hidden />
            Ir para o início
          </Link>
        </Button>
        <Button tamanho="lg" variante="secondary" onClick={() => void navigate(-1)}>
          <ArrowLeft strokeWidth={1.75} aria-hidden />
          Voltar
        </Button>
      </div>
    </LayoutPublico>
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
