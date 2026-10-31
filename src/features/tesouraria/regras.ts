/**
 * Regras da tesouraria iguais às do servidor (ADR-098, ADR-100): o front avisa
 * antes de enviar, o servidor decide sempre.
 */

/** O mês anterior ao de hoje (`AAAA-MM`): o que normalmente se paga ou entrega. */
export function mesAnterior(hoje: string): string {
  const [a, m] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))];
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * A data-valor de um movimento: nunca no futuro e, num pagamento de um mês
 * (salários, impostos), não antes do primeiro dia desse mês.
 */
export function erroDataValor(data: string, hoje: string, mes: string | null = null): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return "Indique a data.";
  if (data > hoje) return "A data não pode ser futura.";
  if (mes && data < `${mes}-01`) return "Não antes do mês que se paga.";
  return undefined;
}

/** Meios em que o dinheiro entra por banco (transferência, Multicaixa, cartões): pedem a conta. */
export const MEIOS_POR_BANCO: readonly string[] = ["TB", "MB", "CC", "CD"];
