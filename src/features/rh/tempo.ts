/**
 * Formação e turnos na gestão (§5.8, F7c).
 *
 * Factos (`WorkplaceEndpoints.cs`, `ManageWorkplace.cs`, `ManageTalent.cs`):
 * - formação: ler com `hr.training.read`, escrever com `hr.training.write`; o
 *   `PUT` substitui tudo; inscrever recusa formação cancelada, lotada ou
 *   colaborador já inscrito (409); concluir e cancelar só inscrições activas;
 *   avaliação de 0 a 100; a validade do certificado (meses) vem da formação;
 * - turnos: tipos com código único (só na criação), horas `HH:mm:ss`, fim antes
 *   do início passa a meia-noite; a escala vai de 1 a 94 dias e **substitui** o
 *   turno que a pessoa já tinha nesses dias (a resposta diz quais); a decisão
 *   de uma troca, aprovada com colega, passa-lhe o turno (se ele não tiver
 *   turno nesse dia); aprovada sem colega, liberta o turno.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components, paths } from "@/lib/api/schema";

type S = components["schemas"];
export type Curso = S["TrainingCourseView"];
export type PedidoCurso = S["CourseRequest"];
export type InscricaoGestao = S["TrainingEnrolmentView"];
export type TipoTurno = S["ShiftTypeView"];
export type TurnoEscalado = S["ShiftAssignmentView"];
export type TrocaGestao = S["ShiftChangeView"];
export type EstadoTroca = NonNullable<NonNullable<paths["/hr/shifts/change-requests"]["get"]["parameters"]["query"]>["status"]>;

export const chavesTempo = {
  cursos: ["hr", "training", "courses"] as const,
  inscricoes: ["hr", "training", "enrolments"] as const,
  tipos: ["hr", "shifts", "types"] as const,
  escala: ["hr", "shifts", "roster"] as const,
  trocas: ["hr", "shifts", "change-requests"] as const,
};

// --- Formação

export function useCursos(comCancelados: boolean) {
  return useQuery({
    queryKey: [...chavesTempo.cursos, comCancelados],
    queryFn: ({ signal }) => ler(api.GET("/hr/training/courses", { params: { query: { includeCancelled: comCancelados } }, signal })),
  });
}

export function usePlanearCurso() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoCurso) => ler(api.POST("/hr/training/courses", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTempo.cursos }),
  });
}

export function useCorrigirCurso() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ courseId, ...b }: PedidoCurso & { courseId: string }) => enviar(api.PUT("/hr/training/courses/{courseId}", { params: { path: { courseId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTempo.cursos }),
  });
}

export function useCancelarCurso() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (courseId: string) => enviar(api.POST("/hr/training/courses/{courseId}/cancellation", { params: { path: { courseId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTempo.cursos }),
  });
}

export function useInscricoesGestao(f: { curso: string | null; colaborador: string | null }) {
  return useQuery({
    queryKey: [...chavesTempo.inscricoes, f.curso, f.colaborador],
    queryFn: ({ signal }) =>
      ler(api.GET("/hr/training/enrolments", { params: { query: { ...(f.curso ? { courseId: f.curso } : {}), ...(f.colaborador ? { employeeId: f.colaborador } : {}) } }, signal })),
  });
}

const invalidarFormacao = (qc: ReturnType<typeof useQueryClient>) => Promise.all([qc.invalidateQueries({ queryKey: chavesTempo.inscricoes }), qc.invalidateQueries({ queryKey: chavesTempo.cursos })]);

export function useInscrever(courseId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (employeeId: string) => ler(api.POST("/hr/training/courses/{courseId}/enrolments", { params: { path: { courseId } }, body: { employeeId } })),
    onSuccess: () => invalidarFormacao(qc),
  });
}

export function useConcluirInscricao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ enrolmentId, ...b }: S["CompletionRequest"] & { enrolmentId: string }) =>
      enviar(api.POST("/hr/training/enrolments/{enrolmentId}/completion", { params: { path: { enrolmentId } }, body: b })),
    onSuccess: () => invalidarFormacao(qc),
  });
}

export function useCancelarInscricao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (enrolmentId: string) => enviar(api.POST("/hr/training/enrolments/{enrolmentId}/cancellation", { params: { path: { enrolmentId } } })),
    onSuccess: () => invalidarFormacao(qc),
  });
}

// --- Turnos

export function useTiposTurno(comInactivos: boolean) {
  return useQuery({
    queryKey: [...chavesTempo.tipos, comInactivos],
    queryFn: ({ signal }) => ler(api.GET("/hr/shifts/types", { params: { query: { includeInactive: comInactivos } }, signal })),
  });
}

export function useDefinirTipoTurno() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ShiftTypeRequest"]) => ler(api.POST("/hr/shifts/types", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTempo.tipos }),
  });
}

export function useCorrigirTipoTurno() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ shiftTypeId, ...b }: S["ShiftTypeRequest"] & { shiftTypeId: string }) => enviar(api.PUT("/hr/shifts/types/{shiftTypeId}", { params: { path: { shiftTypeId } }, body: b })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chavesTempo.tipos }), qc.invalidateQueries({ queryKey: chavesTempo.escala })]),
  });
}

export function useEscala(f: { de: string; ate: string; colaborador: string | null; departamento: string | null }, activo: boolean) {
  return useQuery({
    queryKey: [...chavesTempo.escala, f.de, f.ate, f.colaborador, f.departamento],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/hr/shifts/roster", {
          params: { query: { from: f.de, to: f.ate, ...(f.colaborador ? { employeeId: f.colaborador } : {}), ...(f.departamento ? { departmentId: f.departamento } : {}) } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useEscalar() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ScheduleRequest"]) => ler(api.POST("/hr/shifts/roster", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTempo.escala }),
  });
}

export function useTirarDaEscala() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (assignmentId: string) => enviar(api.DELETE("/hr/shifts/roster/{assignmentId}", { params: { path: { assignmentId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesTempo.escala }),
  });
}

export function useTrocasGestao(estado: EstadoTroca | null) {
  return useQuery({
    queryKey: [...chavesTempo.trocas, estado],
    queryFn: ({ signal }) => ler(api.GET("/hr/shifts/change-requests", { params: { query: estado ? { status: estado } : {} }, signal })),
  });
}

export function useDecidirTroca() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ requestId, ...b }: S["ShiftChangeDecisionRequest"] & { requestId: string }) =>
      enviar(api.POST("/hr/shifts/change-requests/{requestId}/decision", { params: { path: { requestId } }, body: b })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chavesTempo.trocas }), qc.invalidateQueries({ queryKey: chavesTempo.escala })]),
  });
}
