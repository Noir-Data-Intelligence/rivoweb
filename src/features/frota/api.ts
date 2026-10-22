/**
 * Frota (§5.13, F12): viaturas, manutenção (registos e planos), atribuições,
 * viagens, despesas, documentos e seguros com sinistros.
 *
 * Factos (`FleetModuleEndpoints.cs`, `InsuranceEndpoints.cs`, `Vehicle.cs`,
 * `Insurance.cs`):
 * - ler com `fleet.vehicles.read`, escrever com `fleet.vehicles.write`;
 * - viatura: matrícula (20, em maiúsculas, única: 409) e modelo (100);
 *   desactivar não se desfaz; inactiva não recebe manutenção, atribuições,
 *   planos (agendar ou concluir), viagens nem despesas;
 * - manutenção: preventiva ou correctiva, descrição (500); uma aberta de cada
 *   vez (a viatura fica «em manutenção»); fechar não antes do início, custo
 *   opcional ≥ 0;
 * - atribuição: um colaborador (o servidor confirma), uma aberta de cada vez;
 *   terminar não antes do início;
 * - plano preventivo: descrição (500), intervalo em dias > 0, primeira data;
 *   concluir um ciclo reagenda para a data + o intervalo; cancelar não se
 *   desfaz;
 * - viagem já feita: motorista opcional, fim não antes do início, odómetro
 *   inicial ≥ 0 e final ≥ inicial, motivo (500);
 * - despesa: combustível, portagem ou estacionamento, valor > 0, sempre em AOA,
 *   descrição (500);
 * - documento: carregado por quem o junta (ou qualquer um, com
 *   `documents.read`; outro dá 404), categoria (100); retirar pede o motivo
 *   (500), pelo id do documento; abre-se pela viatura, com a leitura da frota
 *   (B40);
 * - apólice: seguradora (200) e número (60, únicos juntos: 409), cobertura
 *   (200; vazia, «Responsabilidade civil»), fim não antes do início, prémio e
 *   capital ≥ 0, moeda ISO (vazia, AOA), notas (1000); anulada não se altera;
 *   anular com a data;
 * - sinistro: dentro da vigência (e antes da anulação), descrição (1000),
 *   valor reclamado ≥ 0, referência (60); aberto paga-se (valor ≥ 0) ou
 *   recusa-se;
 * - as vistas trazem o nome de quem tem a viatura e de quem conduziu; os
 *   colaboradores activos escolhem-se em `/fleet/lookups`, para quem escreve
 *   na frota, sem os RH (B40).
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Viatura = S["VehicleView"];
export type RegistoManutencao = S["MaintenanceRecordView"];
export type Atribuicao = S["VehicleAssignmentView"];
export type Plano = S["MaintenancePlanView"];
export type PlanoPrevisto = S["DueMaintenancePlanView"];
export type Viagem = S["VehicleTripView"];
export type Despesa = S["FleetExpenseView"];
export type DocumentoViatura = S["VehicleDocumentView"];
export type Apolice = S["InsurancePolicyView"];
export type PedidoApolice = S["PolicyRequest"];
export type Sinistro = S["InsuranceClaimView"];

const CHAVE = ["fleet"] as const;

export function useViaturas(f: { inactivas: boolean; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: [...CHAVE, "vehicles", f],
    queryFn: ({ signal }) => lerPagina(api.GET("/fleet/vehicles", { params: { query: { includeInactive: f.inactivas, page: f.pagina, pageSize: f.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

/** Colaboradores activos para atribuir e indicar o motorista (B40). */
export function useEscolhasFrota(activo: boolean) {
  return useQuery({ queryKey: [...CHAVE, "lookups"], queryFn: ({ signal }) => ler(api.GET("/fleet/lookups", { signal })), enabled: activo, staleTime: 60_000 });
}

export function useViatura(id: string) {
  return useQuery({ queryKey: [...CHAVE, "vehicle", id], queryFn: ({ signal }) => ler(api.GET("/fleet/vehicles/{vehicleId}", { params: { path: { vehicleId: id } }, signal })) });
}

export function useRegistarViatura() {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: S["RegisterVehicleRequest"]) => ler(api.POST("/fleet/vehicles", { body: b })), onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }) });
}

export type AcaoViatura =
  | { acto: "desactivar" }
  | { acto: "abrirManutencao"; corpo: S["OpenMaintenanceRequest"] }
  | { acto: "fecharManutencao"; manutencao: string; corpo: S["CloseMaintenanceRequest"] }
  | { acto: "atribuir"; corpo: S["AssignVehicleRequest"] }
  | { acto: "terminarAtribuicao"; atribuicao: string; corpo: S["EndAssignmentRequest"] }
  | { acto: "agendarPlano"; corpo: S["SchedulePlanRequest"] }
  | { acto: "concluirCiclo"; plano: string; corpo: S["CompletePlanCycleRequest"] }
  | { acto: "cancelarPlano"; plano: string }
  | { acto: "viagem"; corpo: S["RegisterTripRequest"] }
  | { acto: "despesa"; corpo: S["RegisterExpenseRequest"] }
  | { acto: "anexar"; corpo: S["AttachVehicleDocumentRequest"] }
  | { acto: "retirarDocumento"; documento: string; corpo: S["RemoveVehicleDocumentRequest"] }
  | { acto: "apolice"; corpo: PedidoApolice };

