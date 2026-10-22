/**
 * ESG e sustentabilidade (§5.14, F13): catálogo de indicadores, medições
 * mensais, iniciativas e o relatório anual por pilar.
 *
 * Factos (`EsgModuleEndpoints.cs`, `ManageEsg.cs`, `Esg.cs`, ADR-069):
 * - ler com `esg.esg.read`, escrever com `esg.esg.write`;
 * - o sistema não traz indicadores, metas nem factores «oficiais»: quem usa
 *   define o catálogo e, para converter (por exemplo litros em kgCO2e), indica
 *   o factor (positivo), a unidade convertida e a fonte;
 * - indicador: código (30, único, em maiúsculas, não muda depois), nome (200),
 *   pilar (ambiental, social, governação), categoria (100), unidade (30),
 *   agregação no ano (soma, média, último), direcção (menos ou mais é
 *   melhor), meta anual opcional; desactivado não recebe medições (409);
 * - medição: um valor por mês (qualquer dia do mês; repetir o mês corrige,
 *   fica na trilha), não negativo, fonte (200), notas (1000); a lista traz o
 *   valor e o convertido; sem janela, do início do ano a hoje;
 * - iniciativa: título (200), pilar, descrição (2000), indicador e
 *   responsável opcionais (o servidor confirma), datas por ordem, orçamento
 *   ≥ 0 numa moeda (AOA), progresso 0–100 (acima de 0 passa a «em curso»);
 *   concluir (100 %) ou cancelar encerra, e encerrada não se altera;
 * - relatório do ano: por pilar, cada indicador com o agregado, o ano
 *   anterior, a meta e se a cumpre; pontuação = % dos com meta que a cumprem;
 * - a iniciativa traz o nome do responsável (`ownerName`) e os colaboradores
 *   activos escolhem-se em `/esg/lookups`, para quem escreve no ESG, sem os
 *   RH (B41).
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Indicador = S["IndicatorView"];
export type Medicao = S["MeasurementView"];
export type Iniciativa = S["InitiativeView"];
export type RelatorioEsg = S["EsgReport"];
export type ResultadoIndicador = S["IndicatorResult"];

const CHAVE = ["esg"] as const;

export function useIndicadores(inactivos = true) {
  return useQuery({ queryKey: [...CHAVE, "indicators", inactivos], queryFn: ({ signal }) => ler(api.GET("/esg/indicators", { params: { query: { includeInactive: inactivos } }, signal })) });
}

export function useMedicoes(f: { indicador: string; de: string; ate: string }, activo: boolean) {
  return useQuery({
    queryKey: [...CHAVE, "measurements", f],
    queryFn: ({ signal }) => ler(api.GET("/esg/measurements", { params: { query: { indicatorId: f.indicador, from: f.de, to: f.ate } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}

export function useIniciativas() {
  return useQuery({ queryKey: [...CHAVE, "initiatives"], queryFn: ({ signal }) => ler(api.GET("/esg/initiatives", { signal })) });
}

export function useEscolhasEsg(activo: boolean) {
  return useQuery({ queryKey: [...CHAVE, "lookups"], queryFn: ({ signal }) => ler(api.GET("/esg/lookups", { signal })), enabled: activo, staleTime: 60_000 });
}

export function useRelatorioEsg(ano: number) {
  return useQuery({ queryKey: [...CHAVE, "report", ano], queryFn: ({ signal }) => ler(api.GET("/esg/report", { params: { query: { year: ano } }, signal })), placeholderData: keepPreviousData });
}

export type AcaoEsg =
  | { acto: "indicador"; corpo: S["IndicatorRequest"] }
  | { acto: "corrigirIndicador"; indicador: string; corpo: S["IndicatorRequest"] }
  | { acto: "medicao"; indicador: string; corpo: S["MeasurementRequest"] }
  | { acto: "iniciativa"; corpo: S["InitiativeRequest"] }
  | { acto: "corrigirIniciativa"; iniciativa: string; corpo: S["InitiativeRequest"] }
  | { acto: "concluir"; iniciativa: string }
  | { acto: "cancelar"; iniciativa: string };

/** Todos os actos do ESG; cada um invalida o ESG (o relatório incluído). */
export function useAcaoEsg() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (a: AcaoEsg): Promise<unknown> => {
      switch (a.acto) {
        case "indicador":
          return ler(api.POST("/esg/indicators", { body: a.corpo }));
        case "corrigirIndicador":
          return enviar(api.PUT("/esg/indicators/{indicatorId}", { params: { path: { indicatorId: a.indicador } }, body: a.corpo }));
        case "medicao":
          return ler(api.POST("/esg/indicators/{indicatorId}/measurements", { params: { path: { indicatorId: a.indicador } }, body: a.corpo }));
        case "iniciativa":
          return ler(api.POST("/esg/initiatives", { body: a.corpo }));
        case "corrigirIniciativa":
          return enviar(api.PUT("/esg/initiatives/{initiativeId}", { params: { path: { initiativeId: a.iniciativa } }, body: a.corpo }));
        case "concluir":
          return enviar(api.POST("/esg/initiatives/{initiativeId}/completion", { params: { path: { initiativeId: a.iniciativa } } }));
        case "cancelar":
          return enviar(api.POST("/esg/initiatives/{initiativeId}/cancellation", { params: { path: { initiativeId: a.iniciativa } } }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
