import type { ReactNode } from "react";
import { cn } from "./cn";

const TONS = {
  neutro: "bg-muted text-muted-foreground",
  sucesso: "bg-success-soft text-success",
  aviso: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  erro: "bg-danger-soft text-danger",
} as const;

export type TomBadge = keyof typeof TONS;

/** Estado curto. O texto diz o estado; a cor só reforça (WCAG 1.4.1). */
export function Badge({ tom = "neutro", children, className }: { tom?: TomBadge; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONS[tom], className)}>
      {children}
    </span>
  );
}
