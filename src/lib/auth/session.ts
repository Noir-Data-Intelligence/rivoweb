/**
 * Sessão em memória (§7.1). O token vive numa variável de módulo, nunca no
 * estado React nem na cache do Query. Por decisão D3 espelha-se em
 * `sessionStorage` (por aba, apaga-se ao fechar) para sobreviver ao F5.
 * `localStorage` está proibido pela lint.
 */
export type Sessao = {
  readonly token: string;
  /** Prazo absoluto, em ms desde a época (sem renovação, ADR-067). */
  readonly expiraEm: number;
  readonly inactividadeSegundos: number;
  /**
   * Obrigada ao segundo factor e ainda sem ele (ADR-127): a sessão só serve
   * para o ligar. Liberta-se ao confirmar a inscrição.
   */
  readonly mfaPendente?: boolean;
};

export type MotivoFim =
  | "saiu"
  | "inactividade"
  | "expirada"
  /** 401 sem motivo legível (B3): revogada, expirada no servidor ou perfil retirado. */
  | "terminada"
  | "outra-aba";

const CHAVE = "rivo.sessao";

let atual: Sessao | null = null;
let ultimoMotivo: MotivoFim | null = null;
const ouvintes = new Set<() => void>();

function avisar(): void {
  for (const f of ouvintes) f();
}

function armazenamento(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function valida(v: unknown, agora: number): v is Sessao {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.token === "string" &&
    s.token.length > 0 &&
    typeof s.expiraEm === "number" &&
    s.expiraEm > agora &&
    typeof s.inactividadeSegundos === "number" &&
    s.inactividadeSegundos > 0 &&
    (s.mfaPendente === undefined || typeof s.mfaPendente === "boolean")
  );
}

/** Recupera a sessão da aba depois de um F5. Chamado uma vez no arranque. */
export function restaurarSessao(agora: number = Date.now()): Sessao | null {
  const st = armazenamento();
  const bruto = st?.getItem(CHAVE) ?? null;
  if (bruto === null) return null;
  try {
    const v: unknown = JSON.parse(bruto);
    if (valida(v, agora)) {
      atual = v;
      return v;
    }
  } catch {
    // valor corrompido: descarta
  }
  st?.removeItem(CHAVE);
  return null;
}

export function iniciarSessao(
  resposta: { accessToken: string; expiresAt: string; idleTimeoutSeconds: number | string; mfaEnrolmentRequired?: boolean },
  agora: number = Date.now(),
): Sessao {
  const expiraEm = Date.parse(resposta.expiresAt);
  const inactividadeSegundos = Number(resposta.idleTimeoutSeconds);
  const s: Sessao = { token: resposta.accessToken, expiraEm, inactividadeSegundos, mfaPendente: resposta.mfaEnrolmentRequired === true };
  if (!valida(s, agora)) throw new Error("Resposta de login inválida.");
  atual = s;
  ultimoMotivo = null;
  armazenamento()?.setItem(CHAVE, JSON.stringify(s));
  avisar();
  return s;
}

/**
 * Termina a sessão **localmente** e de forma idempotente. Quem chama trata do
 * resto (limpar a cache do Query, avisar o servidor no logout).
 */
export function terminarSessaoLocal(motivo: MotivoFim): void {
  armazenamento()?.removeItem(CHAVE);
  if (atual === null) return;
  atual = null;
  ultimoMotivo = motivo;
  avisar();
}

/**
 * Marca (ou liberta) a sessão como à espera do segundo factor (ADR-127): o
 * login disse `mfaEnrolmentRequired`, ou a API respondeu 401 com
 * `mfa_enrolment_required`; a confirmação da inscrição liberta-a.
 */
export function marcarMfaPendente(pendente: boolean): void {
  if (atual === null || (atual.mfaPendente === true) === pendente) return;
  atual = { ...atual, mfaPendente: pendente };
  armazenamento()?.setItem(CHAVE, JSON.stringify(atual));
  avisar();
}

export function obterSessao(): Sessao | null {
  return atual;
}

export function obterToken(): string | null {
  return atual?.token ?? null;
}

/** Motivo do último fim de sessão, para a mensagem do ecrã de entrada. */
export function motivoUltimoFim(): MotivoFim | null {
  return ultimoMotivo;
}

export function limparMotivo(): void {
  ultimoMotivo = null;
}

export function subscreverSessao(f: () => void): () => void {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}
