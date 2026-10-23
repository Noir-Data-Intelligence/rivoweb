import type { ReactNode } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { API_DISPONIVEL } from "@/lib/env";
import { Alert } from "@/ui/Alert";

/** Texto em gradiente da marca (tema da entrada). */
const GRADIENTE_TEXTO = "bg-[image:var(--entrada-gradiente)] bg-clip-text text-transparent";

/** Painel da marca, à esquerda em ecrãs largos; decorativo, sem acções. */
function PainelMarca({ destaque }: { destaque?: ReactNode }) {
  return (
    <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--entrada-painel)] p-12 text-[var(--entrada-painel-texto)] lg:flex">
      <div aria-hidden className="pointer-events-none absolute left-1/4 top-1/4 size-96 rounded-full bg-[var(--entrada-brilho-1)] blur-[64px]" />
      <div aria-hidden className="pointer-events-none absolute left-[37.5%] top-[30%] size-72 rounded-full bg-[var(--entrada-brilho-2)] blur-[64px]" />
      {/* Painel sempre escuro: a versão colorida para fundo escuro. */}
      <span className="relative inline-flex items-center gap-2">
        <img src="/logo/rivo-simbolo-escuro.svg" alt="" className="size-8" />
        <span className="text-xl font-semibold tracking-tight">Rivo</span>
      </span>
      <div className="relative">
        {destaque ?? (
          <>
            <p className="text-5xl font-bold leading-none tracking-[-0.025em]">
              Your Business.
              <br />
              <span className={GRADIENTE_TEXTO}>Under Control.</span>
            </p>
            <p className="mt-6 max-w-md text-lg text-[var(--entrada-painel-suave)]">Finanças, Recursos Humanos e Operações unificados num único sistema empresarial.</p>
          </>
        )}
      </div>
      <p className="relative inline-flex items-center gap-2 text-xs text-[var(--entrada-painel-suave)]">
        <Lock className="size-3.5" strokeWidth={1.75} aria-hidden />
        Sessão encriptada · Acesso seguro
      </p>
    </aside>
  );
}

/** Ecrãs públicos (entrar, convite, recuperação). A marca aparece aqui, não nos dados. */
export function LayoutPublico({ titulo, descricao, children, destaque, comEscudo = true }: { titulo: string; descricao?: ReactNode; children: ReactNode; destaque?: ReactNode; comEscudo?: boolean }) {
  return (
    <div className="flex min-h-screen bg-[var(--entrada-fundo)]">
      <PainelMarca destaque={destaque} />
      <main id="conteudo" className="flex flex-1 flex-col items-center justify-start px-4 py-10 sm:justify-center">
        <div className="w-full max-w-md">
          <span className="mb-10 inline-flex items-center gap-2 lg:hidden">
            <img src="/logo/rivo-simbolo.svg" alt="" className="size-7 dark:hidden" />
            <img src="/logo/rivo-simbolo-escuro.svg" alt="" className="hidden size-7 dark:block" />
            <span className="text-md font-semibold tracking-tight text-foreground">Rivo</span>
          </span>
          <div className="mb-8">
            <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-foreground">
              {comEscudo ? <ShieldCheck className="size-5 text-[var(--entrada-destaque)]" strokeWidth={1.75} aria-hidden /> : null}
              {titulo}
            </h1>
            <div aria-hidden className="mt-2 h-0.5 w-12 rounded-full bg-[image:var(--entrada-gradiente)]" />
            {descricao ? <p className="mt-3 text-sm text-muted-foreground">{descricao}</p> : null}
          </div>
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

/** Rótulos em maiúsculas pequenas, como no tema (aplicar no formulário). */
export const ROTULOS_ENTRADA = "[&_label]:text-xs [&_label]:font-medium [&_label]:uppercase [&_label]:tracking-[0.05em] [&_label]:text-muted-foreground";

/** Botão principal em gradiente da marca. */
export const BOTAO_ENTRADA = "h-11 w-full bg-[image:var(--entrada-gradiente)] font-semibold text-white hover:opacity-90";

/** Campos do tema: mais altos e com o anel no destaque. */
export const CAMPO_ENTRADA = "h-10 rounded-lg focus-visible:ring-[var(--entrada-destaque)]";

/** Ligações do tema. */
export const LIGACAO_ENTRADA = "text-[var(--entrada-destaque)] underline-offset-4 hover:underline";
