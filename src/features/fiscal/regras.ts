/**
 * Regras das versões fiscais, iguais às do servidor (`Rivo.Fiscal.Domain`):
 * o front avisa antes de enviar, o servidor decide sempre.
 */
import type Big from "big.js";

type ComVigencia = { readonly effectiveFrom: string; readonly effectiveTo: string | null };

/** A versão que vigora numa data (datas ISO comparam-se como texto). */
export function versaoEmVigor<T extends ComVigencia>(versoes: readonly T[], data: string): T | undefined {
  return versoes.find((v) => v.effectiveFrom <= data && (v.effectiveTo === null || v.effectiveTo >= data));
}

/** A primeira versão cuja vigência se cruza com [de, ate] (`ate` nulo = sem fim). */
export function versaoSobreposta<T extends ComVigencia>(versoes: readonly T[], de: string, ate: string | null): T | undefined {
  return versoes.find((v) => (ate === null || v.effectiveFrom <= ate) && (v.effectiveTo === null || v.effectiveTo >= de));
}

/** Versões da mais recente para a mais antiga. */
export function ordenarVersoes<T extends ComVigencia>(versoes: readonly T[]): T[] {
  return [...versoes].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

export type EscalaoDigitado = { readonly limiar: Big | null; readonly parcela: Big | null; readonly taxa: Big | null };

/** Mensagem do primeiro problema dos escalões, ou `null` se estão bem. */
export function problemaEscaloes(escaloes: readonly EscalaoDigitado[]): string | null {
  if (escaloes.length === 0) return "Uma tabela de escalões precisa de pelo menos um escalão.";
  for (const e of escaloes) {
    if (!e.limiar || !e.parcela || !e.taxa) return "Preencha o limiar, a parcela fixa e a taxa de cada escalão.";
    if (e.limiar.lt(0)) return "O limiar de um escalão não pode ser negativo.";
    if (e.parcela.lt(0)) return "A parcela fixa não pode ser negativa.";
    if (e.taxa.lt(0) || e.taxa.gt(100)) return "A taxa de um escalão está entre 0 e 100 por cento.";
  }
  const limiares = escaloes.map((e) => e.limiar as Big).sort((a, b) => a.cmp(b));
  if (limiares.some((l, i) => i > 0 && l.eq(limiares[i - 1] as Big))) return "Dois escalões com o mesmo limiar tornam a selecção ambígua.";
  if (!(limiares[0] as Big).eq(0)) return "O primeiro escalão tem de começar em zero (é a isenção).";
  return null;
}
