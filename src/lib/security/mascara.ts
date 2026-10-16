/**
 * Máscara de valores sensíveis (§7.6): só os últimos quatro caracteres ficam à
 * vista. Valores curtos (até quatro) mascaram-se por inteiro, para a máscara
 * nunca revelar o valor todo.
 */
export function mascarar(valor: string): string {
  const limpo = valor.replace(/\s+/g, "");
  if (limpo.length <= 4) return "••••";
  return `•••• ${limpo.slice(-4)}`;
}
