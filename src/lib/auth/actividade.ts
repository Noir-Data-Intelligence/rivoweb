/**
 * Relógio de inactividade (§7.1). O servidor conta a inactividade desde o
 * último pedido autenticado, por isso o relógio local reinicia-se a cada
 * resposta autenticada bem-sucedida. Usa `performance.now()` (monotónico):
 * mudar a hora do sistema não altera os prazos.
 */
let ultimoPedido: number = performance.now();
let ultimaInteraccao: number = performance.now();

export function registarPedidoAutenticado(agora: number = performance.now()): void {
  ultimoPedido = agora;
}

export function registarInteraccao(agora: number = performance.now()): void {
  ultimaInteraccao = agora;
}

export function msDesdeUltimoPedido(agora: number = performance.now()): number {
  return agora - ultimoPedido;
}

/**
 * Pode fazer-se polling (§5.3)? Só com o documento visível **e** interacção
 * real (teclado, rato, toque) depois do último pedido autenticado. Cada
 * pedido autenticado desliza o prazo de inactividade (ADR-067): sem esta
 * condição, o polling manteria viva a sessão de quem deixou o ecrã aberto.
 * Com ela, o polling nunca prolonga a sessão para lá da última interacção.
 */
export function podeFazerPolling(visivel: boolean, interagiu: boolean = interagiuDepoisDoUltimoPedido()): boolean {
  return visivel && interagiu;
}

/** Houve interacção real (teclado, rato, toque) depois do último pedido? */
export function interagiuDepoisDoUltimoPedido(): boolean {
  return ultimaInteraccao > ultimoPedido;
}

export const AVISO_INACTIVIDADE_MS = 2 * 60_000;
export const AVISO_EXPIRACAO_MS = 5 * 60_000;
export const MARGEM_EXPIRACAO_MS = 30_000;
/** Com actividade real e sem pedidos, um `GET /identity/me` no máximo a cada 5 min. */
export const INTERVALO_MANTER_VIVA_MS = 5 * 60_000;

export type EstadoRelogio =
  | { readonly fase: "activa" }
  | { readonly fase: "aviso-inactividade"; readonly restanteMs: number }
  | { readonly fase: "fim-inactividade" }
  | { readonly fase: "fim-expirada" };

/**
 * Decide o estado da sessão a partir dos dois prazos. Função pura, testada com
 * relógio falso.
 */
export function avaliarRelogio(p: {
  readonly msDesdePedido: number;
  readonly inactividadeSegundos: number;
  readonly agoraEpoch: number;
  readonly expiraEm: number;
}): EstadoRelogio {
  if (p.agoraEpoch >= p.expiraEm - MARGEM_EXPIRACAO_MS) return { fase: "fim-expirada" };
  const restante = p.inactividadeSegundos * 1000 - p.msDesdePedido;
  if (restante <= 0) return { fase: "fim-inactividade" };
  if (restante <= AVISO_INACTIVIDADE_MS) return { fase: "aviso-inactividade", restanteMs: restante };
  return { fase: "activa" };
}
