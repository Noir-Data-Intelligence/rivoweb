/**
 * Normalização antes de validar (§7.3, S23): NFC → sem controlos C0/C1 →
 * sem invisíveis e bidi → trim.
 */
import { z } from "zod/mini";

const CONTROLOS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const CONTROLOS_EXCEPTO_QUEBRA = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g;
const INVISIVEIS = /[\u00AD\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function normalizarTexto(v: string, multilinha = false): string {
  const s = v.normalize("NFC").replace(INVISIVEIS, "");
  if (multilinha) return s.replace(/\r\n?/g, "\n").replace(CONTROLOS_EXCEPTO_QUEBRA, "").trim();
  return s.replace(/[\r\n\t]+/g, " ").replace(CONTROLOS, "").trim();
}

/** Campo de texto de uma linha, normalizado, com limites. */
export function texto(opcoes: { min?: number; max: number; obrigatorio?: string }) {
  const min = opcoes.min ?? (opcoes.obrigatorio ? 1 : 0);
  return z.string().check(
    z.overwrite((v) => normalizarTexto(v)),
    z.minLength(min, opcoes.obrigatorio ?? `Escreva pelo menos ${min} caracteres.`),
    z.maxLength(opcoes.max, `No máximo ${opcoes.max} caracteres.`),
  );
}

export const email = z.pipe(
  z.string().check(
    z.overwrite((v) => normalizarTexto(v).toLowerCase()),
    z.minLength(1, "Escreva o e-mail."),
    z.maxLength(256, "E-mail longo de mais."),
  ),
  z.email("Este e-mail não é válido."),
);

/**
 * Política de password do backend (Facto: `IdentityModuleExtensions.cs`:
 * 12 caracteres, dígito, minúscula, maiúscula, não alfanumérico).
 * Não se normaliza: a password vai tal como foi escrita.
 */
export const REGRAS_PASSWORD = [
  { id: "tamanho", texto: "Pelo menos 12 caracteres", ok: (s: string) => s.length >= 12 },
  { id: "minuscula", texto: "Uma letra minúscula", ok: (s: string) => /[a-z]/.test(s) },
  { id: "maiuscula", texto: "Uma letra maiúscula", ok: (s: string) => /[A-Z]/.test(s) },
  { id: "digito", texto: "Um algarismo", ok: (s: string) => /[0-9]/.test(s) },
  { id: "simbolo", texto: "Um símbolo (por exemplo ! ? # %)", ok: (s: string) => /[^a-zA-Z0-9]/.test(s) },
] as const;

export const novaPassword = z.string().check(
  z.maxLength(128, "No máximo 128 caracteres."),
  z.refine((s) => REGRAS_PASSWORD.every((r) => r.ok(s)), "A password não cumpre as regras indicadas."),
);

export const IsoDate = z.string().check(
  z.regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  z.refine((s) => {
    const [a, m, d] = s.split("-").map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(a, m - 1, d));
    return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Data inválida."),
);

export const uuid = z.string().check(z.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
