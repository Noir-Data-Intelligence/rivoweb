/**
 * Notificações (§5.3). Sem tempo real (B11): o sino actualiza por polling de
 * 60 s, só com o documento visível e interacção nos últimos 5 min.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { podeFazerPolling } from "@/lib/auth/actividade";

type S = components["schemas"];
export type Notificacao = S["NotificationView"];
export type PreferenciasNotificacao = S["NotificationPreferencesView"];

export const INTERVALO_POLLING_MS = 60_000;

export const chaves = {
  todas: ["notifications"] as const,
  porLer: ["notifications", "unread-count"] as const,
  lista: (p: { pagina: number; tamanho: number; soPorLer: boolean }) => ["notifications", "list", p.pagina, p.tamanho, p.soPorLer] as const,
  preferencias: ["notifications", "preferences"] as const,
};

/** Contagem por ler: uma página de 1 e o total do cabeçalho `X-Total-Count`. */
export function useContagemPorLer() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: chaves.porLer,
    queryFn: async ({ signal }) => (await lerPagina(api.GET("/notifications/me", { params: { query: { unreadOnly: true, page: 1, pageSize: 1 } }, signal }))).total,
    staleTime: INTERVALO_POLLING_MS,
  });
  useEffect(() => {
    const talvez = () => {
      if (podeFazerPolling(document.visibilityState === "visible")) void qc.invalidateQueries({ queryKey: chaves.porLer });
    };
    const id = window.setInterval(talvez, INTERVALO_POLLING_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") talvez();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [qc]);
  return q;
}

export function useNotificacoes(p: { pagina: number; tamanho: number; soPorLer: boolean }) {
  return useQuery({
    queryKey: chaves.lista(p),
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/notifications/me", { params: { query: { unreadOnly: p.soPorLer, page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useMarcarLida() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (notificationId: string) => enviar(api.POST("/notifications/{notificationId}/read", { params: { path: { notificationId } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todas }),
  });
}

export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/notifications/read-all")),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chaves.todas });
      void qc.invalidateQueries({ queryKey: ["dashboard", "me"] });
    },
  });
}

export function usePreferencias() {
  return useQuery({
    queryKey: chaves.preferencias,
    queryFn: ({ signal }) => ler(api.GET("/notifications/me/preferences", { signal })),
  });
}

export function useGuardarPreferencias() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (emailEnabled: boolean) => enviar(api.PUT("/notifications/me/preferences", { body: { emailEnabled } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.preferencias }),
  });
}
