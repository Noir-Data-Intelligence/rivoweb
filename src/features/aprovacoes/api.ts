/**
 * Aprovações (§5.5). Quem decide vem do token (ADR-050); quem submete não
 * decide (BR-2) e quem já interveio não decide outra vez (BR-4).
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Pedido = S["ApprovalStatusView"];
export type Historico = S["ApprovalHistoryView"];
export type Politica = S["PolicyView"];
export type PedidoPolitica = S["CreatePolicyRequest"];
export type Accao = "Approved" | "Rejected" | "ClarificationRequested";
export type ItemChecklist = S["ApprovalChecklistItemView"];
export type RespostaItem = { itemId: string; response: "Compliant" | "NonCompliant" | "NotApplicable" };

export const chaves = {
  todos: ["approval"] as const,
  pedidos: (p: { pagina: number; tamanho: number; tipo: string | null; para: string | null }) => ["approval", "requests", p] as const,
  pedido: (id: string) => ["approval", "requests", "detail", id] as const,
  historico: (id: string) => ["approval", "requests", "detail", id, "history"] as const,
  politicas: ["approval", "policies"] as const,
};

export function usePedidos(p: { pagina: number; tamanho: number; tipo: string | null; para: string | null }, activo = true) {
  return useQuery({
    queryKey: chaves.pedidos(p),
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/approval/requests", {
          params: { query: { page: p.pagina, pageSize: p.tamanho, ...(p.tipo ? { processType: p.tipo } : {}), ...(p.para ? { pendingFor: p.para } : {}) } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function usePedido(id: string, activo = true) {
  return useQuery({ queryKey: chaves.pedido(id), queryFn: ({ signal }) => ler(api.GET("/approval/requests/{requestId}", { params: { path: { requestId: id } }, signal })), enabled: activo });
}

export function useHistorico(id: string) {
  return useQuery({ queryKey: chaves.historico(id), queryFn: ({ signal }) => ler(api.GET("/approval/requests/{requestId}/history", { params: { path: { requestId: id } }, signal })) });
}

/**
 * Decidir. Depois de uma decisão final numa atribuição de cargo, o módulo de
 * RH aplica-a sozinho em até 60 s; quem pode atribuir cargos antecipa-o (B14,
 * idempotente). Os outros módulos aplicam a sua decisão nos seus ecrãs.
 */
export function useDecidir(antecipar: boolean) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: async ({ requestId, action, notes, checklist, emNomeDe }: { requestId: string; action: Accao; notes: string | null; checklist?: RespostaItem[]; emNomeDe?: string | null }) => {
      // Num passo de aprovação o checklist não vai (o servidor recusa-o). Em nome de quem delegou (ADR-129), `onBehalfOfEmployeeId`.
      const corpo = { action, notes, ...(checklist ? { checklist } : {}), ...(emNomeDe ? { onBehalfOfEmployeeId: emNomeDe } : {}) };
      const r = await ler(api.POST("/approval/requests/{requestId}/decisions", { params: { path: { requestId } }, body: corpo }));
      const final = r.status === "Approved" || r.status === "Rejected";
      if (antecipar && final && r.processType === "hr.position_assignment") {
        // Melhor esforço: se falhar, o processo de fundo aplica na mesma.
        await api.POST("/hr/position-assignments/{assignmentId}/approval-outcome", { params: { path: { assignmentId: r.sourceReference } } }).catch(() => undefined);
      }
      return r;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chaves.todos });
      void qc.invalidateQueries({ queryKey: ["dashboard", "me"] });
      void qc.invalidateQueries({ queryKey: ["hr"] });
    },
  });
}

/** Só quem submeteu pode cancelar (K18). */
export function useCancelar() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (requestId: string) => enviar(api.POST("/approval/requests/{requestId}/cancellation", { params: { path: { requestId } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}

export function usePoliticas(activo = true) {
  return useQuery({ queryKey: chaves.politicas, queryFn: ({ signal }) => ler(api.GET("/approval/policies", { signal })), enabled: activo });
}

export function useCriarPolitica() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoPolitica) => ler(api.POST("/approval/policies", { body: b })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.politicas });
      void qc.invalidateQueries({ queryKey: ["settings", "overview"] });
    },
  });
}

export function useDesactivarPolitica() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (policyId: string) => enviar(api.POST("/approval/policies/{policyId}/deactivation", { params: { path: { policyId } } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.politicas });
      void qc.invalidateQueries({ queryKey: ["settings", "overview"] });
    },
  });
}

// Delegações (ADR-129): quem aprova delega num colega por um período, e o colega decide em nome dele.

export type Delegacao = components["schemas"]["ApprovalDelegationView"];
export type NovaDelegacao = components["schemas"]["CreateDelegationRequest"];

const chavesDelegacao = {
  todas: ["approval", "delegations"] as const,
  lista: (todas: boolean) => ["approval", "delegations", todas ? "all" : "mine"] as const,
  candidatos: ["approval", "delegations", "candidates"] as const,
};

/** As minhas (como delegante ou delegado), em vigor ou por começar; `todas` só para quem administra as políticas. */
export function useDelegacoes(todas = false, activo = true) {
  return useQuery({
    queryKey: chavesDelegacao.lista(todas),
    queryFn: ({ signal }) => ler(api.GET("/approval/delegations", { params: { query: todas ? { scope: "all" } : {} }, signal })),
    enabled: activo,
  });
}

/** Os colaboradores activos em quem se pode delegar, sem ler os RH. */
export function useCandidatosDelegacao(activo = true) {
  return useQuery({
    queryKey: chavesDelegacao.candidatos,
    queryFn: ({ signal }) => ler(api.GET("/approval/delegations/candidates", { signal })),
    staleTime: 5 * 60_000,
    enabled: activo,
  });
}

export function useDelegar() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: NovaDelegacao) => ler(api.POST("/approval/delegations", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesDelegacao.todas }),
  });
}

export function useRevogarDelegacao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (id: string) => enviar(api.POST("/approval/delegations/{delegationId}/revocation", { params: { path: { delegationId: id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}
