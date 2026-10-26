import { describe, expect, it } from "vitest";
import { accaoHistorico, conformidade, estadoAchadoDe, estadoAuditoriaDe, estadoPlanoDe, riscoDe } from "@/features/auditoria-interna/comum";
import {
  aceitaAchados,
  achadoParaApi,
  auditoriaParaApi,
  camposAuditoria,
  errosAchado,
  errosAuditoria,
  errosPlano,
  fasesSeguintes,
  mudarFase,
  planoParaApi,
  podeFecharAchado,
  podeFecharAuditoria,
  resolverAchado,
  type CamposAuditoria,
} from "@/features/auditoria-interna/regras";
import { diasAntes, diasDoPeriodo, erroPeriodo } from "@/features/auditoria/regras";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];

const auditoria = (x: Partial<S["AuditView"]> = {}): S["AuditView"] => ({
  auditId: "a1",
  auditNumber: "AUD-2026-001",
  title: "Compras 2026",
  objectives: "Rever as compras",
  scope: null,
  departmentId: "d1",
  departmentName: "Compras",
  ownerEmployeeId: "e1",
  ownerName: "Ana",
  plannedStart: "2026-11-01",
  plannedEnd: "2026-11-30",
  riskRating: "High",
  status: "InProgress",
  cancellationReason: null,
  createdAt: "2026-10-26T10:00:00Z",
  createdByUserId: null,
  closedAt: null,
  findingsTotal: 2,
  findingsOpen: 1,
  ...x,
});

const achado = (x: Partial<S["FindingView"]> = {}): S["FindingView"] => ({
  findingId: "f1",
  auditId: "a1",
  auditNumber: "AUD-2026-001",
  auditTitle: "Compras 2026",
  description: "Sem três cotações",
  severity: "Medium",
  controlRef: "CP-04",
  recommendation: null,
  status: "InRemediation",
  resolutionNotes: null,
  identifiedAt: "2026-11-02T10:00:00Z",
  identifiedByUserId: null,
  resolvedAt: null,
  actionPlansTotal: 2,
  actionPlansDone: 1,
  ...x,
});

const campos = (x: Partial<CamposAuditoria> = {}): CamposAuditoria => ({ ...camposAuditoria(auditoria()), ...x });

describe("textos dos valores", () => {
  it("risco, fases, estados dos achados e dos planos; um valor novo aparece como vem", () => {
    expect(["Low", "Medium", "High", "Critical"].map(riscoDe)).toEqual(["Baixo", "Médio", "Alto", "Crítico"]);
    expect(["Planned", "InProgress", "Reporting", "Closed", "Cancelled"].map(estadoAuditoriaDe)).toEqual(["Planeada", "Em curso", "Relatório", "Fechada", "Cancelada"]);
    expect(["Open", "InRemediation", "Closed", "AcceptedRisk"].map(estadoAchadoDe)).toEqual(["Aberto", "Em correcção", "Fechado", "Risco aceite"]);
    expect(["Pending", "InProgress", "Done"].map(estadoPlanoDe)).toEqual(["Pendente", "Em curso", "Concluído"]);
    expect(riscoDe("Extreme")).toBe("Extreme");
    expect(accaoHistorico("internalaudit.finding.status_changed")).toBe("Estado do achado alterado");
    expect(accaoHistorico("internalaudit.action_plan.created")).toBe("Plano de acção criado");
  });
  it("conformidade nula sem achados: «—», nunca 100 %", () => {
    expect(conformidade(null, (x) => `${x}%`)).toBe("—");
    expect(conformidade(50, (x) => `${x}%`)).toBe("50%");
  });
});

describe("fases da auditoria", () => {
  it("uma de cada vez; do relatório volta ao campo; encerrada não tem fases", () => {
    expect(fasesSeguintes("Planned").map((f) => f.texto)).toEqual(["Iniciar"]);
    expect(fasesSeguintes("InProgress").map((f) => f.alvo)).toEqual(["Reporting"]);
    expect(fasesSeguintes("Reporting").map((f) => f.texto)).toEqual(["Fechar", "Voltar a em curso"]);
    expect(fasesSeguintes("Closed")).toEqual([]);
    expect(fasesSeguintes("Cancelled")).toEqual([]);
  });
  it("fechar exige zero achados por resolver; achados novos só em curso ou em relatório", () => {
    expect(podeFecharAuditoria(auditoria({ findingsOpen: 1 }))).toBe(false);
    expect(podeFecharAuditoria(auditoria({ findingsOpen: 0 }))).toBe(true);
    expect(["Planned", "InProgress", "Reporting", "Closed"].map(aceitaAchados)).toEqual([false, true, true, false]);
  });
  it("mudar de fase envia o registo inteiro; cancelar leva o motivo", () => {
    expect(mudarFase(auditoria(), "Reporting")).toEqual({
      title: "Compras 2026",
      objectives: "Rever as compras",
      scope: null,
      departmentId: "d1",
      ownerEmployeeId: "e1",
      plannedStart: "2026-11-01",
      plannedEnd: "2026-11-30",
      riskRating: "High",
      status: "Reporting",
      cancellationReason: null,
    });
    expect(mudarFase(auditoria(), "Cancelled", "Sem equipa")).toMatchObject({ status: "Cancelled", cancellationReason: "Sem equipa", title: "Compras 2026" });
  });
});

