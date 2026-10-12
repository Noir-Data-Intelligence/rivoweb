/**
 * Erros da API convertidos num único tipo (§2.2 do plano). Aceita Problem
 * Details (RFC 9457), a forma antiga `{ erro }` e corpo vazio (o 401).
 */
export type TipoErro = "http" | "rede" | "tempo";

export class ApiError extends Error {
  readonly tipo: TipoErro;
  readonly status: number;
  readonly title: string | null;
  readonly detail: string | null;
  /** Erros de validação por campo, com o nome tal como o servidor o devolve. */
  readonly errors: Readonly<Record<string, readonly string[]>>;
  readonly traceId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(init: {
    tipo: TipoErro;
    status: number;
    title?: string | null;
    detail?: string | null;
    errors?: Record<string, readonly string[]>;
    traceId?: string | null;
    retryAfterSeconds?: number | null;
  }) {
    super(init.detail ?? init.title ?? `Erro ${init.status}`);
    this.name = "ApiError";
    this.tipo = init.tipo;
    this.status = init.status;
    this.title = init.title ?? null;
    this.detail = init.detail ?? null;
    this.errors = init.errors ?? {};
    this.traceId = init.traceId ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
  }
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function errosDeCampo(v: unknown): Record<string, readonly string[]> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: Record<string, readonly string[]> = {};
  for (const [campo, msgs] of Object.entries(v)) {
    if (Array.isArray(msgs)) {
      const lista = msgs.filter((m): m is string => typeof m === "string");
      if (lista.length > 0) out[campo] = lista;
    } else if (typeof msgs === "string") {
      out[campo] = [msgs];
    }
  }
  return out;
}

/** `Retry-After` em segundos ou data HTTP. Hoje não é legível cross-origin (B1). */
export function lerRetryAfter(headers: Headers, agora: number = Date.now()): number | null {
  const v = headers.get("Retry-After");
  if (v === null) return null;
  if (/^\d+$/.test(v.trim())) return Number(v.trim());
  const data = Date.parse(v);
  if (Number.isNaN(data)) return null;
  return Math.max(0, Math.ceil((data - agora) / 1000));
}

export function paraApiError(status: number, corpo: unknown, headers: Headers): ApiError {
  const base = { tipo: "http" as const, status, retryAfterSeconds: lerRetryAfter(headers) };
  if (typeof corpo !== "object" || corpo === null) {
    return new ApiError({ ...base, detail: texto(corpo) });
  }
  const o = corpo as Record<string, unknown>;
  return new ApiError({
    ...base,
    title: texto(o.title),
    detail: texto(o.detail) ?? texto(o.erro),
    errors: errosDeCampo(o.errors),
    traceId: texto(o.traceId),
  });
}

export function eApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Falhas transitórias em que uma leitura pode ser repetida (§2, middleware 6). */
export function eTransitorio(e: unknown): boolean {
  if (!eApiError(e)) return false;
  return e.tipo === "rede" || e.tipo === "tempo" || [502, 503, 504].includes(e.status);
}
