/**
 * Administração de acesso e configurações (§5.1). Os ecrãs usam estes hooks e
 * nunca o cliente HTTP directamente (§1.3).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { eApiError } from "@/lib/api/problem";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type ResumoUtilizador = S["UserSummary"];
export type PerfilDeAcesso = S["AccessProfileView"];
export type Governacao = S["AdministrationOverview"];
export type DadosEmpresa = S["TaxEntityProfileView"];
export type PedidoDadosEmpresa = S["TaxEntityRequest"];

export const chaves = {
  utilizadores: ["identity", "users"] as const,
  perfis: ["identity", "roles"] as const,
  governacao: ["settings", "overview"] as const,
  empresa: ["fiscal", "tax-entity"] as const,
};

/** Lista completa: a rota não pagina (B7); a tabela pagina e ordena no cliente. */
export function useUtilizadores(activo = true) {
  return useQuery({
    queryKey: chaves.utilizadores,
    queryFn: ({ signal }) => ler(api.GET("/identity/users", { signal })),
    enabled: activo,
  });
}

/** Perfis atribuíveis. O backend nunca devolve SuperAdmin aqui (ADR-058). */
export function usePerfis(activo = true) {
  return useQuery({
    queryKey: chaves.perfis,
    queryFn: ({ signal }) => ler(api.GET("/identity/roles", { signal })),
    enabled: activo,
    staleTime: 10 * 60_000,
  });
}

export function useConvidar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { email: string; profile: string }) => ler(api.POST("/identity/invitations", { body: dados })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.utilizadores }),
  });
}

export function useMudarEstadoConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, active, reason }: { userId: string; active: boolean; reason: string }) =>
      enviar(api.POST("/identity/users/{userId}/status", { params: { path: { userId } }, body: { active, reason } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.utilizadores }),
  });
}

export function useAtribuirPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, profile }: { userId: string; profile: string }) =>
      enviar(api.POST("/identity/users/{userId}/roles", { params: { path: { userId } }, body: { profile } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.utilizadores }),
  });
}

/** Retirar um perfil termina as sessões da pessoa (ADR-070). */
export function useRetirarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, profile }: { userId: string; profile: string }) =>
      enviar(api.POST("/identity/users/{userId}/roles/{profile}/removal", { params: { path: { userId, profile } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.utilizadores }),
  });
}

/** Reposição por um administrador: termina todas as sessões da pessoa (ADR-059/065). */
export function useReporPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      enviar(api.POST("/identity/users/{userId}/password-reset", { params: { path: { userId } }, body: { newPassword } })),
  });
}

/** O caminho por omissão: a própria pessoa recebe a ligação e define a password. */
export function useEnviarLigacaoRecuperacao() {
  return useMutation({
    mutationFn: (email: string) => enviar(api.POST("/identity/password-recovery", { body: { email } })),
  });
}

export function useGovernacao(activo = true) {
  return useQuery({
    queryKey: chaves.governacao,
    queryFn: ({ signal }) => ler(api.GET("/settings/overview", { signal })),
    enabled: activo,
  });
}

/** `null` quando a empresa ainda não declarou os dados (404). */
export function useDadosEmpresa(activo = true) {
  return useQuery({
    queryKey: chaves.empresa,
    queryFn: async ({ signal }): Promise<DadosEmpresa | null> => {
      try {
        return await ler(api.GET("/fiscal/tax-entity", { signal }));
      } catch (e) {
        if (eApiError(e) && e.status === 404) return null;
        throw e;
      }
    },
    enabled: activo,
  });
}

export function useGuardarDadosEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: PedidoDadosEmpresa) => ler(api.PUT("/fiscal/tax-entity", { body: dados })),
    onSuccess: (r) => qc.setQueryData(chaves.empresa, r),
  });
}

export function useTestarCorreio() {
  return useMutation({
    mutationFn: () => ler(api.POST("/debug/email/test")),
  });
}
