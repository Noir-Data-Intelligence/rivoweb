import { describe, expect, it } from "vitest";
import { subsidiosDe, totais } from "@/features/salarios/comum";
import { errosAbrir, errosItem } from "@/features/salarios/regras";

const item = (bruto: number, irt: number | null, inss: number | null, liquido: number | null) => ({
  itemId: "i",
  employeeId: "e",
  grossSalary: bruto,
  foodAllowance: 10000.1,
  transportAllowance: 5000.2,
  vacationAllowance: 0,
  christmasAllowance: 0,
  netSalary: liquido,
  withholdingTax: irt,
  socialSecurityContribution: inss,
});

describe("item da folha", () => {
  const base = { colaborador: "x", bruto: "450 000,00", alimentacao: "", transporte: "", ferias: "", natal: "" };
  it("bruto positivo; subsídios vazios valem zero", () => {
    expect(errosItem(base)).toEqual({});
    expect(errosItem({ ...base, bruto: "" }).bruto).toBe("Indique o salário bruto.");
    expect(errosItem({ ...base, bruto: "0" }).bruto).toBe("O salário bruto tem de ser positivo.");
    expect(errosItem({ ...base, bruto: "1,234" }).bruto).toBe("Valor inválido (até 2 casas decimais).");
    expect(errosItem({ ...base, colaborador: "" }).colaborador).toBe("Escolha o colaborador.");
  });
  it("os subsídios são parte do bruto: não o passam", () => {
    expect(errosItem({ ...base, bruto: "100 000", alimentacao: "60 000", transporte: "40 000" })).toEqual({});
    expect(errosItem({ ...base, bruto: "100 000", alimentacao: "60 000", transporte: "40 000,01" }).subsidios).toBe("Os subsídios fazem parte do bruto: não podem somar mais do que ele.");
    expect(errosItem({ ...base, natal: "-1" }).natal).toBe("Um subsídio não pode ser negativo.");
  });
});

describe("abrir folha", () => {
  it("ano com quatro algarismos e mês de 1 a 12", () => {
    expect(errosAbrir({ ano: "2026", mes: "10" })).toEqual({});
    expect(errosAbrir({ ano: "26", mes: "13" })).toEqual({ ano: "Indique o ano (quatro algarismos).", mes: "Escolha o mês." });
  });
});

describe("totais da folha", () => {
  it("somam em Big, sem erros de vírgula flutuante; valores por calcular contam zero", () => {
    const t = totais([item(0.1, 0.2, 0.3, 0.4), item(0.2, null, null, null)]);
    expect(t.bruto.toFixed(2)).toBe("0.30");
    expect(t.irt.toFixed(2)).toBe("0.20");
    expect(t.liquido.toFixed(2)).toBe("0.40");
    expect(subsidiosDe(item(1, 0, 0, 1)).toFixed(2)).toBe("15000.30");
  });
});
