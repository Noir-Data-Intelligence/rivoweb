/**
 * Regras do portal do cliente que o front valida antes de enviar, iguais às do
 * servidor (`Conversation.cs`, `PaymentClaim.cs`, `ManagePaymentClaims.cs`,
 * `FinanceDbContext.cs`). O servidor decide sempre: o valor em aberto de cada
 * factura só ele o sabe.
 */
import { lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";

export const MAXIMO_ASSUNTO = 200;
export const MAXIMO_MENSAGEM = 4000;
export const MAXIMO_NOTAS = 500;

export const NOMES_EXTRACTO: Readonly<Record<string, string>> = { Factura: "Factura", NotaCredito: "Nota de crédito", Recibo: "Recibo" };

const limite = (t: string, max: number, vazio: string) => (t === "" ? vazio : t.length > max ? `No máximo ${String(max)} caracteres.` : undefined);

export const erroMensagem = (texto: string) => limite(normalizarTexto(texto, true), MAXIMO_MENSAGEM, "Escreva a mensagem.");

export function errosTicket(v: { assunto: string; texto: string }) {
  return {
    assunto: limite(normalizarTexto(v.assunto), MAXIMO_ASSUNTO, "Indique o assunto."),
    texto: limite(normalizarTexto(v.texto, true), MAXIMO_MENSAGEM, "Descreva o pedido."),
  };
}

export interface CamposComprovativo {
  factura: string;
  valor: string;
  pagoA: string;
  documento: string | null;
  notas: string;
}

/** `hoje` em ISO: uma transferência ainda por fazer não tem comprovativo. */
export function errosComprovativo(v: CamposComprovativo, hoje: string) {
  const valor = lerDinheiroDigitado(v.valor);
  const notas = normalizarTexto(v.notas, true);
  return {
    factura: v.factura === "" ? "Escolha a factura." : undefined,
    valor: valor === null || !valor.gt(0) ? "Valor positivo (até 2 casas decimais)." : undefined,
    pagoA: !IsoDate.safeParse(v.pagoA).success ? "Indique a data do pagamento." : v.pagoA > hoje ? "A data do pagamento não pode ser futura." : undefined,
    documento: v.documento === null ? "Anexe o comprovativo." : undefined,
    notas: notas.length > MAXIMO_NOTAS ? `No máximo ${String(MAXIMO_NOTAS)} caracteres.` : undefined,
  };
}

export function comprovativoParaApi(v: CamposComprovativo) {
  const notas = normalizarTexto(v.notas, true);
  return {
    salesInvoiceId: v.factura,
    amount: paraApi(lerDinheiroDigitado(v.valor) as Dinheiro),
    paidOn: v.pagoA,
    documentId: v.documento ?? "",
    notes: notas === "" ? null : notas,
  };
}

export interface CamposAvaliacao {
  nota: number | null;
  recomendacao: string;
  comentario: string;
}

export function errosAvaliacao(v: CamposAvaliacao) {
  const r = v.recomendacao.trim();
  return {
    nota: v.nota === null || v.nota < 1 || v.nota > 5 ? "Escolha de 1 a 5." : undefined,
    recomendacao: r !== "" && !/^(10|\d)$/.test(r) ? "De 0 a 10." : undefined,
    comentario: normalizarTexto(v.comentario, true).length > MAXIMO_MENSAGEM ? `No máximo ${String(MAXIMO_MENSAGEM)} caracteres.` : undefined,
  };
}

export function avaliacaoParaApi(v: CamposAvaliacao) {
  const r = v.recomendacao.trim();
  const c = normalizarTexto(v.comentario, true);
  return { rating: v.nota ?? 0, netPromoterScore: r === "" ? null : Number(r), comment: c === "" ? null : c };
}

export const temErros = (e: Record<string, string | undefined>) => Object.values(e).some(Boolean);
