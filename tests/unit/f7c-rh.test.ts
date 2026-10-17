import { describe, expect, it } from "vitest";
import { errosCandidato, errosProcesso, errosVaga, proximaEtapa, temErrosProcesso } from "@/features/rh/regras";

describe("funil de recrutamento", () => {
  it("avança um passo de cada vez; da proposta contrata-se, não se avança", () => {
    expect(proximaEtapa("Applied")).toBe("Screening");
    expect(proximaEtapa("Screening")).toBe("Interview");
    expect(proximaEtapa("Interview")).toBe("Offer");
    expect(proximaEtapa("Offer")).toBeNull();
    expect(proximaEtapa("Hired")).toBeNull();
    expect(proximaEtapa("Rejected")).toBeNull();
    expect(proximaEtapa("Outra")).toBeNull();
  });
});

describe("vaga", () => {
  it("título obrigatório até 200; pelo menos uma vaga inteira", () => {
    expect(errosVaga({ titulo: "Contabilista", vagas: "2", descricao: "", requisitos: "" })).toEqual({});
    expect(errosVaga({ titulo: "  ", vagas: "0", descricao: "x".repeat(2001), requisitos: "" })).toEqual({
      titulo: "Indique o título da vaga.",
      vagas: "Pelo menos uma vaga (número inteiro).",
      descricao: "No máximo 2000 caracteres.",
    });
    expect(errosVaga({ titulo: "x".repeat(201), vagas: "1,5", descricao: "", requisitos: "" })).toEqual({
      titulo: "No máximo 200 caracteres.",
      vagas: "Pelo menos uma vaga (número inteiro).",
    });
  });
});

describe("candidato", () => {
  const hoje = "2026-10-17";
  it("nome obrigatório; e-mail e telefone opcionais mas válidos; data não futura", () => {
    expect(errosCandidato({ nome: "Ana", email: "", telefone: "", data: hoje }, hoje)).toEqual({});
    expect(errosCandidato({ nome: "", email: "ana@", telefone: "9".repeat(31), data: "2026-10-18" }, hoje)).toEqual({
      nome: "Indique o nome.",
      email: "E-mail inválido.",
      telefone: "No máximo 30 caracteres.",
      data: "A candidatura não pode ter data futura.",
    });
  });
});

describe("entrada ou saída", () => {
  const tarefa = { titulo: "Entregar o portátil", categoria: "it", prazo: "" };
  it("exige pelo menos uma tarefa (sem tarefas nunca se conclui)", () => {
    const e = errosProcesso({ colaborador: "x", tipo: "Onboarding", ultimoDia: "", motivo: "", tarefas: [{ titulo: " ", categoria: "hr", prazo: "" }] });
    expect(e.tarefas).toBe("Indique pelo menos uma tarefa: um processo sem tarefas não se conclui.");
    expect(temErrosProcesso(e)).toBe(true);
    expect(temErrosProcesso(errosProcesso({ colaborador: "x", tipo: "Onboarding", ultimoDia: "", motivo: "", tarefas: [tarefa] }))).toBe(false);
  });
  it("uma saída exige o último dia; linhas com prazo e sem título são erro", () => {
    const e = errosProcesso({ colaborador: "", tipo: "Offboarding", ultimoDia: "", motivo: "", tarefas: [tarefa, { titulo: "", categoria: "hr", prazo: "2026-11-01" }] });
    expect(e.colaborador).toBe("Escolha o colaborador.");
    expect(e.ultimoDia).toBe("Uma saída exige o último dia de trabalho.");
    expect(e.linhas).toEqual({ 1: "Falta o título desta tarefa." });
    // Uma linha vazia, sem prazo, ignora-se.
    expect(errosProcesso({ colaborador: "x", tipo: "Offboarding", ultimoDia: "2026-11-30", motivo: "", tarefas: [tarefa, { titulo: "", categoria: "hr", prazo: "" }] }).linhas).toEqual({});
  });
});
