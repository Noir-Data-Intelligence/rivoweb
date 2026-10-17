import { describe, expect, it } from "vitest";
import { erroMensagem, errosConclusao, errosCurso, errosEscala, errosTipoTurno, horaDaApi, horaParaApi, passaMeiaNoite, errosAnuncio, errosCandidato, errosProcesso, errosSla, errosVaga, faseAnuncio, horasParaMinutos, minutosParaHoras, proximaEtapa, temErrosProcesso } from "@/features/rh/regras";

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

describe("formação", () => {
  const base = { titulo: "Primeiros socorros", inicio: "2026-11-02", fim: "", horas: "", custo: "", lotacao: "", validade: "" };
  it("título e início obrigatórios; fim não antes do início; números positivos", () => {
    expect(errosCurso(base)).toEqual({});
    expect(errosCurso({ ...base, horas: "7,5", custo: "150 000,00", lotacao: "12", validade: "24", fim: "2026-11-03" })).toEqual({});
    expect(errosCurso({ titulo: " ", inicio: "", fim: "", horas: "0", custo: "-1", lotacao: "0", validade: "241" })).toEqual({
      titulo: "Indique o título.",
      inicio: "Indique o início.",
      horas: "Horas positivas (até 2 casas decimais).",
      custo: "Valor inválido (até 2 casas decimais, não negativo).",
      lotacao: "Pelo menos uma vaga (número inteiro).",
      validade: "De 1 a 240 meses.",
    });
    expect(errosCurso({ ...base, fim: "2026-11-01" }).fim).toBe("A formação não pode acabar antes de começar.");
  });
  it("conclusão: data não futura, avaliação de 0 a 100", () => {
    const hoje = "2026-10-17";
    expect(errosConclusao({ data: hoje, avaliacao: "87,5", certificado: "" }, hoje)).toEqual({});
    expect(errosConclusao({ data: "2026-10-18", avaliacao: "101", certificado: "x".repeat(61) }, hoje)).toEqual({
      data: "A conclusão não pode ser futura.",
      avaliacao: "A avaliação é de 0 a 100.",
      certificado: "No máximo 60 caracteres.",
    });
  });
});

describe("turnos", () => {
  it("tipo: código só ao criar; início e fim diferentes; noite passa a meia-noite", () => {
    expect(errosTipoTurno({ codigo: "N", nome: "Noite", inicio: "22:00", fim: "06:00", novo: true })).toEqual({});
    expect(passaMeiaNoite("22:00", "06:00")).toBe(true);
    expect(passaMeiaNoite("08:00", "17:00")).toBe(false);
    expect(errosTipoTurno({ codigo: "", nome: "", inicio: "08:00", fim: "08:00", novo: true })).toEqual({
      codigo: "Indique o código.",
      nome: "Indique o nome.",
      fim: "Início e fim do turno não podem coincidir.",
    });
    expect(errosTipoTurno({ codigo: "", nome: "Tarde", inicio: "14:00", fim: "22:00", novo: false })).toEqual({});
    expect(horaParaApi("06:00")).toBe("06:00:00");
    expect(horaDaApi("22:00:00")).toBe("22:00");
  });
  it("escala: de 1 a 94 dias", () => {
    const b = { colaborador: "x", tipo: "y", de: "2026-11-01" };
    expect(errosEscala({ ...b, ate: "" })).toEqual({});
    expect(errosEscala({ ...b, ate: "2027-02-02" })).toEqual({});
    expect(errosEscala({ ...b, ate: "2027-02-03" }).ate).toBe("No máximo 94 dias de cada vez.");
    expect(errosEscala({ ...b, ate: "2026-10-31" }).ate).toBe("O último dia não pode ser anterior ao primeiro.");
    expect(errosEscala({ colaborador: "", tipo: "", de: "", ate: "" })).toEqual({ colaborador: "Escolha o colaborador.", tipo: "Escolha o turno.", de: "Indique o primeiro dia." });
  });
});
