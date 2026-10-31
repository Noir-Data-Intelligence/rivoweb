import { describe, expect, it } from "vitest";
import { erroDataValor, MEIOS_POR_BANCO, mesAnterior } from "@/features/tesouraria/regras";

describe("tesouraria pelo banco (ADR-098, ADR-100)", () => {
  it("o mês anterior, também em Janeiro", () => {
    expect(mesAnterior("2026-10-31")).toBe("2026-09");
    expect(mesAnterior("2026-01-05")).toBe("2025-12");
  });

  it("a data-valor: obrigatória, não futura e não antes do mês que se paga", () => {
    expect(erroDataValor("", "2026-10-31")).toBe("Indique a data.");
    expect(erroDataValor("2026-11-01", "2026-10-31")).toBe("A data não pode ser futura.");
    expect(erroDataValor("2026-10-31", "2026-10-31")).toBeUndefined();
    expect(erroDataValor("2026-08-31", "2026-10-31", "2026-09")).toBe("Não antes do mês que se paga.");
    expect(erroDataValor("2026-09-01", "2026-10-31", "2026-09")).toBeUndefined();
  });

  it("numerário e cheque não entram numa conta: ficam para depositar (ADR-099)", () => {
    expect(MEIOS_POR_BANCO).toEqual(["TB", "MB", "CC", "CD"]);
    expect(MEIOS_POR_BANCO).not.toContain("NU");
    expect(MEIOS_POR_BANCO).not.toContain("CH");
  });
});
