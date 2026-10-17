/**
 * RH do dia-a-dia na gestão (§5.8, F7b): dados pessoais e imigração da ficha,
 * documentos da ficha, organograma, contratos, assiduidade, férias e saldos,
 * benefícios.
 *
 * Factos (`HrModuleEndpoints.cs`, `WorkplaceEndpoints.cs`, `TalentEndpoints.cs`):
 * - os dados pessoais e a imigração exigem `hr.personal_data.read`; o `PUT`
 *   substitui tudo (campo omitido fica vazio) e a trilha não guarda os valores;
 *   **a query dos dados pessoais não fica em cache** (§7.6);
 * - a assiduidade, sem datas, são os últimos 30 dias; marcar o ponto é entrada
 *   na primeira vez e saída na segunda (hora do servidor);
 * - férias pedidas em nome de alguém vão a aprovação (202); «ver a decisão»
 *   (`approval-outcome`) aplica a decisão já tomada ou diz que ainda espera;
 * - um contrato sem termo não tem fim; a termo e prestação de serviços exigem-no.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components, paths } from "@/lib/api/schema";

type S = components["schemas"];
export type DadosPessoais = S["PersonalDataView"];
export type PedidoDadosPessoais = S["PersonalDataInput"];
export type Imigracao = S["ImmigrationView"];
export type PedidoImigracao = S["ImmigrationInput"];
export type DocumentoFicha = S["EmployeeDocumentView"];
export type Organograma = S["OrgChart"];
export type Contrato = S["EmploymentContractView"];
export type PedidoContrato = S["DrawContractRequest"];
export type Marcacao = S["AttendanceView"];
export type Ausencia = S["LeaveView"];
export type SaldoAusencias = S["LeaveBalanceView"];
export type Beneficio = S["BenefitView"];
export type PedidoBeneficio = S["CreateBenefitRequest"];
export type Adesao = S["BenefitEnrolmentView"];
export type TipoAusencia = paths["/hr/employees/{employeeId}/leave-entitlements/{year}/{type}"]["put"]["parameters"]["path"]["type"];

type Pag = { pagina: number; tamanho: number };
/** Só os filtros preenchidos (a API não aceita `null` na query). */
const so = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "")) as { [K in keyof T]?: NonNullable<T[K]> };

export const chavesGestao = {
  dadosPessoais: (id: string) => ["hr", "employees", "detail", id, "personal-data"] as const,
  imigracao: (id: string) => ["hr", "immigration", id] as const,
  validades: (dias: number | null) => ["hr", "immigration", "list", dias] as const,
  documentos: (id: string) => ["hr", "employees", "detail", id, "documents"] as const,
  organograma: ["hr", "org-chart"] as const,
  contratos: ["hr", "contracts"] as const,
  assiduidade: ["hr", "attendance"] as const,
  ferias: ["hr", "leave"] as const,
  saldos: ["hr", "leave", "balances"] as const,
  beneficios: ["hr", "benefits"] as const,
  adesoes: ["hr", "benefits", "enrolments"] as const,
};

// --- Dados pessoais e imigração (§7.6: só a pedido, sem cache)

export function useDadosPessoais(employeeId: string, activo: boolean) {
  return useQuery({
    queryKey: chavesGestao.dadosPessoais(employeeId),
    queryFn: ({ signal }) => ler(api.GET("/hr/employees/{employeeId}/personal-data", { params: { path: { employeeId } }, signal })),
    enabled: activo,
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });
}

export function useGravarDadosPessoais(employeeId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoDadosPessoais) => enviar(api.PUT("/hr/employees/{employeeId}/personal-data", { params: { path: { employeeId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.dadosPessoais(employeeId) }),
  });
}

export function useImigracao(employeeId: string, activo: boolean) {
  return useQuery({
    queryKey: chavesGestao.imigracao(employeeId),
    queryFn: ({ signal }) => ler(api.GET("/hr/employees/{employeeId}/immigration", { params: { path: { employeeId } }, signal })),
    enabled: activo,
    gcTime: 0,
    retry: false,
  });
}

export function useGravarImigracao(employeeId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoImigracao) => enviar(api.PUT("/hr/employees/{employeeId}/immigration", { params: { path: { employeeId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "immigration"] }),
  });
}

/** Lista de validades, pela mais próxima. `dias` nulo: todos os registos. */
export function useValidades(dias: number | null) {
  return useQuery({
    queryKey: chavesGestao.validades(dias),
    queryFn: ({ signal }) => ler(api.GET("/hr/immigration", { params: { query: dias === null ? {} : { expiringWithinDays: dias } }, signal })),
    gcTime: 0,
  });
}

// --- Documentos da ficha

export function useDocumentosFicha(employeeId: string) {
  return useQuery({
    queryKey: chavesGestao.documentos(employeeId),
    queryFn: ({ signal }) => ler(api.GET("/hr/employees/{employeeId}/documents", { params: { path: { employeeId } }, signal })),
  });
}

