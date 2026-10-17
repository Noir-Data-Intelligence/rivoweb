import { describe, expect, it } from "vitest";
import { avaliacaoParaApi, comprovativoParaApi, erroMensagem, errosAvaliacao, errosComprovativo, errosTicket, type CamposComprovativo } from "@/features/portalcliente/regras";

const base: CamposComprovativo = { factura: "f1", valor: "125 000,50", pagoA: "2026-10-15", documento: "d1", notas: "" };

describe("comprovativo de pagamento", () => {
  it("factura, valor positivo com 2 casas, data não futura e ficheiro", () => {
    expect(errosComprovativo(base, "2026-10-17")).toEqual({ factura: undefined, valor: undefined, pagoA: undefined, documento: undefined, notas: undefined });
    expect(errosComprovativo({ factura: "", valor: "0", pagoA: "2026-10-18", documento: null, notas: "x".repeat(501) }, "2026-10-17")).toEqual({
      factura: "Escolha a factura.",
      valor: "Valor positivo (até 2 casas decimais).",
      pagoA: "A data do pagamento não pode ser futura.",
      documento: "Anexe o comprovativo.",
      notas: "No máximo 500 caracteres.",
    });
    expect(errosComprovativo({ ...base, valor: "10,123" }, "2026-10-17").valor).toBe("Valor positivo (até 2 casas decimais).");
    expect(errosComprovativo({ ...base, pagoA: "2026-02-30" }, "2026-10-17").pagoA).toBe("Indique a data do pagamento.");
  });
  it("vai à API com o valor em texto e as notas vazias a null", () => {
    expect(comprovativoParaApi(base)).toEqual({ salesInvoiceId: "f1", amount: "125000.50", paidOn: "2026-10-15", documentId: "d1", notes: null });
    expect(comprovativoParaApi({ ...base, notas: "  Transferência BAI ​ " }).notes).toBe("Transferência BAI");
  });
});

describe("mensagens e pedidos de suporte", () => {
  it("mensagem não vazia, até 4000", () => {
    expect(erroMensagem("Olá")).toBeUndefined();
    expect(erroMensagem(" ​\n ")).toBe("Escreva a mensagem.");
    expect(erroMensagem("x".repeat(4001))).toBe("No máximo 4000 caracteres.");
  });
  it("pedido com assunto até 200 e descrição", () => {
    expect(errosTicket({ assunto: "Factura em duplicado", texto: "Recebi duas." })).toEqual({ assunto: undefined, texto: undefined });
    expect(errosTicket({ assunto: "x".repeat(201), texto: "" })).toEqual({ assunto: "No máximo 200 caracteres.", texto: "Descreva o pedido." });
  });
});

describe("avaliação de um pedido fechado", () => {
  it("nota de 1 a 5; recomendação opcional de 0 a 10", () => {
    expect(errosAvaliacao({ nota: 4, recomendacao: "", comentario: "" })).toEqual({ nota: undefined, recomendacao: undefined, comentario: undefined });
    expect(errosAvaliacao({ nota: null, recomendacao: "11", comentario: "" })).toEqual({ nota: "Escolha de 1 a 5.", recomendacao: "De 0 a 10.", comentario: undefined });
    expect(errosAvaliacao({ nota: 5, recomendacao: "10", comentario: "" }).recomendacao).toBeUndefined();
  });
  it("vai à API com a recomendação em número e o comentário vazio a null", () => {
    expect(avaliacaoParaApi({ nota: 5, recomendacao: "9", comentario: " Rápido. " })).toEqual({ rating: 5, netPromoterScore: 9, comment: "Rápido." });
    expect(avaliacaoParaApi({ nota: 3, recomendacao: "", comentario: "" })).toEqual({ rating: 3, netPromoterScore: null, comment: null });
  });
});
