import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

const estilos = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variante: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-card text-foreground hover:bg-secondary",
        ghost: "text-foreground hover:bg-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      tamanho: {
        md: "h-9 px-4 text-base pointer-coarse:h-11",
        sm: "h-8 px-3 text-sm pointer-coarse:h-11",
        lg: "h-10 px-5 text-base pointer-coarse:h-11",
        icone: "size-9 pointer-coarse:size-11",
      },
    },
    defaultVariants: { variante: "primary", tamanho: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof estilos> & {
    asChild?: boolean;
    /** Pedido em curso: bloqueia o botão e anuncia `aria-busy` (S21). */
    aCarregar?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variante, tamanho, asChild = false, aCarregar = false, disabled, children, type, ...props },
  ref,
) {
  if (asChild) {
    return (
      <Slot ref={ref} className={cn(estilos({ variante, tamanho }), className)} {...props}>
        {children}
      </Slot>
    );
  }
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(estilos({ variante, tamanho }), className)}
      disabled={disabled === true || aCarregar}
      aria-busy={aCarregar || undefined}
      {...props}
    >
      {aCarregar ? <Loader2 className="animate-spin" aria-hidden strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
});
