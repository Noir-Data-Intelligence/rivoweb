import { describe, expect, it } from "vitest";
import { erroFecho, errosComentarioMarco, errosMarco, errosNovaTarefa, errosOrcamento, errosPlano, errosProjecto, orcamentoParaApi, planoParaApi, type CamposPlano } from "@/features/projectos/regras";

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
