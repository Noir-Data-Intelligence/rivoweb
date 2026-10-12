/**
 * Cliente HTTP único (§2). Todo o tráfego para a API passa por aqui; os ecrãs
 * usam os hooks de `features/<m>/api.ts` e nunca chamam `fetch` directamente.
 */
import createClient, { type Middleware } from "openapi-fetch";
import { registarPedidoAutenticado } from "@/lib/auth/actividade";
import { obterToken, terminarSessaoLocal } from "@/lib/auth/session";
import { API_URL } from "@/lib/env";
import { lerPaginacao, type Pagina } from "./pagination";
import { ApiError, paraApiError } from "./problem";
import type { paths } from "./schema";

const TEMPO_LEITURA_MS = 20_000;
const TEMPO_ESCRITA_MS = 30_000;

/** Rotas cujo 401 é resposta de negócio («credenciais erradas»), não fim de sessão. */
const ROTAS_SEM_SESSAO = /^\/identity\/(login|login\/google|invitations\/acceptance|password-recovery(\/completion)?)$/;

const autenticacao: Middleware = {
  onRequest({ request }) {
    const token = obterToken();
    // Nunca envia o token para outra origem (S2).
    if (token !== null && API_URL !== "" && request.url.startsWith(`${API_URL}/`) && !request.headers.has("Authorization")) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
};

const tempoLimite: Middleware = {
  onRequest({ request }) {
    const ms = request.method === "GET" ? TEMPO_LEITURA_MS : TEMPO_ESCRITA_MS;
    return new Request(request, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(ms)]) });
  },
};

/**
 * Um 401 do esquema de autenticação traz `WWW-Authenticate` (exposto no CORS)
 * ou vem sem corpo. Um 401 de negócio vem como Problem Details sem esse
 * cabeçalho: por exemplo «A password actual não confere» em
 * `POST /identity/me/password`, que não pode terminar a sessão.
 */
export function eFimDeSessao(r: Response): boolean {
  if (r.status !== 401) return false;
  if (r.headers.has("WWW-Authenticate")) return true;
  return !(r.headers.get("Content-Type") ?? "").includes("json");
}

const sessao: Middleware = {
  onResponse({ request, response, schemaPath }) {
    if (!request.headers.has("Authorization")) return response;
    if (eFimDeSessao(response) && !ROTAS_SEM_SESSAO.test(schemaPath)) {
      terminarSessaoLocal("terminada");
    } else if (response.ok) {
      registarPedidoAutenticado();
    }
    return response;
  },
};

// `fetch` resolvido a cada pedido (e não capturado na criação), para os testes o poderem substituir.
export const api = createClient<paths>({ baseUrl: API_URL, fetch: (req) => globalThis.fetch(req) });
api.use(autenticacao, tempoLimite, sessao);

type Resultado<T> = { data?: T; error?: unknown; response: Response };

function erroDeTransporte(e: unknown): unknown {
  if (e instanceof DOMException && e.name === "TimeoutError") return new ApiError({ tipo: "tempo", status: 0 });
  if (e instanceof DOMException && e.name === "AbortError") return e;
  if (e instanceof TypeError) return new ApiError({ tipo: "rede", status: 0 });
  return e;
}

async function executar<T>(pedido: Promise<Resultado<T>>): Promise<Resultado<T>> {
  let r: Resultado<T>;
  try {
    r = await pedido;
  } catch (e) {
    throw erroDeTransporte(e);
  }
  if (!r.response.ok) throw paraApiError(r.response.status, r.error, r.response.headers);
  return r;
}

/** Desembrulha uma resposta: devolve o corpo ou lança `ApiError`. */
export async function ler<T>(pedido: Promise<Resultado<T>>): Promise<T> {
  const r = await executar(pedido);
  return r.data as T;
}

/** Para respostas sem corpo (204) ou em que só interessa o estado (201/202). */
export async function enviar(pedido: Promise<Resultado<unknown>>): Promise<{ status: number }> {
  const r = await executar(pedido);
  return { status: r.response.status };
}

/** Listagem paginada pelo servidor (ADR-068). */
export async function lerPagina<T>(pedido: Promise<Resultado<T[]>>): Promise<Pagina<T>> {
  const r = await executar(pedido);
  return lerPaginacao(r.data ?? [], r.response.headers);
}
