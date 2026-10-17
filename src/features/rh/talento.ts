/**
 * Declarações, desempenho, conquistas e importação de colaboradores (§5.8, F7c).
 *
 * Factos (`WorkplaceEndpoints.cs`, `TalentEndpoints.cs`, `Talent.cs`,
 * `SettingsModuleEndpoints.cs`):
 * - modelos com `hr.declarations.write`; **emitir é um GET que regista** (PDF
 *   com código de verificação) — só depois de confirmar; o registo e a
 *   verificação pedem `hr.employees.read`; o código ignora hífenes e espaços;
 * - ciclos: planeado → em curso → fechado; um ciclo fechado deixa os objectivos
 *   só de leitura (409); peso de 1 a 100 (omitido = 100); um objectivo
 *   abandonado não recebe progresso; a meta difere do ponto de partida;
 * - conquistas: código único, pontos de 0 a 10 000; atribuir com
 *   `hr.achievements.write` a uma conquista activa, uma vez por pessoa;
 * - importar colaboradores: CSV com `Nome` e `DataAdmissao` (aaaa-mm-dd),
 *   `Departamento` opcional pelo nome exacto; exige `hr.employees.write`.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { descarregar } from "@/lib/api/download";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type ModeloDeclaracao = S["DocumentTemplateView"];
export type PedidoModelo = S["DeclarationTemplateRequest"];
export type DeclaracaoEmitida = S["IssuedDeclarationView"];
export type Ciclo = S["ReviewCycleView"];
export type ObjectivoGestao = S["ObjectiveView"];
export type ResultadoChaveGestao = S["KeyResultView"];
export type Conquista = S["AchievementView"];
export type ConquistaAtribuida = S["EmployeeAchievementView"];
export type EntradaClassificacao = S["LeaderboardEntry"];

export const chavesTalento = {
  modelos: ["hr", "declaration-templates"] as const,
  emitidas: ["hr", "declarations"] as const,
  ciclos: ["hr", "performance", "cycles"] as const,
  objectivos: ["hr", "performance", "objectives"] as const,
  conquistas: ["hr", "achievements"] as const,
  atribuidas: (id: string) => ["hr", "employees", "detail", id, "achievements"] as const,
};

// --- Declarações

export function useModelos(comInactivos: boolean, activo = true) {
  return useQuery({
    queryKey: [...chavesTalento.modelos, comInactivos],
    queryFn: ({ signal }) => ler(api.GET("/hr/declaration-templates", { params: { query: { includeInactive: comInactivos } }, signal })),
    enabled: activo,
  });
}

export function useCriarModelo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoModelo) => ler(api.POST("/hr/declaration-templates", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.modelos }),
  });
}

export function useCorrigirModelo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ templateId, ...b }: PedidoModelo & { templateId: string }) => enviar(api.PUT("/hr/declaration-templates/{templateId}", { params: { path: { templateId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.modelos }),
  });
}

export function useEmitidas(colaborador: string | null, activo = true) {
  return useQuery({
    queryKey: [...chavesTalento.emitidas, colaborador],
    queryFn: ({ signal }) => ler(api.GET("/hr/declarations", { params: { query: colaborador ? { employeeId: colaborador } : {} }, signal })),
    enabled: activo,
  });
}

/** Emite (e regista) a declaração em PDF: só depois de confirmar. */
export function useEmitirDeclaracao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ employeeId, templateId }: { employeeId: string; templateId: string }) =>
      descarregar(`/hr/employees/${encodeURIComponent(employeeId)}/declarations/${encodeURIComponent(templateId)}`, `declaracao-${employeeId.slice(0, 8)}.pdf`),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.emitidas }),
  });
}

/** Leitura: confirma um código impresso numa declaração. */
export function useVerificarCodigo() {
  return useEscrita({
    mutationFn: (code: string) => ler(api.GET("/hr/declarations/verification/{code}", { params: { path: { code } } })),
  });
}

// --- Desempenho

export function useCiclos() {
  return useQuery({ queryKey: chavesTalento.ciclos, queryFn: ({ signal }) => ler(api.GET("/hr/performance/cycles", { signal })) });
}

export function usePlanearCiclo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ReviewCycleRequest"]) => ler(api.POST("/hr/performance/cycles", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.ciclos }),
  });
}

export function useCorrigirCiclo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ cycleId, ...b }: S["ReviewCycleRequest"] & { cycleId: string }) => enviar(api.PUT("/hr/performance/cycles/{cycleId}", { params: { path: { cycleId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.ciclos }),
  });
}

