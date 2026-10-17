import Big from "big.js";
import { describe, expect, it } from "vitest";
import { kz, qtd } from "@/features/inventario/comum";
import { erroContado, errosArmazem, errosArtigo, errosMovimento, lerComSinal } from "@/features/inventario/regras";

const base = { armazem: "a", destino: "", quantidade: "5", custo: "100", motivo: "", data: "2026-10-17" };

describe("artigos e armazéns", () => {
  it("referência, nome e unidade; código e nome do armazém", () => {
    expect(errosArtigo({ sku: "PAP-A4", nome: "Papel A4", unidade: "resma" })).toEqual({});
    expect(errosArtigo({ sku: "", nome: "", unidade: "" })).toEqual({ sku: "Indique a referência (SKU).", nome: "Indique o nome.", unidade: "Indique a unidade (un, kg, caixa…)." });
    expect(errosArmazem({ codigo: "x".repeat(21), nome: "Central" }).codigo).toBe("No máximo 20 caracteres.");
  });
});

describe("movimentos", () => {
  it("entrada: quantidade positiva e custo ≥ 0 até 4 casas", () => {
    expect(errosMovimento("entrada", base, null)).toEqual({});
    expect(errosMovimento("entrada", { ...base, custo: "" }, null).custo).toBe("Indique o custo unitário (zero se não houver).");
    expect(errosMovimento("entrada", { ...base, custo: "0" }, null)).toEqual({});
    expect(errosMovimento("entrada", { ...base, quantidade: "0" }, null).quantidade).toBe("Quantidade positiva (até 4 casas decimais).");
  });
  it("saída e transferência não deixam o armazém negativo; transferência entre armazéns diferentes", () => {
    expect(errosMovimento("saida", base, new Big(5))).toEqual({});
    expect(errosMovimento("saida", base, new Big(4)).quantidade).toBe("Não há quantidade suficiente nesse armazém.");
    expect(errosMovimento("transferencia", { ...base, destino: "a" }, new Big(10)).destino).toBe("O destino tem de ser diferente da origem.");
    expect(errosMovimento("transferencia", { ...base, destino: "b" }, new Big(10))).toEqual({});
  });
  it("ajuste: com motivo, diferente de zero, negativo sem deixar negativo", () => {
    expect(errosMovimento("ajuste", { ...base, quantidade: "-3", motivo: "Partido" }, new Big(5))).toEqual({});
    expect(errosMovimento("ajuste", { ...base, quantidade: "-6", motivo: "Partido" }, new Big(5)).quantidade).toBe("Deixaria o armazém com quantidade negativa.");
    expect(errosMovimento("ajuste", { ...base, quantidade: "0" }, new Big(5))).toEqual({ quantidade: "Um ajuste sem variação não altera nada.", motivo: "Um ajuste precisa de motivo." });
    expect(lerComSinal("-2,5")?.toString()).toBe("-2.5");
    expect(lerComSinal("abc")).toBeNull();
  });
  it("contagem: quantidade contada não negativa", () => {
    expect(erroContado("0")).toBeUndefined();
    expect(erroContado("")).toBe("Indique a quantidade contada.");
    expect(erroContado("-1")).toBe("Quantidade inválida (até 4 casas, não negativa).");
  });
});

describe("formatação", () => {
  it("quantidades com as casas que têm; valores em kwanzas sem vírgula flutuante", () => {
    expect(qtd(2.5)).toBe("2,5");
    expect(qtd(10)).toBe("10");
    expect(kz(new Big("0.1").plus("0.2")).replace(/\s/g, " ")).toContain("0,30");
    expect(kz("1234.5678").replace(/\s/g, " ")).toContain("1 234,57 Kz");
  });
});
