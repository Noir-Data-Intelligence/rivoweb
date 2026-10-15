/**
 * Contas a pagar (§5.6): fornecedores, facturas de compra e pedidos de
 * pagamento. Pedir e executar são permissões diferentes (BR-3): quem pede não
 * executa, e o servidor confirma com 403.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerComVersao, lerPagina, seVersao } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Fornecedor = S["SupplierReference"];
export type PedidoNovoFornecedor = S["RegisterSupplierRequest"];
export type PedidoCorrigirFornecedor = S["UpdateSupplierRequest"];
export type FacturaCompra = S["PurchaseInvoiceView"];
export type PedidoNovaFacturaCompra = S["RegisterPurchaseInvoiceRequest"];
export type ConfrontoFactura = S["PurchaseInvoiceMatchView"];
export type PedidoPagamento = S["PaymentRequestView"];
export type PedidoNovoPedidoPagamento = S["CreatePaymentRequestRequest"];
export type AnexoPedido = S["PaymentRequestDocumentView"];

export const MAXIMO_POR_PAGINA = 200;

export const chaves = {
  fornecedores: ["procurement", "suppliers"] as const,
  listaFornecedores: (p: { pagina: number; tamanho: number; inactivos: boolean }) => ["procurement", "suppliers", "list", p.pagina, p.tamanho, p.inactivos] as const,
  fornecedor: (id: string) => ["procurement", "suppliers", "detail", id] as const,
  facturas: ["finance", "purchase-invoices"] as const,
  listaFacturas: (p: { pagina: number; tamanho: number; venceAte: string | null }) => ["finance", "purchase-invoices", "list", p.pagina, p.tamanho, p.venceAte] as const,
  factura: (id: string) => ["finance", "purchase-invoices", "detail", id] as const,
  confronto: (id: string) => ["finance", "purchase-invoices", "detail", id, "match"] as const,
  pedidos: ["finance", "payment-requests"] as const,
  listaPedidos: (p: { pagina: number; tamanho: number; factura: string | null }) => ["finance", "payment-requests", "list", p.pagina, p.tamanho, p.factura] as const,
  pedido: (id: string) => ["finance", "payment-requests", "detail", id] as const,
  anexos: (id: string) => ["finance", "payment-requests", "detail", id, "documents"] as const,
};

// Fornecedores

export function useFornecedores(p: { pagina: number; tamanho: number; inactivos: boolean }, activo = true) {
  return useQuery({
    queryKey: chaves.listaFornecedores(p),
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/procurement/suppliers", { params: { query: { includeInactive: p.inactivos, page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Lista de apoio (escolher o fornecedor de uma factura): só activos, até ao tecto do servidor. */
export const useFornecedoresActivos = (activo = true) => useFornecedores({ pagina: 1, tamanho: MAXIMO_POR_PAGINA, inactivos: false }, activo);

export function useFornecedor(id: string) {
  return useQuery({
    queryKey: chaves.fornecedor(id),
    queryFn: ({ signal }) => lerComVersao(api.GET("/procurement/suppliers/{supplierId}", { params: { path: { supplierId: id } }, signal })),
  });
}

export function useRegistarFornecedor() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoNovoFornecedor) => ler(api.POST("/procurement/suppliers", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.fornecedores }),
  });
}

export function useCorrigirFornecedor(id: string, versao: string | null) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoCorrigirFornecedor) =>
      enviar(api.POST("/procurement/suppliers/{supplierId}/details", { params: { path: { supplierId: id } }, headers: seVersao(versao), body: b })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.fornecedores }),
  });
}

export function useEstadoFornecedor(id: string, versao: string | null) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (active: boolean) =>
      enviar(api.POST("/procurement/suppliers/{supplierId}/status", { params: { path: { supplierId: id } }, headers: seVersao(versao), body: { active } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.fornecedores }),
  });
}

