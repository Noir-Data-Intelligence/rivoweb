import { describe, expect, it } from "vitest";
import { IsoDate, email, novaPassword, texto } from "@/lib/validation/text";

describe("primitivas de validação (§7.3)", () => {
  it("email normaliza e valida", () => {
    expect(email.parse("  Ana@Rivo.AO​ ")).toBe("ana@rivo.ao");
    expect(email.safeParse("nao-e-email").success).toBe(false);
    expect(email.safeParse("").success).toBe(false);
  });
  it("password segue a política do backend", () => {
    expect(novaPassword.safeParse("Curta1!").success).toBe(false);
    expect(novaPassword.safeParse("semmaiusculas1!").success).toBe(false);
    expect(novaPassword.safeParse("SemSimbolo1234").success).toBe(false);
    expect(novaPassword.safeParse("Valida!2026xx").success).toBe(true);
  });
  it("IsoDate recusa datas impossíveis", () => {
    expect(IsoDate.safeParse("2026-02-29").success).toBe(false);
    expect(IsoDate.safeParse("2028-02-29").success).toBe(true);
  });
  it("texto normaliza antes de medir", () => {
    const t = texto({ max: 3, obrigatorio: "Obrigatório." });
    expect(t.parse(" ab​ ")).toBe("ab");
    expect(t.safeParse("   ").success).toBe(false);
    expect(t.safeParse("abcd").success).toBe(false);
  });
});
