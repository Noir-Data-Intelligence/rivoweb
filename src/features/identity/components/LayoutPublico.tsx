import type { ReactNode } from "react";
import { API_DISPONIVEL } from "@/lib/env";
import { Alert } from "@/ui/Alert";
import { Logo } from "@/ui/Layout";

/** Ecrãs públicos (entrar, convite, recuperação). A marca aparece aqui, não nos dados. */
export function LayoutPublico({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="h-1 w-full bg-marca-gradiente" aria-hidden />
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <div className="w-full max-w-sm">
          <Logo className="mb-8" />
          <h1 className="mb-6 text-lg font-semibold text-foreground">{titulo}</h1>
          {!API_DISPONIVEL ? (
            <Alert tom="aviso" titulo="Pré-visualização sem ligação à API" className="mb-4">
              Esta versão serve para rever o aspecto. Não é possível entrar.
            </Alert>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
