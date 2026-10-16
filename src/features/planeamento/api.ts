/**
 * Planeamento (§5.7): centros de custo, orçamentos por centro (tectos
 * mensais) e previsões de custos por departamento.
 *
 * Facto (`LedgerEndpoints.cs`): ler com `finance.planning.read`, escrever com
 * `finance.planning.write`, aprovar orçamentos com `finance.budgets.approve`.
 * A aprovação não leva corpo: quem aprova é a conta autenticada (ADR-057).
 * O orçamento é um tecto do centro de custo e controla despesa (BR-8) só
 * quando aprovado; a previsão é do departamento e alimenta a tesouraria.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type CentroCusto = S["CostCentreView"];
export type PedidoCentroCusto = S["CostCentreRequest"];
export type Orcamento = S["BudgetView"];
export type PedidoOrcamento = S["BudgetRequest"];
export type PrevisaoCustos = S["CostForecastView"];
export type PedidoPrevisaoCustos = S["CostForecastRequest"];

export const chaves = {
  planeamento: ["finance", "planning"] as const,
  centros: (inactivos: boolean, pagina: number, tamanho: number) => ["finance", "planning", "cost-centres", inactivos, pagina, tamanho] as const,
  orcamentos: (p: { centro: string | null; ano: number | null; pagina: number; tamanho: number }) => ["finance", "planning", "budgets", p.centro, p.ano, p.pagina, p.tamanho] as const,
  previsoes: (p: { departamento: string | null; ano: number | null; pagina: number; tamanho: number }) => ["finance", "planning", "cost-forecasts", p.departamento, p.ano, p.pagina, p.tamanho] as const,
};

export function useCentrosCusto(p: { inactivos: boolean; pagina: number; tamanho: number }, activo = true) {
  return useQuery({
    queryKey: chaves.centros(p.inactivos, p.pagina, p.tamanho),
    queryFn: ({ signal }) => lerPagina(api.GET("/finance/planning/cost-centres", { params: { query: { includeInactive: p.inactivos, page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Lista de apoio (nomes, escolhas): todos, até ao tecto do servidor. */
export const useTodosCentrosCusto = (activo = true) => useCentrosCusto({ inactivos: true, pagina: 1, tamanho: 200 }, activo);

export function useAbrirCentroCusto() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoCentroCusto) => enviar(api.POST("/finance/planning/cost-centres", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "planning", "cost-centres"] }),
  });
}

export function useOrcamentos(p: { centro: string | null; ano: number | null; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: chaves.orcamentos(p),
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/finance/planning/budgets", {
          params: { query: { ...(p.centro ? { costCentreId: p.centro } : {}), ...(p.ano !== null ? { fiscalYear: p.ano } : {}), page: p.pagina, pageSize: p.tamanho } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCriarOrcamento() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoOrcamento) => enviar(api.POST("/finance/planning/budgets", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "planning", "budgets"] }),
  });
}

export function useReverOrcamento() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ budgetId, monthlyCeilings }: { budgetId: string; monthlyCeilings: Record<string, string> }) =>
      enviar(api.POST("/finance/planning/budgets/{budgetId}/revision", { params: { path: { budgetId } }, body: { monthlyCeilings } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "planning", "budgets"] }),
  });
}

export function useAprovarOrcamento() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (budgetId: string) => enviar(api.POST("/finance/planning/budgets/{budgetId}/approval", { params: { path: { budgetId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "planning", "budgets"] }),
  });
}

export function usePrevisoesCustos(p: { departamento: string | null; ano: number | null; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: chaves.previsoes(p),
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/finance/planning/cost-forecasts", {
          params: { query: { ...(p.departamento ? { departmentId: p.departamento } : {}), ...(p.ano !== null ? { fiscalYear: p.ano } : {}), page: p.pagina, pageSize: p.tamanho } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useRegistarPrevisaoCustos() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoPrevisaoCustos) => enviar(api.POST("/finance/planning/cost-forecasts", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "planning", "cost-forecasts"] }),
  });
}

/** Departamentos e colaboradores activos para escolher, sem as permissões de RH (B22). Só com `finance.planning.write`. */
export function useEscolhasPlaneamento(activo: boolean) {
  return useQuery({ queryKey: [...chaves.planeamento, "lookups"], queryFn: ({ signal }) => ler(api.GET("/finance/planning/lookups", { signal })), enabled: activo, staleTime: 60_000 });
}

/** Revê os custos de uma previsão em rascunho (B23). Submetida: 409. */
export function useReverPrevisaoCustos() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ forecastId, ...body }: { forecastId: string } & S["CostForecastRevisionRequest"]) =>
      enviar(api.PUT("/finance/planning/cost-forecasts/{forecastId}", { params: { path: { forecastId } }, body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "planning", "cost-forecasts"] }),
  });
}

/** Submete uma previsão que ficou em rascunho (B23). Já submetida: 409. */
export function useSubmeterPrevisaoCustos() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (forecastId: string) => enviar(api.POST("/finance/planning/cost-forecasts/{forecastId}/submission", { params: { path: { forecastId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "planning", "cost-forecasts"] }),
  });
}
