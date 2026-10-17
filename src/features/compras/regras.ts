/**
 * Regras de entrada das compras, as mesmas do servidor (`PurchaseRequisition.cs`,
 * `PurchaseOrder.cs`, `GoodsReceipt.cs`). Quantidades até 4 casas, preços até 2;
 * os totais mostrados antes de gravar são estimativas — os do servidor mandam.
 */
import Big from "big.js";
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";

export type LinhaRascunho = { descricao: string; quantidade: string; preco: string };
export const linhaVazia = (): LinhaRascunho => ({ descricao: "", quantidade: "1", preco: "" });

/** Linha totalmente vazia: ignora-se ao gravar. */
export const linhaEmBranco = (l: LinhaRascunho) => normalizarTexto(l.descricao) === "" && l.preco.trim() === "" && (l.quantidade.trim() === "" || l.quantidade.trim() === "1");

export function errosLinha(l: LinhaRascunho, precoObrigatorio: boolean): string | undefined {
  const d = normalizarTexto(l.descricao);
  if (d === "") return "Falta a descrição.";
  if (d.length > 500) return "Descrição com mais de 500 caracteres.";
  const q = lerDecimalDigitado(l.quantidade, 4);
  if (q === null || q.lte(0)) return "Quantidade positiva (até 4 casas decimais).";
  if (l.preco.trim() === "") return precoObrigatorio ? "Falta o preço." : undefined;
  const p = lerDinheiroDigitado(l.preco);
  if (p === null || p.lt(0)) return "Preço inválido (até 2 casas, não negativo).";
  return undefined;
}

/** Total estimado das linhas válidas (quantidade × preço, arredondado ao cêntimo por linha). */
export function totalLinhas(linhas: readonly LinhaRascunho[]): Big {
  let t = new Big(0);
  for (const l of linhas) {
    const q = lerDecimalDigitado(l.quantidade, 4);
    const p = l.preco.trim() === "" ? new Big(0) : lerDinheiroDigitado(l.preco);
    if (q && p && q.gt(0) && p.gte(0)) t = t.plus(q.times(p).round(2, Big.roundHalfUp));
  }
  return t;
}

export type ErrosRequisicao = { justificacao?: string; linhas?: string; porLinha: Record<number, string> };

export function errosRequisicao(p: { justificacao: string; linhas: readonly LinhaRascunho[] }): ErrosRequisicao {
  const e: ErrosRequisicao = { porLinha: {} };
  const j = normalizarTexto(p.justificacao, true);
  if (j === "") e.justificacao = "Diga o que se pretende comprar e porquê: é o que quem decide vai ler.";
  else if (j.length > 1000) e.justificacao = "No máximo 1000 caracteres.";
  const usadas = p.linhas.map((l, i) => [l, i] as const).filter(([l]) => !linhaEmBranco(l));
  if (usadas.length === 0) e.linhas = "Indique pelo menos uma linha.";
  for (const [l, i] of usadas) {
    const x = errosLinha(l, false);
    if (x) e.porLinha[i] = x;
  }
  return e;
}

export const temErros = (e: { porLinha: Record<number, string> } & Record<string, unknown>) =>
  Object.entries(e).some(([k, v]) => k !== "porLinha" && Boolean(v)) || Object.keys(e.porLinha).length > 0;

export type ErrosOrdem = { fornecedor?: string; esperada?: string; linhas?: string; total?: string; porLinha: Record<number, string> };

/** `disponivel`: o aprovado menos o já encomendado. */
export function errosOrdem(p: { fornecedor: string; emissao: string; esperada: string; linhas: readonly LinhaRascunho[]; disponivel: Big | null }): ErrosOrdem {
  const e: ErrosOrdem = { porLinha: {} };
  if (p.fornecedor === "") e.fornecedor = "Escolha o fornecedor.";
  if (p.esperada !== "" && p.emissao !== "" && p.esperada < p.emissao) e.esperada = "A entrega esperada não pode ser anterior à emissão.";
  const usadas = p.linhas.map((l, i) => [l, i] as const).filter(([l]) => !linhaEmBranco(l));
  if (usadas.length === 0) e.linhas = "Uma ordem sem linhas não encomenda nada.";
  for (const [l, i] of usadas) {
    const x = errosLinha(l, true);
    if (x) e.porLinha[i] = x;
  }
  if (p.disponivel && totalLinhas(p.linhas).gt(p.disponivel)) e.total = "Passa o valor aprovado na requisição (descontado o já encomendado). Encomendar acima precisa de nova requisição.";
  return e;
}

/** Quantidade a receber por linha: vazio ou zero não conta; positiva e sem passar o que falta. */
export function errosRecepcao(linhas: readonly { quantidade: string; falta: Big }[]): { linhas?: string; porLinha: Record<number, string> } {
  const e: { linhas?: string; porLinha: Record<number, string> } = { porLinha: {} };
  let alguma = false;
  linhas.forEach((l, i) => {
    const t = l.quantidade.trim();
    if (t === "" || t === "0") return;
    const q = lerDecimalDigitado(t, 4);
    if (q === null || q.lt(0)) e.porLinha[i] = "Quantidade inválida (até 4 casas decimais).";
    else if (q.gt(l.falta)) e.porLinha[i] = "Passa o que falta receber desta linha.";
    else if (q.gt(0)) alguma = true;
  });
  if (!alguma && Object.keys(e.porLinha).length === 0) e.linhas = "Indique pelo menos uma quantidade recebida.";
  return e;
}

/** Linhas já validadas para a API: quantidade e preço em texto, sem as linhas em branco (preço vazio é zero). */
export function linhasParaApi(linhas: readonly LinhaRascunho[]): { description: string; quantity: string; preco: string }[] {
  const out: { description: string; quantity: string; preco: string }[] = [];
  for (const l of linhas) {
    if (linhaEmBranco(l)) continue;
    const q = lerDecimalDigitado(l.quantidade, 4);
    const p = l.preco.trim() === "" ? new Big(0) : lerDinheiroDigitado(l.preco);
    if (!q || !p) continue;
    out.push({ description: normalizarTexto(l.descricao), quantity: decimalParaApi(q), preco: p.toFixed(2) });
  }
  return out;
}
