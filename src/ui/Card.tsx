import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/** Cartão: borda, sem sombra, 20 px (16 px no telemóvel). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-border bg-card p-4 text-card-foreground md:p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-md font-semibold text-foreground", className)} {...props} />;
}
