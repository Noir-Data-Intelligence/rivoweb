/**
 * Formatos pt-AO (§4.3). A saída é construída a partir de `formatToParts` para
 * não depender das diferenças de ICU entre motores (R8).
 */
import type { Dinheiro } from "@/lib/money/money";

const MENOS = "\u2212";
const ESPACO_FINO = "\u202F";
const ESPACO = "\u00A0";

const cacheNumero = new Map<number, Intl.NumberFormat>();

function formatadorNumero(casas: number): Intl.NumberFormat {
  let f = cacheNumero.get(casas);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
      useGrouping: "always",
    });
    cacheNumero.set(casas, f);
  }
  return f;
}

/**
 * «1 234 567,89», com espaço inseparável a agrupar e vírgula decimal. Recebe o
 * valor como texto decimal, para não passar por `number`.
 */
export function formatarNumeroDecimal(valor: string, casas: number): string {
  const negativo = valor.startsWith("-");
  const absoluto = negativo ? valor.slice(1) : valor;
  const partes = formatadorNumero(casas).formatToParts(absoluto as Intl.StringNumericLiteral);
  let s = "";
  for (const p of partes) {
    if (p.type === "group") s += ESPACO;
    else if (p.type === "decimal") s += ",";
    else if (p.type === "integer" || p.type === "fraction") s += p.value;
  }
  const zero = /^[0\u00A0,]*$/.test(s);
  return negativo && !zero ? MENOS + s : s;
}

const SIMBOLOS: Readonly<Record<string, string>> = { AOA: "Kz" };
const CASAS: Readonly<Record<string, number>> = { AOA: 2, USD: 2, EUR: 2 };

/** «1 234 567,89 Kz» · «12 500,00 USD» · «−1 200,00 Kz». */
export function formatarMoeda(valor: Dinheiro, moeda = "AOA"): string {
  const casas = CASAS[moeda] ?? 2;
  const texto = formatarNumeroDecimal(valor.round(casas).toFixed(casas), casas);
  return `${texto}${ESPACO}${SIMBOLOS[moeda] ?? moeda}`;
}

/** «14 %» · «+3,2 %» com `comSinal`. Espaço fino antes de `%`. */
export function formatarPercentagem(valor: number | string, casas = 0, comSinal = false): string {
  const v = typeof valor === "number" ? valor.toFixed(casas) : valor;
  const texto = formatarNumeroDecimal(v, casas);
  const positivo = !texto.startsWith(MENOS) && !/^0(,0+)?$/.test(texto);
  return `${comSinal && positivo ? "+" : ""}${texto}${ESPACO_FINO}%`;
}

export function formatarInteiro(valor: number): string {
  return formatarNumeroDecimal(String(Math.trunc(valor)), 0);
}

/** «512 B» · «38 KB» · «2,4 MB». */
export function formatarTamanho(bytes: number | string): string {
  const b = Number(bytes);
  if (b < 1024) return `${formatarNumeroDecimal(String(b), 0)} B`;
  if (b < 1024 * 1024) return `${formatarNumeroDecimal((b / 1024).toFixed(0), 0)} KB`;
  return `${formatarNumeroDecimal((b / 1024 / 1024).toFixed(1), 1)} MB`;
}
