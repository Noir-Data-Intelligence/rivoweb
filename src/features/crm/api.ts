/**
 * CRM (§5.12, F11): leads, oportunidades e quadro, actividades, tipos de
 * serviço e relatório comercial.
 *
 * Factos (`CrmEndpoints.cs`, `ManageCrm.cs`, `Crm.cs`, `CrmStore.cs`,
 * `CommercialDbContext.cs`):
 * - ler com `commercial.crm.read`, escrever com `commercial.crm.write`;
 * - lead: nome obrigatório (200), empresa e e-mail (200), telefone (50), origem
 *   (100), notas (2000); estados New → Contacted → Qualified; desqualificar
 *   pede o motivo (500); converter cria o cliente (nome da empresa ou do lead,
 *   NIF obrigatório; NIF repetido dá 409 com o cliente existente) ou usa um
 *   existente, e abre a oportunidade se vier título (probabilidade 50); um lead
 *   convertido ou desqualificado não muda mais;
 * - oportunidade: título (200), de um cliente ou de um lead, valor ≥ 0, moeda
 *   ISO, probabilidade 0–100 (sem ela, 10, também ao corrigir); etapas abertas Prospecting, Qualification,
 *   Proposal, Negotiation (mover leva a posição no quadro); ganhar exige
 *   cliente (409 «converta primeiro o lead»); perder exige o motivo (500);
 *   fechada não muda mais; o histórico diz os dias em cada etapa;
 * - actividade: Meeting, Call, Email, Task ou Note; assunto (300), notas
 *   (4000); de um lead, de uma oportunidade ou de um cliente; concluir uma vez;
 * - tipo de serviço: código único (30), nome (200), descrição (1000), preço ≥ 0,
 *   moeda;
 * - `ownerEmployeeId` tem de ser uma ficha que existe; as vistas trazem os
 *   nomes (`ownerName`, `customerName`, `leadName`) e quem escreve escolhe o
 *   responsável e o cliente em `GET /commercial/lookups` (B35);
 * - as listas vêm ordenadas pelo servidor e, com `page`, paginadas com
 *   `X-Total-Count`; sem `page`, vêm todas (o quadro, as escolhas e as listas
 *   de uma ficha) (B35).
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Lead = S["LeadView"];
export type PedidoLead = S["LeadRequest"];
export type Oportunidade = S["OpportunityView"];
export type PedidoOportunidade = S["OpportunityRequest"];
export type ColunaQuadro = S["PipelineColumn"];
export type Passagem = S["StageChangeView"];
export type Actividade = S["CrmActivityView"];
export type PedidoActividade = S["ActivityRequest"];
export type TipoServico = S["ServiceTypeView"];
export type PedidoTipoServico = S["ServiceTypeRequest"];
export type Relatorio = S["CrmReport"];
export type PedidoConversao = S["LeadConversionRequest"];

export type EstadoLead = "New" | "Contacted" | "Qualified" | "Disqualified" | "Converted";
export type EtapaAberta = "Prospecting" | "Qualification" | "Proposal" | "Negotiation";
export type Etapa = EtapaAberta | "Won" | "Lost";
export type TipoActividade = PedidoActividade["kind"];

export type EscolhasComerciais = S["CommercialLookups"];

export const chaves = {
  crm: ["commercial", "crm"] as const,
  leads: ["commercial", "crm", "leads"] as const,
  lead: (id: string) => ["commercial", "crm", "leads", "detail", id] as const,
  oportunidades: ["commercial", "crm", "opportunities"] as const,
  oportunidade: (id: string) => ["commercial", "crm", "opportunities", "detail", id] as const,
  actividades: ["commercial", "crm", "activities"] as const,
  servicos: ["commercial", "crm", "service-types"] as const,
};

/** Tudo o que muda com uma escrita no CRM: listas, fichas, quadro, actividades e relatório. */
function useInvalidarCrm() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: chaves.crm });
}

