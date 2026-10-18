/**
 * Comprovativos de pagamento enviados pelos clientes no portal (§5.13, F10):
 * a fila de quem confirma.
 *
 * Factos (`FinanceModuleEndpoints.cs`, `ManagePaymentClaims.cs`, B32/ADR-087):
 * - ler com `finance.receipts.read`; cada pedido traz o cliente, o número da
 *   factura, as notas do cliente e o nome do ficheiro;
 * - o ficheiro descarrega-se pelo pedido (`/finance/payment-claims/{id}/document`),
 *   sempre em anexo, sem `documents.read`;
 * - confirmar (`finance.receipts.write`) regista um recibo por transferência
 *   bancária na data do pagamento e devolve o `receiptId`; só um pedido
 *   pendente se confirma (409); se o recibo falhar (série em falta, período
 *   fechado), o pedido continua pendente e o motivo vem no 409;
 * - o valor vem na moeda da factura (`currency`, B34);
 * - rejeitar pede o motivo (até 500 caracteres); não apaga nada.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { descarregar } from "@/lib/api/download";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";
import { normalizarTexto } from "@/lib/validation/normalizar";

export type PedidoComprovativo = components["schemas"]["PaymentClaimReviewView"];
export type EstadoPedido = PedidoComprovativo["status"];

export const MAXIMO_MOTIVO = 500;

export const chaves = { comprovativos: ["finance", "payment-claims"] as const };

export function useFilaComprovativos(f: { estado: EstadoPedido | null; cliente: string | null; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: [...chaves.comprovativos, f],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/finance/payment-claims", {
          params: {
            query: {
              page: f.pagina,
              pageSize: f.tamanho,
              ...(f.estado ? { status: f.estado } : {}),
              ...(f.cliente ? { customerId: f.cliente } : {}),
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useDescarregarComprovativo() {
  return useEscrita({
    mutationFn: (p: Pick<PedidoComprovativo, "id" | "fileName">) => descarregar(`/finance/payment-claims/${encodeURIComponent(p.id)}/document`, p.fileName ?? "comprovativo"),
  });
}

export function useConfirmarComprovativo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (id: string) =>
      ler(
        api.POST("/finance/payment-claims/{claimId}/confirmation", {
          params: { path: { claimId: id } },
        }),
      ),
    // O recibo novo muda, além da fila, os recibos, as facturas e o que está por receber.
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["finance"] }),
  });
}

export function useRejeitarComprovativo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      enviar(
        api.POST("/finance/payment-claims/{claimId}/rejection", {
          params: { path: { claimId: id } },
          body: { reason: motivo },
        }),
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaves.comprovativos }),
  });
}

export function erroMotivo(texto: string) {
  const t = normalizarTexto(texto, true);
  if (t === "") return "Diga ao cliente porque rejeita.";
  return t.length > MAXIMO_MOTIVO ? `No máximo ${String(MAXIMO_MOTIVO)} caracteres.` : undefined;
}
