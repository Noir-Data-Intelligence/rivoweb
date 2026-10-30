/**
 * Regras puras da contabilidade, iguais às do servidor: o front avisa antes
 * de enviar, o servidor decide sempre.
 */
import Big from "big.js";

const dd = (n: number) => String(n).padStart(2, "0");

/** Primeiro e último dia de um mês (1–12) ou do ano inteiro (`mes` nulo). */
export function janelaDoPeriodo(ano: number, mes: number | null): { de: string; ate: string } {
  if (mes === null) return { de: `${ano}-01-01`, ate: `${ano}-12-31` };
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return { de: `${ano}-${dd(mes)}-01`, ate: `${ano}-${dd(mes)}-${dd(ultimo)}` };
}

export type LinhaDigitada = { readonly lado: "Debit" | "Credit"; readonly valor: Big | null };

/** Totais a débito e a crédito das linhas de um lançamento, e a diferença. */
export function totaisLancamento(linhas: readonly LinhaDigitada[]): { debito: Big; credito: Big; diferenca: Big } {
  let debito = new Big(0);
  let credito = new Big(0);
  for (const l of linhas) {
    if (!l.valor) continue;
    if (l.lado === "Debit") debito = debito.plus(l.valor);
    else credito = credito.plus(l.valor);
  }
  return { debito, credito, diferenca: debito.minus(credito) };
}

/** Primeiro problema das linhas de um lançamento, ou `null`. */
export function problemaLancamento(linhas: readonly (LinhaDigitada & { readonly conta: string; readonly descricao: string })[]): string | null {
  if (linhas.length < 2) return "Um lançamento tem pelo menos duas linhas.";
  for (const l of linhas) {
    if (l.conta.trim() === "") return "Escolha a conta de cada linha.";
    if (!l.valor || l.valor.lte(0)) return "Cada linha tem um valor maior que zero.";
    if (l.descricao.trim() === "") return "Cada linha tem descrição.";
  }
  if (!linhas.some((l) => l.lado === "Debit") || !linhas.some((l) => l.lado === "Credit")) return "Um lançamento tem linhas a débito e a crédito.";
  const { diferenca } = totaisLancamento(linhas);
  if (!diferenca.eq(0)) return "O total a débito tem de igualar o total a crédito.";
  return null;
}

type LinhaRegra = { readonly lado: string; readonly parcela: string };

/**
 * Uma regra de lançamento equilibra se, para cada parcela, débitos e
 * créditos se anulam sabendo que total = líquido + imposto. Conta cada
 * parcela como vector (líquido, imposto): `Gross` vale (1, 1).
 */
export function regraEquilibra(linhas: readonly LinhaRegra[]): boolean {
  let liquido = 0;
  let imposto = 0;
  for (const l of linhas) {
    const s = l.lado === "Debit" ? 1 : -1;
    if (l.parcela === "Net" || l.parcela === "Gross") liquido += s;
    if (l.parcela === "Tax" || l.parcela === "Gross") imposto += s;
  }
  return linhas.length >= 2 && liquido === 0 && imposto === 0;
}

/** Os meses de um ano até ao mês corrente (o histórico não se lança no futuro). */
export function janelasDoAno(ano: number, hoje: string): { de: string; ate: string }[] {
  const [a, m] = [Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7))];
  const ultimo = ano < a ? 12 : ano === a ? m : 0;
  return Array.from({ length: ultimo }, (_, i) => janelaDoPeriodo(ano, i + 1));
}

type RespostaHistorico = {
  readonly posted: number | string;
  readonly alreadyPosted: number | string;
  readonly cancelled: number | string;
  readonly withoutRule: number | string;
  readonly postedByKind: Readonly<Record<string, number | string>>;
  readonly problems: readonly { readonly document: string; readonly date: string; readonly error: string }[];
};

/** Soma as respostas de vários meses do lançamento do histórico. */
export function somarHistorico(rs: readonly RespostaHistorico[]) {
  const porTipo: Record<string, number> = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.postedByKind)) porTipo[k] = (porTipo[k] ?? 0) + Number(v);
  const soma = (k: "posted" | "alreadyPosted" | "cancelled" | "withoutRule") => rs.reduce((t, r) => t + Number(r[k]), 0);
  return {
    lancados: soma("posted"),
    jaLancados: soma("alreadyPosted"),
    anulados: soma("cancelled"),
    semRegra: soma("withoutRule"),
    porTipo,
    problemas: rs.flatMap((r) => r.problems),
  };
}
