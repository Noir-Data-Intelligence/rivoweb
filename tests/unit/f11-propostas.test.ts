import Big from "big.js";
import { describe, expect, it } from "vitest";
import { errosLinha, errosModelo, errosProposta, linhaParaApi, propostaParaApi, totalLinha, type CamposProposta, type Proposta } from "@/features/crm/propostas";

const base: CamposProposta = { titulo: " Auditoria 2027 ", para: "cliente", cliente: "c1", lead: "", oportunidade: "o1", moeda: "USD", validade: "2026-11-30", modelo: "m1", texto: "", notas: "" };

describe("proposta", () => {
  it("título, destinatário e validade não passada ao criar", () => {
    expect(errosProposta(base, true, "2026-10-18")).toEqual({ titulo: undefined, cliente: undefined, lead: undefined, validade: undefined, notas: undefined });
    expect(errosProposta({ ...base, titulo: "", cliente: "", validade: "2026-10-01" }, true, "2026-10-18")).toMatchObject({
      titulo: "Indique o título.",
      cliente: "Escolha o cliente.",
      validade: "A validade não pode ser passada.",
    });
    expect(errosProposta({ ...base, para: "lead" }, true, "2026-10-18").lead).toBe("Escolha o lead.");
    // Ao corrigir, uma validade já passada fica como estava.
    expect(errosProposta({ ...base, validade: "2026-10-01" }, false, "2026-10-18").validade).toBeUndefined();
  });
  it("nova leva o modelo e o texto vazio a null (o servidor usa o do modelo)", () => {
    expect(propostaParaApi(base)).toEqual({ title: "Auditoria 2027", customerId: "c1", leadId: null, opportunityId: "o1", currency: "USD", validUntil: "2026-11-30", templateId: "m1", body: null, notes: null });
  });
  it("ao corrigir, destinatário, oportunidade e moeda ficam os de origem", () => {
    const original = { customerId: null, leadId: "l1", opportunityId: null, currency: "AOA" } as Proposta;
    expect(propostaParaApi({ ...base, texto: "Linha 1\n\nLinha 2" }, original)).toMatchObject({ customerId: null, leadId: "l1", opportunityId: null, currency: "AOA", templateId: null, body: "Linha 1\n\nLinha 2" });
  });
});

describe("linhas", () => {
  it("livre pede descrição e preço; com serviço, podem ficar vazios", () => {
    expect(errosLinha({ servico: "", descricao: "", quantidade: "0", preco: "", desconto: "101" })).toEqual({
      descricao: "Indique a descrição (ou escolha um serviço).",
      quantidade: "Quantidade positiva (até 4 casas decimais).",
      preco: "Indique o preço (ou escolha um serviço).",
      desconto: "Entre 0 e 100 (até 2 casas decimais).",
    });
    expect(errosLinha({ servico: "s1", descricao: "", quantidade: "1,5", preco: "", desconto: "" })).toEqual({ descricao: undefined, quantidade: undefined, preco: undefined, desconto: undefined });
    expect(errosLinha({ servico: "", descricao: "x", quantidade: "1,12345", preco: "10", desconto: "" }).quantidade).toBe("Quantidade positiva (até 4 casas decimais).");
  });
  it("vai à API em texto; vazios a null", () => {
    expect(linhaParaApi({ servico: "s1", descricao: "", quantidade: "2,5", preco: "", desconto: "" })).toEqual({ serviceTypeId: "s1", description: null, quantity: "2.5", unitPrice: null, discountPercent: null });
    expect(linhaParaApi({ servico: "", descricao: " Horas extra ", quantidade: "3", preco: "12 500,5", desconto: "7,5" })).toEqual({ serviceTypeId: null, description: "Horas extra", quantity: "3", unitPrice: "12500.50", discountPercent: "7.5" });
  });
  it("o total da linha arredonda como o servidor (metade para cima, 2 casas)", () => {
    expect(totalLinha(new Big("3"), new Big("12500.50"), new Big("7.5")).toFixed(2)).toBe("34688.89");
    expect(totalLinha(new Big("1"), new Big("0.05"), new Big("50")).toFixed(2)).toBe("0.03");
  });
});

describe("modelo", () => {
  it("nome e texto obrigatórios", () => {
    expect(errosModelo({ nome: "", texto: "  " })).toEqual({ nome: "Indique o nome.", texto: "Escreva o texto do modelo." });
    expect(errosModelo({ nome: "Padrão", texto: "Exmos. {{cliente}}" })).toEqual({ nome: undefined, texto: undefined });
  });
});
