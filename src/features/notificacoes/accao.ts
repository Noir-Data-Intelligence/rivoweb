/**
 * O destino do botão de uma notificação (ADR-142). O `actionUrl` vem absoluto e
 * aponta para o front publicado: na mesma origem, navega-se pelo router com o
 * caminho (sem recarregar); noutra origem, é uma ligação normal. Só `http` e
 * `https`: qualquer outro esquema (`javascript:`, `data:`) não dá botão.
 */
export type DestinoAccao = { tipo: "interno"; caminho: string } | { tipo: "externo"; href: string };

export function destinoDaAccao(url: string | null | undefined, origem: string): DestinoAccao | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.origin === origem) return { tipo: "interno", caminho: `${u.pathname}${u.search}${u.hash}` };
  return { tipo: "externo", href: u.href };
}
