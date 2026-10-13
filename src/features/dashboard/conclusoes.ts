/**
 * Títulos dos gráficos como conclusões (§4.5): calculados dos dados, nunca
 * escritos à mão. Sem conclusão possível, diz isso. Funções puras e testadas.
 */
import type Big from "big.js";
import { lerAnoMes, mesCurto, nomeMes } from "@/lib/format/periodo";

export const SEM_DADOS = "Sem dados suficientes para comparar";

export type MesValores = { readonly ano: number; readonly mes: number; readonly receita: Big; readonly despesa: Big };

/** «Receita acima da despesa desde Março», a partir da sequência final de meses. */
export function conclusaoReceitaDespesa(meses: readonly MesValores[]): string {
  const comDados = meses.filter((m) => !m.receita.eq(0) || !m.despesa.eq(0));
  if (comDados.length < 2) return SEM_DADOS;
  const ultimo = comDados[comDados.length - 1] as MesValores;
  const receitaGanha = (m: MesValores) => m.receita.gt(m.despesa);
  const lado = receitaGanha(ultimo);
  let inicio = comDados.length - 1;
  while (inicio > 0 && receitaGanha(comDados[inicio - 1] as MesValores) === lado) inicio--;
  const k = comDados.length - inicio;
  const primeiro = comDados[inicio] as MesValores;
  if (lado) {
    if (k === comDados.length) return "Receita acima da despesa em todos os meses com movimento";
    if (k >= 2) return `Receita acima da despesa desde ${nomeMes(primeiro.mes)}`;
    return `Receita voltou a superar a despesa em ${nomeMes(ultimo.mes)}`;
  }
  if (k === comDados.length) return "Despesa acima da receita em todos os meses com movimento";
  if (k >= 2) return `Despesa acima da receita desde ${nomeMes(primeiro.mes)}`;
  return `Despesa superou a receita em ${nomeMes(ultimo.mes)}`;
}

/** Maior valor de uma lista, com o rótulo; `null` se tudo for zero. */
function maior<T>(itens: readonly T[], valor: (t: T) => number): T | null {
  let melhor: T | null = null;
  let v = 0;
  for (const i of itens) {
    if (valor(i) > v) {
      v = valor(i);
      melhor = i;
    }
  }
  return melhor;
}

export function conclusaoAdmissoes(meses: readonly { month: string; count: number }[]): string {
  const total = meses.reduce((s, m) => s + m.count, 0);
  if (total === 0) return "Sem admissões no período";
  const pico = maior(meses, (m) => m.count);
  const am = pico ? lerAnoMes(pico.month) : null;
  const plural = total === 1 ? "admissão" : "admissões";
  return am && meses.filter((m) => m.count > 0).length > 1 ? `${total} ${plural} no período, mais em ${nomeMes(am.mes)}` : `${total} ${plural} no período`;
}

export function conclusaoEquipas(deps: readonly { department: string; count: number }[]): string {
  const m = maior(deps, (d) => d.count);
  if (!m) return "Ainda não há colaboradores activos";
  if (deps.filter((d) => d.count > 0).length === 1) return `Todos os colaboradores activos em ${m.department}`;
  return `Maior equipa: ${m.department} (${m.count} ${m.count === 1 ? "pessoa" : "pessoas"})`;
}

export function conclusaoPipeline(etapas: readonly { stage: string; totalValue: Big }[], nomeEtapa: (s: string) => string): string {
  const m = maior(etapas, (e) => Number(e.totalValue.toString()));
  return m ? `Maior valor em aberto na etapa ${nomeEtapa(m.stage)}` : "Sem oportunidades em aberto";
}

export function conclusaoGanhas(meses: readonly { month: string; count: number }[]): string {
  const total = meses.reduce((s, m) => s + m.count, 0);
  if (total === 0) return "Sem oportunidades ganhas no período";
  const pico = maior(meses, (m) => m.count);
  const am = pico ? lerAnoMes(pico.month) : null;
  const plural = total === 1 ? "oportunidade ganha" : "oportunidades ganhas";
  return am && meses.filter((m) => m.count > 0).length > 1 ? `${total} ${plural}, mais em ${mesCurto(am.ano, am.mes)}` : `${total} ${plural} no período`;
}

/**
 * Meses de uma janela, para as séries que só trazem os meses com dados
 * (admissões, vendas ganhas): os que faltam valem 0, que é o facto.
 */
export function mesesDaJanela(from: string, to: string): { ano: number; mes: number; chave: string }[] {
  const [a0, m0] = from.split("-").map(Number) as [number, number];
  const [a1, m1] = to.split("-").map(Number) as [number, number];
  const out: { ano: number; mes: number; chave: string }[] = [];
  for (let t = a0 * 12 + m0 - 1; t <= a1 * 12 + m1 - 1 && out.length < 120; t++) {
    const ano = Math.floor(t / 12);
    const mes = (t % 12) + 1;
    out.push({ ano, mes, chave: `${ano}-${String(mes).padStart(2, "0")}` });
  }
  return out;
}
