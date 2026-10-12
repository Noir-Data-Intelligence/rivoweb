/** Só `https:` e `mailto:` para URLs vindos de dados (S12). Devolve null para o resto. */
export function urlSegura(valor: string | null | undefined): string | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim();
  if (v === "" || /[\u0000-\u001F\u007F]/.test(v)) return null;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return null;
  }
  if (url.protocol === "https:" && url.hostname !== "") return url.href;
  if (url.protocol === "mailto:") return url.href;
  return null;
}
