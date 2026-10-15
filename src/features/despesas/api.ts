/**
 * Despesas de colaborador (§5.6, ADR-071). No backoffice: registar em nome de
 * alguém, aprovar ou rejeitar (quem decide não é o colaborador da despesa,
 * 409) e marcar reembolsada. No portal: o próprio submete e retira.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Despesa = S["ExpenseClaimView"];
export type ResumoDespesas = S["ExpenseSummary"];
export type MinhaDespesa = S["OwnExpense"];
export type EstadoDespesa = "Submitted" | "Approved" | "Rejected" | "Reimbursed" | "Withdrawn";

export const ESTADOS: readonly EstadoDespesa[] = ["Submitted", "Approved", "Rejected", "Reimbursed", "Withdrawn"];

/** Categorias em uso (texto livre na API; estas são sugestões). */
export const CATEGORIAS = ["Alojamento", "Combustível", "Comunicações", "Material de escritório", "Refeições", "Transporte"] as const;

type Filtro = { estado: EstadoDespesa | null; de: string | null; ate: string | null };

export const chaves = {
  todas: ["finance", "expenses"] as const,
  lista: (f: Filtro) => ["finance", "expenses", "list", f.estado, f.de, f.ate] as const,
  resumo: (f: Pick<Filtro, "de" | "ate">) => ["finance", "expenses", "summary", f.de, f.ate] as const,
  ficha: (id: string) => ["finance", "expenses", "detail", id] as const,
  minhas: ["portal", "me", "expenses"] as const,
};

const datas = (de: string | null, ate: string | null) => ({ ...(de ? { from: de } : {}), ...(ate ? { to: ate } : {}) });

export function useDespesas(f: Filtro) {
  return useQuery({
    queryKey: chaves.lista(f),
    queryFn: ({ signal }) => ler(api.GET("/finance/expenses", { params: { query: { ...(f.estado ? { status: f.estado } : {}), ...datas(f.de, f.ate) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useResumoDespesas(f: Pick<Filtro, "de" | "ate">) {
  return useQuery({
    queryKey: chaves.resumo(f),
    queryFn: ({ signal }) => ler(api.GET("/finance/expenses/summary", { params: { query: datas(f.de, f.ate) }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useDespesa(id: string) {
  return useQuery({ queryKey: chaves.ficha(id), queryFn: ({ signal }) => ler(api.GET("/finance/expenses/{expenseId}", { params: { path: { expenseId: id } }, signal })) });
}

export function useRegistarDespesa() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ExpenseRequest"]) => ler(api.POST("/finance/expenses", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.todas }),
  });
}

export function useDecidirDespesa(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ aprovar, notas }: { aprovar: boolean; notas: string | null }) =>
      aprovar
        ? enviar(api.POST("/finance/expenses/{expenseId}/approval", { params: { path: { expenseId: id } }, body: { notes: notas } }))
        : enviar(api.POST("/finance/expenses/{expenseId}/rejection", { params: { path: { expenseId: id } }, body: { notes: notas } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todas }),
  });
}

export function useReembolsar(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ReimbursementRequest"]) => enviar(api.POST("/finance/expenses/{expenseId}/reimbursement", { params: { path: { expenseId: id } }, body: b })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todas }),
  });
}

// Portal do colaborador

export function useMinhasDespesas() {
  return useQuery({ queryKey: chaves.minhas, queryFn: ({ signal }) => ler(api.GET("/portal/me/expenses", { signal })) });
}

export function useSubmeterDespesa() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["MyExpenseRequest"]) => ler(api.POST("/portal/me/expenses", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.minhas }),
  });
}

export function useRetirarDespesa() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (expenseId: string) => enviar(api.POST("/portal/me/expenses/{expenseId}/withdrawal", { params: { path: { expenseId } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.minhas }),
  });
}
