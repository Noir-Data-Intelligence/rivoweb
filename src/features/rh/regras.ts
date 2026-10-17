/**
 * Regras do RH que o front valida antes de enviar, iguais às do domínio
 * (`Workplace.cs`, `Talent.cs`, `EmploymentContract.cs`, `Benefit.cs`). O
 * servidor decide sempre; isto só evita um pedido que se sabe recusado.
 */
import { hojeIso } from "@/lib/format/data";
import { lerDinheiroDigitado } from "@/lib/money/money";
import { normalizarTexto, pareceEmail } from "@/lib/validation/normalizar";
import { ibanValido } from "@/lib/validation/text";

/** País com duas letras, nascimento não futuro, IBAN válido se mudou. */
export function errosDadosPessoais(v: Readonly<Record<string, string>>, ibanAnterior: string | null, hoje = hojeIso()): Record<string, string> {
  const e: Record<string, string> = {};
  for (const k of ["country", "passportIssuingCountry"]) {
    const x = normalizarTexto(v[k] ?? "");
    if (x !== "" && !/^[A-Za-z]{2}$/.test(x)) e[k] = "Duas letras (código ISO do país).";
  }
  if (v.birthDate && v.birthDate > hoje) e.birthDate = "A data de nascimento não pode ser futura.";
  const iban = (v.iban ?? "").replace(/\s+/g, "").toUpperCase();
  if (iban !== "" && iban !== (ibanAnterior ?? "") && !ibanValido(iban)) e.iban = "IBAN inválido: confirme os dígitos de controlo.";
  return e;
}

export const TIPO_CONTRATO: Readonly<Record<string, string>> = {
  Permanent: "Sem termo",
  FixedTerm: "A termo",
  Freelance: "Prestação de serviços",
};

export type ErrosContrato = { colaborador?: string; inicio?: string; fim?: string; salario?: string };

/** O tipo manda na data de fim: sem termo não tem; a termo e prestação exigem-na, depois do início. */
export function errosContrato(p: { colaborador: string; tipo: string; inicio: string; fim: string; salario: string }): ErrosContrato {
  const e: ErrosContrato = {};
  if (!p.colaborador) e.colaborador = "Escolha o colaborador.";
  if (!p.inicio) e.inicio = "Indique o início.";
  if (p.tipo === "Permanent" && p.fim) e.fim = "Um contrato sem termo não tem data de fim.";
  if (p.tipo !== "Permanent" && !p.fim) e.fim = "Um contrato a termo ou de prestação de serviços exige data de fim.";
  else if (p.fim && p.inicio && p.fim <= p.inicio) e.fim = "A data de fim tem de ser posterior à de início.";
  const s = lerDinheiroDigitado(p.salario);
  if (p.salario.trim() === "") e.salario = "Indique o salário mensal.";
  else if (s === null) e.salario = "Valor inválido (até 2 casas decimais).";
  else if (s.lte(0)) e.salario = "O salário tem de ser maior que zero.";
  return e;
}

