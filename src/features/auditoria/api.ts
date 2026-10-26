/**
 * Auditoria (§5.14, F13): consulta da trilha, só leitura.
 *
 * Factos (`AuditModuleEndpoints.cs`, `QueryAuditTrail.cs`): `audit.trail.read`;
 * filtros opcionais por tipo e id da entidade (iguais, não «contém») e por
 * período (`from`/`to`, dias UTC inclusivos); com `page`/`pageSize` (até 200)
 * vem a página e `X-Total-Count` (#122), os mais recentes primeiro. Cada
 * registo traz a acção, a entidade, quem (o id da conta, ou nada quando foi o
 * sistema), o IP e a correlação; não traz os valores antes e depois. A
 * contagem por dia vai até 366 dias, com os dias sem eventos a zero.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, ler, lerPagina } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type RegistoAuditoria = components["schemas"]["AuditEntryView"];
export type EventosDoDia = components["schemas"]["AuditDailyCountView"];

export function useAuditoriaPeriodo(f: { tipo: string | null; id: string | null; de: string; ate: string; pagina: number; tamanho: number }, activo: boolean) {
  return useQuery({
    queryKey: ["audit", "periodo", f],
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/audit/entries", { params: { query: { ...(f.tipo ? { entityType: f.tipo } : {}), ...(f.id ? { entityId: f.id } : {}), from: f.de, to: f.ate, page: f.pagina, pageSize: f.tamanho } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}

export function useEventosPorDia(de: string, ate: string, activo: boolean) {
  return useQuery({
    queryKey: ["audit", "por-dia", de, ate],
    queryFn: ({ signal }) => ler(api.GET("/audit/entries/daily-count", { params: { query: { from: de, to: ate } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}
