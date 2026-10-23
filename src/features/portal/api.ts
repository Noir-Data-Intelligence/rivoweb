/**
 * Portal do colaborador (§5.8): o próprio, pelo token. Nenhuma rota aceita
 * `employeeId`; o 403 é sempre por falta de vínculo à ficha (o shell trata-o).
 *
 * Factos (`EmployeePortalModuleEndpoints.cs`): a assiduidade, sem datas, é do
 * mês corrente até hoje; os turnos, de hoje a 30 dias (no máximo 93); o saldo
 * de férias é do ano corrente. Pedir férias responde 202 (só a decisão o torna
 * ausência); justificar responde 201 (falta nova) ou 200 (falta existente).
 * Descarregar um documento ou um recibo é leitura; **emitir uma declaração
 * fica registado** (§5.15).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { descarregar } from "@/lib/api/download";
import { api, enviar, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Marcacao = S["OwnAttendanceRecord"];
export type PedidoFerias = S["OwnLeaveRequest"];
export type SaldoFerias = S["OwnLeaveBalance"];
export type DocumentoPessoal = S["OwnEmployeeDocument"];
export type Recibo = S["OwnPayslip"];
export type Anuncio = S["OwnAnnouncement"];
export type PedidoInterno = S["OwnTicket"];
export type CategoriaPedido = S["OpenMyTicketRequest"]["category"];
export type PrioridadePedido = NonNullable<S["OpenMyTicketRequest"]["priority"]>;
export type Formacao = S["OwnTraining"];
export type Turno = S["OwnShift"];
export type TrocaTurno = S["OwnShiftChange"];
export type ModeloDeclaracao = S["OwnDeclarationTemplate"];
export type Objectivo = S["OwnObjective"];
export type ResultadoChave = S["OwnKeyResult"];
export type Conquista = S["OwnAchievement"];
export type BemAGuarda = S["OwnAssetInCustody"];
export type MeuBeneficio = S["OwnBenefit"];
export type MeuContrato = S["OwnEmploymentContract"];
export type MeusDados = S["OwnPersonalData"];

const base = ["portal", "me"] as const;
export const chaves = {
  assiduidade: (de: string | null, ate: string | null) => [...base, "attendance", de, ate] as const,
  ferias: [...base, "leave"] as const,
  saldos: (ano: number) => [...base, "leave", "balances", ano] as const,
  documentos: [...base, "documents"] as const,
  recibos: [...base, "payslips"] as const,
  anuncios: [...base, "announcements"] as const,
  pedidos: [...base, "tickets"] as const,
  formacao: [...base, "training"] as const,
  turnos: (de: string | null, ate: string | null) => [...base, "shifts", de, ate] as const,
  trocas: [...base, "shift-change-requests"] as const,
  declaracoes: [...base, "declarations"] as const,
  objectivos: [...base, "objectives"] as const,
  conquistas: [...base, "achievements"] as const,
  bens: [...base, "assets"] as const,
  beneficios: [...base, "benefits"] as const,
  contratos: [...base, "contracts"] as const,
  dados: [...base, "personal-data"] as const,
};

/** `de`/`até` nulos: a janela por omissão do servidor (mês corrente até hoje). */
export function useMinhaAssiduidade(de: string | null, ate: string | null) {
  return useQuery({
    queryKey: chaves.assiduidade(de, ate),
    queryFn: ({ signal }) => ler(api.GET("/portal/me/attendance", { params: { query: { ...(de ? { from: de } : {}), ...(ate ? { to: ate } : {}) } }, signal })),
  });
}

export function useJustificarFalta() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["JustifyMyAbsenceRequest"]) => ler(api.POST("/portal/me/attendance/justification", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...base, "attendance"] }),
  });
}

export function useMinhasFerias() {
  return useQuery({ queryKey: chaves.ferias, queryFn: ({ signal }) => ler(api.GET("/portal/me/leave", { signal })) });
}

export function useMeusSaldos(ano: number) {
  return useQuery({ queryKey: chaves.saldos(ano), queryFn: ({ signal }) => ler(api.GET("/portal/me/leave/balances", { params: { query: { year: ano } }, signal })) });
}

export function usePedirFerias() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["RequestMyLeaveRequest"]) => ler(api.POST("/portal/me/leave", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.ferias }),
  });
}

/** Só um pedido por decidir; já decidido dá 409 (B25). Actualiza também o saldo («por decidir»). */
export function useRetirarFerias() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (leaveId: string) => enviar(api.POST("/portal/me/leave/{leaveId}/cancellation", { params: { path: { leaveId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.ferias }),
  });
}

export function useMeusDocumentos() {
  return useQuery({ queryKey: chaves.documentos, queryFn: ({ signal }) => ler(api.GET("/portal/me/documents", { signal })) });
}

export function useDescarregarDocumento() {
  return useEscrita({
    mutationFn: (d: Pick<DocumentoPessoal, "documentId" | "fileName">) => descarregar(`/portal/me/documents/${encodeURIComponent(d.documentId)}`, d.fileName),
  });
}

