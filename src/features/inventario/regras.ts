/** Regras de entrada do inventário, as mesmas do servidor (`InventoryItem.cs`, `InventoryCount.cs`). Quantidades e custos até 4 casas. */
import type Big from "big.js";
import { lerDecimalDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";

export function errosArtigo(p: { sku: string; nome: string; unidade: string }): { sku?: string; nome?: string; unidade?: string } {
  const e: { sku?: string; nome?: string; unidade?: string } = {};
  const s = normalizarTexto(p.sku);
  if (s === "") e.sku = "Indique a referência (SKU).";
  else if (s.length > 50) e.sku = "No máximo 50 caracteres.";
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome.";
  else if (n.length > 200) e.nome = "No máximo 200 caracteres.";
  const u = normalizarTexto(p.unidade);
  if (u === "") e.unidade = "Indique a unidade (un, kg, caixa…).";
  else if (u.length > 20) e.unidade = "No máximo 20 caracteres.";
  return e;
}

export function errosArmazem(p: { codigo: string; nome: string }): { codigo?: string; nome?: string } {
  const e: { codigo?: string; nome?: string } = {};
  const c = normalizarTexto(p.codigo);
  if (c === "") e.codigo = "Indique o código.";
  else if (c.length > 20) e.codigo = "No máximo 20 caracteres.";
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome.";
  else if (n.length > 200) e.nome = "No máximo 200 caracteres.";
  return e;
}

/** Decimal com sinal opcional, até 4 casas. */
export function lerComSinal(texto: string): Big | null {
  const t = texto.trim();
  const neg = t.startsWith("-");
  const v = lerDecimalDigitado(neg ? t.slice(1).trim() : t, 4);
  return v === null ? null : neg ? v.times(-1) : v;
}

export type CamposMovimento = { armazem: string; destino: string; quantidade: string; custo: string; motivo: string; data: string };
export type ErrosMovimento = Partial<Record<keyof CamposMovimento, string>>;

/** `disponivel`: a quantidade em mão no armazém escolhido (para saída, transferência e ajuste negativo). */
export function errosMovimento(tipo: "entrada" | "saida" | "ajuste" | "transferencia", p: CamposMovimento, disponivel: Big | null): ErrosMovimento {
  const e: ErrosMovimento = {};
  if (p.armazem === "") e.armazem = tipo === "transferencia" ? "Escolha o armazém de origem." : "Escolha o armazém.";
  if (tipo === "transferencia") {
    if (p.destino === "") e.destino = "Escolha o armazém de destino.";
    else if (p.destino === p.armazem) e.destino = "O destino tem de ser diferente da origem.";
  }
  if (p.data === "") e.data = "Indique a data.";
  const m = normalizarTexto(p.motivo, true);
  if (m.length > 500) e.motivo = "No máximo 500 caracteres.";
  if (tipo === "ajuste") {
    if (m === "") e.motivo = "Um ajuste precisa de motivo.";
    const d = lerComSinal(p.quantidade);
    if (d === null) e.quantidade = "Variação inválida (até 4 casas; negativa para tirar).";
    else if (d.eq(0)) e.quantidade = "Um ajuste sem variação não altera nada.";
    else if (disponivel && d.lt(0) && d.abs().gt(disponivel)) e.quantidade = "Deixaria o armazém com quantidade negativa.";
    return e;
  }
  const q = lerDecimalDigitado(p.quantidade, 4);
  if (q === null || q.lte(0)) e.quantidade = "Quantidade positiva (até 4 casas decimais).";
  else if ((tipo === "saida" || tipo === "transferencia") && disponivel && q.gt(disponivel)) e.quantidade = "Não há quantidade suficiente nesse armazém.";
  if (tipo === "entrada") {
    const c = lerDecimalDigitado(p.custo, 4);
    if (p.custo.trim() === "") e.custo = "Indique o custo unitário (zero se não houver).";
    else if (c === null || c.lt(0)) e.custo = "Custo inválido (até 4 casas, não negativo).";
  }
  return e;
}

export function erroContado(texto: string): string | undefined {
  const q = lerDecimalDigitado(texto, 4);
  return texto.trim() === "" ? "Indique a quantidade contada." : q === null || q.lt(0) ? "Quantidade inválida (até 4 casas, não negativa)." : undefined;
}
