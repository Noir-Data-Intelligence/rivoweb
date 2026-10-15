/**
 * Normalização antes de validar (§7.3, S23): NFC → sem controlos C0/C1 →
 * sem invisíveis e bidi → trim.
 */
import { z } from "zod/mini";
import { normalizarTexto, pareceEmail } from "./normalizar";

export { normalizarTexto };

/** Campo de texto de uma linha, normalizado, com limites. */
export function texto(opcoes: { min?: number; max: number; obrigatorio?: string }) {
  const min = opcoes.min ?? (opcoes.obrigatorio ? 1 : 0);
  return z.string().check(
    z.overwrite((v) => normalizarTexto(v)),
    z.minLength(min, opcoes.obrigatorio ?? `Escreva pelo menos ${min} caracteres.`),
    z.maxLength(opcoes.max, `No máximo ${opcoes.max} caracteres.`),
  );
}

/** E-mail que pode ficar vazio (contactos). Limite das colunas da API: 200. */
export const emailOpcional = z.string().check(
  z.overwrite((v) => normalizarTexto(v).toLowerCase()),
  z.maxLength(200, "No máximo 200 caracteres."),
  z.refine((v) => v === "" || pareceEmail(v), "Este e-mail não é válido."),
);

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

/**
 * IBAN pela norma ISO 13616 (resto 97 = 1), sem espaços e em maiúsculas. É a
 * mesma verificação do servidor: um IBAN errado paga a outra pessoa.
 */
export function ibanValido(iban: string): boolean {
  const s = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const rodado = s.slice(4) + s.slice(0, 4);
  let resto = 0;
  for (const c of rodado) {
    const v = c >= "A" ? String(c.charCodeAt(0) - 55) : c;
    for (const d of v) resto = (resto * 10 + Number(d)) % 97;
  }
  return resto === 1;
}
