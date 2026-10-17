import { describe, expect, it } from "vitest";
import { erroDevolucao, errosAbate, errosActivo, errosApolice, errosManutencao, type CamposActivo } from "@/features/activos/regras";

const base: CamposActivo = { codigo: "", nome: "Portátil", categoria: "", localizacao: "", serie: "", aquisicao: "2026-03-10", inicio: "", custo: "850 000", residual: "", metodo: "StraightLine", vida: "36", taxa: "", unidades: "" };

describe("activo", () => {
  it("nome, custo positivo, residual entre zero e o custo, vida de 1 a 1200 meses", () => {
    expect(errosActivo(base)).toEqual({});
    expect(errosActivo({ ...base, nome: "", custo: "0", residual: "900 000", vida: "1201" })).toEqual({
      nome: "Indique o nome.",
      custo: "Custo positivo (até 2 casas decimais).",
      residual: "Entre zero e o custo de aquisição.",
      vida: "De 1 a 1200 meses.",
    });
    expect(errosActivo({ ...base, residual: "900 000" }).residual).toBe("Entre zero e o custo de aquisição.");
  });
  it("a amortização não começa antes do mês da aquisição; os métodos pedem o que precisam", () => {
    expect(errosActivo({ ...base, inicio: "2026-03-01" })).toEqual({});
    expect(errosActivo({ ...base, inicio: "2026-02-28" }).inicio).toBe("A amortização não começa antes do mês da aquisição.");
    expect(errosActivo({ ...base, metodo: "DecliningBalance" }).taxa).toBe("Quotas decrescentes exigem a taxa anual, de 0 a 100 %.");
    expect(errosActivo({ ...base, metodo: "DecliningBalance", taxa: "25" })).toEqual({});
    expect(errosActivo({ ...base, metodo: "UnitsOfProduction" }).unidades).toBe("Unidades de produção exigem o total de unidades esperado.");
  });
});

describe("abate, manutenção, custódia e seguros", () => {
  it("abate depois da aquisição, valor de venda não negativo", () => {
    expect(errosAbate({ data: "2026-10-17", valor: "", motivo: "" }, "2026-03-10")).toEqual({});
    expect(errosAbate({ data: "2026-03-10", valor: "-1", motivo: "" }, "2026-03-10")).toEqual({ data: "O abate é depois da aquisição.", valor: "Valor de venda não negativo (até 2 casas)." });
  });
  it("manutenção com descrição e data; custo não negativo", () => {
    expect(errosManutencao({ descricao: "Revisão", data: "2026-11-01", fornecedor: "", custo: "" })).toEqual({});
    expect(errosManutencao({ descricao: "", data: "", fornecedor: "", custo: "-5" })).toEqual({ descricao: "Descreva a manutenção.", data: "Indique a data.", custo: "O custo não pode ser negativo (até 2 casas)." });
  });
  it("devolução não antes da entrega", () => {
    expect(erroDevolucao("2026-10-01", "2026-10-02")).toBe("A devolução não pode ser anterior à entrega.");
    expect(erroDevolucao("2026-10-02", "2026-10-02")).toBeUndefined();
  });
  it("apólice: seguradora, número, vigência e prémio", () => {
    const p = { seguradora: "ENSA", numero: "AP-1", cobertura: "", inicio: "2026-01-01", fim: "2026-12-31", premio: "120 000", capital: "" };
    expect(errosApolice(p)).toEqual({});
    expect(errosApolice({ ...p, fim: "2025-12-31", premio: "" })).toEqual({ fim: "A apólice não pode acabar antes de começar.", premio: "Prémio não negativo (até 2 casas)." });
    expect(errosApolice({ ...p, numero: "x".repeat(61) }).numero).toBe("No máximo 60 caracteres.");
  });
});
