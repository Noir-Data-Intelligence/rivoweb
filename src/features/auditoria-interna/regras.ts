/**
 * Regras da auditoria interna, as mesmas do servidor (`AuditEngagement.cs`,
 * `ManageInternalAudit.cs`). O servidor decide; isto só guia o formulário e
 * os botões.
 */
import type { components } from "@/lib/api/schema";
import { normalizarTexto } from "@/lib/validation/normalizar";

type S = components["schemas"];
type Erros<K extends string> = Partial<Record<K, string>>;
export const temErros = (e: object) => Object.keys(e).length > 0;

export const MAXIMO_TITULO = 200;
export const MAXIMO_TEXTO = 2000;
export const MAXIMO_CONTROLO = 50;

export type Risco = "Low" | "Medium" | "High" | "Critical";
export type EstadoAuditoria = "Planned" | "InProgress" | "Reporting" | "Closed" | "Cancelled";
export type EstadoAchado = "Open" | "InRemediation" | "Closed" | "AcceptedRisk";
export type EstadoPlano = "Pending" | "InProgress" | "Done";

const opc = (v: string, multi = false) => {
  const n = normalizarTexto(v, multi);
  return n === "" ? null : n;
};
const texto = (e: Record<string, string>, k: string, v: string, n: number, falta?: string, multi = false) => {
  const t = normalizarTexto(v, multi);
  if (t === "" && falta) e[k] = falta;
  else if (t.length > n) e[k] = `No máximo ${String(n)} caracteres.`;
};

// ---- Auditoria ---------------------------------------------------------

export const auditoriaEncerrada = (estado: string) => estado === "Closed" || estado === "Cancelled";
/** Achados novos só no trabalho de campo e no relatório. */
export const aceitaAchados = (estado: string) => estado === "InProgress" || estado === "Reporting";

export type Fase = { readonly alvo: EstadoAuditoria; readonly texto: string };

/** As fases a que se pode passar a seguir (uma de cada vez; do relatório pode voltar ao campo). Cancelar é à parte. */
export function fasesSeguintes(estado: string): readonly Fase[] {
  switch (estado) {
    case "Planned":
      return [{ alvo: "InProgress", texto: "Iniciar" }];
    case "InProgress":
      return [{ alvo: "Reporting", texto: "Passar a relatório" }];
    case "Reporting":
      return [
        { alvo: "Closed", texto: "Fechar" },
        { alvo: "InProgress", texto: "Voltar a em curso" },
      ];
    default:
      return [];
  }
}

/** Fechar exige todos os achados fechados ou com o risco aceite. */
export const podeFecharAuditoria = (a: Pick<S["AuditView"], "findingsOpen">) => Number(a.findingsOpen) === 0;

export type CamposAuditoria = {
  titulo: string;
  objectivos: string;
  ambito: string;
  departamento: string;
  responsavel: string;
  inicio: string;
  fim: string;
  risco: Risco;
};

export const camposAuditoria = (a?: S["AuditView"]): CamposAuditoria => ({
  titulo: a?.title ?? "",
  objectivos: a?.objectives ?? "",
  ambito: a?.scope ?? "",
  departamento: a?.departmentId ?? "",
  responsavel: a?.ownerEmployeeId ?? "",
  inicio: a?.plannedStart ?? "",
  fim: a?.plannedEnd ?? "",
  risco: (a?.riskRating as Risco | undefined) ?? "Medium",
});

export function errosAuditoria(v: CamposAuditoria): Erros<keyof CamposAuditoria> {
  const e: Record<string, string> = {};
  texto(e, "titulo", v.titulo, MAXIMO_TITULO, "Indique o título.");
  texto(e, "objectivos", v.objectivos, MAXIMO_TEXTO, undefined, true);
  texto(e, "ambito", v.ambito, MAXIMO_TEXTO, undefined, true);
  if (!v.departamento) e.departamento = "Escolha o departamento auditado.";
  if (!v.responsavel) e.responsavel = "Escolha o responsável.";
  if (!v.inicio) e.inicio = "Indique o início previsto.";
  if (!v.fim) e.fim = "Indique o fim previsto.";
  else if (v.inicio && v.fim < v.inicio) e.fim = "O fim não pode ser antes do início.";
  return e;
}

/**
 * Já validado. O PUT substitui o registo inteiro: ao corrigir, o estado e o
 * motivo de cancelamento seguem os actuais (`actual`); ao planear, nulos.
 */
