/**
 * Facturação (§5.4): séries, canais, taxas, rascunhos, facturas, notas de
 * crédito, pró-formas, recibos e vencidas. Emitir e anular nunca se repetem
 * (§2): um segundo POST seria um documento fiscal a mais.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { descarregar } from "@/lib/api/download";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Serie = S["DocumentSeriesView"];
export type CanalPagamento = S["PaymentChannelView"];
export type PautaImposto = S["TaxRateScheduleView"];
export type Rascunho = S["InvoiceDraftView"];
export type PedidoRascunho = S["DraftRequest"];
export type ResumoFactura = S["SalesInvoiceSummary"];
export type Factura = S["SalesInvoiceView"];
export type SaldoFactura = S["InvoiceBalanceView"];
export type NotaCredito = S["CreditNoteView"];
export type PedidoNotaCredito = S["IssueCreditNoteRequest"];
export type Recibo = S["ReceiptView"];
export type PedidoRecibo = S["RegisterReceiptRequest"];
export type ProForma = S["ProformaView"];
export type PedidoProForma = S["ProformaRequest"];
export type PedidoConversao = S["ConversionRequest"];
export type Vencida = S["OverdueReceivable"];

type Pag = { pagina: number; tamanho: number };

export const chaves = {
  series: ["finance", "series"] as const,
  canais: ["finance", "payment-channels"] as const,
  pautas: ["fiscal", "tax-rates"] as const,
  taxa: (codigo: string, data: string) => ["fiscal", "tax-rates", "determination", codigo, data] as const,
  rascunhos: ["finance", "invoice-drafts"] as const,
  rascunho: (id: string) => ["finance", "invoice-drafts", id] as const,
  facturas: ["finance", "sales-invoices"] as const,
  factura: (id: string) => ["finance", "sales-invoices", "detail", id] as const,
  saldo: (id: string) => ["finance", "sales-invoices", "detail", id, "balance"] as const,
  notas: ["finance", "credit-notes"] as const,
  nota: (id: string) => ["finance", "credit-notes", "detail", id] as const,
  recibos: ["finance", "receipts"] as const,
  recibo: (id: string) => ["finance", "receipts", "detail", id] as const,
  proformas: ["finance", "proformas"] as const,
  vencidas: ["finance", "receivables", "overdue"] as const,
};

/** Tudo o que um documento novo ou anulado muda: listas, saldos, vencidas, dashboard. */
function invalidarDocumentos(qc: ReturnType<typeof useQueryClient>) {
  for (const k of [chaves.facturas, chaves.notas, chaves.recibos, chaves.proformas, chaves.rascunhos, chaves.vencidas, ["dashboard"] as const]) {
    void qc.invalidateQueries({ queryKey: k });
  }
}

// --- Configuração

export function useSeries(activo = true) {
  return useQuery({
    queryKey: chaves.series,
    queryFn: ({ signal }) => ler(api.GET("/finance/series", { params: { query: { page: 1, pageSize: 200 } }, signal })),
    enabled: activo,
    staleTime: 5 * 60_000,
  });
}

export function useAbrirSerie() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["OpenSeriesRequest"]) => ler(api.POST("/finance/series", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.series }),
  });
}

export function useCanais(activo = true) {
  return useQuery({ queryKey: chaves.canais, queryFn: ({ signal }) => ler(api.GET("/finance/payment-channels", { signal })), enabled: activo, staleTime: 5 * 60_000 });
}

export function useGuardarCanal() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ channelId, ...b }: S["PaymentChannelRequest"] & { channelId?: string }) =>
      channelId ? enviar(api.PUT("/finance/payment-channels/{channelId}", { params: { path: { channelId } }, body: b })) : enviar(api.POST("/finance/payment-channels", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.canais }),
  });
}

/** Pautas de IVA (só quem tem `fiscal.rates.read`). */
export function usePautas(activo = true) {
  return useQuery({
    queryKey: chaves.pautas,
    queryFn: ({ signal }) => ler(api.GET("/fiscal/tax-rates", { params: { query: { page: 1, pageSize: 200 } }, signal })),
    enabled: activo,
    staleTime: 10 * 60_000,
  });
}

