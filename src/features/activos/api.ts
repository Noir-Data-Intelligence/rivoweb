/**
 * Activos fixos (§5.10, F9): registo, plano e corrida de amortização, abate,
 * manutenção, custódia e seguros.
 *
 * Factos (`TreasuryEndpoints.cs`, `SpendingEndpoints.cs`, `TreasuryAndAssets.cs`,
 * `ManageTreasury.cs`):
 * - ler com `finance.assets.read`, escrever com `finance.assets.write`;
 * - registo: código único (vazio gera um), custo positivo e residual entre zero
 *   e o custo, vida útil de 1 a 1200 meses, a amortização não começa antes do
 *   mês da aquisição; quotas decrescentes exigem a taxa anual, unidades de
 *   produção o total de unidades; o `PUT` substitui tudo e só antes de haver
 *   amortização registada;
 * - corrida mensal: idempotente por activo e mês; unidades de produção exigem
 *   as unidades usadas no mês; diz quantos registou, quantos já estavam e os
 *   que saltou;
 * - abate depois da aquisição, valor de venda não negativo; um activo abatido
 *   não recebe manutenção nem se entrega;
 * - manutenção agendada conclui-se (custo ≥ 0) ou cancela-se; custódia só de um
 *   activo em uso, devolução não antes da entrega; apólice não acaba antes de
 *   começar, prémio e capital ≥ 0; cancelada não se altera.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Activo = S["FixedAssetView"];
export type FichaActivo = S["FixedAssetDetailView"];
export type PedidoActivo = S["AssetRequest"];
export type Manutencao = S["AssetMaintenanceView"];
export type Custodia = S["AssetCustodyView"];
export type Apolice = S["AssetInsuranceView"];
export type PedidoApolice = S["AssetPolicyInput"];

export const chaves = {
  activos: ["finance", "assets"] as const,
};
const invalidar = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: chaves.activos });

export function useActivos(f: { estado: "Active" | "Disposed" | null; categoria: string | null }) {
  return useQuery({
    queryKey: [...chaves.activos, "list", f.estado, f.categoria],
    queryFn: ({ signal }) => ler(api.GET("/finance/assets", { params: { query: { ...(f.estado ? { status: f.estado } : {}), ...(f.categoria ? { category: f.categoria } : {}) } }, signal })),
  });
}

export function useActivo(id: string) {
  return useQuery({ queryKey: [...chaves.activos, "detail", id], queryFn: ({ signal }) => ler(api.GET("/finance/assets/{assetId}", { params: { path: { assetId: id } }, signal })) });
}

export function useRegistarActivo() {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: PedidoActivo) => ler(api.POST("/finance/assets", { body: b })), onSuccess: () => invalidar(qc) });
}

export function useCorrigirActivo(id: string) {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: PedidoActivo) => enviar(api.PUT("/finance/assets/{assetId}", { params: { path: { assetId: id } }, body: b })), onSuccess: () => invalidar(qc) });
}

export function useCorrerAmortizacao() {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: S["DepreciationRunRequest"]) => ler(api.POST("/finance/assets/depreciation-runs", { body: b })), onSuccess: () => invalidar(qc) });
}

export function useAbater(id: string) {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: S["DisposalRequest"]) => enviar(api.POST("/finance/assets/{assetId}/disposal", { params: { path: { assetId: id } }, body: b })), onSuccess: () => invalidar(qc) });
}

// --- Manutenção

export function useManutencoes(f: { activo: string | null; estado: "Scheduled" | "Completed" | "Cancelled" | null }) {
  return useQuery({
    queryKey: [...chaves.activos, "maintenance", f.activo, f.estado],
    queryFn: ({ signal }) => ler(api.GET("/finance/assets/maintenance", { params: { query: { ...(f.activo ? { assetId: f.activo } : {}), ...(f.estado ? { status: f.estado } : {}) } }, signal })),
  });
}

export function useAgendarManutencao(id: string) {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: S["MaintenanceRequest"]) => ler(api.POST("/finance/assets/{assetId}/maintenance", { params: { path: { assetId: id } }, body: b })), onSuccess: () => invalidar(qc) });
}

export function useConcluirManutencao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, ...b }: S["MaintenanceCompletionRequest"] & { id: string }) => enviar(api.POST("/finance/assets/maintenance/{maintenanceId}/completion", { params: { path: { maintenanceId: id } }, body: b })),
    onSuccess: () => invalidar(qc),
  });
}

export function useCancelarManutencao() {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (id: string) => enviar(api.POST("/finance/assets/maintenance/{maintenanceId}/cancellation", { params: { path: { maintenanceId: id } } })), onSuccess: () => invalidar(qc) });
}

// --- Custódia

export function useCustodias(f: { activo: string | null; colaborador: string | null; abertas: boolean }) {
  return useQuery({
    queryKey: [...chaves.activos, "custody", f.activo, f.colaborador, f.abertas],
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/assets/custody", { params: { query: { ...(f.activo ? { assetId: f.activo } : {}), ...(f.colaborador ? { employeeId: f.colaborador } : {}), openOnly: f.abertas } }, signal })),
  });
}

export function useEntregar(id: string) {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: S["CustodyRequest"]) => ler(api.POST("/finance/assets/{assetId}/custody", { params: { path: { assetId: id } }, body: b })), onSuccess: () => invalidar(qc) });
}

export function useDevolver() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, ...b }: S["CustodyReturnRequest"] & { id: string }) => enviar(api.POST("/finance/assets/custody/{custodyId}/return", { params: { path: { custodyId: id } }, body: b })),
    onSuccess: () => invalidar(qc),
  });
}

// --- Seguros

export function useApolices(f: { activo: string | null; dias: number | null }) {
  return useQuery({
    queryKey: [...chaves.activos, "insurance", f.activo, f.dias],
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/assets/insurance", { params: { query: { ...(f.activo ? { assetId: f.activo } : {}), ...(f.dias !== null ? { expiringWithinDays: f.dias } : {}) } }, signal })),
  });
}

export function useContratarApolice(id: string) {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: PedidoApolice) => ler(api.POST("/finance/assets/{assetId}/insurance", { params: { path: { assetId: id } }, body: b })), onSuccess: () => invalidar(qc) });
}

export function useCorrigirApolice() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, ...b }: PedidoApolice & { id: string }) => enviar(api.PUT("/finance/assets/insurance/{policyId}", { params: { path: { policyId: id } }, body: b })),
    onSuccess: () => invalidar(qc),
  });
}

export function useCancelarApolice() {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (id: string) => enviar(api.POST("/finance/assets/insurance/{policyId}/cancellation", { params: { path: { policyId: id } } })), onSuccess: () => invalidar(qc) });
}
