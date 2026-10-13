/**
 * Normalização antes de validar (§7.3, S23), sem zod: o login (chunk inicial)
 * usa isto directamente; os esquemas zod de `text.ts` também.
 */
const CONTROLOS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const CONTROLOS_EXCEPTO_QUEBRA = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;
const INVISIVEIS = /[\u00AD\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function normalizarTexto(v: string, multilinha = false): string {
  const s = v.normalize("NFC").replace(INVISIVEIS, "");
  if (multilinha) return s.replace(/\r\n?/g, "\n").replace(CONTROLOS_EXCEPTO_QUEBRA, "").trim();
  return s.replace(/[\r\n\t]+/g, " ").replace(CONTROLOS, "").trim();
}

/**
 * Forma de um e-mail, para o login. Não substitui o servidor: só evita um
 * pedido que já se sabe que falha.
 */
export function pareceEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
