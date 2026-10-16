import { describe, expect, it } from "vitest";
import { errosContrato, errosDadosPessoais, lerDias } from "@/features/rh/regras";
import { mascarar } from "@/lib/security/mascara";

describe("máscara de dados pessoais (§7.6)", () => {
  it("só os últimos quatro à vista; curtos mascaram-se por inteiro", () => {
    expect(mascarar("AO06 0040 0000 1234 5678 9012 3")).toBe("•••• 0123");
    expect(mascarar("004812345LA041")).toBe("•••• A041");
    expect(mascarar("1234")).toBe("••••");
    expect(mascarar("12")).toBe("••••");
  });
});

describe("dados pessoais", () => {
  const hoje = "2026-10-16";
  it("país com duas letras, nascimento não futuro", () => {
    expect(errosDadosPessoais({ country: "AO", passportIssuingCountry: "pt", birthDate: "1990-05-01" }, null, hoje)).toEqual({});
    expect(errosDadosPessoais({ country: "Angola", passportIssuingCountry: "PRT", birthDate: "2026-10-17" }, null, hoje)).toEqual({
      country: "Duas letras (código ISO do país).",
      passportIssuingCountry: "Duas letras (código ISO do país).",
      birthDate: "A data de nascimento não pode ser futura.",
    });
  });
  it("IBAN só se valida quando muda, como no servidor", () => {
    expect(errosDadosPessoais({ iban: "AO06 0040 0000 1234 5678 9012 4" }, null, hoje).iban).toBe("IBAN inválido: confirme os dígitos de controlo.");
    // Valor antigo, gravado antes da regra: não impede de corrigir o resto.
    expect(errosDadosPessoais({ iban: "AO0600400000123456789012 4" }, "AO06004000001234567890124", hoje)).toEqual({});
    expect(errosDadosPessoais({ iban: "" }, "AO06004000001234567890124", hoje)).toEqual({});
  });
});

describe("contratos", () => {
  const base = { colaborador: "x", inicio: "2026-11-01", salario: "450 000" };
  it("o tipo manda na data de fim", () => {
    expect(errosContrato({ ...base, tipo: "Permanent", fim: "" })).toEqual({});
    expect(errosContrato({ ...base, tipo: "Permanent", fim: "2027-01-01" }).fim).toBe("Um contrato sem termo não tem data de fim.");
    expect(errosContrato({ ...base, tipo: "FixedTerm", fim: "" }).fim).toBe("Um contrato a termo ou de prestação de serviços exige data de fim.");
    expect(errosContrato({ ...base, tipo: "Freelance", fim: "2026-11-01" }).fim).toBe("A data de fim tem de ser posterior à de início.");
    expect(errosContrato({ ...base, tipo: "FixedTerm", fim: "2027-04-30" })).toEqual({});
  });
  it("salário positivo, em texto pt-AO", () => {
    expect(errosContrato({ ...base, tipo: "Permanent", fim: "", salario: "0" }).salario).toBe("O salário tem de ser maior que zero.");
    expect(errosContrato({ ...base, tipo: "Permanent", fim: "", salario: "1,234" }).salario).toBe("Valor inválido (até 2 casas decimais).");
    expect(errosContrato({ colaborador: "", tipo: "Permanent", inicio: "", fim: "", salario: "" })).toEqual({
      colaborador: "Escolha o colaborador.",
      inicio: "Indique o início.",
      salario: "Indique o salário mensal.",
    });
  });
});

describe("direito a dias", () => {
  it("de 0 a 366, até 2 casas", () => {
    expect(lerDias("22")).toBe("22");
    expect(lerDias("2,5")).toBe("2.5");
    expect(lerDias("0")).toBe("0");
    expect(lerDias("367")).toBeNull();
    expect(lerDias("-1")).toBeNull();
    expect(lerDias("1,255")).toBeNull();
  });
});
