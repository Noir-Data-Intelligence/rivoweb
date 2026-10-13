/**
 * Pré-visualização dos totais de um documento (§2.6). Reproduz as regras do
 * servidor (Facto: `SalesInvoiceLine.Create` e `SalesInvoice.ApplyTerms`):
 * líquido da linha = arred(quantidade × preço); imposto = arred(líquido × taxa);
 * retenção = arred(líquido total × taxa de retenção); arred = 2 casas, meio
 * para cima. O valor que conta é o que o servidor devolve depois de emitir.
 */
import Big from "big.js";

const arred = (v: Big) => v.round(2, Big.roundHalfUp);

export type LinhaCalculo = { readonly quantidade: Big; readonly preco: Big; readonly taxa: Big | null };

export type Totais = {
  readonly liquido: Big;
  /** `null` quando falta a taxa de alguma linha (quem não lê as taxas). */
  readonly imposto: Big | null;
  readonly total: Big | null;
  readonly retencao: Big;
  readonly aPagar: Big | null;
};

export function liquidoDaLinha(l: Pick<LinhaCalculo, "quantidade" | "preco">): Big {
  return arred(l.quantidade.times(l.preco));
}

export function impostoDaLinha(l: LinhaCalculo): Big | null {
  return l.taxa === null ? null : arred(liquidoDaLinha(l).times(l.taxa).div(100));
}

export function calcularTotais(linhas: readonly LinhaCalculo[], taxaRetencao: Big | null): Totais {
  let liquido = new Big(0);
  let imposto: Big | null = new Big(0);
  for (const l of linhas) {
    liquido = liquido.plus(liquidoDaLinha(l));
    const i = impostoDaLinha(l);
    imposto = imposto === null || i === null ? null : imposto.plus(i);
  }
  const retencao = taxaRetencao !== null && taxaRetencao.gt(0) ? arred(liquido.times(taxaRetencao).div(100)) : new Big(0);
  const total = imposto === null ? null : liquido.plus(imposto);
  return { liquido, imposto, total, retencao, aPagar: total === null ? null : total.minus(retencao) };
}
