/**
 * Configuração fiscal (§5.7): taxas com vigência (IVA e INSS), tabela de IRT
 * por escalões e limiares de isenção dos subsídios. Tudo versionado: uma
 * versão nova não apaga a anterior, fecha-se com uma data de fim.
 *
 * Facto (`FiscalModuleEndpoints.cs`): ler com `fiscal.rates.read`, escrever
 * com `fiscal.rates.write`. A tabela de IRT e cada isenção respondem 404
 * enquanto não houver nenhuma versão.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler } from "@/lib/api/client";
import { eApiError } from "@/lib/api/problem";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type PautaImposto = S["TaxRateScheduleView"];
export type VersaoTaxa = S["TaxRateVersionView"];
export type TabelaIrt = S["IncomeTaxScheduleView"];
export type VersaoIrt = S["IncomeTaxScheduleVersionView"];
export type Escalao = S["IncomeTaxBracketView"];
export type Isencao = S["SubsidyExemptionScheduleView"];
export type VersaoIsencao = S["SubsidyExemptionVersionView"];

/** `TaxKind` vem como número (0, 1, 2); aceita-se também o nome. */
export const TIPOS_IMPOSTO = [
  { valor: 0, nome: "ValueAdded", texto: "IVA" },
  { valor: 1, nome: "EmployeeSocialSecurity", texto: "INSS do trabalhador" },
  { valor: 2, nome: "EmployerSocialSecurity", texto: "INSS patronal" },
] as const;
export type TipoImposto = (typeof TIPOS_IMPOSTO)[number]["valor"];

export function tipoImposto(kind: unknown): (typeof TIPOS_IMPOSTO)[number] | undefined {
  return TIPOS_IMPOSTO.find((t) => t.valor === kind || t.nome === kind || String(t.valor) === String(kind));
}

/** `SubsidyKind`: 0 = alimentação, 1 = transporte. */
export const SUBSIDIOS = [
  { valor: 0, texto: "Subsídio de alimentação" },
  { valor: 1, texto: "Subsídio de transporte" },
] as const;
export type TipoSubsidio = (typeof SUBSIDIOS)[number]["valor"];

export const chaves = {
  // A mesma chave que a facturação usa para as pautas de IVA.
  taxas: ["fiscal", "tax-rates"] as const,
  determinacao: (p: { codigo: string; data: string; tipo: TipoImposto | null }) => ["fiscal", "tax-rates", "determination", p.codigo, p.data, p.tipo] as const,
  irt: ["fiscal", "income-tax-schedule"] as const,
  simulacaoIrt: (p: { materia: string; data: string }) => ["fiscal", "income-tax-schedule", "determination", p.materia, p.data] as const,
  isencoes: ["fiscal", "subsidy-exemptions"] as const,
  isencao: (tipo: TipoSubsidio) => ["fiscal", "subsidy-exemptions", tipo] as const,
};

/** 404 quer dizer «ainda não há»: devolve-se `null` em vez de erro. */
async function ouNada<T>(pedido: Promise<T>): Promise<T | null> {
  try {
    return await pedido;
  } catch (e) {
    if (eApiError(e) && e.status === 404) return null;
    throw e;
  }
}

// Taxas (IVA e INSS)

export function useTaxas(activo = true) {
  return useQuery({
    queryKey: chaves.taxas,
    queryFn: ({ signal }) => ler(api.GET("/fiscal/tax-rates", { params: { query: { page: 1, pageSize: 200 } }, signal })),
    enabled: activo,
  });
}

export function useAbrirPauta() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["OpenScheduleRequest"]) => ler(api.POST("/fiscal/tax-rates", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.taxas }),
  });
}

export function useNovaVersaoTaxa() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ scheduleId, ...b }: S["IntroduceRateRequest"] & { scheduleId: string }) =>
      ler(api.POST("/fiscal/tax-rates/{scheduleId}/versions", { params: { path: { scheduleId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.taxas }),
  });
}

export function useFecharVersaoTaxa() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ scheduleId, versionId, effectiveTo }: { scheduleId: string; versionId: string; effectiveTo: string }) =>
      enviar(api.POST("/fiscal/tax-rates/{scheduleId}/versions/{versionId}/closure", { params: { path: { scheduleId, versionId } }, body: { effectiveTo } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.taxas }),
  });
}

/** Que taxa o servidor aplica a um código numa data. 404: nenhuma versão cobre a data. */
export function useDeterminarTaxa(p: { codigo: string; data: string; tipo: TipoImposto | null } | null) {
  return useQuery({
    queryKey: p ? chaves.determinacao(p) : ["fiscal", "tax-rates", "determination", "nenhum"],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/fiscal/tax-rates/determination", {
          params: { query: { taxCode: p?.codigo ?? "", taxPointDate: p?.data ?? "", ...(p?.tipo !== null && p?.tipo !== undefined ? { kind: p.tipo } : {}) } },
          signal,
        }),
      ),
    enabled: p !== null,
    retry: false,
  });
}

// Tabela de IRT

export function useTabelaIrt() {
  return useQuery({
    queryKey: chaves.irt,
    queryFn: ({ signal }) => ouNada(ler(api.GET("/fiscal/income-tax-schedule", { signal }))),
  });
}

export function useNovaVersaoIrt() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["IntroduceIncomeTaxScheduleVersionRequest"]) => ler(api.POST("/fiscal/income-tax-schedule/versions", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.irt }),
  });
}

export function useFecharVersaoIrt() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ versionId, effectiveTo }: { versionId: string; effectiveTo: string }) =>
      enviar(api.POST("/fiscal/income-tax-schedule/versions/{versionId}/closure", { params: { path: { versionId } }, body: { effectiveTo } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.irt }),
  });
}

export function useSimularIrt(p: { materia: string; data: string } | null) {
  return useQuery({
    queryKey: p ? chaves.simulacaoIrt(p) : ["fiscal", "income-tax-schedule", "determination", "nenhum"],
    queryFn: ({ signal }) =>
      ler(api.GET("/fiscal/income-tax-schedule/determination", { params: { query: { taxableIncome: p?.materia ?? "0", taxPointDate: p?.data ?? "" } }, signal })),
    enabled: p !== null,
    retry: false,
  });
}

// Isenções dos subsídios

export function useIsencao(tipo: TipoSubsidio) {
  return useQuery({
    queryKey: chaves.isencao(tipo),
    queryFn: ({ signal }) => ouNada(ler(api.GET("/fiscal/subsidy-exemptions", { params: { query: { kind: tipo } }, signal }))),
  });
}

export function useNovaVersaoIsencao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["IntroduceSubsidyExemptionVersionRequest"]) => ler(api.POST("/fiscal/subsidy-exemptions/versions", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.isencoes }),
  });
}

export function useFecharVersaoIsencao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ versionId, ...b }: S["CloseSubsidyExemptionVersionRequest"] & { versionId: string }) =>
      enviar(api.POST("/fiscal/subsidy-exemptions/versions/{versionId}/closure", { params: { path: { versionId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.isencoes }),
  });
}