// --- Rascunhos

export function useRascunhos(incluirEmitidos = false) {
  return useQuery({
    queryKey: [...chaves.rascunhos, incluirEmitidos],
    queryFn: ({ signal }) => ler(api.GET("/finance/invoice-drafts", { params: { query: { includeIssued: incluirEmitidos } }, signal })),
  });
}

export function useRascunho(id: string | null) {
  return useQuery({
    queryKey: chaves.rascunho(id ?? ""),
    queryFn: ({ signal }) => ler(api.GET("/finance/invoice-drafts/{draftId}", { params: { path: { draftId: id ?? "" } }, signal })),
    enabled: id !== null,
  });
}

export function useGuardarRascunho() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: async ({ draftId, corpo }: { draftId: string | null; corpo: PedidoRascunho }): Promise<string> => {
      if (draftId) {
        await enviar(api.PUT("/finance/invoice-drafts/{draftId}", { params: { path: { draftId } }, body: corpo }));
        return draftId;
      }
      return (await ler(api.POST("/finance/invoice-drafts", { body: corpo }))).draftId;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: chaves.rascunhos });
      void qc.invalidateQueries({ queryKey: chaves.rascunho(id) });
    },
  });
}

export function useEliminarRascunho() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (draftId: string) => enviar(api.DELETE("/finance/invoice-drafts/{draftId}", { params: { path: { draftId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.rascunhos }),
  });
}

/** Emite a factura do rascunho. Fica registada e não se apaga. */
export function useEmitirRascunho() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ draftId, issuedOn }: { draftId: string; issuedOn: string | null }) =>
      ler(api.POST("/finance/invoice-drafts/{draftId}/issue", { params: { path: { draftId } }, body: { issuedOn } })),
    onSuccess: () => invalidarDocumentos(qc),
  });
}

// --- Facturas

export function useFacturas(p: Pag & { customerId: string | null; from: string | null; to: string | null }, activo = true) {
  return useQuery({
    enabled: activo,
    queryKey: [...chaves.facturas, p],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/finance/sales-invoices", {
          params: { query: { page: p.pagina, pageSize: p.tamanho, ...(p.customerId ? { customerId: p.customerId } : {}), ...(p.from ? { from: p.from } : {}), ...(p.to ? { to: p.to } : {}) } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useFactura(id: string) {
  return useQuery({ queryKey: chaves.factura(id), queryFn: ({ signal }) => ler(api.GET("/finance/sales-invoices/{invoiceId}", { params: { path: { invoiceId: id } }, signal })) });
}

export function useSaldo(id: string) {
  return useQuery({ queryKey: chaves.saldo(id), queryFn: ({ signal }) => ler(api.GET("/finance/sales-invoices/{invoiceId}/balance", { params: { path: { invoiceId: id } }, signal })) });
}

export function useAnularFactura() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      enviar(api.POST("/finance/sales-invoices/{invoiceId}/cancellation", { params: { path: { invoiceId } }, body: { reason } })),
    onSuccess: () => invalidarDocumentos(qc),
  });
}

export type TipoDocumento = "factura" | "nota" | "recibo";

/** Envia o documento por e-mail ao cliente (efeito externo). */
export function useEnviarDocumento() {
  return useEscrita({
    mutationFn: async ({ tipo, id }: { tipo: TipoDocumento; id: string }) => {
      if (tipo === "factura") return ler(api.POST("/finance/sales-invoices/{invoiceId}/delivery", { params: { path: { invoiceId: id } } }));
      if (tipo === "nota") return ler(api.POST("/finance/credit-notes/{creditNoteId}/delivery", { params: { path: { creditNoteId: id } } }));
      return ler(api.POST("/finance/receipts/{receiptId}/delivery", { params: { path: { receiptId: id } } }));
    },
  });
}

const CAMINHO_PDF: Readonly<Record<TipoDocumento, string>> = {
  factura: "/finance/sales-invoices/{id}/document",
  nota: "/finance/credit-notes/{id}/document",
  recibo: "/finance/receipts/{id}/document",
};

/** PDF do documento, descarregado como anexo (§2.5). O nome constrói-se a partir do número. */
export function useDescarregarPdf() {
  return useEscrita({
    mutationFn: ({ tipo, id, numero }: { tipo: TipoDocumento; id: string; numero: string }) =>
      descarregar(CAMINHO_PDF[tipo].replace("{id}", encodeURIComponent(id)), `${numero.replace(/\//g, "-")}.pdf`),
  });
}

// --- Notas de crédito

export function useNotas(p: Pag & { salesInvoiceId?: string | null }) {
  return useQuery({
    queryKey: [...chaves.notas, p],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/finance/credit-notes", { params: { query: { page: p.pagina, pageSize: p.tamanho, ...(p.salesInvoiceId ? { salesInvoiceId: p.salesInvoiceId } : {}) } }, signal }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useNota(id: string) {
  return useQuery({ queryKey: chaves.nota(id), queryFn: ({ signal }) => ler(api.GET("/finance/credit-notes/{creditNoteId}", { params: { path: { creditNoteId: id } }, signal })) });
}

export function useEmitirNota() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoNotaCredito) => ler(api.POST("/finance/credit-notes", { body: b })),
    onSuccess: () => invalidarDocumentos(qc),
  });
}

