import { describe, expect, it } from "vitest";
import { textoMercado } from "@/features/contabilidade/comum";
import { errosVenda } from "@/features/facturacao/VenderActivo";
import { eContaImobilizado, textoPaisMercado } from "@/features/pagar/comum";

describe("mercado, compra e venda de imobilizado (ADR-106 a ADR-108)", () => {
  it("o mercado da regra: sem mercado serve os dois", () => {
    expect(textoMercado(null)).toBe("Os dois");
    expect(textoMercado("Domestic")).toBe("Nacional");
    expect(textoMercado("Foreign")).toBe("Estrangeiro");
  });

  it("país e mercado do fornecedor, só com o que vem", () => {
    expect(textoPaisMercado("ZA", "Foreign")).toBe("país ZA, mercado estrangeiro");
    expect(textoPaisMercado(null, null)).toBe("");
  });

  it("conta do imobilizado: classe 1, de 11 a 14", () => {
    for (const c of ["11", "11.3.2", "12.1", "13", "14.1.1", " 11.5 "]) expect(eContaImobilizado(c)).toBe(true);
    for (const c of ["", "1", "10", "15.1", "18.1", "111", "75.2.12", "31.1"]) expect(eContaImobilizado(c)).toBe(false);
  });

  it("a venda pela factura: data depois da aquisição, meio na FR, descrição, preço maior que zero e imposto", () => {
    const base = { tipo: "FT", data: "2026-10-20", meio: "", descricao: "Venda", preco: "600 000", imposto: "NOR" };
    expect(errosVenda(base, "2026-03-10")).toEqual({});
    expect(errosVenda({ ...base, data: "2026-03-09" }, "2026-03-10").data).toBe("Não pode ser antes da aquisição.");
    expect(errosVenda({ ...base, tipo: "FR" }, "2026-03-10").meio).toBeDefined();
    expect(errosVenda({ ...base, preco: "0" }, "2026-03-10").preco).toBeDefined();
    expect(errosVenda({ ...base, descricao: "  " }, "2026-03-10").descricao).toBeDefined();
  });
});
