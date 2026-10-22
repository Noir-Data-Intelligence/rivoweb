/**
 * Auditoria (§5.14, F13): consulta da trilha, só leitura.
 *
 * Factos (`AuditModuleEndpoints.cs`, `QueryAuditTrail.cs`): `audit.trail.read`;
 * filtros opcionais por tipo e id da entidade (iguais, não «contém»); `limit`
 * de 1 a 200 (50 por omissão), os mais recentes primeiro. Cada registo traz a
 * acção, a entidade, quem (o id da conta, ou nada quando foi o sistema), o IP
 * e a correlação; não traz os valores antes e depois.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type RegistoAuditoria = components["schemas"]["AuditEntryView"];

export function useAuditoria(f: { tipo: string | null; id: string | null; limite: number }) {
  return useQuery({
    queryKey: ["audit", f],
    queryFn: ({ signal }) => ler(api.GET("/audit/entries", { params: { query: { ...(f.tipo ? { entityType: f.tipo } : {}), ...(f.id ? { entityId: f.id } : {}), limit: f.limite } }, signal })),
    placeholderData: keepPreviousData,
  });
}