describe("formulário da auditoria", () => {
  it("título, departamento, responsável e datas obrigatórios; fim depois do início; limites do servidor", () => {
    expect(errosAuditoria(campos({ titulo: " ", departamento: "", responsavel: "", inicio: "", fim: "" }))).toEqual({
      titulo: "Indique o título.",
      departamento: "Escolha o departamento auditado.",
      responsavel: "Escolha o responsável.",
      inicio: "Indique o início previsto.",
      fim: "Indique o fim previsto.",
    });
    expect(errosAuditoria(campos({ inicio: "2026-11-30", fim: "2026-11-01" })).fim).toBe("O fim não pode ser antes do início.");
    expect(errosAuditoria(campos({ titulo: "x".repeat(201), ambito: "y".repeat(2001) }))).toEqual({ titulo: "No máximo 200 caracteres.", ambito: "No máximo 2000 caracteres." });
    expect(errosAuditoria(campos())).toEqual({});
  });
  it("planear: estado nulo; corrigir: mantém o estado e o motivo actuais; vazios a null", () => {
    expect(auditoriaParaApi(campos({ objectivos: "  " }))).toMatchObject({ objectives: null, status: null, cancellationReason: null });
    expect(auditoriaParaApi(campos({ titulo: "  Novo título " }), auditoria())).toMatchObject({ title: "Novo título", status: "InProgress" });
  });
});

describe("achados", () => {
  it("descrição obrigatória; controlo até 50", () => {
    expect(errosAchado({ descricao: "", gravidade: "Low", controlo: "c".repeat(51), recomendacao: "" })).toEqual({ descricao: "Descreva o achado.", controlo: "No máximo 50 caracteres." });
  });
  it("fechar exige todos os planos concluídos (sem planos, pode)", () => {
    expect(podeFecharAchado(achado())).toBe(false);
    expect(podeFecharAchado(achado({ actionPlansDone: 2 }))).toBe(true);
    expect(podeFecharAchado(achado({ actionPlansTotal: 0, actionPlansDone: 0 }))).toBe(true);
  });
  it("registar nasce sem estado; corrigir mantém o actual; resolver envia tudo, e o risco aceite leva o motivo", () => {
    expect(achadoParaApi({ descricao: "A", gravidade: "Critical", controlo: " ", recomendacao: "" })).toEqual({ description: "A", severity: "Critical", controlRef: null, recommendation: null, status: null, resolutionNotes: null });
    expect(resolverAchado(achado(), "Closed")).toEqual({ description: "Sem três cotações", severity: "Medium", controlRef: "CP-04", recommendation: null, status: "Closed", resolutionNotes: null });
    expect(resolverAchado(achado(), "AcceptedRisk", "Custo maior do que o risco")).toMatchObject({ status: "AcceptedRisk", resolutionNotes: "Custo maior do que o risco" });
  });
});

describe("planos de acção", () => {
  it("acção, responsável e prazo obrigatórios; nasce pendente, corrigir leva o estado", () => {
    expect(errosPlano({ accao: "", responsavel: "", prazo: "", estado: "Pending" })).toEqual({ accao: "Indique a acção a executar.", responsavel: "Escolha o responsável.", prazo: "Indique o prazo." });
    const v = { accao: "Pedir três cotações", responsavel: "e2", prazo: "2026-12-15", estado: "Done" as const };
    expect(planoParaApi(v, true)).toEqual({ action: "Pedir três cotações", ownerEmployeeId: "e2", dueDate: "2026-12-15", status: null });
    expect(planoParaApi(v, false).status).toBe("Done");
  });
});

describe("período da trilha (#122)", () => {
  it("dias inclusivos, até 366; fim antes do início recusado", () => {
    expect(diasDoPeriodo("2026-10-20", "2026-10-26")).toBe(7);
    expect(diasAntes("2026-03-01", 1)).toBe("2026-02-28");
    expect(erroPeriodo("2026-10-27", "2026-10-26")).toBe("O fim não pode ser antes do início.");
    expect(erroPeriodo("2025-10-25", "2026-10-26")).toBe("O período tem no máximo 366 dias.");
    expect(erroPeriodo("2025-10-26", "2026-10-26")).toBeUndefined();
  });
});
