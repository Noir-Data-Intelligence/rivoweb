/** Nome de ficheiro seguro para descargas: sem caminhos, controlos nem nomes reservados do Windows. */
const RESERVADOS = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const INVISIVEIS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function sanitizarNomeFicheiro(nome: string, omissao = "ficheiro"): string {
  let s = nome
    .normalize("NFC")
    .replace(INVISIVEIS, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[. ]+$/, "");
  if (s.length > 150) {
    const ponto = s.lastIndexOf(".");
    const ext = ponto > 0 && s.length - ponto <= 10 ? s.slice(ponto) : "";
    s = s.slice(0, 150 - ext.length) + ext;
  }
  if (s === "" || RESERVADOS.test(s)) return omissao;
  return s;
}
