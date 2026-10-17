/**
 * Salários (§5.9, F8): folhas de pagamento mensais.
 *
 * Factos (`PayrollModuleEndpoints.cs`, `PayrollRun.cs`, `ManagePayrollRuns.cs`):
 * - ler com `payroll.runs.read`, escrever com `payroll.runs.write` (Admin e HR);
 * - quem abre a folha é a conta autenticada, que tem de estar ligada a uma
 *   ficha de colaborador (ADR-057; sem ficha: 400 com o motivo);
 * - Rascunho → Por aprovar (submeter cria o pedido de aprovação; 501 sem motor
 *   de governança) → Aprovada ou Recusada (aplicada por «ver decisão»);
 * - itens só em rascunho; **o IRT, o INSS e o líquido calculam-se no
 *   servidor** ao juntar o item, à data do fim do mês (sem configuração fiscal
 *   em vigor: 400 com o que falta); os subsídios são parte do bruto e não
 *   podem somar mais do que ele;
 * - recibos anexam-se só a itens de uma folha aprovada;
 * - o servidor aceita duas folhas do mesmo mês e o mesmo colaborador duas
 *   vezes na folha, e não há forma de tirar um item (B27, B28): o front avisa.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Folha = S["PayrollRunView"];
export type ItemFolha = S["PayrollItemView"];
export type PedidoItem = S["AddItemRequest"];
export type AnexoItem = S["PayrollItemDocumentView"];

export const chaves = {
  folhas: ["payroll", "runs"] as const,
  folha: (id: string) => ["payroll", "runs", "detail", id] as const,
  anexos: (runId: string, itemId: string) => ["payroll", "runs", "detail", runId, "items", itemId, "documents"] as const,
};

export function useFolhas(p: { pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: [...chaves.folhas, "list", p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/payroll/runs", { params: { query: { page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

/** Todas as folhas (até ao tecto do servidor), para avisar de um mês repetido. */
export const useTodasFolhas = () => useFolhas({ pagina: 1, tamanho: 200 });

export function useFolha(runId: string) {
  return useQuery({ queryKey: chaves.folha(runId), queryFn: ({ signal }) => ler(api.GET("/payroll/runs/{runId}", { params: { path: { runId } }, signal })) });
}

export function useAbrirFolha() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: { year: number; month: number }) => ler(api.POST("/payroll/runs", { body: { ...b, openedByEmployeeId: null } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.folhas }),
  });
}

export function useJuntarItem(runId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoItem) => ler(api.POST("/payroll/runs/{runId}/items", { params: { path: { runId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.folhas }),
  });
}

export function useSubmeterFolha(runId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/payroll/runs/{runId}/submission", { params: { path: { runId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.folhas }),
  });
}

/** Aplica a decisão já tomada em Aprovações; se ainda espera, o estado não muda. */
export function useVerDecisaoFolha(runId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/payroll/runs/{runId}/decision", { params: { path: { runId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.folhas }),
  });
}

export function useAnexosItem(runId: string, itemId: string, activo: boolean) {
  return useQuery({
    queryKey: chaves.anexos(runId, itemId),
    queryFn: ({ signal }) => ler(api.GET("/payroll/runs/{runId}/items/{itemId}/documents", { params: { path: { runId, itemId } }, signal })),
    enabled: activo,
  });
}

export function useAnexarRecibo(runId: string, itemId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["AttachPayrollDocumentRequest"]) => ler(api.POST("/payroll/runs/{runId}/items/{itemId}/documents", { params: { path: { runId, itemId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.anexos(runId, itemId) }),
  });
}
