/**
 * Anúncios e pedidos internos na gestão (§5.8, F7c).
 *
 * Factos (`WorkplaceEndpoints.cs`, `TalentEndpoints.cs`, `Workplace.cs`):
 * - anúncios: gerir com `hr.announcements.write` (`/manage` traz agendados,
 *   expirados e arquivados); o `PUT` substitui tudo; expira depois de
 *   publicado; arquivar não se desfaz;
 * - pedidos: ler com `hr.tickets.read`, escrever com `hr.tickets.write`; a lista
 *   não é paginada; um pedido fechado não aceita mensagens, responsável nem
 *   estado; atribuir põe um pedido aberto «em curso»; a resposta da equipa é a
 *   primeira resposta do SLA;
 * - SLA por categoria, em minutos: positivos e a resolução não mais curta do
 *   que a resposta.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components, paths } from "@/lib/api/schema";

type S = components["schemas"];
export type AnuncioGestao = S["AnnouncementView"];
export type PedidoAnuncio = S["AnnouncementRequest"];
export type PedidoInternoGestao = S["TicketView"];
export type PoliticaSla = S["TicketSlaPolicyView"];
type FiltrosPedidos = NonNullable<paths["/hr/tickets"]["get"]["parameters"]["query"]>;
export type EstadoPedidoInterno = NonNullable<FiltrosPedidos["status"]>;
export type CategoriaPedidoInterno = NonNullable<FiltrosPedidos["category"]>;

export const chavesServicos = {
  anuncios: ["hr", "announcements"] as const,
  pedidos: ["hr", "tickets"] as const,
  sla: ["hr", "tickets", "sla"] as const,
};

export function useAnunciosGestao() {
  return useQuery({ queryKey: [...chavesServicos.anuncios, "manage"], queryFn: ({ signal }) => ler(api.GET("/hr/announcements/manage", { signal })) });
}

export function usePublicarAnuncio() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoAnuncio) => ler(api.POST("/hr/announcements", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.anuncios }),
  });
}

export function useCorrigirAnuncio() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ announcementId, ...b }: PedidoAnuncio & { announcementId: string }) =>
      enviar(api.PUT("/hr/announcements/{announcementId}", { params: { path: { announcementId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.anuncios }),
  });
}

export function useArquivarAnuncio() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (announcementId: string) => enviar(api.POST("/hr/announcements/{announcementId}/archive", { params: { path: { announcementId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.anuncios }),
  });
}

export function usePedidosInternos(f: { estado: EstadoPedidoInterno | null; categoria: CategoriaPedidoInterno | null; requerente: string | null; responsavel: string | null }) {
  return useQuery({
    queryKey: [...chavesServicos.pedidos, "list", f.estado, f.categoria, f.requerente, f.responsavel],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/hr/tickets", {
          params: {
            query: {
              ...(f.estado ? { status: f.estado } : {}),
              ...(f.categoria ? { category: f.categoria } : {}),
              ...(f.requerente ? { requesterEmployeeId: f.requerente } : {}),
              ...(f.responsavel ? { assigneeEmployeeId: f.responsavel } : {}),
            },
          },
          signal,
        }),
      ),
  });
}

export function usePedidoInterno(ticketId: string) {
  return useQuery({
    queryKey: [...chavesServicos.pedidos, "detail", ticketId],
    queryFn: ({ signal }) => ler(api.GET("/hr/tickets/{ticketId}", { params: { path: { ticketId } }, signal })),
  });
}

export function useAbrirPedidoEmNome() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["TicketRequest"]) => ler(api.POST("/hr/tickets", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.pedidos }),
  });
}

export function useResponderPedidoGestao(ticketId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (body: string) => ler(api.POST("/hr/tickets/{ticketId}/messages", { params: { path: { ticketId } }, body: { body } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.pedidos }),
  });
}

export function useAtribuirPedido(ticketId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (assigneeEmployeeId: string | null) => enviar(api.POST("/hr/tickets/{ticketId}/assignment", { params: { path: { ticketId } }, body: { assigneeEmployeeId } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.pedidos }),
  });
}

export function useMudarEstadoPedido(ticketId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (status: EstadoPedidoInterno) => enviar(api.POST("/hr/tickets/{ticketId}/status", { params: { path: { ticketId } }, body: { status } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.pedidos }),
  });
}

export function usePoliticasSla(activo = true) {
  return useQuery({ queryKey: chavesServicos.sla, queryFn: ({ signal }) => ler(api.GET("/hr/tickets/sla-policies", { signal })), enabled: activo });
}

export function useDefinirSla() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ category, ...b }: { category: CategoriaPedidoInterno; responseMinutes: number; resolutionMinutes: number }) =>
      enviar(api.PUT("/hr/tickets/sla-policies/{category}", { params: { path: { category } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesServicos.pedidos }),
  });
}
