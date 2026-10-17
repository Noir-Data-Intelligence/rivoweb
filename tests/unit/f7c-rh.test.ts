import { describe, expect, it } from "vitest";
import { erroMensagem, errosAnuncio, errosCandidato, errosProcesso, errosSla, errosVaga, faseAnuncio, horasParaMinutos, minutosParaHoras, proximaEtapa, temErrosProcesso } from "@/features/rh/regras";

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

describe("anúncios", () => {
  const hoje = "2026-10-17";
  it("título e texto obrigatórios; expira depois do dia de publicação (vazio = hoje)", () => {
    expect(errosAnuncio({ titulo: "Feriado", texto: "Fechado.", publica: "", expira: "" }, hoje)).toEqual({});
    expect(errosAnuncio({ titulo: "", texto: " ", publica: "", expira: hoje }, hoje)).toEqual({
      titulo: "Indique o título.",
      texto: "Escreva o texto do anúncio.",
      expira: "Tem de expirar depois do dia de publicação.",
    });
    expect(errosAnuncio({ titulo: "x", texto: "y", publica: "2026-11-01", expira: "2026-11-01" }, hoje).expira).toBe("Tem de expirar depois do dia de publicação.");
    expect(errosAnuncio({ titulo: "x", texto: "y", publica: "2026-11-01", expira: "2026-11-02" }, hoje)).toEqual({});
  });
  it("fase: arquivado, agendado, expirado ou em vigor", () => {
    const agora = new Date("2026-10-17T12:00:00Z");
    expect(faseAnuncio({ archived: true, publishedAt: "2026-10-01T00:00:00Z", expiresAt: null }, agora)).toBe("arquivado");
    expect(faseAnuncio({ archived: false, publishedAt: "2026-10-18T00:00:00Z", expiresAt: null }, agora)).toBe("agendado");
    expect(faseAnuncio({ archived: false, publishedAt: "2026-10-01T00:00:00Z", expiresAt: "2026-10-17T00:00:00Z" }, agora)).toBe("expirado");
    expect(faseAnuncio({ archived: false, publishedAt: "2026-10-01T00:00:00Z", expiresAt: "2026-10-20T00:00:00Z" }, agora)).toBe("em-vigor");
  });
});

describe("prazos dos pedidos (SLA)", () => {
  it("horas em minutos inteiros e positivos", () => {
    expect(horasParaMinutos("4")).toBe(240);
    expect(horasParaMinutos("0,5")).toBe(30);
    expect(horasParaMinutos("1,25")).toBe(75);
    expect(horasParaMinutos("0,01")).toBeNull();
    expect(horasParaMinutos("0")).toBeNull();
    expect(horasParaMinutos("-1")).toBeNull();
    expect(horasParaMinutos("abc")).toBeNull();
    expect(minutosParaHoras(2880)).toBe("48");
    expect(minutosParaHoras(90)).toBe("1,5");
  });
  it("a resolução não é mais curta do que a resposta", () => {
    expect(errosSla("4", "48")).toEqual({});
    expect(errosSla("4", "4")).toEqual({});
    expect(errosSla("8", "4").resolucao).toBe("A resolução não pode ter prazo mais curto do que a resposta.");
    expect(errosSla("", "x")).toEqual({ resposta: "Horas positivas (até 2 casas; em minutos inteiros).", resolucao: "Horas positivas (até 2 casas; em minutos inteiros)." });
  });
  it("mensagem obrigatória até 4000", () => {
    expect(erroMensagem(" ")).toBe("Escreva a mensagem.");
    expect(erroMensagem("x".repeat(4001))).toBe("No máximo 4000 caracteres.");
    expect(erroMensagem("Olá")).toBeUndefined();
  });
});