export function useMudarCiclo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ cycleId, accao }: { cycleId: string; accao: "activation" | "closure" }) =>
      accao === "activation"
        ? enviar(api.POST("/hr/performance/cycles/{cycleId}/activation", { params: { path: { cycleId } } }))
        : enviar(api.POST("/hr/performance/cycles/{cycleId}/closure", { params: { path: { cycleId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.ciclos }),
  });
}

export function useObjectivosGestao(f: { ciclo: string | null; colaborador: string | null; departamento: string | null }, activo = true) {
  return useQuery({
    queryKey: [...chavesTalento.objectivos, f.ciclo, f.colaborador, f.departamento],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/hr/performance/objectives", {
          params: { query: { ...(f.ciclo ? { cycleId: f.ciclo } : {}), ...(f.colaborador ? { ownerEmployeeId: f.colaborador } : {}), ...(f.departamento ? { departmentId: f.departamento } : {}) } },
          signal,
        }),
      ),
    enabled: activo,
  });
}

const invalidarDesempenho = (qc: ReturnType<typeof useQueryClient>) => Promise.all([qc.invalidateQueries({ queryKey: chavesTalento.objectivos }), qc.invalidateQueries({ queryKey: chavesTalento.ciclos })]);

export function useDefinirObjectivo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ObjectiveRequest"]) => ler(api.POST("/hr/performance/objectives", { body: b })),
    onSuccess: () => invalidarDesempenho(qc),
  });
}

export function useCorrigirObjectivo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ objectiveId, ...b }: S["ObjectiveRevisionRequest"] & { objectiveId: string }) =>
      enviar(api.PUT("/hr/performance/objectives/{objectiveId}", { params: { path: { objectiveId } }, body: b })),
    onSuccess: () => invalidarDesempenho(qc),
  });
}

export function useJuntarResultadoChave() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ objectiveId, ...b }: S["KeyResultRequest"] & { objectiveId: string }) =>
      ler(api.POST("/hr/performance/objectives/{objectiveId}/key-results", { params: { path: { objectiveId } }, body: b })),
    onSuccess: () => invalidarDesempenho(qc),
  });
}

export function useRegistarProgressoGestao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ keyResultId, currentValue }: { keyResultId: string; currentValue: string }) =>
      enviar(api.POST("/hr/performance/key-results/{keyResultId}/progress", { params: { path: { keyResultId } }, body: { currentValue } })),
    onSuccess: () => invalidarDesempenho(qc),
  });
}

// --- Conquistas

export function useConquistas(comInactivas: boolean) {
  return useQuery({
    queryKey: [...chavesTalento.conquistas, comInactivas],
    queryFn: ({ signal }) => ler(api.GET("/hr/achievements", { params: { query: { includeInactive: comInactivas } }, signal })),
  });
}

export function useClassificacao(top = 10) {
  return useQuery({ queryKey: [...chavesTalento.conquistas, "leaderboard", top], queryFn: ({ signal }) => ler(api.GET("/hr/achievements/leaderboard", { params: { query: { top } }, signal })) });
}

export function useCriarConquista() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["AchievementRequest"]) => ler(api.POST("/hr/achievements", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.conquistas }),
  });
}

export function useCorrigirConquista() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ achievementId, ...b }: S["AchievementRequest"] & { achievementId: string }) => enviar(api.PUT("/hr/achievements/{achievementId}", { params: { path: { achievementId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTalento.conquistas }),
  });
}

export function useConquistasDe(employeeId: string, activo = true) {
  return useQuery({
    queryKey: chavesTalento.atribuidas(employeeId),
    queryFn: ({ signal }) => ler(api.GET("/hr/employees/{employeeId}/achievements", { params: { path: { employeeId } }, signal })),
    enabled: activo,
  });
}

export function useAtribuirConquista() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ employeeId, ...b }: S["AwardRequest"] & { employeeId: string }) => ler(api.POST("/hr/employees/{employeeId}/achievements", { params: { path: { employeeId } }, body: b })),
    onSuccess: (_r, v) => Promise.all([qc.invalidateQueries({ queryKey: chavesTalento.atribuidas(v.employeeId) }), qc.invalidateQueries({ queryKey: chavesTalento.conquistas })]),
  });
}

// --- Importação de colaboradores

export function useImportarColaboradores() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: async (ficheiro: File) => {
      const corpo = new FormData();
      corpo.append("file", ficheiro, ficheiro.name);
      return ler(api.POST("/settings/import/employees", { body: corpo as never, bodySerializer: (b: unknown) => b as FormData }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "employees"] }),
  });
}
