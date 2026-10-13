import { useSearchParams } from "react-router";

const TAMANHOS = new Set([25, 50, 100]);

function inteiro(v: string | null, omissao: number): number {
  return v !== null && /^\d{1,6}$/.test(v) && Number(v) > 0 ? Number(v) : omissao;
}

/**
 * Página e tamanho no URL (`?pagina=2&tamanho=50`), para o «voltar» do browser
 * e uma ligação partilhada abrirem a mesma página. Só números: nunca dados
 * pessoais no URL (S19).
 */
export function usePaginacaoUrl() {
  const [params, setParams] = useSearchParams();
  const pagina = inteiro(params.get("pagina"), 1);
  const t = inteiro(params.get("tamanho"), 25);
  const tamanho = TAMANHOS.has(t) ? t : 25;
  const mudar = ({ pagina: p, tamanho: n }: { pagina: number; tamanho: number }) => {
    setParams(
      (actual) => {
        const novo = new URLSearchParams(actual);
        if (p > 1) novo.set("pagina", String(p));
        else novo.delete("pagina");
        if (n !== 25) novo.set("tamanho", String(n));
        else novo.delete("tamanho");
        return novo;
      },
      { replace: false },
    );
  };
  return { pagina, tamanho, mudar };
}
