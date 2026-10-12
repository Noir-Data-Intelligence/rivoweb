import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { marcarSemLigacao } from "@/features/sistema/BarraSemLigacao";
import { eApiError, eTransitorio } from "@/lib/api/problem";

function aoFalhar(erro: unknown): void {
  if (eApiError(erro) && erro.tipo === "rede") marcarSemLigacao(true);
}

/**
 * Cache só em memória (sem persistQueryClient). Repetições só em leituras e só
 * para falhas transitórias (§2, middleware 6). Escritas nunca repetem.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: aoFalhar }),
  mutationCache: new MutationCache({ onError: aoFalhar }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (tentativas, erro) => tentativas < 2 && eTransitorio(erro),
      retryDelay: (tentativa) => Math.min(1000 * 2 ** tentativa, 8000),
    },
    mutations: { retry: false },
  },
});
