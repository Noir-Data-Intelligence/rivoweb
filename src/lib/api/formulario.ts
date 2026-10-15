/**
 * Erros de validação do servidor → campos do formulário (§4.6). O nome do
 * campo converte-se (`Lines[0].Quantity` → `lines.0.quantity`) e casa sem
 * distinguir maiúsculas. O que não casa com nenhum campo volta para o alerta
 * no topo do formulário.
 */
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { eApiError } from "./problem";

export function nomeDeCampo(servidor: string): string {
  return servidor
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
    .map((s) => s.charAt(0).toLowerCase() + s.slice(1))
    .join(".");
}

/**
 * Aplica os erros de um 400 aos campos conhecidos. `aliases` liga chaves do
 * servidor que não são nomes de campo (por exemplo `pedido`, `emitente`) a um
 * campo concreto. Devolve as mensagens que ficaram por colocar.
 */
export function aplicarErrosDoServidor<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
  campos: readonly Path<T>[],
  aliases: Readonly<Record<string, Path<T>>> = {},
): string[] {
  if (!eApiError(erro) || erro.status !== 400) return [];
  // Um 400 só com `detail` (sem mapa de campos) também tem de aparecer.
  if (Object.keys(erro.errors).length === 0) return [erro.detail ?? "O servidor recusou os dados. Reveja e tente de novo."];
  const porNome = new Map(campos.map((c) => [c.toLowerCase(), c]));
  const soltas: string[] = [];
  let primeiro = true;
  for (const [chave, mensagens] of Object.entries(erro.errors)) {
    const nome = nomeDeCampo(chave).toLowerCase();
    const campo = porNome.get(nome) ?? aliases[chave] ?? aliases[nome];
    if (campo === undefined) {
      soltas.push(...mensagens);
      continue;
    }
    setError(campo, { type: "server", message: mensagens.join(" ") }, { shouldFocus: primeiro });
    primeiro = false;
  }
  return soltas;
}
