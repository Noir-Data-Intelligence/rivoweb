import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalido?: boolean }>(
  function Input({ className, invalido, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalido || undefined}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-subtle",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-60 pointer-coarse:h-11",
          "aria-[invalid=true]:border-danger",
          className,
        )}
        {...props}
      />
    );
  },
);

type FieldProps = {
  rotulo: string;
  erro?: string | undefined;
  ajuda?: ReactNode;
  children: (ids: { id: string; descricao: string | undefined; invalido: boolean }) => ReactNode;
  className?: string | undefined;
};

/** Rótulo por cima, ajuda e erro por baixo, ligados por `aria-describedby` (IV §4.2). */
export function Field({ rotulo, erro, ajuda, children, className }: FieldProps) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descricao = [ajuda ? idAjuda : null, erro ? idErro : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {rotulo}
      </label>
      {children({ id, descricao, invalido: Boolean(erro) })}
      {ajuda ? (
        <div id={idAjuda} className="text-xs text-muted-foreground">
          {ajuda}
        </div>
      ) : null}
      {erro ? (
        <p id={idErro} className="text-xs text-danger" role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
