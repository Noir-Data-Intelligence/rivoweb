import { describe, expect, it } from "vitest";
import {
  erroComentario,
  erroFecho,
  erroFimAlocacao,
  erroMotivoFicheiro,
  erroPasso,
  errosAlocacao,
  errosComentarioMarco,
  errosLinhaOrcamento,
  errosMarco,
  errosNovaTarefa,
  errosOrcamento,
  errosPlano,
  errosProjecto,
  errosTempo,
  linhaOrcamentoParaApi,
  orcamentoParaApi,
  planoParaApi,
  tempoParaApi,
  type CamposPlano,
} from "@/features/projectos/regras";

describe("projecto, orçamento e marcos", () => {
  it("nome e início; fecho não antes do início", () => {
    expect(errosProjecto({ nome: " ", inicio: "" })).toEqual({ nome: "Indique o nome.", inicio: "Indique a data de início." });
    expect(errosProjecto({ nome: "x".repeat(201), inicio: "2026-01-01" }).nome).toBe("No máximo 200 caracteres.");
    expect(erroFecho("2025-12-31", "2026-01-01")).toBe("A data de fecho não pode ser anterior à de início.");
    expect(erroFecho("2026-06-30", "2026-01-01")).toBeUndefined();
  });
  it("orçamento positivo, em texto", () => {
    expect(errosOrcamento({ valor: "0", moeda: "AOA" }).valor).toBe("Valor positivo (até 2 casas decimais).");
    expect(orcamentoParaApi({ valor: "2 500 000,5", moeda: "USD" })).toEqual({ amount: "2500000.50", currency: "USD" });
  });
  it("marco não antes do início do projecto; comentário até 4000", () => {
    expect(errosMarco({ nome: "", data: "2025-12-01" }, "2026-01-01")).toEqual({ nome: "Indique o nome.", data: "A data do marco não pode ser anterior ao início do projecto." });
    expect(errosComentarioMarco({ texto: " ", autor: "" }).texto).toBe("Escreva o comentário.");
    expect(errosComentarioMarco({ texto: "ok", autor: "a".repeat(201) }).autor).toBe("No máximo 200 caracteres.");
  });
});

describe("tarefas", () => {
  const base: CamposPlano = { titulo: " Levantamento ", descricao: "", inicio: "2026-02-01", prazo: "2026-02-15", horas: "12,5", prioridade: "High", progresso: "40" };
  it("nova: título e prazo não antes do início do projecto", () => {
    expect(errosNovaTarefa({ titulo: "", prazo: "2025-12-31" }, "2026-01-01")).toEqual({ titulo: "Indique o título.", prazo: "O prazo não pode ser anterior ao início do projecto." });
    expect(errosNovaTarefa({ titulo: "Ok", prazo: "" }, "2026-01-01")).toEqual({ titulo: undefined, prazo: undefined });
  });
  it("planear: datas, horas e progresso nos limites do servidor", () => {
    expect(Object.values(errosPlano(base, "2026-01-01")).filter(Boolean)).toEqual([]);
    expect(errosPlano({ ...base, inicio: "2025-12-01" }, "2026-01-01").inicio).toBe("As datas da tarefa não podem ser anteriores ao início do projecto.");
    expect(errosPlano({ ...base, prazo: "2026-01-20" }, "2026-01-01").prazo).toBe("O prazo não pode ser anterior ao início da tarefa.");
    expect(errosPlano({ ...base, horas: "-1", progresso: "101" }, "2026-01-01")).toMatchObject({ horas: "Horas não negativas (até 2 casas decimais).", progresso: "Entre 0 e 100." });
  });
  it("vai à API com as horas em texto e os vazios a null", () => {
    expect(planoParaApi(base)).toEqual({ title: "Levantamento", description: null, startDate: "2026-02-01", dueDate: "2026-02-15", estimatedHours: "12.5", priority: "High", progress: 40 });
    expect(planoParaApi({ ...base, inicio: "", prazo: "", horas: "", progresso: "" })).toMatchObject({ startDate: null, dueDate: null, estimatedHours: null, progress: null });
  });
});

describe("trabalho do projecto", () => {
  it("comentário e passo obrigatórios, nos limites", () => {
    expect(erroComentario("  ")).toBe("Escreva o comentário.");
    expect(erroPasso("x".repeat(301))).toBe("No máximo 300 caracteres.");
  });
  it("tempo: colaborador, dia não futuro, horas entre 0 e 24", () => {
    const v = { pessoa: "e1", tarefa: "", dia: "2026-10-20", horas: "7,5", descricao: "", facturavel: true };
    expect(Object.values(errosTempo(v, "2026-10-22")).filter(Boolean)).toEqual([]);
    expect(errosTempo({ ...v, pessoa: "", dia: "2026-10-23", horas: "25" }, "2026-10-22")).toMatchObject({
      pessoa: "Escolha o colaborador.",
      dia: "Não se regista tempo num dia futuro.",
      horas: "Horas entre 0 e 24 (até 2 casas decimais).",
    });
    expect(tempoParaApi(v)).toEqual({ employeeId: "e1", taskId: null, day: "2026-10-20", hours: "7.5", description: null, billable: true });
  });
  it("linha de orçamento: categoria e valores não negativos, em texto", () => {
    expect(errosLinhaOrcamento({ categoria: "", descricao: "", previsto: "-1", gasto: "x" })).toMatchObject({ categoria: "Indique a categoria.", previsto: "Valor não negativo (até 2 casas decimais).", gasto: "Valor não negativo (até 2 casas decimais)." });
    expect(linhaOrcamentoParaApi({ categoria: " Materiais ", descricao: "", previsto: "1 200 000", gasto: "" })).toEqual({ category: "Materiais", description: null, plannedAmount: "1200000.00", actualAmount: null });
  });
  it("retirar ficheiro pede motivo; alocação não antes do projecto nem fim antes do início", () => {
    expect(erroMotivoFicheiro("")).toBe("Diga porque retira o ficheiro do projecto.");
    expect(errosAlocacao({ recurso: "", inicio: "2025-12-01" }, "2026-01-01")).toEqual({ recurso: "Escolha o recurso.", inicio: "A alocação não pode começar antes do início do projecto." });
    expect(erroFimAlocacao("2026-01-31", "2026-02-01")).toBe("A data de fim não pode ser anterior ao início da alocação.");
  });
});
