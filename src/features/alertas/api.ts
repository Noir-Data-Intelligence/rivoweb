/** Alertas (§5.3): eventos e regras. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type RegraAlerta = S["AlertRuleView"];
export type EventoAlerta = S["AlertEventView"];
export type ResultadoAvaliacao = S["EvaluationResult"];

/** Tipos de regra (Facto: `AlertKind` em `Rivo.Alerts.Domain`), com o nome para a interface. */
export const TIPOS: Readonly<Record<string, { nome: string; frase: (d: number) => string }>> = {
  ReceivablesOverdue: { nome: "Facturas vencidas", frase: (d) => `Facturas vencidas há pelo menos ${d} dias` },
  PayablesDue: { nome: "Facturas de compra a vencer", frase: (d) => `Facturas de compra a vencer em ${d} dias` },
  BillsDue: { nome: "Letras e livranças a vencer", frase: (d) => `Letras e livranças a vencer em ${d} dias` },
  InsuranceExpiring: { nome: "Seguros de viatura a caducar", frase: (d) => `Seguros de viatura a caducar em ${d} dias` },
  FleetMaintenanceDue: { nome: "Manutenções de frota previstas", frase: (d) => `Manutenções de frota previstas em ${d} dias` },
  CustomerContractsExpiring: { nome: "Contratos de cliente a terminar", frase: (d) => `Contratos de cliente a terminar em ${d} dias` },
  EmploymentContractsEnding: { nome: "Contratos de trabalho a terminar", frase: (d) => `Contratos de trabalho a terminar em ${d} dias` },
  IdentityDocumentsExpiring: { nome: "Documentos de identificação a caducar", frase: (d) => `Documentos de identificação a caducar em ${d} dias` },
  LeavePendingNearStart: { nome: "Férias por decidir perto do início", frase: (d) => `Férias por decidir que começam em ${d} dias` },
};

export const nomeTipo = (k: string) => TIPOS[k]?.nome ?? k;

export const chaves = {
  regras: ["alerts", "rules"] as const,
  eventos: (soAbertos: boolean) => ["alerts", "events", soAbertos] as const,
  todos: ["alerts"] as const,
};

export function useRegras() {
  return useQuery({ queryKey: chaves.regras, queryFn: ({ signal }) => ler(api.GET("/alerts/rules", { signal })) });
}

export function useEventos(soAbertos: boolean) {
  return useQuery({
    queryKey: chaves.eventos(soAbertos),
    queryFn: ({ signal }) => ler(api.GET("/alerts/events", { params: { query: { openOnly: soAbertos, limit: 200 } }, signal })),
  });
}

export type PedidoRegra = { name: string; kind: string | null; thresholdDays: number; recipients: string[]; sendEmail: boolean; active: boolean | null };

export function useCriarRegra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r: PedidoRegra) => ler(api.POST("/alerts/rules", { body: r })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.regras }),
  });
}

/** O tipo de uma regra não muda: na revisão, `kind` é ignorado pelo servidor. */
export function useReverRegra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, ...r }: PedidoRegra & { ruleId: string }) => enviar(api.PUT("/alerts/rules/{ruleId}", { params: { path: { ruleId } }, body: r })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.regras }),
  });
}

export function useResolver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => enviar(api.POST("/alerts/events/{alertId}/resolution", { params: { path: { alertId } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}

/** Avalia já todas as regras activas (o servidor fá-lo também em ciclo). */
export function useAvaliar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ler(api.POST("/alerts/evaluation")),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}
