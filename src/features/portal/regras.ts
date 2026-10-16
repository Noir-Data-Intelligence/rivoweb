/**
 * Regras do portal que o front valida antes de enviar, iguais às do servidor
 * (`EmployeePortalModuleEndpoints.cs`, `LeaveRequest.cs`). O servidor decide
 * sempre; isto só evita um pedido que se sabe recusado.
 */
import { decimalParaApi, lerDecimalDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import type { Anuncio } from "./api";

export { diasDeCalendario, validarFerias, type ErrosFerias } from "@/features/rh";

/** Limites das colunas do servidor (`HrDbContext.cs`). */
export const MAXIMO_ASSUNTO = 200;
export const MAXIMO_MENSAGEM = 4000;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dia(iso: string): number | null {
  if (!ISO.test(iso)) return null;
  const t = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return new Date(t).toISOString().slice(0, 10) === iso ? t / 86_400_000 : null;
}

/** Soma dias a uma data ISO. */
export function somarDias(iso: string, n: number): string {
  const d = dia(iso);
  if (d === null) return iso;
  return new Date((d + n) * 86_400_000).toISOString().slice(0, 10);
}

/** Primeiro dia do mês de uma data ISO. */
export const inicioDoMes = (iso: string) => `${iso.slice(0, 8)}01`;

/** Janela dos turnos: fim não antes do início e no máximo 93 dias depois. */
export function erroJanelaTurnos(de: string, ate: string): string | undefined {
  const a = dia(de);
  const b = dia(ate);
  if (a === null || b === null) return "Indique as duas datas.";
  if (b < a) return "A data final tem de ser igual ou posterior à inicial.";
  if (b - a > 93) return "No máximo 93 dias.";
  return undefined;
}

/** Janela da assiduidade: só o fim não pode vir antes do início. */
export function erroJanelaAssiduidade(de: string, ate: string): string | undefined {
  const a = dia(de);
  const b = dia(ate);
  if (a === null || b === null) return "Indique as duas datas.";
  if (b < a) return "A data final não pode ser anterior à inicial.";
  return undefined;
}

/** Valor actual de um resultado-chave: decimal com até 4 casas, como texto para a API. */
export function lerValorResultado(texto: string): string | null {
  const v = lerDecimalDigitado(normalizarTexto(texto), 4);
  return v === null ? null : decimalParaApi(v);
}

/** Percentagem entre 0 e 100 para a barra de progresso. */
export function percentagemBarra(progresso: number | string): number {
  const n = Number(progresso);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Fixados primeiro; dentro de cada grupo, o mais recente primeiro. */
export function ordenarAnuncios(lista: readonly Anuncio[]): Anuncio[] {
  return [...lista].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishedAt.localeCompare(a.publishedAt));
}
