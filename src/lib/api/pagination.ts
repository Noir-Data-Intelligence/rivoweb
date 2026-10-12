/** Paginação por cabeçalhos (ADR-068). O corpo é sempre um array. */
export type Pagina<T> = {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
};

export const TAMANHOS_PAGINA = [25, 50, 100] as const;
export const TAMANHO_PAGINA_OMISSAO = 25;

function inteiro(v: string | null): number | null {
  if (v === null || !/^\d+$/.test(v.trim())) return null;
  return Number(v.trim());
}

export function lerPaginacao<T>(items: readonly T[], headers: Headers): Pagina<T> {
  return {
    items,
    page: inteiro(headers.get("X-Page")) ?? 1,
    pageSize: inteiro(headers.get("X-Page-Size")) ?? items.length,
    total: inteiro(headers.get("X-Total-Count")) ?? items.length,
  };
}
