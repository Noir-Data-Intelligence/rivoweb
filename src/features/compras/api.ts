/**
 * Compras (§5.10, F9): requisições, ordens de compra e recepções.
 *
 * Factos (`ProcurementModuleEndpoints.cs`, `PurchaseRequisition.cs`,
 * `PurchaseOrder.cs`, `GoodsReceipt.cs`, `Manage*.cs`):
 * - requisição: o requisitante é a conta (ligada a uma ficha); justificação,
 *   moeda e linhas (quantidade positiva, preço estimado ≥ 0, zero é «por
 *   cotar»); rascunho → submeter (202, vai a aprovação) → aprovada ou recusada
 *   (aplicada por «ver decisão»); cancela-se só em rascunho ou por aprovar,
 *   com motivo; nunca se apaga;
 * - ordem: só de uma requisição aprovada, a um fornecedor activo, na moeda da
 *   requisição, sem passar o aprovado (descontado o já encomendado); a entrega
 *   esperada não é antes da emissão; cancela-se com motivo e só sem
 *   mercadoria recebida;
 * - recepção: contra uma ordem emitida, por quem recebe (a conta); uma
 *   contagem por linha, positiva e sem passar o que falta; anula-se com motivo;
 * - as vistas trazem os nomes (requisitante, departamento, quem recebeu) e as
 *   linhas pela ordem em que foram escritas (B29, B30); o departamento escolhe-se
 *   em `/procurement/lookups`, sem as permissões de RH.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Requisicao = S["RequisitionView"];
export type OrdemCompra = S["PurchaseOrderView"];
export type Recepcao = S["GoodsReceiptView"];
export type FornecedorCompras = S["SupplierReference"];

type Pag = { pagina: number; tamanho: number };

export const chaves = {
  requisicoes: ["procurement", "requisitions"] as const,
  ordens: ["procurement", "orders"] as const,
  recepcoes: ["procurement", "receipts"] as const,
  fornecedores: ["procurement", "suppliers"] as const,
};

const invalidarTudo = (qc: ReturnType<typeof useQueryClient>) =>
  Promise.all([qc.invalidateQueries({ queryKey: chaves.requisicoes }), qc.invalidateQueries({ queryKey: chaves.ordens }), qc.invalidateQueries({ queryKey: chaves.recepcoes })]);

// --- Requisições

export function useRequisicoes(p: Pag & { estado: string | null; requisitante: string | null }) {
  return useQuery({
    queryKey: [...chaves.requisicoes, "list", p.estado, p.requisitante, p.pagina, p.tamanho],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/procurement/requisitions", {
          params: { query: { ...(p.estado ? { status: p.estado } : {}), ...(p.requisitante ? { requestedByEmployeeId: p.requisitante } : {}), page: p.pagina, pageSize: p.tamanho } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useRequisicao(id: string) {
  return useQuery({
    queryKey: [...chaves.requisicoes, "detail", id],
    queryFn: ({ signal }) => ler(api.GET("/procurement/requisitions/{requisitionId}", { params: { path: { requisitionId: id } }, signal })),
  });
}

export function useAbrirRequisicao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: Omit<S["OpenRequisitionRequest"], "requestedByEmployeeId">) => ler(api.POST("/procurement/requisitions", { body: { ...b, requestedByEmployeeId: null } })),
    onSuccess: () => invalidarTudo(qc),
  });
}

export function useSubmeterRequisicao(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/procurement/requisitions/{requisitionId}/submission", { params: { path: { requisitionId: id } } })),
    onSuccess: () => invalidarTudo(qc),
  });
}

export function useVerDecisaoRequisicao(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/procurement/requisitions/{requisitionId}/approval-outcome", { params: { path: { requisitionId: id } } })),
    onSuccess: () => invalidarTudo(qc),
  });
}

export function useCancelarRequisicao(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (reason: string) => enviar(api.POST("/procurement/requisitions/{requisitionId}/cancellation", { params: { path: { requisitionId: id } }, body: { reason } })),
    onSuccess: () => invalidarTudo(qc),
  });
}

/** Departamentos para escolher na requisição (B29). Só com `procurement.requisitions.write`. */
export function useEscolhasCompras(activo: boolean) {
  return useQuery({ queryKey: ["procurement", "lookups"], queryFn: ({ signal }) => ler(api.GET("/procurement/lookups", { signal })), enabled: activo, staleTime: 60_000 });
}

// --- Ordens de compra

export function useOrdens(p: Pag & { requisicao: string | null; fornecedor: string | null }, activo = true) {
  return useQuery({
    queryKey: [...chaves.ordens, "list", p.requisicao, p.fornecedor, p.pagina, p.tamanho],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/procurement/orders", {
          params: { query: { ...(p.requisicao ? { requisitionId: p.requisicao } : {}), ...(p.fornecedor ? { supplierId: p.fornecedor } : {}), page: p.pagina, pageSize: p.tamanho } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useOrdem(id: string) {
  return useQuery({
    queryKey: [...chaves.ordens, "detail", id],
    queryFn: ({ signal }) => ler(api.GET("/procurement/orders/{purchaseOrderId}", { params: { path: { purchaseOrderId: id } }, signal })),
  });
}

export function useEmitirOrdem(requisicaoId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["IssuePurchaseOrderRequest"]) => ler(api.POST("/procurement/requisitions/{requisitionId}/orders", { params: { path: { requisitionId: requisicaoId } }, body: b })),
    onSuccess: () => invalidarTudo(qc),
  });
}

export function useCancelarOrdem(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (reason: string) => enviar(api.POST("/procurement/orders/{purchaseOrderId}/cancellation", { params: { path: { purchaseOrderId: id } }, body: { reason } })),
    onSuccess: () => invalidarTudo(qc),
  });
}

/** Fornecedores activos, para escolher na ordem (lista de apoio, até ao tecto do servidor). */
export function useFornecedoresActivos(activo: boolean) {
  return useQuery({
    queryKey: [...chaves.fornecedores, "activos"],
    queryFn: ({ signal }) => lerPagina(api.GET("/procurement/suppliers", { params: { query: { includeInactive: false, page: 1, pageSize: 200 } }, signal })),
    enabled: activo,
  });
}

// --- Recepções

export function useRecepcoes(p: Pag & { ordem: string | null }, activo = true) {
  return useQuery({
    queryKey: [...chaves.recepcoes, "list", p.ordem, p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/procurement/receipts", { params: { query: { ...(p.ordem ? { purchaseOrderId: p.ordem } : {}), page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useRegistarRecepcao(ordemId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: Omit<S["RegisterGoodsReceiptRequest"], "receivedByEmployeeId">) =>
      ler(api.POST("/procurement/orders/{purchaseOrderId}/receipts", { params: { path: { purchaseOrderId: ordemId } }, body: { ...b, receivedByEmployeeId: null } })),
    onSuccess: () => invalidarTudo(qc),
  });
}

export function useAnularRecepcao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => enviar(api.POST("/procurement/receipts/{goodsReceiptId}/cancellation", { params: { path: { goodsReceiptId: id } }, body: { reason } })),
    onSuccess: () => invalidarTudo(qc),
  });
}