/** Dias de direito ou transitados: de 0 a 366, até 2 casas (`LeaveEntitlement.Set`). */
export function lerDias(texto: string): string | null {
  const v = lerDinheiroDigitado(normalizarTexto(texto), 2);
  if (v === null || v.lt(0) || v.gt(366)) return null;
  return v.toString();
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function dia(iso: string): number | null {
  if (!ISO.test(iso)) return null;
  const t = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const d = new Date(t);
  return d.toISOString().slice(0, 10) === iso ? t / 86_400_000 : null;
}

/** Dias de calendário de um intervalo, os dois extremos incluídos (como `calendarDays`). */
export function diasDeCalendario(de: string, ate: string): number | null {
  const a = dia(de);
  const b = dia(ate);
  if (a === null || b === null || b < a) return null;
  return b - a + 1;
}

export type ErrosFerias = { tipo?: string; de?: string; ate?: string };

export function validarFerias(p: { tipo: string; de: string; ate: string }): ErrosFerias {
  const e: ErrosFerias = {};
  if (!p.tipo) e.tipo = "Escolha o tipo.";
  if (dia(p.de) === null) e.de = "Indique o primeiro dia.";
  if (dia(p.ate) === null) e.ate = "Indique o último dia.";
  else if (!e.de && diasDeCalendario(p.de, p.ate) === null) e.ate = "O último dia não pode ser anterior ao primeiro.";
  return e;
}

// --- F7c: recrutamento, entradas e saídas (limites de `HrDbContext`)

const ORDEM_FUNIL = ["Applied", "Screening", "Interview", "Offer"] as const;

/** A etapa seguinte do funil, ou `null` na proposta (daí contrata-se) e nas finais. */
export function proximaEtapa(etapa: string): string | null {
  const i = ORDEM_FUNIL.indexOf(etapa as (typeof ORDEM_FUNIL)[number]);
  return i >= 0 && i < ORDEM_FUNIL.length - 1 ? (ORDEM_FUNIL[i + 1] ?? null) : null;
}

export type ErrosVaga = { titulo?: string; vagas?: string; descricao?: string; requisitos?: string };

export function errosVaga(p: { titulo: string; vagas: string; descricao: string; requisitos: string }): ErrosVaga {
  const e: ErrosVaga = {};
  const t = normalizarTexto(p.titulo);
  if (t === "") e.titulo = "Indique o título da vaga.";
  else if (t.length > 200) e.titulo = "No máximo 200 caracteres.";
  if (!/^\d{1,3}$/.test(p.vagas.trim()) || Number(p.vagas) < 1) e.vagas = "Pelo menos uma vaga (número inteiro).";
  if (normalizarTexto(p.descricao, true).length > 2000) e.descricao = "No máximo 2000 caracteres.";
  if (normalizarTexto(p.requisitos, true).length > 2000) e.requisitos = "No máximo 2000 caracteres.";
  return e;
}

export type ErrosCandidato = { nome?: string; email?: string; telefone?: string; data?: string };

export function errosCandidato(p: { nome: string; email: string; telefone: string; data: string }, hoje = hojeIso()): ErrosCandidato {
  const e: ErrosCandidato = {};
  const n = normalizarTexto(p.nome);
  if (n === "") e.nome = "Indique o nome.";
  else if (n.length > 200) e.nome = "No máximo 200 caracteres.";
  const m = p.email.trim();
  if (m !== "" && (!pareceEmail(m) || m.length > 320)) e.email = "E-mail inválido.";
  if (p.telefone.trim().length > 30) e.telefone = "No máximo 30 caracteres.";
  if (p.data !== "" && p.data > hoje) e.data = "A candidatura não pode ter data futura.";
  return e;
}

export type TarefaRascunho = { titulo: string; categoria: string; prazo: string };
export type ErrosProcesso = { colaborador?: string; ultimoDia?: string; motivo?: string; tarefas?: string; linhas: Record<number, string> };

/** Um processo sem tarefas nunca se conclui e não há como lhas juntar depois: exige-se pelo menos uma. */
export function errosProcesso(p: { colaborador: string; tipo: string; ultimoDia: string; motivo: string; tarefas: readonly TarefaRascunho[] }): ErrosProcesso {
  const e: ErrosProcesso = { linhas: {} };
  if (p.colaborador === "") e.colaborador = "Escolha o colaborador.";
  if (p.tipo === "Offboarding" && p.ultimoDia === "") e.ultimoDia = "Uma saída exige o último dia de trabalho.";
  if (normalizarTexto(p.motivo, true).length > 500) e.motivo = "No máximo 500 caracteres.";
  const preenchidas = p.tarefas.filter((t) => normalizarTexto(t.titulo) !== "");
  if (preenchidas.length === 0) e.tarefas = "Indique pelo menos uma tarefa: um processo sem tarefas não se conclui.";
  p.tarefas.forEach((t, i) => {
    if (normalizarTexto(t.titulo).length > 200) e.linhas[i] = "Título com mais de 200 caracteres.";
    else if (normalizarTexto(t.titulo) === "" && t.prazo !== "") e.linhas[i] = "Falta o título desta tarefa.";
  });
  return e;
}

export const temErrosProcesso = (e: ErrosProcesso) => Boolean(e.colaborador || e.ultimoDia || e.motivo || e.tarefas) || Object.keys(e.linhas).length > 0;
