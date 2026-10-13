/** Dashboard executivo e painel pessoal (§5.3). Só leituras. */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type { Janela } from "@/lib/format/periodo";

type S = components["schemas"];
export type VisaoExecutiva = S["ExecutiveOverviewView"];
export type MeuPainel = S["MyDashboardView"];
export type KpisPorPerfil = S["RoleDashboardView"];
export type KpisFinancas = S["FinanceKpis"];
export type KpisPessoas = S["WorkforceSnapshot"];
export type KpisVendas = S["SalesSnapshot"];

export const chaves = {
  executivo: (j: Janela) => ["dashboard", "overview", j.from, j.to] as const,
  meu: ["dashboard", "me"] as const,
  kpis: (j: Janela) => ["dashboard", "kpis", j.from, j.to] as const,
};

export function useVisaoExecutiva(janela: Janela, activo = true) {
  return useQuery({
    queryKey: chaves.executivo(janela),
    queryFn: ({ signal }) => ler(api.GET("/dashboard/overview", { params: { query: { from: janela.from, to: janela.to, topCustomers: 5 } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Painel pessoal: não exige permissão; mostra só o que é da própria pessoa (ADR-069). */
export function useMeuPainel() {
  return useQuery({
    queryKey: chaves.meu,
    queryFn: ({ signal }) => ler(api.GET("/dashboard/me", { signal })),
  });
}

/** KPIs por perfil: as secções `finance`, `hr` e `sales` vêm conforme as permissões (ADR-069). */
export function useKpis(janela: Janela) {
  return useQuery({
    queryKey: chaves.kpis(janela),
    queryFn: ({ signal }) => ler(api.GET("/dashboard/kpis", { params: { query: { from: janela.from, to: janela.to } }, signal })),
    placeholderData: keepPreviousData,
  });
}