/** Colaboradores e clientes activos, para quem escreve no comercial (B35). */
export function useEscolhasComerciais(activo = true) {
  return useQuery({ queryKey: ["commercial", "lookups"], queryFn: ({ signal }) => ler(api.GET("/commercial/lookups", { signal })), enabled: activo, staleTime: 60_000 });
}

type Pag = { pagina: number; tamanho: number };

// --- Leads

export function useLeads(f: { estado: EstadoLead | null; pagina: number; tamanho: number }, activo = true) {
  return useQuery({
    queryKey: [...chaves.leads, "list", f],
    queryFn: ({ signal }) => lerPagina(api.GET("/commercial/leads", { params: { query: { page: f.pagina, pageSize: f.tamanho, ...(f.estado ? { status: f.estado } : {}) } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useLead(id: string) {
  return useQuery({ queryKey: chaves.lead(id), queryFn: ({ signal }) => ler(api.GET("/commercial/leads/{leadId}", { params: { path: { leadId: id } }, signal })) });
}

export function useGuardarLead() {
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: async ({ id, corpo }: { id: string | null; corpo: PedidoLead }): Promise<string> => {
      if (id === null) return (await ler(api.POST("/commercial/leads", { body: corpo }))).leadId;
      await enviar(api.PUT("/commercial/leads/{leadId}", { params: { path: { leadId: id } }, body: corpo }));
      return id;
    },
    onSuccess: invalidar,
  });
}

export function useAvancarLead(id: string) {
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: (estado: "Contacted" | "Qualified") => enviar(api.POST("/commercial/leads/{leadId}/status", { params: { path: { leadId: id } }, body: { status: estado } })),
    onSuccess: invalidar,
  });
}

export function useDesqualificarLead(id: string) {
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: (motivo: string) => enviar(api.POST("/commercial/leads/{leadId}/disqualification", { params: { path: { leadId: id } }, body: { reason: motivo } })),
    onSuccess: invalidar,
  });
}

export function useConverterLead(id: string) {
  const qc = useQueryClient();
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: (corpo: PedidoConversao) => ler(api.POST("/commercial/leads/{leadId}/conversion", { params: { path: { leadId: id } }, body: corpo })),
    onSuccess: async () => {
      await invalidar();
      // Pode ter nascido um cliente.
      await qc.invalidateQueries({ queryKey: ["commercial", "customers"] });
    },
  });
}

// --- Oportunidades