export function useMeusRecibos() {
  return useQuery({ queryKey: chaves.recibos, queryFn: ({ signal }) => ler(api.GET("/portal/me/payslips", { signal })) });
}

/** O anexado pelos RH ou, sem anexo, gerado da folha aprovada. */
export function useDescarregarRecibo() {
  return useEscrita({
    mutationFn: (r: Pick<Recibo, "itemId" | "year" | "month">) =>
      descarregar(`/portal/me/payslips/${encodeURIComponent(r.itemId)}/document`, `recibo-${String(r.year)}-${String(r.month).padStart(2, "0")}.pdf`),
  });
}

export function useMeusAnuncios() {
  return useQuery({ queryKey: chaves.anuncios, queryFn: ({ signal }) => ler(api.GET("/portal/me/announcements", { signal })) });
}

export function useMeusPedidos() {
  return useQuery({ queryKey: chaves.pedidos, queryFn: ({ signal }) => ler(api.GET("/portal/me/tickets", { signal })) });
}

export function useAbrirPedido() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["OpenMyTicketRequest"]) => ler(api.POST("/portal/me/tickets", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.pedidos }),
  });
}

export function useResponderPedido() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: string }) => ler(api.POST("/portal/me/tickets/{ticketId}/messages", { params: { path: { ticketId } }, body: { body } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.pedidos }),
  });
}

export function useMinhaFormacao() {
  return useQuery({ queryKey: chaves.formacao, queryFn: ({ signal }) => ler(api.GET("/portal/me/training", { signal })) });
}

/** `de`/`até` nulos: de hoje a 30 dias. */
export function useMeusTurnos(de: string | null, ate: string | null) {
  return useQuery({
    queryKey: chaves.turnos(de, ate),
    queryFn: ({ signal }) => ler(api.GET("/portal/me/shifts", { params: { query: { ...(de ? { from: de } : {}), ...(ate ? { to: ate } : {}) } }, signal })),
  });
}

export function useMinhasTrocas() {
  return useQuery({ queryKey: chaves.trocas, queryFn: ({ signal }) => ler(api.GET("/portal/me/shift-change-requests", { signal })) });
}

export function usePedirTroca() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ assignmentId, ...b }: S["MyShiftChangeRequest"] & { assignmentId: string }) =>
      ler(api.POST("/portal/me/shifts/{assignmentId}/change-requests", { params: { path: { assignmentId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.trocas }),
  });
}

export function useCancelarTroca() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (requestId: string) => enviar(api.POST("/portal/me/shift-change-requests/{requestId}/cancellation", { params: { path: { requestId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.trocas }),
  });
}

export function useMinhasDeclaracoes() {
  return useQuery({ queryKey: chaves.declaracoes, queryFn: ({ signal }) => ler(api.GET("/portal/me/declarations", { signal })) });
}

/** Emite e regista a declaração (não é uma leitura): só depois de confirmar. */
export function useEmitirDeclaracao() {
  return useEscrita({
    mutationFn: (m: ModeloDeclaracao) => descarregar(`/portal/me/declarations/${encodeURIComponent(m.templateId)}`, `${m.name}.pdf`),
  });
}

export function useMeusObjectivos() {
  return useQuery({ queryKey: chaves.objectivos, queryFn: ({ signal }) => ler(api.GET("/portal/me/objectives", { signal })) });
}

export function useRegistarProgresso() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ keyResultId, currentValue }: { keyResultId: string; currentValue: string }) =>
      enviar(api.POST("/portal/me/objectives/key-results/{keyResultId}/progress", { params: { path: { keyResultId } }, body: { currentValue } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.objectivos }),
  });
}

export function useMinhasConquistas() {
  return useQuery({ queryKey: chaves.conquistas, queryFn: ({ signal }) => ler(api.GET("/portal/me/achievements", { signal })) });
}

export function useMeusBens() {
  return useQuery({ queryKey: chaves.bens, queryFn: ({ signal }) => ler(api.GET("/portal/me/assets", { signal })) });
}

/** Activos primeiro e, em cada grupo, os mais recentes primeiro (o servidor ordena). */
export function useMeusBeneficios() {
  return useQuery({ queryKey: chaves.beneficios, queryFn: ({ signal }) => ler(api.GET("/portal/me/benefits", { signal })) });
}

/** Do mais recente para o mais antigo; sem as notas internas dos RH. */
export function useMeusContratos() {
  return useQuery({ queryKey: chaves.contratos, queryFn: ({ signal }) => ler(api.GET("/portal/me/contracts", { signal })) });
}

/** Só leitura de propósito: corrigir (sobretudo o IBAN) passa sempre pelos RH. */
export function useMeusDados() {
  return useQuery({ queryKey: chaves.dados, queryFn: ({ signal }) => ler(api.GET("/portal/me/personal-data", { signal })) });
}