export function useAnexarDocumento(employeeId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["AttachDocumentRequest"]) => ler(api.POST("/hr/employees/{employeeId}/documents", { params: { path: { employeeId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.documentos(employeeId) }),
  });
}

export function useRetirarDocumento(employeeId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string | null }) =>
      enviar(api.POST("/hr/employees/{employeeId}/documents/{documentId}/removal", { params: { path: { employeeId, documentId } }, body: { reason } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.documentos(employeeId) }),
  });
}

// --- Organograma

export function useOrganograma() {
  return useQuery({ queryKey: chavesGestao.organograma, queryFn: ({ signal }) => ler(api.GET("/hr/org-chart", { signal })) });
}

// --- Contratos

export function useContratos(p: Pag & { colaborador: string | null }) {
  return useQuery({
    queryKey: [...chavesGestao.contratos, p.colaborador, p.pagina, p.tamanho],
    // Com `employeeId`, o servidor devolve o histórico inteiro, sem paginar (B26).
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/hr/contracts", { params: { query: p.colaborador ? { employeeId: p.colaborador } : { page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useCelebrarContrato() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoContrato) => ler(api.POST("/hr/contracts", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.contratos }),
  });
}

export function useCessarContrato() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ contractId, on }: { contractId: string; on: string | null }) => enviar(api.POST("/hr/contracts/{contractId}/termination", { params: { path: { contractId } }, body: { on } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.contratos }),
  });
}

// --- Assiduidade

export function useAssiduidade(p: Pag & { de: string | null; ate: string | null; colaborador: string | null; anomalias: boolean }) {
  return useQuery({
    queryKey: [...chavesGestao.assiduidade, p.de, p.ate, p.colaborador, p.anomalias, p.pagina, p.tamanho],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/hr/attendance", {
          params: { query: { ...so({ from: p.de, to: p.ate, employeeId: p.colaborador }), ...(p.anomalias ? { anomaliesOnly: true } : {}), page: p.pagina, pageSize: p.tamanho } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useMarcarPonto() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ClockRequest"]) => ler(api.POST("/hr/attendance/clock", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.assiduidade }),
  });
}

export function useRegistarFalta() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["RecordAbsenceRequest"]) => ler(api.POST("/hr/attendance/absences", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.assiduidade }),
  });
}

// --- Férias e ausências

export function useAusencias(p: Pag & { colaborador: string | null }) {
  return useQuery({
    queryKey: [...chavesGestao.ferias, "list", p.colaborador, p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/hr/leave", { params: { query: { ...so({ employeeId: p.colaborador }), page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useSaldosAusencias(ano: number, colaborador: string | null) {
  return useQuery({
    queryKey: [...chavesGestao.saldos, ano, colaborador],
    queryFn: ({ signal }) => ler(api.GET("/hr/leave/balances", { params: { query: { year: ano, ...so({ employeeId: colaborador }) } }, signal })),
  });
}

export function usePedirAusencia() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["RequestLeaveRequest"]) => ler(api.POST("/hr/leave", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.ferias }),
  });
}

export function useRetirarAusencia() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (leaveId: string) => enviar(api.POST("/hr/leave/{leaveId}/cancellation", { params: { path: { leaveId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.ferias }),
  });
}

/** Aplica a decisão da aprovação ao pedido; se ainda não houver, diz isso (202). */
export function useVerDecisaoAusencia() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (leaveId: string) => ler(api.POST("/hr/leave/{leaveId}/approval-outcome", { params: { path: { leaveId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.ferias }),
  });
}

export function useDefinirDireito() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ employeeId, year, type, ...b }: S["LeaveEntitlementRequest"] & { employeeId: string; year: number; type: TipoAusencia }) =>
      enviar(api.PUT("/hr/employees/{employeeId}/leave-entitlements/{year}/{type}", { params: { path: { employeeId, year, type } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.saldos }),
  });
}

// --- Benefícios

export function useBeneficios(p: Pag) {
  return useQuery({
    queryKey: [...chavesGestao.beneficios, "list", p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/hr/benefits", { params: { query: { page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

/** Catálogo completo (até ao tecto do servidor), para nomes e escolhas. */
export const useTodosBeneficios = () => useBeneficios({ pagina: 1, tamanho: 200 });

export function useCriarBeneficio() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoBeneficio) => ler(api.POST("/hr/benefits", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.beneficios }),
  });
}

export function useAdesoes(p: Pag & { colaborador: string | null }) {
  return useQuery({
    queryKey: [...chavesGestao.adesoes, p.colaborador, p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/hr/benefits/enrolments", { params: { query: { ...so({ employeeId: p.colaborador }), page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useAderir() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["EnrolRequest"]) => ler(api.POST("/hr/benefits/enrolments", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.adesoes }),
  });
}

export function useCancelarAdesao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ enrolmentId, on }: { enrolmentId: string; on: string | null }) =>
      enviar(api.POST("/hr/benefits/enrolments/{enrolmentId}/cancellation", { params: { path: { enrolmentId } }, body: { on } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chavesGestao.adesoes }),
  });
}
