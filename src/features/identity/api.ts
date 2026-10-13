/**
 * Hooks de identidade. Os ecrãs usam estes hooks e nunca o cliente HTTP
 * directamente (§1.3).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { queryClient } from "@/app/queryClient";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { hojeIso } from "@/lib/format/data";
import { iniciarSessao, obterSessao, obterToken, subscreverSessao, terminarSessaoLocal, type MotivoFim } from "@/lib/auth/session";
import { avisarOutrasAbas } from "./broadcast";

export type Utilizador = components["schemas"]["CurrentUserResponse"];
export type SessaoActiva = components["schemas"]["SessionView"];

export const chaves = {
  me: ["identity", "me"] as const,
  sessoes: ["identity", "me", "sessions"] as const,
  portal: ["portal", "me"] as const,
  portalCliente: ["customer-portal", "me"] as const,
  saude: ["health"] as const,
};

export function useSessao() {
  return useSyncExternalStore(subscreverSessao, obterSessao);
}

export function useMe() {
  const sessao = useSessao();
  return useQuery({
    queryKey: chaves.me,
    queryFn: ({ signal }) => ler(api.GET("/identity/me", { signal })),
    enabled: sessao !== null,
    staleTime: 5 * 60_000,
  });
}

export function useEntrar() {
  return useEscrita({
    mutationFn: async (dados: { email: string; password: string }) => {
      const r = await ler(api.POST("/identity/login", { body: dados }));
      queryClient.clear();
      iniciarSessao(r);
      return r;
    },
  });
}

/**
 * Logout (§7.1). O token é descartado localmente **antes** e
 * independentemente da resposta do servidor (S4).
 */
export function sair(motivo: MotivoFim = "saiu"): void {
  const token = obterToken();
  terminarSessaoLocal(motivo);
  queryClient.clear();
  if (motivo === "saiu") avisarOutrasAbas();
  if (token !== null) {
    void api.POST("/identity/logout", { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
}

export function usePedirRecuperacao() {
  return useEscrita({
    mutationFn: (email: string) => enviar(api.POST("/identity/password-recovery", { body: { email } })),
  });
}

export function useConcluirRecuperacao() {
  return useEscrita({
    mutationFn: (dados: { userId: string; token: string; password: string }) =>
      enviar(api.POST("/identity/password-recovery/completion", { body: dados })),
  });
}

export function useAceitarConvite() {
  return useEscrita({
    mutationFn: (dados: { userId: string; token: string; password: string }) =>
      enviar(api.POST("/identity/invitations/acceptance", { body: dados })),
  });
}

export function useMudarPassword() {
  return useEscrita({
    mutationFn: (dados: { currentPassword: string; newPassword: string }) =>
      enviar(api.POST("/identity/me/password", { body: dados })),
  });
}

export function useSessoesActivas() {
  return useQuery({
    queryKey: chaves.sessoes,
    queryFn: ({ signal }) => ler(api.GET("/identity/me/sessions", { signal })),
  });
}

export function useTerminarSessao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (sessionId: string) =>
      enviar(api.POST("/identity/me/sessions/{sessionId}/revocation", { params: { path: { sessionId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.sessoes }),
  });
}

/** Ficha de colaborador ligada à conta, se existir (shell do colaborador, §3.3). */
export function usePortalColaborador(activo = true) {
  return useQuery({
    queryKey: chaves.portal,
    queryFn: ({ signal }) => ler(api.GET("/portal/me", { signal })),
    enabled: activo,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

/** Resumo do cliente no mês corrente (Africa/Luanda); confirma a associação conta → cliente. */
export function usePortalCliente(activo = true) {
  const hoje = hojeIso();
  const inicioMes = `${hoje.slice(0, 8)}01`;
  return useQuery({
    queryKey: [...chaves.portalCliente, inicioMes, hoje],
    queryFn: ({ signal }) => ler(api.GET("/customer-portal/me", { params: { query: { from: inicioMes, to: hoje } }, signal })),
    enabled: activo,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
