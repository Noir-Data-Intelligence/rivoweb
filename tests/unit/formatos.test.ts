import { describe, expect, it } from "vitest";
import { formatarData, formatarDataCurta, formatarDataHora, hojeIso } from "@/lib/format/data";
import { formatarMoeda, formatarPercentagem } from "@/lib/format/numero";
import { dinheiro, lerDinheiroDigitado, paraApi } from "@/lib/money/money";

const NBSP = " ";
const FINO = " ";
const MENOS = "−";

describe("dinheiro (§2.6)", () => {
  it("doubles até 15 algarismos voltam exactos", () => {
    expect(dinheiro(9999999999999.99).toFixed(2)).toBe("9999999999999.99");
    expect(dinheiro(0.1).plus(dinheiro(0.2)).toString()).toBe("0.3");
    expect(dinheiro(1234.5).toFixed(2)).toBe("1234.50");
  });
  it("recusa NaN, infinito e expoentes em texto", () => {
    expect(() => dinheiro(Number.NaN)).toThrow();
    expect(() => dinheiro(Infinity)).toThrow();
    expect(() => dinheiro("1e5")).toThrow();
  });
  it("sobe como texto decimal, metade para longe do zero", () => {
    expect(paraApi(dinheiro("2.345"))).toBe("2.35");
    expect(paraApi(dinheiro("-2.345"))).toBe("-2.35");
  });
  it("lê o que a pessoa escreve", () => {
    expect(lerDinheiroDigitado("1 234,50")?.toFixed(2)).toBe("1234.50");
    expect(lerDinheiroDigitado("1.234,5")?.toFixed(2)).toBe("1234.50");
    expect(lerDinheiroDigitado("1234.5")?.toFixed(2)).toBe("1234.50");
    expect(lerDinheiroDigitado("1,234")).toBeNull();
    expect(lerDinheiroDigitado("abc")).toBeNull();
    expect(lerDinheiroDigitado("1e3")).toBeNull();
  });
});

describe("formatos pt-AO (§4.3)", () => {
  it("moeda", () => {
    expect(formatarMoeda(dinheiro("1234567.891"))).toBe(`1${NBSP}234${NBSP}567,89${NBSP}Kz`);
    expect(formatarMoeda(dinheiro("-1200"))).toBe(`${MENOS}1${NBSP}200,00${NBSP}Kz`);
    expect(formatarMoeda(dinheiro("12500"), "USD")).toBe(`12${NBSP}500,00${NBSP}USD`);
    expect(formatarMoeda(dinheiro("-0.001"))).toBe(`0,00${NBSP}Kz`);
  });
  it("percentagem", () => {
    expect(formatarPercentagem(14)).toBe(`14${FINO}%`);
    expect(formatarPercentagem(3.2, 1, true)).toBe(`+3,2${FINO}%`);
    expect(formatarPercentagem(-3.2, 1, true)).toBe(`${MENOS}3,2${FINO}%`);
  });
  it("datas sem passar por UTC", () => {
    expect(formatarData("2026-10-12")).toBe("12/10/2026");
    expect(formatarDataCurta("2026-10-02")).toBe("2 out 2026");
    expect(formatarData("2026-13-01")).toBe("—");
  });
  it("data-hora em Africa/Luanda (UTC+1)", () => {
    expect(formatarDataHora("2026-10-12T23:30:00Z")).toBe("13/10/2026 00:30");
    expect(hojeIso(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
});