export function auditoriaParaApi(v: CamposAuditoria, actual?: Pick<S["AuditView"], "status" | "cancellationReason">): S["AuditRequest"] {
  return {
    title: normalizarTexto(v.titulo),
    objectives: opc(v.objectivos, true),
    scope: opc(v.ambito, true),
    departmentId: v.departamento,
    ownerEmployeeId: v.responsavel,
    plannedStart: v.inicio,
    plannedEnd: v.fim,
    riskRating: v.risco,
    status: (actual?.status as EstadoAuditoria | undefined) ?? null,
    cancellationReason: actual?.cancellationReason ?? null,
  };
}

/** Mudar de fase: todos os campos actuais, mais o estado novo (e o motivo, ao cancelar). */
export const mudarFase = (a: S["AuditView"], alvo: EstadoAuditoria, motivo: string | null = null): S["AuditRequest"] => ({
  ...auditoriaParaApi(camposAuditoria(a), a),
  status: alvo,
  cancellationReason: alvo === "Cancelled" ? motivo : a.cancellationReason,
});

// ---- Achado ------------------------------------------------------------

export const achadoResolvido = (estado: string) => estado === "Closed" || estado === "AcceptedRisk";
/** Fechar exige todos os planos concluídos (sem planos, pode). */
export const podeFecharAchado = (f: Pick<S["FindingView"], "actionPlansTotal" | "actionPlansDone">) => Number(f.actionPlansDone) === Number(f.actionPlansTotal);

export type CamposAchado = { descricao: string; gravidade: Risco; controlo: string; recomendacao: string };

export const camposAchado = (f?: S["FindingView"]): CamposAchado => ({
  descricao: f?.description ?? "",
  gravidade: (f?.severity as Risco | undefined) ?? "Medium",
  controlo: f?.controlRef ?? "",
  recomendacao: f?.recommendation ?? "",
});

export function errosAchado(v: CamposAchado): Erros<keyof CamposAchado> {
  const e: Record<string, string> = {};
  texto(e, "descricao", v.descricao, MAXIMO_TEXTO, "Descreva o achado.", true);
  texto(e, "controlo", v.controlo, MAXIMO_CONTROLO);
  texto(e, "recomendacao", v.recomendacao, MAXIMO_TEXTO, undefined, true);
  return e;
}

/** Já validado. Ao corrigir, o estado e as notas seguem os actuais. */
export function achadoParaApi(v: CamposAchado, actual?: Pick<S["FindingView"], "status" | "resolutionNotes">): S["FindingRequest"] {
  return {
    description: normalizarTexto(v.descricao, true),
    severity: v.gravidade,
    controlRef: opc(v.controlo),
    recommendation: opc(v.recomendacao, true),
    status: (actual?.status as EstadoAchado | undefined) ?? null,
    resolutionNotes: actual?.resolutionNotes ?? null,
  };
}

/** Fechar ou aceitar o risco: todos os campos actuais, mais o estado (e o motivo). */
export const resolverAchado = (f: S["FindingView"], alvo: "Closed" | "AcceptedRisk", notas: string | null = null): S["FindingRequest"] => ({
  ...achadoParaApi(camposAchado(f), f),
  status: alvo,
  resolutionNotes: alvo === "AcceptedRisk" ? notas : f.resolutionNotes,
});

// ---- Plano de acção ----------------------------------------------------

export type CamposPlano = { accao: string; responsavel: string; prazo: string; estado: EstadoPlano };

export const camposPlano = (p?: S["ActionPlanView"]): CamposPlano => ({
  accao: p?.action ?? "",
  responsavel: p?.ownerEmployeeId ?? "",
  prazo: p?.dueDate ?? "",
  estado: (p?.status as EstadoPlano | undefined) ?? "Pending",
});

export function errosPlano(v: CamposPlano): Erros<keyof CamposPlano> {
  const e: Record<string, string> = {};
  texto(e, "accao", v.accao, MAXIMO_TEXTO, "Indique a acção a executar.", true);
  if (!v.responsavel) e.responsavel = "Escolha o responsável.";
  if (!v.prazo) e.prazo = "Indique o prazo.";
  return e;
}

/** Já validado. Um plano nasce pendente (estado nulo); ao corrigir, segue o escolhido. */
export const planoParaApi = (v: CamposPlano, novo: boolean): S["ActionPlanRequest"] => ({
  action: normalizarTexto(v.accao, true),
  ownerEmployeeId: v.responsavel,
  dueDate: v.prazo,
  status: novo ? null : v.estado,
});
