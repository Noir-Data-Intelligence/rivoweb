import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Indicador (IV §7): rótulo, valor em números tabulares e, se houver, uma
 * linha de contexto. Sem cor a carregar significado sozinha.
 */
export function Kpi({ rotulo, valor, detalhe, className }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-card border border-l-2 border-border border-l-[var(--marca-destaque)] bg-card p-4", className)}>
      <p className="truncate text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">{rotulo}</p>
      <p className="mt-1.5 truncate text-xl font-bold tabular-nums text-foreground">{valor}</p>
      {detalhe ? <p className="mt-1 truncate text-xs text-muted-foreground">{detalhe}</p> : null}
    </div>
  );
}

/** Grelha de KPIs: no máximo 4 por linha (IV §7). */
export function GrelhaKpis({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
