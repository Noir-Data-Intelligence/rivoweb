/** Regras do período da trilha: dias UTC inclusivos, no máximo 366 (`QueryAuditTrail.cs`). */

/** Período máximo da contagem por dia (`QueryAuditTrail.MaxDays`). */
export const MAXIMO_DIAS = 366;

const dia = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

/** Quantos dias tem o período, contando os dois extremos. */
export const diasDoPeriodo = (de: string, ate: string) => dia(ate) - dia(de) + 1;

/** `AAAA-MM-DD` de `n` dias antes de `iso`. */
export function diasAntes(iso: string, n: number): string {
  return new Date((dia(iso) - n) * 86_400_000).toISOString().slice(0, 10);
}

/** O erro do período, ou nada. */
export function erroPeriodo(de: string, ate: string): string | undefined {
  if (de > ate) return "O fim não pode ser antes do início.";
  if (diasDoPeriodo(de, ate) > MAXIMO_DIAS) return `O período tem no máximo ${String(MAXIMO_DIAS)} dias.`;
  return undefined;
}