export function useOportunidades(f: { etapa: Etapa | null; cliente: string | null }, activo = true) {
  return useQuery({
    queryKey: [...chaves.oportunidades, "list", f],
    queryFn: ({ signal }) => ler(api.GET("/commercial/opportunities", { params: { query: { ...(f.etapa ? { stage: f.etapa } : {}), ...(f.cliente ? { customerId: f.cliente } : {}) } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useOportunidadesPagina(f: { etapa: Etapa | null } & Pag) {
  return useQuery({
    queryKey: [...chaves.oportunidades, "page", f],
    queryFn: ({ signal }) => lerPagina(api.GET("/commercial/opportunities", { params: { query: { page: f.pagina, pageSize: f.tamanho, ...(f.etapa ? { stage: f.etapa } : {}) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useQuadro() {
  return useQuery({ queryKey: [...chaves.oportunidades, "board"], queryFn: ({ signal }) => ler(api.GET("/commercial/opportunities/board", { signal })) });
}

export function useOportunidade(id: string) {
  return useQuery({ queryKey: chaves.oportunidade(id), queryFn: ({ signal }) => ler(api.GET("/commercial/opportunities/{opportunityId}", { params: { path: { opportunityId: id } }, signal })) });
}

export function useHistoricoOportunidade(id: string) {
  return useQuery({
    queryKey: [...chaves.oportunidade(id), "history"],
    queryFn: ({ signal }) => ler(api.GET("/commercial/opportunities/{opportunityId}/history", { params: { path: { opportunityId: id } }, signal })),
  });
}

export function useGuardarOportunidade() {
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: async ({ id, corpo }: { id: string | null; corpo: PedidoOportunidade }): Promise<string> => {
      if (id === null) return (await ler(api.POST("/commercial/opportunities", { body: corpo }))).opportunityId;
      await enviar(api.PUT("/commercial/opportunities/{opportunityId}", { params: { path: { opportunityId: id } }, body: corpo }));
      return id;
    },
    onSuccess: invalidar,
  });
}

export function useMoverOportunidade() {
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: ({ id, etapa, posicao }: { id: string; etapa: EtapaAberta; posicao: number | null }) =>
      enviar(api.POST("/commercial/opportunities/{opportunityId}/stage", { params: { path: { opportunityId: id } }, body: { stage: etapa, boardOrder: posicao } })),
    onSuccess: invalidar,
  });
}

export function useGanharOportunidade(id: string) {
  const invalidar = useInvalidarCrm();
  return useEscrita({ mutationFn: () => enviar(api.POST("/commercial/opportunities/{opportunityId}/won", { params: { path: { opportunityId: id } } })), onSuccess: invalidar });
}

export function usePerderOportunidade(id: string) {
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: (motivo: string) => enviar(api.POST("/commercial/opportunities/{opportunityId}/lost", { params: { path: { opportunityId: id } }, body: { reason: motivo } })),
    onSuccess: invalidar,
  });
}

// --- Actividades

export function useActividades(f: { lead?: string; oportunidade?: string; cliente?: string; feitas: boolean | null }, activo = true) {
  return useQuery({
    queryKey: [...chaves.actividades, f],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/commercial/activities", {
          params: {
            query: {
              ...(f.lead ? { leadId: f.lead } : {}),
              ...(f.oportunidade ? { opportunityId: f.oportunidade } : {}),
              ...(f.cliente ? { customerId: f.cliente } : {}),
              ...(f.feitas === null ? {} : { done: f.feitas }),
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useActividadesPagina(f: { feitas: boolean | null } & Pag) {
  return useQuery({
    queryKey: [...chaves.actividades, "page", f],
    queryFn: ({ signal }) => lerPagina(api.GET("/commercial/activities", { params: { query: { page: f.pagina, pageSize: f.tamanho, ...(f.feitas === null ? {} : { done: f.feitas }) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useRegistarActividade() {
  const invalidar = useInvalidarCrm();
  return useEscrita({ mutationFn: (corpo: PedidoActividade) => ler(api.POST("/commercial/activities", { body: corpo })), onSuccess: invalidar });
}

export function useConcluirActividade() {
  const invalidar = useInvalidarCrm();
  return useEscrita({ mutationFn: (id: string) => enviar(api.POST("/commercial/activities/{activityId}/completion", { params: { path: { activityId: id } } })), onSuccess: invalidar });
}

// --- Tipos de serviço

export function useTiposServico(inactivos: boolean, activo = true) {
  return useQuery({
    queryKey: [...chaves.servicos, inactivos],
    queryFn: ({ signal }) => ler(api.GET("/commercial/service-types", { params: { query: { includeInactive: inactivos } }, signal })),
    enabled: activo,
  });
}

export function useGuardarTipoServico() {
  const invalidar = useInvalidarCrm();
  return useEscrita({
    mutationFn: async ({ id, corpo }: { id: string | null; corpo: PedidoTipoServico }) => {
      if (id === null) await ler(api.POST("/commercial/service-types", { body: corpo }));
      else await enviar(api.PUT("/commercial/service-types/{serviceTypeId}", { params: { path: { serviceTypeId: id } }, body: corpo }));
    },
    onSuccess: invalidar,
  });
}

// --- Relatório

export function useRelatorioComercial(f: { de: string; ate: string; moeda: string }, activo = true) {
  return useQuery({
    queryKey: [...chaves.crm, "report", f],
    queryFn: ({ signal }) => ler(api.GET("/commercial/crm/report", { params: { query: { from: f.de, to: f.ate, currency: f.moeda } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}
