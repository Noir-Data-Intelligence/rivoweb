/**
 * «Ir para…» no cabeçalho (Ctrl/⌘ K): procura entre as páginas do menu que a
 * conta pode abrir. Não procura dados nem pede nada ao servidor.
 */
import * as D from "@radix-ui/react-dialog";
import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router";
import { useUtilizador } from "@/features/identity/utilizador";
import type { Shell } from "@/lib/auth/permissions";
import { cn } from "@/ui/cn";
import { MENU, type EntradaMenu } from "./rotas";

const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function filtrarPaginas(entradas: readonly EntradaMenu[], texto: string): EntradaMenu[] {
  const t = normalizar(texto.trim());
  if (t === "") return [...entradas];
  return entradas.filter((e) => normalizar(`${e.titulo} ${e.grupo ?? ""}`).includes(t));
}

const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function ProcurarPagina({ shell }: { shell: Shell }) {
  const { pode } = useUtilizador();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(0);
  const idLista = useId();
  const paginas = filtrarPaginas(
    MENU[shell].filter((e) => pode(e.requer)),
    texto,
  );

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto(true);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  const mudarAberto = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setTexto("");
      setActivo(0);
    }
  };
  const ir = (e: EntradaMenu | undefined) => {
    if (!e) return;
    mudarAberto(false);
    void navigate(e.caminho);
  };

  return (
    <D.Root open={aberto} onOpenChange={mudarAberto}>
      <D.Trigger asChild>
        <button
          type="button"
          className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-secondary/60 px-3 text-sm text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Ir para uma página"
        >
          <Search className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="truncate">Ir para…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-card px-1.5 font-sans text-[0.6875rem] sm:inline">{MAC ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-foreground/40" />
        <D.Content className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-card border border-border bg-popover text-popover-foreground shadow-lg focus:outline-none">
          <D.Title className="sr-only">Ir para uma página</D.Title>
          <D.Description className="sr-only">Escreva parte do nome da página e carregue em Enter.</D.Description>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={idLista}
              aria-activedescendant={paginas[activo] ? `${idLista}-${String(activo)}` : undefined}
              aria-label="Nome da página"
              className="h-11 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-subtle"
              placeholder="Procurar página…"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setActivo(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActivo((a) => Math.min(a + 1, paginas.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActivo((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  ir(paginas[activo]);
                }
              }}
            />
          </div>
          <ul id={idLista} role="listbox" aria-label="Páginas" className="max-h-80 overflow-y-auto p-1">
            {paginas.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma página com esse nome.</li>
            ) : (
              paginas.map((e, i) => (
                <li
                  key={e.caminho}
                  id={`${idLista}-${String(i)}`}
                  role="option"
                  aria-selected={i === activo}
                  className={cn("flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm", i === activo && "bg-[var(--marca-destaque-suave)] text-[var(--marca-destaque)]")}
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => ir(e)}
                >
                  <e.icone className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="truncate font-medium">{e.titulo}</span>
                  {e.grupo ? <span className="truncate text-xs text-muted-foreground">{e.grupo}</span> : null}
                  {i === activo ? <CornerDownLeft className="ml-auto size-3.5 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
                </li>
              ))
            )}
          </ul>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
