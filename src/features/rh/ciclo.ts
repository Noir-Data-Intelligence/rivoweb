/**
 * Recrutamento e entradas/saídas (§5.8, F7c).
 *
 * Factos (`HrModuleEndpoints.cs`, `JobOpening.cs`, `EmployeeLifecycleProcess.cs`):
 * - ler com `hr.recruitment.read` / `hr.lifecycle.read`, escrever com `…write`;
 *   **contratar exige `hr.employees.write`** (cria o colaborador, sem conta);
 * - o funil só avança um passo de cada vez (Candidatura → Triagem → Entrevista
 *   → Proposta); rejeitar pode ser em qualquer etapa; contrata-se só da
 *   proposta; uma vaga fechada não aceita candidaturas;
 * - um processo recebe as tarefas ao começar (não há rota para juntar depois);
 *   sem tarefas nunca se conclui; conclui-se só com todas feitas; concluir a
 *   primeira tarefa põe-no «em curso». Uma saída exige o último dia.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Vaga = S["JobOpeningView"];
export type Candidato = S["CandidateView"];
export type Processo = S["LifecycleProcessView"];
export type TarefaProcesso = S["LifecycleTaskView"];
export type PedidoProcesso = S["StartLifecycleRequest"];

type Pag = { pagina: number; tamanho: number };

export const chavesCiclo = {
  vagas: ["hr", "recruitment", "openings"] as const,
  candidatos: ["hr", "recruitment", "candidates"] as const,
  processos: ["hr", "lifecycle"] as const,
};

export function useVagas(p: Pag) {
  return useQuery({
    queryKey: [...chavesCiclo.vagas, p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/hr/recruitment/openings", { params: { query: { page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

/** Lista de apoio: todas as vagas (até ao tecto do servidor), para achar uma pelo id. */
export const useTodasVagas = () => useVagas({ pagina: 1, tamanho: 200 });

export function useAbrirVaga() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["OpenJobOpeningRequest"]) => ler(api.POST("/hr/recruitment/openings", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesCiclo.vagas }),
  });
}

export function useFecharVaga() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (openingId: string) => enviar(api.POST("/hr/recruitment/openings/{openingId}/closure", { params: { path: { openingId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesCiclo.vagas }),
  });
}

export function useCandidatos(p: Pag & { vaga: string | null }) {
  return useQuery({
    queryKey: [...chavesCiclo.candidatos, p.vaga, p.pagina, p.tamanho],
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/hr/recruitment/candidates", { params: { query: { ...(p.vaga ? { openingId: p.vaga } : {}), page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useRegistarCandidato(openingId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ApplyRequest"]) => ler(api.POST("/hr/recruitment/openings/{openingId}/candidates", { params: { path: { openingId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesCiclo.candidatos }),
  });
}

export function useAvancarCandidato() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ candidateId, stage }: { candidateId: string; stage: string }) =>
      enviar(api.POST("/hr/recruitment/candidates/{candidateId}/stage", { params: { path: { candidateId } }, body: { stage } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesCiclo.candidatos }),
  });
}

export function useContratarCandidato() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ candidateId, departmentId }: { candidateId: string; departmentId: string | null }) =>
      ler(api.POST("/hr/recruitment/candidates/{candidateId}/hire", { params: { path: { candidateId } }, body: { departmentId } })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chavesCiclo.candidatos }), qc.invalidateQueries({ queryKey: ["hr", "employees"] })]),
  });
}

export function useProcessos(p: Pag & { tipo: string | null; colaborador: string | null }) {
  return useQuery({
    queryKey: [...chavesCiclo.processos, p.tipo, p.colaborador, p.pagina, p.tamanho],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/hr/lifecycle", {
          params: { query: { ...(p.tipo ? { kind: p.tipo } : {}), ...(p.colaborador ? { employeeId: p.colaborador } : {}), page: p.pagina, pageSize: p.tamanho } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useIniciarProcesso() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoProcesso) => ler(api.POST("/hr/lifecycle", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesCiclo.processos }),
  });
}

export function useConcluirTarefa() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ processId, taskId }: { processId: string; taskId: string }) =>
      enviar(api.POST("/hr/lifecycle/{processId}/tasks/{taskId}/completion", { params: { path: { processId, taskId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesCiclo.processos }),
  });
}

export function useConcluirProcesso() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (processId: string) => enviar(api.POST("/hr/lifecycle/{processId}/completion", { params: { path: { processId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesCiclo.processos }),
  });
}
