/** Regras de entrada dos activos fixos, as mesmas do servidor (`TreasuryAndAssets.cs`). Valores até 2 casas, taxa até 4, unidades até 4. */
import { lerDecimalDigitado, lerDinheiroDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";

export type MetodoAmortizacao = "StraightLine" | "DecliningBalance" | "UnitsOfProduction";
export const METODOS: Record<MetodoAmortizacao, string> = { StraightLine: "Linear (quotas constantes)", DecliningBalance: "Quotas decrescentes", UnitsOfProduction: "Unidades de produção" };

export type CamposActivo = {
  codigo: string;
  nome: string;
  categoria: string;
  localizacao: string;
  serie: string;
  aquisicao: string;
  inicio: string;
  custo: string;
  residual: string;
  metodo: MetodoAmortizacao;
  vida: string;
  taxa: string;
  unidades: string;
};
export type ErrosActivo = Partial<Record<keyof CamposActivo, string>>;

const maximo = (e: ErrosActivo, k: keyof CamposActivo, v: string, n: number) => {
  if (normalizarTexto(v).length > n) e[k] = `No máximo ${n} caracteres.`;
};

export function errosActivo(p: CamposActivo): ErrosActivo {
  const e: ErrosActivo = {};
  maximo(e, "codigo", p.codigo, 40);
  if (normalizarTexto(p.nome) === "") e.nome = "Indique o nome.";
  else maximo(e, "nome", p.nome, 200);
  maximo(e, "categoria", p.categoria, 100);
  maximo(e, "localizacao", p.localizacao, 200);
  maximo(e, "serie", p.serie, 100);
  if (p.aquisicao === "") e.aquisicao = "Indique a data de aquisição.";
  else if (p.inicio !== "" && p.inicio.slice(0, 7) < p.aquisicao.slice(0, 7)) e.inicio = "A amortização não começa antes do mês da aquisição.";
  const custo = lerDinheiroDigitado(p.custo);
  if (p.custo.trim() === "" || custo === null || custo.lte(0)) e.custo = "Custo positivo (até 2 casas decimais).";
  if (p.residual.trim() !== "") {
    const r = lerDinheiroDigitado(p.residual);
    if (r === null || r.lt(0) || (custo && r.gt(custo))) e.residual = "Entre zero e o custo de aquisição.";
  }
  if (!/^\d{1,4}$/.test(p.vida.trim()) || Number(p.vida) < 1 || Number(p.vida) > 1200) e.vida = "De 1 a 1200 meses.";
  if (p.metodo === "DecliningBalance") {
    const t = lerDecimalDigitado(p.taxa, 4);
    if (t === null || t.lte(0) || t.gt(100)) e.taxa = "Quotas decrescentes exigem a taxa anual, de 0 a 100 %.";
  }
  if (p.metodo === "UnitsOfProduction") {
    const u = lerDecimalDigitado(p.unidades, 4);
    if (u === null || u.lte(0)) e.unidades = "Unidades de produção exigem o total de unidades esperado.";
  }
  return e;
}

export function errosAbate(p: { data: string; valor: string; motivo: string }, aquisicao: string): { data?: string; valor?: string; motivo?: string } {
  const e: { data?: string; valor?: string; motivo?: string } = {};
  if (p.data !== "" && p.data <= aquisicao) e.data = "O abate é depois da aquisição.";
  if (p.valor.trim() !== "") {
    const v = lerDinheiroDigitado(p.valor);
    if (v === null || v.lt(0)) e.valor = "Valor de venda não negativo (até 2 casas).";
  }
  if (normalizarTexto(p.motivo, true).length > 500) e.motivo = "No máximo 500 caracteres.";
  return e;
}

export function errosManutencao(p: { descricao: string; data: string; fornecedor: string; custo: string }): { descricao?: string; data?: string; fornecedor?: string; custo?: string } {
  const e: { descricao?: string; data?: string; fornecedor?: string; custo?: string } = {};
  const d = normalizarTexto(p.descricao);
  if (d === "") e.descricao = "Descreva a manutenção.";
  else if (d.length > 500) e.descricao = "No máximo 500 caracteres.";
  if (p.data === "") e.data = "Indique a data.";
  if (normalizarTexto(p.fornecedor).length > 200) e.fornecedor = "No máximo 200 caracteres.";
  if (p.custo.trim() !== "") {
    const c = lerDinheiroDigitado(p.custo);
    if (c === null || c.lt(0)) e.custo = "O custo não pode ser negativo (até 2 casas).";
  }
  return e;
}

/** A devolução não pode ser anterior à entrega. */
export const erroDevolucao = (data: string, entrega: string) => (data !== "" && data < entrega ? "A devolução não pode ser anterior à entrega." : undefined);

export type CamposApolice = { seguradora: string; numero: string; cobertura: string; inicio: string; fim: string; premio: string; capital: string };

export function errosApolice(p: CamposApolice): Partial<Record<keyof CamposApolice, string>> {
  const e: Partial<Record<keyof CamposApolice, string>> = {};
  const sg = normalizarTexto(p.seguradora);
  if (sg === "") e.seguradora = "Indique a seguradora.";
  else if (sg.length > 200) e.seguradora = "No máximo 200 caracteres.";
  const n = normalizarTexto(p.numero);
  if (n === "") e.numero = "Indique o número da apólice.";
  else if (n.length > 60) e.numero = "No máximo 60 caracteres.";
  if (normalizarTexto(p.cobertura, true).length > 500) e.cobertura = "No máximo 500 caracteres.";
  if (p.inicio === "") e.inicio = "Indique o início.";
  if (p.fim === "") e.fim = "Indique o fim.";
  else if (p.inicio !== "" && p.fim < p.inicio) e.fim = "A apólice não pode acabar antes de começar.";
  const pr = lerDinheiroDigitado(p.premio);
  if (p.premio.trim() === "" || pr === null || pr.lt(0)) e.premio = "Prémio não negativo (até 2 casas).";
  if (p.capital.trim() !== "") {
    const c = lerDinheiroDigitado(p.capital);
    if (c === null || c.lt(0)) e.capital = "Capital seguro não negativo (até 2 casas).";
  }
  return e;
}
