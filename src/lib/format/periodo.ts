/**
 * Períodos do dashboard, em Africa/Luanda (D15). O backend não tem período por
 * omissão («decisão de produto»): a interface oferece estes e começa no ano
 * corrente, que é o que dá sentido às séries mensais.
 */
import { hojeIso } from "./data";

export const PERIODOS = ["mes", "trimestre", "ano", "ano-anterior"] as const;
export type Periodo = (typeof PERIODOS)[number];
export const PERIODO_OMISSAO: Periodo = "ano";

export const NOME_PERIODO: Readonly<Record<Periodo, string>> = {
  mes: "Este mês",
  trimestre: "Últimos 3 meses",
  ano: "Este ano",
  "ano-anterior": "Ano anterior",
};

export type Janela = { readonly from: string; readonly to: string };

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Janela `from`/`to` (`YYYY-MM-DD`, inclusivas) de um período, a partir de hoje em Luanda. */
export function janelaDe(periodo: Periodo, hoje: string = hojeIso()): Janela {
  const [a, m] = hoje.split("-").map(Number) as [number, number];
  switch (periodo) {
    case "mes":
      return { from: `${a}-${doisDigitos(m)}-01`, to: hoje };
    case "trimestre": {
      const total = a * 12 + (m - 1) - 2;
      return { from: `${Math.floor(total / 12)}-${doisDigitos((total % 12) + 1)}-01`, to: hoje };
    }
    case "ano":
      return { from: `${a}-01-01`, to: hoje };
    case "ano-anterior":
      return { from: `${a - 1}-01-01`, to: `${a - 1}-12-31` };
  }
}

export function lerPeriodo(v: string | null): Periodo {
  return (PERIODOS as readonly string[]).includes(v ?? "") ? (v as Periodo) : PERIODO_OMISSAO;
}

const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

/** «Março» a partir do número do mês (1–12). */
export function nomeMes(m: number): string {
  return MESES_LONGOS[m - 1] ?? "—";
}

/** «mar 2026» (eixos e tabelas). */
export function mesCurto(ano: number, m: number): string {
  return `${MESES_CURTOS[m - 1] ?? "—"} ${ano}`;
}

/** Lê «2026-03» (forma das séries de RH e vendas) em ano e mês. */
export function lerAnoMes(v: string): { ano: number; mes: number } | null {
  const r = /^(\d{4})-(\d{2})$/.exec(v);
  if (!r) return null;
  const mes = Number(r[2]);
  return mes >= 1 && mes <= 12 ? { ano: Number(r[1]), mes } : null;
}
