/**
 * Inventário (§5.10, F9): artigos, armazéns, movimentos, contagens e valorização.
 *
 * Factos (`InventoryModuleEndpoints.cs`, `InventoryItem.cs`, `InventoryCount.cs`,
 * `ManageInventoryCounts.cs`):
 * - ler com `inventory.items.read`, escrever com `inventory.items.write`;
 * - quantidades e custos até 4 casas; custo médio ponderado, recalculado em
 *   cada entrada; um item inactivo não se movimenta;
 * - entrada: quantidade positiva e custo ≥ 0; saída e transferência não deixam
 *   o armazém negativo; ajuste com motivo, diferente de zero e sem deixar
 *   negativo; transferência entre armazéns diferentes;
 * - contagem de um armazém activo: uma linha por item (o servidor diz o
 *   esperado e a variância); fechar sem divergências fecha; com divergências e
 *   política que as cubra fica por aprovar (o stock não muda até à decisão);
 *   sem política, fecha e gera os ajustes; recusada não reabre; cancelar com
 *   motivo;
 * - valorização: valor dos movimentos de cada artigo num período.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Artigo = S["InventoryItemView"];
export type Armazem = S["WarehouseView"];
export type Contagem = S["InventoryCountView"];
export type Movimento = S["StockMovementView"];
export type Valorizacao = S["StockValuationEntry"];

type Pag = { pagina: number; tamanho: number };

export const chaves = {
  artigos: ["inventory", "items"] as const,
  armazens: ["inventory", "warehouses"] as const,
  contagens: ["inventory", "counts"] as const,
  valorizacao: ["inventory", "valuation"] as const,
};

export function useArtigos(p: Pag & { inactivos: boolean }) {
  return useQuery({
    queryKey: [...chaves.artigos, "list", p.inactivos, p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/inventory/items", { params: { query: { includeInactive: p.inactivos, page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

/** Lista de apoio (nomes nas contagens e na valorização), até ao tecto do servidor. */
export const useTodosArtigos = (activo = true) => {
  return useQuery({
    queryKey: [...chaves.artigos, "todos"],
    queryFn: ({ signal }) => lerPagina(api.GET("/inventory/items", { params: { query: { includeInactive: true, page: 1, pageSize: 200 } }, signal })),
    enabled: activo,
  });
};

export function useArtigo(id: string) {
  return useQuery({ queryKey: [...chaves.artigos, "detail", id], queryFn: ({ signal }) => ler(api.GET("/inventory/items/{itemId}", { params: { path: { itemId: id } }, signal })) });
}

export function useRegistarArtigo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["RegisterItemRequest"]) => ler(api.POST("/inventory/items", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.artigos }),
  });
}

export function useEstadoArtigo(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (active: boolean) => enviar(api.POST("/inventory/items/{itemId}/status", { params: { path: { itemId: id } }, body: { active } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.artigos }),
  });
}

export type TipoMovimento = "entrada" | "saida" | "ajuste" | "transferencia";

export function useMovimentar(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (m: { tipo: "entrada"; corpo: S["RegisterStockReceiptRequest"] } | { tipo: "saida"; corpo: S["RegisterMovementRequest"] } | { tipo: "ajuste"; corpo: S["RegisterAdjustmentRequest"] } | { tipo: "transferencia"; corpo: S["TransferStockRequest"] }): Promise<unknown> => {
      const path = { itemId: id };
      switch (m.tipo) {
        case "entrada":
          return ler(api.POST("/inventory/items/{itemId}/movements/receipts", { params: { path }, body: m.corpo }));
        case "saida":
          return ler(api.POST("/inventory/items/{itemId}/movements/issues", { params: { path }, body: m.corpo }));
        case "ajuste":
          return ler(api.POST("/inventory/items/{itemId}/movements/adjustments", { params: { path }, body: m.corpo }));
        case "transferencia":
          return ler(api.POST("/inventory/items/{itemId}/movements/transfers", { params: { path }, body: m.corpo }));
      }
    },
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.artigos }), qc.invalidateQueries({ queryKey: chaves.valorizacao })]),
  });
}

export function useArmazens(p: Pag & { inactivos: boolean }, activo = true) {
  return useQuery({
    queryKey: [...chaves.armazens, "list", p.inactivos, p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/inventory/warehouses", { params: { query: { includeInactive: p.inactivos, page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Lista de apoio: todos os armazéns (nomes) — os activos para escolher. */
export const useTodosArmazens = (activo = true) => useArmazens({ inactivos: true, pagina: 1, tamanho: 200 }, activo);

export function useRegistarArmazem() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["RegisterWarehouseRequest"]) => ler(api.POST("/inventory/warehouses", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.armazens }),
  });
}

export function useEstadoArmazem() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => enviar(api.POST("/inventory/warehouses/{warehouseId}/status", { params: { path: { warehouseId: id } }, body: { active } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.armazens }),
  });
}

export function useContagens(p: Pag & { armazem: string | null }) {
  return useQuery({
    queryKey: [...chaves.contagens, "list", p.armazem, p.pagina, p.tamanho],
    queryFn: ({ signal }) => lerPagina(api.GET("/inventory/counts", { params: { query: { ...(p.armazem ? { warehouseId: p.armazem } : {}), page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useContagem(id: string) {
  return useQuery({ queryKey: [...chaves.contagens, "detail", id], queryFn: ({ signal }) => ler(api.GET("/inventory/counts/{countId}", { params: { path: { countId: id } }, signal })) });
}

export function useAbrirContagem() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["OpenCountRequest"]) => ler(api.POST("/inventory/counts", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.contagens }),
  });
}

export function useContarItem(countId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["AddCountLineRequest"]) => ler(api.POST("/inventory/counts/{countId}/lines", { params: { path: { countId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.contagens }),
  });
}

const invalidarContagem = (qc: ReturnType<typeof useQueryClient>) => Promise.all([qc.invalidateQueries({ queryKey: chaves.contagens }), qc.invalidateQueries({ queryKey: chaves.artigos })]);

export function useFecharContagem(countId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/inventory/counts/{countId}/close", { params: { path: { countId } } })),
    onSuccess: () => invalidarContagem(qc),
  });
}

export function useVerDecisaoContagem(countId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/inventory/counts/{countId}/decision", { params: { path: { countId } } })),
    onSuccess: () => invalidarContagem(qc),
  });
}

export function useCancelarContagem(countId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (reason: string) => enviar(api.POST("/inventory/counts/{countId}/cancellation", { params: { path: { countId } }, body: { reason } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.contagens }),
  });
}

export function useValorizacao(p: { de: string; ate: string }, activo: boolean) {
  return useQuery({
    queryKey: [...chaves.valorizacao, p.de, p.ate],
    queryFn: ({ signal }) => ler(api.GET("/inventory/valuation", { params: { query: { from: p.de, to: p.ate } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}
