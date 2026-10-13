/**
 * Núcleo organizacional de RH (§5.2): departamentos, cargos, colaboradores,
 * ligação de conta e atribuição de cargo. O resto do RH fica na F7.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerComVersao, lerPagina, seVersao } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Departamento = S["DepartmentView"];
export type Cargo = S["PositionView"];
export type Colaborador = S["EmployeeView"];
export type FichaColaborador = S["EmployeeDetailView"];
export type OcupacaoCargo = S["PositionAssignmentView"];
export type VinculoConta = S["EmployeeAccountLinkView"];
export type PedidoAdmissao = S["HireEmployeeRequest"];

/** Tecto do servidor por página (ADR-068). As listas de apoio pedem tudo de uma vez até aqui. */
export const MAXIMO_POR_PAGINA = 200;

export const chaves = {
  departamentos: ["hr", "departments"] as const,
  cargos: ["hr", "positions"] as const,
  colaboradores: ["hr", "employees"] as const,
  colaborador: (id: string) => ["hr", "employees", "detail", id] as const,
  historicoConta: (id: string) => ["hr", "employees", "detail", id, "account-history"] as const,
  ocupacoes: (positionId: string) => ["hr", "positions", positionId, "assignments"] as const,
};

type Paginacao = { pagina: number; tamanho: number };

export function useDepartamentos({ pagina, tamanho }: Paginacao, activo = true) {
  return useQuery({
    queryKey: [...chaves.departamentos, pagina, tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/hr/departments", { params: { query: { page: pagina, pageSize: tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useCargos({ pagina, tamanho }: Paginacao, activo = true) {
  return useQuery({
    queryKey: [...chaves.cargos, pagina, tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/hr/positions", { params: { query: { page: pagina, pageSize: tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useColaboradores({ pagina, tamanho }: Paginacao, activo = true) {
  return useQuery({
    queryKey: [...chaves.colaboradores, pagina, tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/hr/employees", { params: { query: { page: pagina, pageSize: tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Listas de apoio (nomes, escolhas): a primeira página com o tecto do servidor. */
export const useTodosDepartamentos = (activo = true) => useDepartamentos({ pagina: 1, tamanho: MAXIMO_POR_PAGINA }, activo);
export const useTodosCargos = (activo = true) => useCargos({ pagina: 1, tamanho: MAXIMO_POR_PAGINA }, activo);
export const useTodosColaboradores = (activo = true) => useColaboradores({ pagina: 1, tamanho: MAXIMO_POR_PAGINA }, activo);

export function useColaborador(employeeId: string) {
  return useQuery({
    queryKey: chaves.colaborador(employeeId),
    queryFn: ({ signal }) => lerComVersao(api.GET("/hr/employees/{employeeId}", { params: { path: { employeeId } }, signal })),
  });
}

export function useHistoricoConta(employeeId: string, activo = true) {
  return useQuery({
    queryKey: chaves.historicoConta(employeeId),
    queryFn: ({ signal }) => ler(api.GET("/hr/employees/{employeeId}/account-history", { params: { path: { employeeId } }, signal })),
    enabled: activo,
  });
}

export function useOcupacoes(positionId: string | null) {
  return useQuery({
    queryKey: chaves.ocupacoes(positionId ?? ""),
    queryFn: ({ signal }) => ler(api.GET("/hr/positions/{positionId}/assignments", { params: { path: { positionId: positionId ?? "" } }, signal })),
    enabled: positionId !== null,
  });
}

// --- Escritas

export function useCriarDepartamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { name: string; managerId: string | null }) => ler(api.POST("/hr/departments", { body: dados })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.departamentos }),
  });
}

export function useCorrigirDepartamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, ...dados }: { departmentId: string; name: string; managerId: string | null }) =>
      enviar(api.PUT("/hr/departments/{departmentId}", { params: { path: { departmentId } }, body: dados })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.departamentos }),
  });
}

export function useCriarCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { name: string; hierarchyLevel: number; grantsApprovalAuthority: boolean }) => ler(api.POST("/hr/positions", { body: dados })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.cargos }),
  });
}

/** A autoridade de aprovação não se corrige: fixa-se ao criar o cargo. */
export function useCorrigirCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ positionId, ...dados }: { positionId: string; name: string; hierarchyLevel: number }) =>
      enviar(api.PUT("/hr/positions/{positionId}", { params: { path: { positionId } }, body: dados })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.cargos }),
  });
}

export function useAdmitir() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: PedidoAdmissao) => ler(api.POST("/hr/employees", { body: dados })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.colaboradores }),
  });
}

/** Escritas sobre um colaborador: levam `If-Match` quando a ficha veio com versão (ADR-080). */
function useEscritaColaborador<V>(executar: (employeeId: string, versao: string | null, v: V) => Promise<unknown>, employeeId: string, versao: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => executar(employeeId, versao, v),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.colaboradores }),
  });
}

