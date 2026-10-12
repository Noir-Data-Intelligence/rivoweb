/**
 * CSV para Excel em pt (§7.5): BOM UTF-8, `;` como separador, células de texto
 * com fórmulas neutralizadas (S18). Números saem como números.
 */
const PERIGOSO = /^[=+\-@\t\r]/;
const BOM = "﻿";

export function celulaCsv(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v).replace(".", ",") : "";
  let s = v;
  if (PERIGOSO.test(s)) s = `'${s}`;
  if (/[";\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function gerarCsv(linhas: readonly (readonly (string | number | null | undefined)[])[]): string {
  return BOM + linhas.map((l) => l.map(celulaCsv).join(";")).join("\r\n");
}
