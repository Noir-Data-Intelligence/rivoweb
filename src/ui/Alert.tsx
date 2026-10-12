import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

const TONS = {
  info: { classe: "bg-info-soft text-info", Icone: Info },
  sucesso: { classe: "bg-success-soft text-success", Icone: CheckCircle2 },
  aviso: { classe: "bg-warning-soft text-warning", Icone: AlertTriangle },
  erro: { classe: "bg-danger-soft text-danger", Icone: XCircle },
} as const;

/** Mensagem em linha. Nunca depende só da cor: tem ícone e texto (WCAG 1.4.1). */
export function Alert({
  tom = "info",
  titulo,
  children,
  accao,
  className,
}: {
  tom?: keyof typeof TONS;
  titulo?: string | undefined;
  children?: ReactNode;
  accao?: ReactNode;
  className?: string | undefined;
}) {
  const { classe, Icone } = TONS[tom];
  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md px-3 py-2.5 text-sm", classe, className)}
    >
      <Icone className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1 text-foreground">
        {titulo ? <p className="font-medium">{titulo}</p> : null}
        {children ? <div className={titulo ? "mt-0.5 text-muted-foreground" : ""}>{children}</div> : null}
      </div>
      {accao ? <div className="shrink-0">{accao}</div> : null}
    </div>
  );
}