export function useCorrigirNome(employeeId: string, versao: string | null) {
  return useEscritaColaborador<string>(
    (id, ver, fullName) => enviar(api.PUT("/hr/employees/{employeeId}", { params: { path: { employeeId: id } }, headers: seVersao(ver), body: { fullName } })),
    employeeId,
    versao,
  );
}

export function useMudarContactos(employeeId: string, versao: string | null) {
  return useEscritaColaborador<{ email: string | null; phone: string | null; employeeCode: string | null }>(
    (id, ver, body) => enviar(api.PUT("/hr/employees/{employeeId}/contacts", { params: { path: { employeeId: id } }, headers: seVersao(ver), body })),
    employeeId,
    versao,
  );
}

export function useTransferir(employeeId: string, versao: string | null) {
  return useEscritaColaborador<string | null>(
    (id, ver, departmentId) =>
      enviar(api.POST("/hr/employees/{employeeId}/department", { params: { path: { employeeId: id } }, headers: seVersao(ver), body: { departmentId } })),
    employeeId,
    versao,
  );
}

export function useMudarEstadoColaborador(employeeId: string, versao: string | null) {
  return useEscritaColaborador<boolean>(
    (id, ver, active) => enviar(api.POST("/hr/employees/{employeeId}/status", { params: { path: { employeeId: id } }, headers: seVersao(ver), body: { active } })),
    employeeId,
    versao,
  );
}

export function useLigarConta(employeeId: string, versao: string | null) {
  return useEscritaColaborador<string>(
    (id, ver, userId) => enviar(api.POST("/hr/employees/{employeeId}/account", { params: { path: { employeeId: id } }, headers: seVersao(ver), body: { userId } })),
    employeeId,
    versao,
  );
}

export function useDesligarConta(employeeId: string, versao: string | null) {
  return useEscritaColaborador<undefined>(
    (id, ver) => enviar(api.DELETE("/hr/employees/{employeeId}/account", { params: { path: { employeeId: id } }, headers: seVersao(ver) })),
    employeeId,
    versao,
  );
}

export type ResultadoAtribuicao =
  | { readonly tipo: "atribuido"; readonly assignmentId: string }
  | { readonly tipo: "pendente"; readonly assignmentId: string; readonly detalhe: string | null };

/**
 * Atribuir cargo: `201` = em vigor; `202` = pendente de aprovação (cargo com
 * autoridade, BR-20), que nunca se mostra como sucesso (§2.4). A atribuição
 * directa é só para SuperAdmin (ADR-058) e não passa por aprovação.
 */
export function useAtribuirCargo(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      directa,
      ...body
    }: {
      directa: boolean;
      positionId: string;
      effectiveFrom: string | null;
      effectiveTo: string | null;
    }): Promise<ResultadoAtribuicao> => {
      if (directa) {
        const r = await ler(api.POST("/hr/employees/{employeeId}/positions/direct", { params: { path: { employeeId } }, body }));
        return { tipo: "atribuido", assignmentId: r.assignmentId };
      }
      const r = await api.POST("/hr/employees/{employeeId}/positions", { params: { path: { employeeId } }, body });
      // `ler` valida o estado e lança ApiError; aqui só falta distinguir 201 de 202.
      const dados = await ler(Promise.resolve(r));
      if (r.response.status === 202 && "estado" in dados) {
        return { tipo: "pendente", assignmentId: dados.assignmentId, detalhe: dados.detalhe };
      }
      return { tipo: "atribuido", assignmentId: dados.assignmentId };
    },
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: chaves.colaborador(employeeId) });
      void qc.invalidateQueries({ queryKey: chaves.ocupacoes(v.positionId) });
    },
  });
}

/**
 * Aplica a decisão de uma atribuição pendente. Idempotente (B14): o processo
 * de fundo faz o mesmo a cada 60 s; chamar aqui só antecipa. `200` = aplicada
 * (ou já estava); `202` = ainda sem decisão.
 */
export function useVerificarDecisao(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string; positionId: string }) => {
      const r = await api.POST("/hr/position-assignments/{assignmentId}/approval-outcome", { params: { path: { assignmentId } } });
      const dados = await ler(Promise.resolve(r));
      return { pendente: r.response.status === 202, estado: dados.estado, detalhe: dados.detalhe };
    },
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: chaves.colaborador(employeeId) });
      void qc.invalidateQueries({ queryKey: chaves.ocupacoes(v.positionId) });
    },
  });
}

export function useEncerrarCargo(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, endedOn }: { assignmentId: string; positionId: string; endedOn: string | null }) =>
      enviar(api.POST("/hr/position-assignments/{assignmentId}/closure", { params: { path: { assignmentId } }, body: { endedOn } })),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: chaves.colaborador(employeeId) });
      void qc.invalidateQueries({ queryKey: chaves.ocupacoes(v.positionId) });
    },
  });
}
