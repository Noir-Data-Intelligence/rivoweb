import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  titulo,
  descricao,
  children,
  fecharVisivel = true,
  className,
  ...props
}: {
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
  fecharVisivel?: boolean;
  className?: string | undefined;
} & Omit<D.DialogContentProps, "title">) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
      <D.Content
        className={cn(
          // Nunca mais alto que o ecrã: o que não cabe desliza, e o botão de confirmar fica sempre alcançável.
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          "rounded-card border border-border bg-popover p-5 text-popover-foreground shadow-md focus:outline-none",
          className,
        )}
        {...props}
      >
        <D.Title className="pr-8 text-md font-semibold">{titulo}</D.Title>
        {descricao ? <D.Description className="mt-1.5 text-sm text-muted-foreground">{descricao}</D.Description> : null}
        <div className="mt-4">{children}</div>
        {fecharVisivel ? (
          <D.Close
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </D.Close>
        ) : null}
      </D.Content>
    </D.Portal>
  );
}
