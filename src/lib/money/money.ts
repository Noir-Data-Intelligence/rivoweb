/**
 * Dinheiro (§2.6). Nunca em `number`: converte-se para `Big` na fronteira e
 * sobe para a API como texto decimal (o contrato aceita `number | string` em
 * todos os decimais, Verificado no OpenAPI de 2026-10-12).
 */
import Big from "big.js";

declare const marca: unique symbol;
export type Dinheiro = Big & { readonly [marca]: "Dinheiro" };

// Arredondamento: metade para longe do zero (ROUND_HALF_UP), como o
// MidpointRounding.AwayFromZero do backend nos totais de documentos.
Big.RM = Big.roundHalfUp;
Big.DP = 20;
Big.NE = -30;
Big.PE = 30;

/**
 * Converte o valor que a API devolve. Um `double` com até 15 algarismos
 * significativos volta a texto exactamente (`String(n)` dá a representação
 * mais curta), o que cobre até 9 999 999 999 999,99.
 */
export function dinheiro(v: number | string): Dinheiro {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new RangeError("Valor monetário inválido.");
    return new Big(String(v)) as Dinheiro;
  }
  const s = v.trim();
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new RangeError("Valor monetário inválido.");
  return new Big(s) as Dinheiro;
}

/** Texto decimal para enviar à API, com as casas da moeda. */
export function paraApi(v: Dinheiro, casas = 2): string {
  return v.round(casas).toFixed(casas);
}

/**
 * Lê o que a pessoa escreveu num campo de valor («1 234,50», «1234.5»).
 * Devolve null se não for um valor válido. Sem expoentes nem NaN.
 */
export function lerDinheiroDigitado(texto: string, casas = 2): Dinheiro | null {
  const s = texto.replace(/[\s\u00A0\u202F]/g, "").replace(/\u2212/g, "-");
  if (s === "") return null;
  let normal: string;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) normal = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+(,\d+)?$/.test(s)) normal = s.replace(",", ".");
  else if (/^-?\d+(\.\d+)?$/.test(s)) normal = s;
  else return null;
  const casasDadas = normal.split(".")[1]?.length ?? 0;
  if (casasDadas > casas) return null;
  return new Big(normal) as Dinheiro;
}
