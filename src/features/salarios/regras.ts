/** Regras de entrada dos salários, as mesmas do servidor (`PayrollRun.cs`). O cálculo de IRT e INSS é só do servidor. */
import Big from "big.js";
import { lerDinheiroDigitado } from "@/lib/money/money";

export type CamposItem = { bruto: string; alimentacao: string; transporte: string; ferias: string; natal: string };
export type ErrosItem = Partial<Record<keyof CamposItem | "colaborador" | "subsidios", string>>;

/** Subsídio vazio vale zero. */
const subsidio = (t: string) => (t.trim() === "" ? new Big(0) : lerDinheiroDigitado(t));

export function errosItem(p: CamposItem & { colaborador: string }): ErrosItem {
  const e: ErrosItem = {};
  if (p.colaborador === "") e.colaborador = "Escolha o colaborador.";
  const bruto = p.bruto.trim() === "" ? null : lerDinheiroDigitado(p.bruto);
  if (p.bruto.trim() === "") e.bruto = "Indique o salário bruto.";
  else if (bruto === null) e.bruto = "Valor inválido (até 2 casas decimais).";
  else if (bruto.lte(0)) e.bruto = "O salário bruto tem de ser positivo.";
  let soma = new Big(0);
  for (const k of ["alimentacao", "transporte", "ferias", "natal"] as const) {
    const v = subsidio(p[k]);
    if (v === null) e[k] = "Valor inválido (até 2 casas decimais).";
    else if (v.lt(0)) e[k] = "Um subsídio não pode ser negativo.";
    else soma = soma.plus(v);
  }
  if (bruto && bruto.gt(0) && soma.gt(bruto)) e.subsidios = "Os subsídios fazem parte do bruto: não podem somar mais do que ele.";
  return e;
}

export function errosAbrir(p: { ano: string; mes: string }): { ano?: string; mes?: string } {
  const e: { ano?: string; mes?: string } = {};
  if (!/^\d{4}$/.test(p.ano.trim()) || Number(p.ano) < 2000 || Number(p.ano) > 2100) e.ano = "Indique o ano (quatro algarismos).";
  if (!/^\d{1,2}$/.test(p.mes) || Number(p.mes) < 1 || Number(p.mes) > 12) e.mes = "Escolha o mês.";
  return e;
}
