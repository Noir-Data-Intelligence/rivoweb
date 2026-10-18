/**
 * Regras do CRM que o front valida antes de enviar, iguais às do servidor
 * (`Crm.cs`, `CommercialDbContext.cs`). O servidor decide sempre.
 */
import { instanteDeDataHoraLocal } from "@/lib/format/data";
import { lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { emailOpcional, IsoDate } from "@/lib/validation/text";
import type { PedidoActividade, PedidoConversao, PedidoLead, PedidoOportunidade, PedidoTipoServico, TipoActividade } from "./api";

export const MOEDAS = ["AOA", "USD", "EUR"] as const;

type Erros<T> = { [K in keyof T]?: string | undefined };
export const temErros = (e: Record<string, string | undefined>) => Object.values(e).some(Boolean);

const max = (t: string, n: number) => (t.length > n ? `No máximo ${n.toLocaleString("pt-PT")} caracteres.` : undefined);
const opc = (t: string, multilinha = false) => {
  const v = normalizarTexto(t, multilinha);
  return v === "" ? null : v;
};

// --- Lead

export interface CamposLead {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  origem: string;
  responsavel: string;
  notas: string;
}

export function errosLead(v: CamposLead): Erros<CamposLead> {
  const nome = normalizarTexto(v.nome);
  const email = normalizarTexto(v.email);
  return {
    nome: nome === "" ? "Indique o nome de quem contactar." : max(nome, 200),
    empresa: max(normalizarTexto(v.empresa), 200),
    email: email !== "" && !emailOpcional.safeParse(email).success ? "E-mail inválido." : max(email, 200),
    telefone: max(normalizarTexto(v.telefone), 50),
    origem: max(normalizarTexto(v.origem), 100),
    notas: max(normalizarTexto(v.notas, true), 2000),
  };
}

export function leadParaApi(v: CamposLead): PedidoLead {
  return {
    name: normalizarTexto(v.nome),
    company: opc(v.empresa),
    email: opc(v.email),
    phone: opc(v.telefone),
    source: opc(v.origem),
    ownerEmployeeId: v.responsavel === "" ? null : v.responsavel,
    notes: opc(v.notas, true),
  };
}

export const erroMotivo = (t: string, falta: string) => {
  const v = normalizarTexto(t, true);
  return v === "" ? falta : max(v, 500);
};

// --- Conversão do lead

export interface CamposConversao {
  destino: "novo" | "existente";
  cliente: string;
  nif: string;
  morada: string;
  cidade: string;
  pais: string;
  abrirOportunidade: boolean;
  titulo: string;
  valor: string;
  moeda: string;
}

export function errosConversao(v: CamposConversao): Erros<CamposConversao> {
  const nif = normalizarTexto(v.nif);
  const titulo = normalizarTexto(v.titulo);
  const valor = v.valor.trim() === "" ? null : lerDinheiroDigitado(v.valor);
  return {
    cliente: v.destino === "existente" && v.cliente === "" ? "Escolha o cliente." : undefined,
    nif: v.destino === "novo" ? (nif === "" ? "Indique o NIF do novo cliente." : max(nif, 30)) : undefined,
    morada: v.destino === "novo" ? (normalizarTexto(v.morada) === "" ? "Indique a morada de facturação." : max(normalizarTexto(v.morada), 300)) : undefined,
    cidade: v.destino === "novo" ? (normalizarTexto(v.cidade) === "" ? "Indique a cidade." : max(normalizarTexto(v.cidade), 100)) : undefined,
    pais: v.destino === "novo" && !/^[A-Za-z]{2}$/.test(v.pais.trim()) ? "Código do país com duas letras (ex.: AO)." : undefined,
    titulo: v.abrirOportunidade ? (titulo === "" ? "Indique o título da oportunidade." : max(titulo, 200)) : undefined,
    valor: v.abrirOportunidade && v.valor.trim() !== "" && (valor === null || valor.lt(0)) ? "Valor não negativo (até 2 casas decimais)." : undefined,
  };
}

export function conversaoParaApi(v: CamposConversao): PedidoConversao {
  const valor = v.abrirOportunidade && v.valor.trim() !== "" ? lerDinheiroDigitado(v.valor) : null;
  return {
    customerId: v.destino === "existente" ? v.cliente : null,
    taxId: v.destino === "novo" ? normalizarTexto(v.nif) : null,
    addressDetail: v.destino === "novo" ? normalizarTexto(v.morada) : null,
    city: v.destino === "novo" ? normalizarTexto(v.cidade) : null,
    country: v.destino === "novo" ? v.pais.trim().toUpperCase() : null,
    opportunityTitle: v.abrirOportunidade ? normalizarTexto(v.titulo) : null,
    estimatedValue: valor ? paraApi(valor) : null,
    currency: v.abrirOportunidade ? v.moeda : null,
  };
}

// --- Oportunidade

export interface CamposOportunidade {
  titulo: string;
  para: "cliente" | "lead";
  cliente: string;
  lead: string;
  valor: string;
  moeda: string;
  probabilidade: string;
  fecho: string;
  responsavel: string;
  notas: string;
}

export function errosOportunidade(v: CamposOportunidade, nova: boolean): Erros<CamposOportunidade> {
  const titulo = normalizarTexto(v.titulo);
  const valor = lerDinheiroDigitado(v.valor);
  const p = v.probabilidade.trim();
  return {
    titulo: titulo === "" ? "Indique o título." : max(titulo, 200),
    cliente: nova && v.para === "cliente" && v.cliente === "" ? "Escolha o cliente." : undefined,
    lead: nova && v.para === "lead" && v.lead === "" ? "Escolha o lead." : undefined,
    valor: valor === null || valor.lt(0) ? "Valor não negativo (até 2 casas decimais)." : undefined,
    // Vazia, o servidor põe 10% — também ao corrigir; por isso, ao corrigir, é obrigatória.
    probabilidade: (p === "" && !nova) || (p !== "" && !(/^\d{1,3}$/.test(p) && Number(p) <= 100)) ? "Entre 0 e 100." : undefined,
    fecho: v.fecho !== "" && !IsoDate.safeParse(v.fecho).success ? "Data inválida." : undefined,
    notas: max(normalizarTexto(v.notas, true), 2000),
  };
}

export function oportunidadeParaApi(v: CamposOportunidade, original?: { customerId: string | null; leadId: string | null }): PedidoOportunidade {
  return {
    title: normalizarTexto(v.titulo),
    customerId: original ? original.customerId : v.para === "cliente" ? v.cliente : null,
    leadId: original ? original.leadId : v.para === "lead" ? v.lead : null,
    estimatedValue: paraApi(lerDinheiroDigitado(v.valor) as Dinheiro),
    currency: v.moeda,
    probability: v.probabilidade.trim() === "" ? null : Number(v.probabilidade.trim()),
    expectedCloseDate: v.fecho === "" ? null : v.fecho,
    ownerEmployeeId: v.responsavel === "" ? null : v.responsavel,
    notes: opc(v.notas, true),
  };
}

// --- Actividade

export interface CamposActividade {
  tipo: TipoActividade;
  assunto: string;
  quando: string;
  feita: boolean;
  responsavel: string;
  notas: string;
}

export function errosActividade(v: CamposActividade): Erros<CamposActividade> {
  const assunto = normalizarTexto(v.assunto);
  return {
    assunto: assunto === "" ? "Indique o assunto." : max(assunto, 300),
    quando: v.quando !== "" && instanteDeDataHoraLocal(v.quando) === null ? "Data e hora inválidas." : undefined,
    notas: max(normalizarTexto(v.notas, true), 4000),
  };
}

export function actividadeParaApi(v: CamposActividade, sobre: { lead?: string; oportunidade?: string; cliente?: string }): PedidoActividade {
  return {
    kind: v.tipo,
    subject: normalizarTexto(v.assunto),
    notes: opc(v.notas, true),
    scheduledAt: v.quando === "" ? null : instanteDeDataHoraLocal(v.quando),
    done: v.feita,
    leadId: sobre.lead ?? null,
    opportunityId: sobre.oportunidade ?? null,
    customerId: sobre.cliente ?? null,
    ownerEmployeeId: v.responsavel === "" ? null : v.responsavel,
  };
}

// --- Tipo de serviço

export interface CamposServico {
  codigo: string;
  nome: string;
  descricao: string;
  preco: string;
  moeda: string;
  activo: boolean;
}

export function errosServico(v: CamposServico, novo: boolean): Erros<CamposServico> {
  const codigo = normalizarTexto(v.codigo);
  const nome = normalizarTexto(v.nome);
  const preco = lerDinheiroDigitado(v.preco);
  return {
    codigo: novo ? (codigo === "" ? "Indique o código." : max(codigo, 30)) : undefined,
    nome: nome === "" ? "Indique o nome." : max(nome, 200),
    descricao: max(normalizarTexto(v.descricao, true), 1000),
    preco: preco === null || preco.lt(0) ? "Preço não negativo (até 2 casas decimais)." : undefined,
  };
}

export function servicoParaApi(v: CamposServico): PedidoTipoServico {
  return {
    code: normalizarTexto(v.codigo),
    name: normalizarTexto(v.nome),
    description: opc(v.descricao, true),
    unitPrice: paraApi(lerDinheiroDigitado(v.preco) as Dinheiro),
    currency: v.moeda,
    active: v.activo,
  };
}
