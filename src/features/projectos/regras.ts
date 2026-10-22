/** Regras dos projectos iguais às do servidor (`Project.cs`, `ProjectTask.cs`, `ProjectWork.cs`). */
import { lerDecimalDigitado, lerDinheiroDigitado, paraApi, decimalParaApi, type Dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";
import type { components } from "@/lib/api/schema";
import type { Prioridade } from "./api";

type S = components["schemas"];
export const temErros = (e: Record<string, string | undefined>) => Object.values(e).some(Boolean);
const max = (t: string, n: number) => (t.length > n ? `No máximo ${n.toLocaleString("pt-PT")} caracteres.` : undefined);
const data = (v: string) => IsoDate.safeParse(v).success;

export function errosProjecto(v: { nome: string; inicio: string }) {
  const nome = normalizarTexto(v.nome);
  return { nome: nome === "" ? "Indique o nome." : max(nome, 200), inicio: data(v.inicio) ? undefined : "Indique a data de início." };
}

export const erroFecho = (fim: string, inicio: string) => (!data(fim) ? "Indique a data de fecho." : fim < inicio ? "A data de fecho não pode ser anterior à de início." : undefined);

export function errosOrcamento(v: { valor: string; moeda: string }) {
  const valor = lerDinheiroDigitado(v.valor);
  return { valor: valor === null || !valor.gt(0) ? "Valor positivo (até 2 casas decimais)." : undefined };
}

export const orcamentoParaApi = (v: { valor: string; moeda: string }): S["SetBudgetRequest"] => ({ amount: paraApi(lerDinheiroDigitado(v.valor) as Dinheiro), currency: v.moeda });

export function errosMarco(v: { nome: string; data: string }, inicioProjecto: string) {
  const nome = normalizarTexto(v.nome);
  return {
    nome: nome === "" ? "Indique o nome." : max(nome, 200),
    data: !data(v.data) ? "Indique a data alvo." : v.data < inicioProjecto ? "A data do marco não pode ser anterior ao início do projecto." : undefined,
  };
}

export function errosNovaTarefa(v: { titulo: string; prazo: string }, inicioProjecto: string) {
  const titulo = normalizarTexto(v.titulo);
  return {
    titulo: titulo === "" ? "Indique o título." : max(titulo, 200),
    prazo: v.prazo === "" ? undefined : !data(v.prazo) ? "Data inválida." : v.prazo < inicioProjecto ? "O prazo não pode ser anterior ao início do projecto." : undefined,
  };
}

export interface CamposPlano {
  titulo: string;
  descricao: string;
  inicio: string;
  prazo: string;
  horas: string;
  prioridade: Prioridade;
  progresso: string;
}

export function errosPlano(v: CamposPlano, inicioProjecto: string) {
  const titulo = normalizarTexto(v.titulo);
  const horas = v.horas.trim() === "" ? null : lerDecimalDigitado(v.horas, 2);
  const p = v.progresso.trim();
  return {
    titulo: titulo === "" ? "Indique o título." : max(titulo, 200),
    descricao: max(normalizarTexto(v.descricao, true), 4000),
    inicio: v.inicio === "" ? undefined : !data(v.inicio) ? "Data inválida." : v.inicio < inicioProjecto ? "As datas da tarefa não podem ser anteriores ao início do projecto." : undefined,
    prazo:
      v.prazo === ""
        ? undefined
        : !data(v.prazo)
          ? "Data inválida."
          : v.prazo < inicioProjecto
            ? "As datas da tarefa não podem ser anteriores ao início do projecto."
            : v.inicio !== "" && v.prazo < v.inicio
              ? "O prazo não pode ser anterior ao início da tarefa."
              : undefined,
    horas: v.horas.trim() !== "" && (horas === null || horas.lt(0)) ? "Horas não negativas (até 2 casas decimais)." : undefined,
    progresso: p !== "" && !(/^\d{1,3}$/.test(p) && Number(p) <= 100) ? "Entre 0 e 100." : undefined,
  };
}

export function planoParaApi(v: CamposPlano): S["PlanTaskRequest"] {
  const descricao = normalizarTexto(v.descricao, true);
  const horas = v.horas.trim() === "" ? null : lerDecimalDigitado(v.horas, 2);
  return {
    title: normalizarTexto(v.titulo),
    description: descricao === "" ? null : descricao,
    startDate: v.inicio === "" ? null : v.inicio,
    dueDate: v.prazo === "" ? null : v.prazo,
    estimatedHours: horas ? decimalParaApi(horas) : null,
    priority: v.prioridade,
    progress: v.progresso.trim() === "" ? null : Number(v.progresso.trim()),
  };
}

export function errosComentarioMarco(v: { texto: string; autor: string }) {
  const texto = normalizarTexto(v.texto, true);
  return { texto: texto === "" ? "Escreva o comentário." : max(texto, 4000), autor: max(normalizarTexto(v.autor), 200) };
}

// --- Bloco 2: comentários, checklist, tempo, orçamento por linhas, ficheiros, recursos.

export const erroComentario = (t: string) => {
  const v = normalizarTexto(t, true);
  return v === "" ? "Escreva o comentário." : max(v, 4000);
};

export const erroPasso = (t: string) => {
  const v = normalizarTexto(t);
  return v === "" ? "Indique o passo." : max(v, 300);
};

export interface CamposTempo {
  pessoa: string;
  tarefa: string;
  dia: string;
  horas: string;
  descricao: string;
  facturavel: boolean;
}

export function errosTempo(v: CamposTempo, hoje: string) {
  const h = lerDecimalDigitado(v.horas, 2);
  return {
    pessoa: v.pessoa === "" ? "Escolha o colaborador." : undefined,
    dia: !data(v.dia) ? "Indique o dia." : v.dia > hoje ? "Não se regista tempo num dia futuro." : undefined,
    horas: h === null || !h.gt(0) || h.gt(24) ? "Horas entre 0 e 24 (até 2 casas decimais)." : undefined,
    descricao: max(normalizarTexto(v.descricao), 500),
  };
}

export function tempoParaApi(v: CamposTempo): S["TimeEntryRequest"] {
  const d = normalizarTexto(v.descricao);
  return {
    employeeId: v.pessoa,
    taskId: v.tarefa === "" ? null : v.tarefa,
    day: v.dia,
    hours: decimalParaApi(lerDecimalDigitado(v.horas, 2) as NonNullable<ReturnType<typeof lerDecimalDigitado>>),
    description: d === "" ? null : d,
    billable: v.facturavel,
  };
}

export interface CamposLinhaOrcamento {
  categoria: string;
  descricao: string;
  previsto: string;
  gasto: string;
}

export function errosLinhaOrcamento(v: CamposLinhaOrcamento) {
  const cat = normalizarTexto(v.categoria);
  const previsto = lerDinheiroDigitado(v.previsto);
  const gasto = v.gasto.trim() === "" ? null : lerDinheiroDigitado(v.gasto);
  return {
    categoria: cat === "" ? "Indique a categoria." : max(cat, 100),
    descricao: max(normalizarTexto(v.descricao), 500),
    previsto: previsto === null || previsto.lt(0) ? "Valor não negativo (até 2 casas decimais)." : undefined,
    gasto: v.gasto.trim() !== "" && (gasto === null || gasto.lt(0)) ? "Valor não negativo (até 2 casas decimais)." : undefined,
  };
}

export function linhaOrcamentoParaApi(v: CamposLinhaOrcamento): S["BudgetLineRequest"] {
  const d = normalizarTexto(v.descricao);
  return {
    category: normalizarTexto(v.categoria),
    description: d === "" ? null : d,
    plannedAmount: paraApi(lerDinheiroDigitado(v.previsto) as Dinheiro),
    actualAmount: v.gasto.trim() === "" ? null : paraApi(lerDinheiroDigitado(v.gasto) as Dinheiro),
  };
}

export const erroMotivoFicheiro = (t: string) => {
  const v = normalizarTexto(t, true);
  return v === "" ? "Diga porque retira o ficheiro do projecto." : v.length > 500 ? "O motivo tem no máximo 500 caracteres." : undefined;
};

export function errosAlocacao(v: { recurso: string; inicio: string }, inicioProjecto: string) {
  return {
    recurso: v.recurso === "" ? "Escolha o recurso." : undefined,
    inicio: !data(v.inicio) ? "Indique o início." : v.inicio < inicioProjecto ? "A alocação não pode começar antes do início do projecto." : undefined,
  };
}

export const erroFimAlocacao = (fim: string, inicio: string) => (!data(fim) ? "Indique o fim." : fim < inicio ? "A data de fim não pode ser anterior ao início da alocação." : undefined);
