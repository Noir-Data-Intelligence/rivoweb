/**
 * Analytics (§5.14, F13): tendências (receita e despesa por mês, frota e
 * inventário), RH e vendas de um período.
 *
 * Factos (`AnalyticsModuleEndpoints.cs`): tudo com `analytics.overview.read`;
 * `from` e `to` obrigatórios (início depois do fim: 400); `currency` opcional
 * (AOA) nas tendências e nas vendas, que só contam documentos e oportunidades
 * nessa moeda. Distinto do dashboard executivo (ADR-047): a evolução mês a
 * mês, sem alertas nem previsões.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Tendencias = components["schemas"]["AnalyticsOverviewView"];
type Filtro = { de: string; ate: string; moeda: string };

export function useTendencias(f: Filtro, activo: boolean) {
  return useQuery({
    queryKey: ["analytics", "overview", f],
    queryFn: ({ signal }) => ler(api.GET("/analytics/overview", { params: { query: { from: f.de, to: f.ate, currency: f.moeda } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}

export function useAnalyticsRh(f: Omit<Filtro, "moeda">, activo: boolean) {
  return useQuery({
    queryKey: ["analytics", "hr", f],
    queryFn: ({ signal }) => ler(api.GET("/analytics/hr", { params: { query: { from: f.de, to: f.ate } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}

export function useAnalyticsVendas(f: Filtro, activo: boolean) {
  return useQuery({
    queryKey: ["analytics", "sales", f],
    queryFn: ({ signal }) => ler(api.GET("/analytics/sales", { params: { query: { from: f.de, to: f.ate, currency: f.moeda } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}
