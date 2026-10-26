/**
 * Auditoria interna (ADR-089, backend #119): auditorias planeadas a um
 * departamento, os achados e os planos de acção correctiva. Não é a trilha
 * técnica (`/auditoria`), embora o histórico venha dela.
 *
 * Factos (`InternalAuditModuleEndpoints.cs`, `ManageInternalAudit.cs`,
 * `AuditEngagement.cs`):
 * - ler com `internalaudit.{audits,findings,actions}.read`, escrever com o
 *   `.write` correspondente; o Admin conduz, o Manager só lê;
 * - `/internal-audit/lookups` (departamentos e colaboradores activos) exige
 *   `internalaudit.audits.write`: só com um formulário aberto;
 * - os PUT substituem o registo inteiro (um campo omitido é validado como
 *   vazio): enviam-se sempre todos os campos, mesmo só para mudar o estado;
 * - fases: planeada → em curso → relatório → fechada, uma de cada vez; do
 *   relatório pode voltar ao campo; cancelar exige motivo; fechar exige os
 *   achados todos fechados ou com o risco aceite;
 * - achados só em curso ou em relatório; fechar exige os planos concluídos;
 *   aceitar o risco exige motivo; quem é responsável por um plano do achado
 *   não o resolve (403); o primeiro plano passa o achado a «em correcção»;
 * - conformidade: % dos achados resolvidos, nula sem achados.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type AuditoriaInterna = S["AuditView"];
export type DetalheAuditoria = S["AuditDetailView"];
export type Achado = S["FindingView"];
export type PlanoAccao = S["ActionPlanView"];
export type EntradaHistorico = S["HistoryEntryView"];

const CHAVE = ["internal-audit"] as const;

export function useResumoAuditoriaInterna() {
  return useQuery({ queryKey: [...CHAVE, "overview"], queryFn: ({ signal }) => ler(api.GET("/internal-audit/overview", { signal })) });
}

export function useAuditoriasInternas(f: { estado: string | null; departamento: string | null }) {
  return useQuery({
    queryKey: [...CHAVE, "audits", f],
    queryFn: ({ signal }) => ler(api.GET("/internal-audit/audits", { params: { query: { ...(f.estado ? { status: f.estado } : {}), ...(f.departamento ? { departmentId: f.departamento } : {}) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useAuditoriaInterna(id: string) {
  return useQuery({ queryKey: [...CHAVE, "audit", id], queryFn: ({ signal }) => ler(api.GET("/internal-audit/audits/{auditId}", { params: { path: { auditId: id } }, signal })) });
}

export function useHistoricoAuditoria(id: string) {
  return useQuery({ queryKey: [...CHAVE, "history", id], queryFn: ({ signal }) => ler(api.GET("/internal-audit/audits/{auditId}/history", { params: { path: { auditId: id } }, signal })) });
}

export function useAchados(f: { estado: string | null; gravidade: string | null }) {
  return useQuery({
    queryKey: [...CHAVE, "findings", f],
    queryFn: ({ signal }) => ler(api.GET("/internal-audit/findings", { params: { query: { ...(f.estado ? { status: f.estado } : {}), ...(f.gravidade ? { severity: f.gravidade } : {}) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function usePlanosAccao(f: { estado: string | null; atrasados: boolean }) {
  return useQuery({
    queryKey: [...CHAVE, "action-plans", f],
    queryFn: ({ signal }) => ler(api.GET("/internal-audit/action-plans", { params: { query: { ...(f.estado ? { status: f.estado } : {}), ...(f.atrasados ? { overdue: true } : {}) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

/** Departamentos e colaboradores activos; exige `internalaudit.audits.write`, por isso só com o formulário aberto. */
export function useOpcoesAuditoria(activo: boolean) {
  return useQuery({ queryKey: [...CHAVE, "lookups"], queryFn: ({ signal }) => ler(api.GET("/internal-audit/lookups", { signal })), enabled: activo, staleTime: 60_000 });
}

export type AcaoAuditoriaInterna =
  | { acto: "planear"; corpo: S["AuditRequest"] }
  | { acto: "rever"; auditoria: string; corpo: S["AuditRequest"] }
  | { acto: "achado"; auditoria: string; corpo: S["FindingRequest"] }
  | { acto: "reverAchado"; achado: string; corpo: S["FindingRequest"] }
  | { acto: "plano"; achado: string; corpo: S["ActionPlanRequest"] }
  | { acto: "reverPlano"; plano: string; corpo: S["ActionPlanRequest"] };

/** Todos os actos da auditoria interna; cada um invalida o módulo (listas, detalhe, histórico e resumo). */
export function useAcaoAuditoriaInterna() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (a: AcaoAuditoriaInterna): Promise<unknown> => {
      switch (a.acto) {
        case "planear":
          return ler(api.POST("/internal-audit/audits", { body: a.corpo }));
        case "rever":
          return enviar(api.PUT("/internal-audit/audits/{auditId}", { params: { path: { auditId: a.auditoria } }, body: a.corpo }));
        case "achado":
          return ler(api.POST("/internal-audit/audits/{auditId}/findings", { params: { path: { auditId: a.auditoria } }, body: a.corpo }));
        case "reverAchado":
          return enviar(api.PUT("/internal-audit/findings/{findingId}", { params: { path: { findingId: a.achado } }, body: a.corpo }));
        case "plano":
          return ler(api.POST("/internal-audit/findings/{findingId}/action-plans", { params: { path: { findingId: a.achado } }, body: a.corpo }));
        case "reverPlano":
          return enviar(api.PUT("/internal-audit/action-plans/{actionPlanId}", { params: { path: { actionPlanId: a.plano } }, body: a.corpo }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
