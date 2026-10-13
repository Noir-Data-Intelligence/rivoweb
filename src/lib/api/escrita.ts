/**
 * Escrita que nunca sai duas vezes (§2.4, S21). `isPending` só muda depois de
 * o React voltar a desenhar, e um clique duplo dispara os dois cliques antes
 * disso: num documento fiscal, seriam dois documentos. Aqui, um trinco
 * síncrono ignora qualquer `mutate` enquanto o anterior não terminou.
 *
 * Provado no e2e: clique duplo em «Emitir documento» com a rede lenta fazia
 * dois `POST …/issue`.
 */
import { useMutation, type DefaultError, type MutateOptions, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

export function useEscrita<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
  opcoes: UseMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const m = useMutation(opcoes);
  const emCurso = useRef(false);
  const { mutate: mutar } = m;
  const mutate = useCallback<typeof mutar>(
    (...args) => {
      if (emCurso.current) return;
      emCurso.current = true;
      const [variaveis, o] = args as [TVariables, MutateOptions<TData, TError, TVariables, TContext> | undefined];
      const opcoesComTrinco: MutateOptions<TData, TError, TVariables, TContext> = {
        ...o,
        onSettled: (...a) => {
          emCurso.current = false;
          o?.onSettled?.(...a);
        },
      };
      mutar(...([variaveis, opcoesComTrinco] as Parameters<typeof mutar>));
    },
    [mutar],
  );
  return { ...m, mutate };
}
