/**
 * Validação do destino depois do login (`/entrar?voltar=…`), sem open
 * redirect (S6). Só caminhos internos que casem com uma rota conhecida.
 */
const PUBLICAS = new Set(["/entrar", "/convite", "/recuperar", "/recuperar-password"]);

export function validarVoltar(
  valor: string | null | undefined,
  origem: string,
  rotaConhecida: (caminho: string) => boolean,
): string {
  if (typeof valor !== "string" || valor === "") return "/";
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";
  // Controlos, espaços e barras invertidas não têm lugar num caminho interno
  // (alguns browsers tratam `/\` como `//`).
  if (/[\u0000-\u001F\u007F\s\\]/.test(valor)) return "/";
  let url: URL;
  try {
    url = new URL(valor, origem);
  } catch {
    return "/";
  }
  if (url.origin !== new URL(origem).origin) return "/";
  if (url.pathname.startsWith("//") || PUBLICAS.has(url.pathname)) return "/";
  return rotaConhecida(url.pathname) ? url.pathname + url.search + url.hash : "/";
}
