/**
 * Logout propagado às outras abas (S3). Cada aba tem a sua sessão no servidor
 * (o token vive em `sessionStorage`, que é por aba), por isso cada aba que
 * recebe o aviso termina também a sua própria sessão no servidor.
 */
const CANAL = "rivo-sessao";
type Mensagem = { readonly tipo: "saiu" };

let canal: BroadcastChannel | null = null;

function obterCanal(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  canal ??= new BroadcastChannel(CANAL);
  return canal;
}

export function avisarOutrasAbas(): void {
  obterCanal()?.postMessage({ tipo: "saiu" } satisfies Mensagem);
}

export function ouvirOutrasAbas(aoSair: () => void): () => void {
  const c = obterCanal();
  if (!c) return () => undefined;
  const f = (e: MessageEvent<unknown>) => {
    if (typeof e.data === "object" && e.data !== null && (e.data as Mensagem).tipo === "saiu") aoSair();
  };
  c.addEventListener("message", f);
  return () => c.removeEventListener("message", f);
}