/** Importação CSV (colunas Nome e NIF obrigatórias; IBAN, Email, Telefone opcionais). Multipart, campo `file`. */
export function useImportarFornecedores() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: async (ficheiro: File) => {
      const corpo = new FormData();
      corpo.append("file", ficheiro, ficheiro.name);
      return ler(api.POST("/settings/import/suppliers", { body: corpo as never, bodySerializer: (b: unknown) => b as FormData }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.fornecedores }),
  });
}

// Facturas de compra

export function useFacturasCompra(p: { pagina: number; tamanho: number; venceAte: string | null }) {
  return useQuery({
    queryKey: chaves.listaFacturas(p),
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/finance/purchase-invoices", { params: { query: { ...(p.venceAte ? { dueBefore: p.venceAte } : {}), page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useFacturaCompra(id: string) {
  return useQuery({
    queryKey: chaves.factura(id),
    queryFn: ({ signal }) => ler(api.GET("/finance/purchase-invoices/{purchaseInvoiceId}", { params: { path: { purchaseInvoiceId: id } }, signal })),
  });
}

export function useConfronto(id: string, activo: boolean) {
  return useQuery({
    queryKey: chaves.confronto(id),
    queryFn: ({ signal }) => ler(api.GET("/finance/purchase-invoices/{purchaseInvoiceId}/match", { params: { path: { purchaseInvoiceId: id } }, signal })),
    enabled: activo,
  });
}

export function useRegistarFacturaCompra() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoNovaFacturaCompra) => ler(api.POST("/finance/purchase-invoices", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.facturas }),
  });
}

export function useAnularFacturaCompra(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (reason: string) => enviar(api.POST("/finance/purchase-invoices/{purchaseInvoiceId}/cancellation", { params: { path: { purchaseInvoiceId: id } }, body: { reason } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.facturas }),
  });
}

// Pedidos de pagamento

export function usePedidosPagamento(p: { pagina: number; tamanho: number; factura: string | null }, activo = true) {
  return useQuery({
    queryKey: chaves.listaPedidos(p),
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/finance/payment-requests", { params: { query: { ...(p.factura ? { purchaseInvoiceId: p.factura } : {}), page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function usePedidoPagamento(id: string) {
  return useQuery({
    queryKey: chaves.pedido(id),
    queryFn: ({ signal }) => ler(api.GET("/finance/payment-requests/{paymentRequestId}", { params: { path: { paymentRequestId: id } }, signal })),
  });
}

/** 202: o pedido existe e foi submetido a aprovação. Quem pede vem do token. */
export function usePedirPagamento() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoNovoPedidoPagamento) => ler(api.POST("/finance/payment-requests", { body: b })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chaves.pedidos });
      void qc.invalidateQueries({ queryKey: ["approval"] });
    },
  });
}

export function useCancelarPedidoPagamento(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (reason: string) => enviar(api.POST("/finance/payment-requests/{paymentRequestId}/cancellation", { params: { path: { paymentRequestId: id } }, body: { reason } })),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chaves.pedidos });
      void qc.invalidateQueries({ queryKey: ["approval"] });
    },
  });
}

/** Não se desfaz: o dinheiro sai da conta escolhida. Quem executa vem do token (BR-3). */
export function useExecutarPagamento(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: { bankAccountId: string; method: string; reference: string | null }) =>
      ler(api.POST("/finance/payment-requests/{paymentRequestId}/execution", { params: { path: { paymentRequestId: id } }, body: { ...b, executedByEmployeeId: null } })),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chaves.pedidos });
      void qc.invalidateQueries({ queryKey: chaves.facturas });
      void qc.invalidateQueries({ queryKey: ["finance", "accounts"] });
    },
  });
}

export function useAnexos(id: string) {
  return useQuery({
    queryKey: chaves.anexos(id),
    queryFn: ({ signal }) => ler(api.GET("/finance/payment-requests/{paymentRequestId}/documents", { params: { path: { paymentRequestId: id } }, signal })),
  });
}

export function useAnexar(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: { documentId: string; category: string | null }) => ler(api.POST("/finance/payment-requests/{paymentRequestId}/documents", { params: { path: { paymentRequestId: id } }, body: b })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.anexos(id) }),
  });
}
