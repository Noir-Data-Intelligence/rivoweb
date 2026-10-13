/**
 * Controlos de formulário fora do chunk inicial: o login só precisa de
 * `Input` e `Field`, que ficam em `Field.tsx`.
 */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const CAMPO =
  "w-full rounded-md border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

/** Lista nativa: teclado, leitores de ecrã e telemóvel sem trabalho extra. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalido?: boolean }>(
  function Select({ className, invalido, ...props }, ref) {
    return <select ref={ref} aria-invalid={invalido || undefined} className={cn(CAMPO, "h-9 pointer-coarse:h-11", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalido?: boolean }>(
  function Textarea({ className, invalido, ...props }, ref) {
    return <textarea ref={ref} aria-invalid={invalido || undefined} className={cn(CAMPO, "min-h-20 py-2", className)} {...props} />;
  },
);

/** Caixa de verificação com o rótulo ao lado. */
export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { rotulo: ReactNode; ajuda?: ReactNode }>(
  function Checkbox({ rotulo, ajuda, className, id, ...props }, ref) {
    const gerado = useId();
    const idFinal = id ?? gerado;
    return (
      <div className={cn("flex items-start gap-2", className)}>
        <input
          ref={ref}
          id={idFinal}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-5"
          aria-describedby={ajuda ? `${idFinal}-ajuda` : undefined}
          {...props}
        />
        <div className="text-sm">
          <label htmlFor={idFinal} className="font-medium text-foreground">
            {rotulo}
          </label>
          {ajuda ? (
            <p id={`${idFinal}-ajuda`} className="text-xs text-muted-foreground">
              {ajuda}
            </p>
          ) : null}
        </div>
      </div>
    );
  },
);