export function useAnularNota() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      enviar(api.POST("/finance/credit-notes/{creditNoteId}/cancellation", { params: { path: { creditNoteId: id } }, body: { reason } })),
    onSuccess: () => invalidarDocumentos(qc),
  });
}

// --- Recibos

export function useRecibos(p: Pag & { from: string | null; to: string | null }) {
  return useQuery({
    queryKey: [...chaves.recibos, p],
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/finance/receipts", { params: { query: { page: p.pagina, pageSize: p.tamanho, ...(p.from ? { from: p.from } : {}), ...(p.to ? { to: p.to } : {}) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useRecibo(id: string) {
  return useQuery({ queryKey: chaves.recibo(id), queryFn: ({ signal }) => ler(api.GET("/finance/receipts/{receiptId}", { params: { path: { receiptId: id } }, signal })) });
}

export function useEmitirRecibo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoRecibo) => ler(api.POST("/finance/receipts", { body: b })),
    onSuccess: () => invalidarDocumentos(qc),
  });
}

export function useAnularRecibo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      enviar(api.POST("/finance/receipts/{receiptId}/cancellation", { params: { path: { receiptId: id } }, body: { reason } })),
    onSuccess: () => invalidarDocumentos(qc),
  });
}

// --- Pró-formas

export function useProformas(estado: "Open" | "Converted" | "Cancelled" | null) {
  return useQuery({
    queryKey: [...chaves.proformas, estado],
    queryFn: ({ signal }) => ler(api.GET("/finance/proformas", { params: { query: estado ? { status: estado } : {} }, signal })),
  });
}

export function useEmitirProforma() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoProForma) => ler(api.POST("/finance/proformas", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.proformas }),
  });
}

/** Converte em factura: emite um documento fiscal. */
export function useConverterProforma() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ proformaId, corpo }: { proformaId: string; corpo: PedidoConversao }) =>
      ler(api.POST("/finance/proformas/{proformaId}/conversion", { params: { path: { proformaId } }, body: corpo })),
    onSuccess: () => invalidarDocumentos(qc),
  });
}

export function useAnularProforma() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (proformaId: string) => enviar(api.POST("/finance/proformas/{proformaId}/cancellation", { params: { path: { proformaId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.proformas }),
  });
}

// --- A receber

export function useVencidas() {
  return useQuery({ queryKey: chaves.vencidas, queryFn: ({ signal }) => ler(api.GET("/finance/receivables/overdue", { signal })) });
}
