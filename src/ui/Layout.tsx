import type { ReactNode } from "react";
import { cn } from "./cn";

export function PageHeader({ titulo, descricao, accao }: { titulo: string; descricao?: ReactNode; accao?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{titulo}</h1>
        {descricao ? <p className="mt-1 text-sm text-muted-foreground">{descricao}</p> : null}
      </div>
      {accao ? <div className="shrink-0">{accao}</div> : null}
    </header>
  );
}

/** Estado vazio: símbolo mono a 10 %, uma frase, uma acção (IV §5). */
export function EmptyState({ frase, accao, className }: { frase: string; accao?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4 px-4 py-12 text-center", className)}>
      <img src="/logo/rivo-simbolo-mono-tinta.svg" alt="" className="size-14 opacity-10 dark:hidden" />
      <img src="/logo/rivo-simbolo-mono-branco.svg" alt="" className="hidden size-14 opacity-10 dark:block" />
      <p className="max-w-sm text-base text-muted-foreground">{frase}</p>
      {accao}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function Logo({ className, comNome = true }: { className?: string | undefined; comNome?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src="/logo/rivo-simbolo.svg" alt="" className="size-7 dark:hidden" />
      <img src="/logo/rivo-simbolo-escuro.svg" alt="" className="hidden size-7 dark:block" />
      {comNome ? <span className="text-md font-semibold tracking-tight text-foreground">Rivo</span> : <span className="sr-only">Rivo</span>}
    </span>
  );
}

/** Carregamento de página inteira (arranque, troca de rota preguiçosa). */
export function CarregandoPagina({ texto = "A carregar…" }: { texto?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="text-sm text-muted-foreground">{texto}</span>
    </div>
  );
}