/** Todos os actos sobre uma viatura; cada um invalida a frota. */
export function useAcaoViatura(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (a: AcaoViatura): Promise<unknown> => {
      const path = { vehicleId: id };
      switch (a.acto) {
        case "desactivar":
          return enviar(api.POST("/fleet/vehicles/{vehicleId}/deactivation", { params: { path } }));
        case "abrirManutencao":
          return ler(api.POST("/fleet/vehicles/{vehicleId}/maintenance", { params: { path }, body: a.corpo }));
        case "fecharManutencao":
          return enviar(api.POST("/fleet/vehicles/{vehicleId}/maintenance/{maintenanceId}/closure", { params: { path: { ...path, maintenanceId: a.manutencao } }, body: a.corpo }));
        case "atribuir":
          return ler(api.POST("/fleet/vehicles/{vehicleId}/assignments", { params: { path }, body: a.corpo }));
        case "terminarAtribuicao":
          return enviar(api.POST("/fleet/vehicles/{vehicleId}/assignments/{assignmentId}/closure", { params: { path: { ...path, assignmentId: a.atribuicao } }, body: a.corpo }));
        case "agendarPlano":
          return ler(api.POST("/fleet/vehicles/{vehicleId}/maintenance-plans", { params: { path }, body: a.corpo }));
        case "concluirCiclo":
          return enviar(api.POST("/fleet/vehicles/{vehicleId}/maintenance-plans/{planId}/cycles", { params: { path: { ...path, planId: a.plano } }, body: a.corpo }));
        case "cancelarPlano":
          return enviar(api.POST("/fleet/vehicles/{vehicleId}/maintenance-plans/{planId}/cancellation", { params: { path: { ...path, planId: a.plano } } }));
        case "viagem":
          return ler(api.POST("/fleet/vehicles/{vehicleId}/trips", { params: { path }, body: a.corpo }));
        case "despesa":
          return ler(api.POST("/fleet/vehicles/{vehicleId}/expenses", { params: { path }, body: a.corpo }));
        case "anexar":
          return ler(api.POST("/fleet/vehicles/{vehicleId}/documents", { params: { path }, body: a.corpo }));
        case "retirarDocumento":
          return enviar(api.POST("/fleet/vehicles/{vehicleId}/documents/{documentId}/removal", { params: { path: { ...path, documentId: a.documento } }, body: a.corpo }));
        case "apolice":
          return ler(api.POST("/fleet/vehicles/{vehicleId}/insurance", { params: { path }, body: a.corpo }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useDocumentosViatura(id: string, p: { pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: [...CHAVE, "documents", id, p],
    queryFn: ({ signal }) => lerPagina(api.GET("/fleet/vehicles/{vehicleId}/documents", { params: { path: { vehicleId: id }, query: { page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function usePlanosPrevistos(f: { dias: number; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: [...CHAVE, "due", f],
    queryFn: ({ signal }) => lerPagina(api.GET("/fleet/maintenance-plans/due", { params: { query: { withinDays: f.dias, page: f.pagina, pageSize: f.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useApolices(f: { viatura: string | null; dias: number | null }) {
  return useQuery({
    queryKey: [...CHAVE, "insurance", f],
    queryFn: ({ signal }) => ler(api.GET("/fleet/insurance", { params: { query: { ...(f.viatura ? { vehicleId: f.viatura } : {}), ...(f.dias !== null ? { expiringWithinDays: f.dias } : {}) } }, signal })),
  });
}

export function useSinistros(apolice: string, activo: boolean) {
  return useQuery({ queryKey: [...CHAVE, "claims", apolice], queryFn: ({ signal }) => ler(api.GET("/fleet/insurance/{policyId}/claims", { params: { path: { policyId: apolice } }, signal })), enabled: activo });
}

export type AcaoApolice =
  | { acto: "corrigir"; corpo: PedidoApolice }
  | { acto: "anular"; corpo: S["CancelPolicyRequest"] }
  | { acto: "sinistro"; corpo: S["ClaimRequest"] }
  | { acto: "pagar"; sinistro: string; corpo: S["SettleClaimRequest"] }
  | { acto: "recusar"; sinistro: string };

/** Actos sobre uma apólice e os seus sinistros. */
export function useAcaoApolice(apolice: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (a: AcaoApolice): Promise<unknown> => {
      const path = { policyId: apolice };
      switch (a.acto) {
        case "corrigir":
          return enviar(api.PUT("/fleet/insurance/{policyId}", { params: { path }, body: a.corpo }));
        case "anular":
          return enviar(api.POST("/fleet/insurance/{policyId}/cancellation", { params: { path }, body: a.corpo }));
        case "sinistro":
          return ler(api.POST("/fleet/insurance/{policyId}/claims", { params: { path }, body: a.corpo }));
        case "pagar":
          return enviar(api.POST("/fleet/insurance/{policyId}/claims/{claimId}/settlement", { params: { path: { ...path, claimId: a.sinistro } }, body: a.corpo }));
        case "recusar":
          return enviar(api.POST("/fleet/insurance/{policyId}/claims/{claimId}/rejection", { params: { path: { ...path, claimId: a.sinistro } } }));
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
