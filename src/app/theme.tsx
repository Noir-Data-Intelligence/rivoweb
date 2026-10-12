/**
 * Tema claro/escuro (§4.1). Provider próprio em vez de `next-themes`, que
 * injecta um script inline e obrigaria a `unsafe-inline` na CSP.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { gravarPrefs, lerPrefs, type Tema } from "@/lib/prefs";

type ContextoTema = {
  readonly tema: Tema;
  readonly escuro: boolean;
  readonly mudarTema: (t: Tema) => void;
};

const Contexto = createContext<ContextoTema | null>(null);

function sistemaEscuro(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => lerPrefs().tema);
  const [escuroSistema, setEscuroSistema] = useState<boolean>(sistemaEscuro);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const f = (e: MediaQueryListEvent) => setEscuroSistema(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const escuro = tema === "escuro" || (tema === "sistema" && escuroSistema);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
  }, [escuro]);

  const mudarTema = useCallback((t: Tema) => {
    gravarPrefs({ tema: t });
    setTema(t);
  }, []);

  const valor = useMemo(() => ({ tema, escuro, mudarTema }), [tema, escuro, mudarTema]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): ContextoTema {
  const c = useContext(Contexto);
  if (!c) throw new Error("useTema fora de ProvedorTema");
  return c;
}
