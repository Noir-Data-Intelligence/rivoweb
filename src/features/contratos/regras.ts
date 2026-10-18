/** Regras dos contratos de clientes iguais às do servidor (`Crm.cs`, `Relationships.cs`). */
import { lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";
import type { Contrato, PedidoContrato, TipoContrato } from "./api";

const max = (t: string, n: number) => (t.length > n ? `No máximo ${n.toLocaleString("pt-PT")} caracteres.` : undefined);
const data = (v: string) => v === "" || IsoDate.safeParse(v).success;
const inteiro = (v: string) => /^\d{1,6}$/.test(v.trim());

export interface CamposContrato {
  referencia: string;
  titulo: string;
  cliente: string;
  tipo: TipoContrato;
  inicio: string;
  fim: string;
  valor: string;
  moeda: string;
  slaResposta: string;
  slaResolucao: string;
  aviso: string;
  autoRenovar: boolean;
  notas: string;
}

export function errosContrato(v: CamposContrato, novo: boolean) {
  const valor = v.valor.trim() === "" ? null : lerDinheiroDigitado(v.valor);
  const horas = (t: string) => (t.trim() === "" ? undefined : inteiro(t) && Number(t) > 0 ? undefined : "Horas inteiras, maiores que zero.");
  return {
    referencia: novo ? (normalizarTexto(v.referencia) === "" ? "Indique a referência." : max(normalizarTexto(v.referencia), 60)) : undefined,
    titulo: normalizarTexto(v.titulo) === "" ? "Indique o título." : max(normalizarTexto(v.titulo), 200),
    cliente: novo && v.cliente === "" ? "Escolha o cliente." : undefined,
    inicio: v.inicio === "" || !data(v.inicio) ? "Indique a data de início." : undefined,
    fim: !data(v.fim) ? "Data inválida." : v.fim !== "" && v.inicio !== "" && v.fim < v.inicio ? "O fim não pode ser antes do início." : undefined,
    valor: v.valor.trim() !== "" && (valor === null || valor.lt(0)) ? "Valor não negativo (até 2 casas decimais)." : undefined,
    slaResposta: horas(v.slaResposta),
    slaResolucao: horas(v.slaResolucao),
    aviso: v.aviso.trim() === "" || inteiro(v.aviso) ? undefined : "Dias inteiros (0 ou mais).",
    notas: max(normalizarTexto(v.notas, true), 4000),
  };
}

const num = (t: string) => (t.trim() === "" ? null : Number(t.trim()));

/** Ao corrigir, a referência, o cliente e o tipo vão como estavam (o servidor ignora-os). */
export function contratoParaApi(v: CamposContrato, original?: Contrato): PedidoContrato {
  const valor = v.valor.trim() === "" ? null : (lerDinheiroDigitado(v.valor) as Dinheiro);
  const notas = normalizarTexto(v.notas, true);
  return {
    number: original ? original.number : normalizarTexto(v.referencia),
    title: normalizarTexto(v.titulo),
    customerId: original ? original.customerId : v.cliente,
    kind: original ? (original.kind as TipoContrato) : v.tipo,
    startsOn: v.inicio,
    endsOn: v.fim === "" ? null : v.fim,
    value: valor ? paraApi(valor) : null,
    currency: valor ? v.moeda : null,
    slaResponseHours: num(v.slaResposta),
    slaResolutionHours: num(v.slaResolucao),
    renewalNoticeDays: num(v.aviso),
    autoRenew: v.autoRenovar,
    notes: notas === "" ? null : notas,
  };
}

export const camposDoContrato = (c: Contrato): CamposContrato => ({
  referencia: c.number,
  titulo: c.title,
  cliente: c.customerId,
  tipo: c.kind as TipoContrato,
  inicio: c.startsOn,
  fim: c.endsOn ?? "",
  valor: c.value === null ? "" : String(c.value).replace(".", ","),
  moeda: c.currency ?? "AOA",
  slaResposta: c.slaResponseHours === null ? "" : String(c.slaResponseHours),
  slaResolucao: c.slaResolutionHours === null ? "" : String(c.slaResolutionHours),
  aviso: c.renewalNoticeDays === null ? "" : String(c.renewalNoticeDays),
  autoRenovar: c.autoRenew,
  notas: c.notes ?? "",
});

export function erroRenovacao(fim: string, actual: string | null) {
  if (!IsoDate.safeParse(fim).success) return "Indique o novo fim.";
  return actual !== null && fim <= actual ? "A renovação tem de estender o fim actual." : undefined;
}

export interface CamposAditamento {
  descricao: string;
  efeito: string;
  variacao: string;
  novoFim: string;
}

/** `valor` e `inicio` do contrato, para recusar o que o servidor recusaria. */
export function errosAditamento(v: CamposAditamento, contrato: { valor: number | string | null; inicio: string }) {
  const desc = normalizarTexto(v.descricao, true);
  const variacao = v.variacao.trim() === "" ? null : lerDinheiroDigitado(v.variacao.replace(/^\+/, ""));
  const negativo = variacao !== null && contrato.valor !== null ? lerDinheiroDigitado(String(contrato.valor).replace(".", ","))?.plus(variacao).lt(0) : variacao?.lt(0);
  return {
    descricao: desc === "" ? "Descreva o aditamento." : max(desc, 2000),
    efeito: data(v.efeito) ? undefined : "Data inválida.",
    variacao:
      v.variacao.trim() === "" && v.novoFim === ""
        ? "Um aditamento muda o valor, o fim, ou os dois."
        : v.variacao.trim() !== "" && variacao === null
          ? "Valor com até 2 casas decimais (negativo para reduzir)."
          : negativo
            ? "O aditamento deixaria o contrato com valor negativo."
            : undefined,
    novoFim: !data(v.novoFim) ? "Data inválida." : v.novoFim !== "" && v.novoFim < contrato.inicio ? "O fim não pode ser antes do início." : undefined,
  };
}

export function aditamentoParaApi(v: CamposAditamento) {
  const variacao = v.variacao.trim() === "" ? null : lerDinheiroDigitado(v.variacao.replace(/^\+/, ""));
  return {
    description: normalizarTexto(v.descricao, true),
    effectiveOn: v.efeito === "" ? null : v.efeito,
    valueChange: variacao ? paraApi(variacao) : null,
    newEndsOn: v.novoFim === "" ? null : v.novoFim,
  };
}
