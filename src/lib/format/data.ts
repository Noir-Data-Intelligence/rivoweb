/**
 * Datas (§4.3). As datas da API (`YYYY-MM-DD`) nunca passam por `new Date()`,
 * que as lê como UTC. As datas-hora mostram-se em Africa/Luanda (D15).
 */
export const FUSO = "Africa/Luanda";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

function componentes(iso: string): { a: string; m: number; d: string } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!r) return null;
  const a = r[1] as string;
  const m = Number(r[2]);
  const d = r[3] as string;
  if (m < 1 || m > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return { a, m, d };
}

/** «12/10/2026» (tabelas). */
export function formatarData(iso: string): string {
  const c = componentes(iso);
  return c ? `${c.d}/${String(c.m).padStart(2, "0")}/${c.a}` : "—";
}

/** «12 out 2026» (títulos). */
export function formatarDataCurta(iso: string): string {
  const c = componentes(iso);
  return c ? `${Number(c.d)} ${MESES[c.m - 1]} ${c.a}` : "—";
}

// en-GB só pela ordem e pelos algarismos; o texto final é montado à mão.
const fmtDataHora = new Intl.DateTimeFormat("en-GB", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function partesDataHora(instante: string | Date): Record<string, string> | null {
  const d = typeof instante === "string" ? new Date(instante) : instante;
  if (Number.isNaN(d.getTime())) return null;
  const out: Record<string, string> = {};
  for (const p of fmtDataHora.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** «12/10/2026 14:05», em Africa/Luanda. */
export function formatarDataHora(instante: string | Date): string {
  const p = partesDataHora(instante);
  return p ? `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}` : "—";
}

/** «14:05», em Africa/Luanda. */
export function formatarHora(instante: string | Date): string {
  const p = partesDataHora(instante);
  return p ? `${p.hour}:${p.minute}` : "—";
}

/** Data de hoje em Africa/Luanda, como `YYYY-MM-DD`. */
export function hojeIso(agora: Date = new Date()): string {
  const p = partesDataHora(agora);
  return p ? `${p.year}-${p.month}-${p.day}` : "";
}
