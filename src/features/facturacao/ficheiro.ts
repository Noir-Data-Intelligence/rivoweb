/**
 * Nome do PDF de um documento a partir do número (§2.5): as barras da série
 * («FT S001/17») passam a hífen e saem os caracteres que os sistemas de
 * ficheiros recusam.
 */
export function nomeFicheiroPdf(numero: string): string {
  const seguro = numero
    .trim()
    .replace(/[/\\]+/g, "-")
    .replace(/[<>:"|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ");
  return `${seguro || "documento"}.pdf`;
}
