/** Regras de entrada do ESG, as mesmas do servidor (`Esg.cs`, `EsgModuleExtensions.cs`). Metas e medições até 4 casas, factor até 6, orçamento até 2. */
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";

type Erros<K extends string> = Partial<Record<K, string>>;
export const temErros = (e: object) => Object.keys(e).length > 0;
const opc = (v: string, multi = false) => {
  const n = normalizarTexto(v, multi);
  return n === "" ? null : n;
};
const texto = (e: Record<string, string>, k: string, v: string, n: number, falta?: string, multi = false) => {
  const t = normalizarTexto(v, multi);
  if (t === "" && falta) e[k] = falta;
  else if (t.length > n) e[k] = `No máximo ${n} caracteres.`;
};
const decimal = (v: string, casas: number) => (v.trim() === "" ? null : lerDecimalDigitado(v, casas));

export type Pilar = "Environmental" | "Social" | "Governance";
export type Agregacao = "Sum" | "Average" | "Last";
export type Direccao = "LowerIsBetter" | "HigherIsBetter";

export type CamposIndicador = {
  codigo: string;
  nome: string;
  pilar: Pilar;
  categoria: string;
  unidade: string;
  agregacao: Agregacao;
  direccao: Direccao;
  meta: string;
  factor: string;
  unidadeConvertida: string;
  fonte: string;
  activo: boolean;
};

export function errosIndicador(p: CamposIndicador): Erros<keyof CamposIndicador> {
  const e: Record<string, string> = {};
  texto(e, "codigo", p.codigo, 30, "Indique o código.");
  texto(e, "nome", p.nome, 200, "Indique o nome.");
  texto(e, "categoria", p.categoria, 100);
  texto(e, "unidade", p.unidade, 30, "Indique a unidade (por exemplo, kWh ou litros).");
  if (p.meta.trim() !== "" && decimal(p.meta, 4) === null) e.meta = "Número até 4 casas decimais.";
  if (p.factor.trim() !== "") {
    const f = decimal(p.factor, 6);
    if (f === null || f.lte(0)) e.factor = "Factor positivo, até 6 casas decimais.";
    texto(e, "unidadeConvertida", p.unidadeConvertida, 30, "Com factor, indique a unidade convertida.");
    texto(e, "fonte", p.fonte, 300, "Com factor, indique a fonte (de onde vem o valor).");
  }
  return e;
}

/** Já validado. Sem factor, a unidade convertida e a fonte não seguem. */
export function indicadorParaApi(p: CamposIndicador) {
  const meta = decimal(p.meta, 4);
  const factor = decimal(p.factor, 6);
  return {
    code: normalizarTexto(p.codigo).toUpperCase(),
    name: normalizarTexto(p.nome),
    pillar: p.pilar,
    category: opc(p.categoria),
    unit: normalizarTexto(p.unidade),
    aggregation: p.agregacao,
    direction: p.direccao,
    annualTarget: meta ? decimalParaApi(meta) : null,
    conversionFactor: factor ? decimalParaApi(factor) : null,
    convertedUnit: factor ? normalizarTexto(p.unidadeConvertida) : null,
    factorSource: factor ? normalizarTexto(p.fonte) : null,
    active: p.activo,
  };
}

export type CamposMedicao = { mes: string; ano: string; valor: string; fonte: string; notas: string };
export function errosMedicao(p: CamposMedicao): Erros<keyof CamposMedicao> {
  const e: Record<string, string> = {};
  if (!/^(0?[1-9]|1[0-2])$/.test(p.mes)) e.mes = "Escolha o mês.";
  if (!/^\d{4}$/.test(p.ano.trim()) || Number(p.ano) < 2000 || Number(p.ano) > 2100) e.ano = "Ano com 4 algarismos.";
  const v = decimal(p.valor, 4);
  if (v === null || v.lt(0)) e.valor = "Valor não negativo, até 4 casas decimais.";
  texto(e, "fonte", p.fonte, 200);
  texto(e, "notas", p.notas, 1000, undefined, true);
  return e;
}
/** Já validado: o período é o primeiro dia do mês. */
export function medicaoParaApi(p: CamposMedicao) {
  const v = decimal(p.valor, 4);
  return { period: `${p.ano.trim()}-${p.mes.padStart(2, "0")}-01`, value: v ? decimalParaApi(v) : "0", source: opc(p.fonte), notes: opc(p.notas, true) };
}

export type CamposIniciativa = { titulo: string; pilar: Pilar; descricao: string; indicador: string; responsavel: string; inicio: string; fim: string; orcamento: string; moeda: string; progresso: string };
export function errosIniciativa(p: CamposIniciativa): Erros<keyof CamposIniciativa> {
  const e: Record<string, string> = {};
  texto(e, "titulo", p.titulo, 200, "Indique o título.");
  texto(e, "descricao", p.descricao, 2000, undefined, true);
  if (p.inicio !== "" && p.fim !== "" && p.fim < p.inicio) e.fim = "A iniciativa não pode acabar antes de começar.";
  if (p.orcamento.trim() !== "") {
    const o = lerDinheiroDigitado(p.orcamento);
    if (o === null || o.lt(0)) e.orcamento = "Orçamento não negativo (até 2 casas).";
  }
  if (!/^[A-Za-z]{3}$/.test(p.moeda.trim())) e.moeda = "Código de 3 letras (por exemplo, AOA).";
  if (!/^\d{1,3}$/.test(p.progresso.trim()) || Number(p.progresso) > 100) e.progresso = "De 0 a 100.";
  return e;
}
/** Já validado. */
export function iniciativaParaApi(p: CamposIniciativa) {
  const o = p.orcamento.trim() === "" ? null : lerDinheiroDigitado(p.orcamento);
  return {
    title: normalizarTexto(p.titulo),
    pillar: p.pilar,
    description: opc(p.descricao, true),
    indicatorId: p.indicador === "" ? null : p.indicador,
    ownerEmployeeId: p.responsavel === "" ? null : p.responsavel,
    startsOn: p.inicio === "" ? null : p.inicio,
    endsOn: p.fim === "" ? null : p.fim,
    budget: o ? paraApi(o) : null,
    currency: p.moeda.trim().toUpperCase(),
    progress: Number(p.progresso.trim()),
  };
}
