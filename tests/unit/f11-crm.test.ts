import { describe, expect, it } from "vitest";
import {
  actividadeParaApi,
  conversaoParaApi,
  errosActividade,
  errosConversao,
  errosLead,
  errosOportunidade,
  errosServico,
  leadParaApi,
  oportunidadeParaApi,
  servicoParaApi,
  type CamposConversao,
  type CamposOportunidade,
} from "@/features/crm/regras";
import { dataHoraLocalDeInstante, instanteDeDataHoraLocal } from "@/lib/format/data";

describe("lead", () => {
  it("nome obrigatório, e-mail válido e limites do servidor", () => {
    expect(errosLead({ nome: " ", empresa: "", email: "x@", telefone: "", origem: "o".repeat(101), notas: "" })).toMatchObject({
      nome: "Indique o nome de quem contactar.",
      email: "E-mail inválido.",
      origem: "No máximo 100 caracteres.",
    });
    expect(errosLead({ nome: "Ana", empresa: "", email: "ana@cliente.ao", telefone: "", origem: "", notas: "" })).toEqual({
      nome: undefined,
      empresa: undefined,
      email: undefined,
      telefone: undefined,
      origem: undefined,
      notas: undefined,
    });
  });
  it("vai à API aparado, opcionais a null e o responsável mantido", () => {
    expect(leadParaApi({ nome: " Ana ", empresa: " Lda ", email: "", telefone: "", origem: "", notas: "" }, "e1")).toEqual({
      name: "Ana",
      company: "Lda",
      email: null,
      phone: null,
      source: null,
      ownerEmployeeId: "e1",
      notes: null,
    });
  });
});

describe("converter um lead", () => {
  const base: CamposConversao = { destino: "novo", cliente: "", nif: "5000000000", morada: "Rua 1", cidade: "Luanda", pais: "ao", abrirOportunidade: true, titulo: "Projecto", valor: "1 250 000,5", moeda: "USD" };
  it("cliente novo pede NIF, morada, cidade e país de duas letras", () => {
    expect(errosConversao({ ...base, nif: "", morada: "", cidade: "", pais: "ANG" })).toMatchObject({
      nif: "Indique o NIF do novo cliente.",
      morada: "Indique a morada de facturação.",
      cidade: "Indique a cidade.",
      pais: "Código do país com duas letras (ex.: AO).",
    });
    expect(errosConversao({ ...base, destino: "existente" }).cliente).toBe("Escolha o cliente.");
    expect(errosConversao({ ...base, titulo: "" }).titulo).toBe("Indique o título da oportunidade.");
  });
  it("vai à API com o valor em texto e o país em maiúsculas; existente só leva o id", () => {
    expect(conversaoParaApi(base)).toEqual({
      customerId: null,
      taxId: "5000000000",
      addressDetail: "Rua 1",
      city: "Luanda",
      country: "AO",
      opportunityTitle: "Projecto",
      estimatedValue: "1250000.50",
      currency: "USD",
    });
    expect(conversaoParaApi({ ...base, destino: "existente", cliente: "c1", abrirOportunidade: false })).toEqual({
      customerId: "c1",
      taxId: null,
      addressDetail: null,
      city: null,
      country: null,
      opportunityTitle: null,
      estimatedValue: null,
      currency: null,
    });
  });
});

describe("oportunidade", () => {
  const base: CamposOportunidade = { titulo: "Auditoria", para: "cliente", cliente: "c1", lead: "", valor: "500 000", moeda: "AOA", probabilidade: "", fecho: "2026-12-15", notas: "" };
  it("probabilidade vazia só ao criar (o servidor poria 10% ao corrigir)", () => {
    expect(errosOportunidade(base, true).probabilidade).toBeUndefined();
    expect(errosOportunidade(base, false).probabilidade).toBe("Entre 0 e 100.");
    expect(errosOportunidade({ ...base, probabilidade: "101" }, true).probabilidade).toBe("Entre 0 e 100.");
    expect(errosOportunidade({ ...base, valor: "-1" }, true).valor).toBe("Valor não negativo (até 2 casas decimais).");
    expect(errosOportunidade({ ...base, cliente: "" }, true).cliente).toBe("Escolha o cliente.");
  });
  it("ao corrigir, o cliente e o lead ficam os de origem", () => {
    expect(oportunidadeParaApi({ ...base, probabilidade: "40" }, null)).toMatchObject({ customerId: "c1", leadId: null, estimatedValue: "500000.00", probability: 40, expectedCloseDate: "2026-12-15" });
    expect(oportunidadeParaApi({ ...base, probabilidade: "40", cliente: "outro" }, "e1", { customerId: null, leadId: "l1" })).toMatchObject({ customerId: null, leadId: "l1", ownerEmployeeId: "e1" });
  });
});

describe("actividade e tipo de serviço", () => {
  it("a hora é a de Luanda (UTC+1)", () => {
    expect(instanteDeDataHoraLocal("2026-10-20T09:30")).toBe("2026-10-20T09:30:00+01:00");
    expect(instanteDeDataHoraLocal("2026-13-20T09:30")).toBeNull();
    expect(dataHoraLocalDeInstante("2026-10-20T08:30:00Z")).toBe("2026-10-20T09:30");
    expect(actividadeParaApi({ tipo: "Meeting", assunto: " Visita ", quando: "2026-10-20T09:30", feita: false, notas: "" }, { oportunidade: "o1" })).toEqual({
      kind: "Meeting",
      subject: "Visita",
      notes: null,
      scheduledAt: "2026-10-20T09:30:00+01:00",
      done: false,
      leadId: null,
      opportunityId: "o1",
      customerId: null,
      ownerEmployeeId: null,
    });
    expect(errosActividade({ tipo: "Call", assunto: "", quando: "x", feita: false, notas: "" })).toMatchObject({ assunto: "Indique o assunto.", quando: "Data e hora inválidas." });
  });
  it("o código só conta ao criar; preço em texto", () => {
    expect(errosServico({ codigo: "", nome: "", descricao: "", preco: "-5", moeda: "AOA", activo: true }, true)).toMatchObject({
      codigo: "Indique o código.",
      nome: "Indique o nome.",
      preco: "Preço não negativo (até 2 casas decimais).",
    });
    expect(errosServico({ codigo: "", nome: "Consultoria", descricao: "", preco: "1000", moeda: "AOA", activo: true }, false).codigo).toBeUndefined();
    expect(servicoParaApi({ codigo: " CONS ", nome: "Consultoria", descricao: "", preco: "15 000,5", moeda: "EUR", activo: false })).toEqual({
      code: "CONS",
      name: "Consultoria",
      description: null,
      unitPrice: "15000.50",
      currency: "EUR",
      active: false,
    });
  });
});
