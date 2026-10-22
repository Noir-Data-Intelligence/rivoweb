import { describe, expect, it } from "vitest";
import { numeroEsg } from "@/features/esg/comum";
import { errosIndicador, errosIniciativa, errosMedicao, indicadorParaApi, iniciativaParaApi, medicaoParaApi, type CamposIndicador, type CamposIniciativa } from "@/features/esg/regras";

const ind = (x: Partial<CamposIndicador> = {}): CamposIndicador => ({
  codigo: "env-01",
  nome: "Gasóleo",
  pilar: "Environmental",
  categoria: "",
  unidade: "litros",
  agregacao: "Sum",
  direccao: "LowerIsBetter",
  meta: "",
  factor: "",
  unidadeConvertida: "",
  fonte: "",
  activo: true,
  ...x,
});

describe("indicadores", () => {
  it("código, nome e unidade obrigatórios; limites do servidor", () => {
    expect(errosIndicador(ind({ codigo: " ", nome: "", unidade: "" }))).toEqual({ codigo: "Indique o código.", nome: "Indique o nome.", unidade: "Indique a unidade (por exemplo, kWh ou litros)." });
    expect(errosIndicador(ind({ codigo: "x".repeat(31), categoria: "c".repeat(101) }))).toEqual({ codigo: "No máximo 30 caracteres.", categoria: "No máximo 100 caracteres." });
    expect(errosIndicador(ind({ meta: "1,23456" })).meta).toBe("Número até 4 casas decimais.");
  });
  it("factor positivo exige a unidade convertida e a fonte", () => {
    expect(errosIndicador(ind({ factor: "0" }))).toEqual({ factor: "Factor positivo, até 6 casas decimais.", unidadeConvertida: "Com factor, indique a unidade convertida.", fonte: "Com factor, indique a fonte (de onde vem o valor)." });
    expect(errosIndicador(ind({ factor: "2,68", unidadeConvertida: "kgCO2e", fonte: "Inventário interno 2026" }))).toEqual({});
  });
  it("sobe o código em maiúsculas e os números em texto; sem factor, sem unidade convertida nem fonte", () => {
    expect(indicadorParaApi(ind({ meta: "12 000,5", unidadeConvertida: "esquecida", fonte: "x" }))).toEqual({
      code: "ENV-01",
      name: "Gasóleo",
      pillar: "Environmental",
      category: null,
      unit: "litros",
      aggregation: "Sum",
      direction: "LowerIsBetter",
      annualTarget: "12000.5",
      conversionFactor: null,
      convertedUnit: null,
      factorSource: null,
      active: true,
    });
    expect(indicadorParaApi(ind({ factor: "2,680000", unidadeConvertida: "kgCO2e", fonte: "Fonte" }))).toMatchObject({ conversionFactor: "2.68", convertedUnit: "kgCO2e", factorSource: "Fonte" });
  });
});

describe("medições e iniciativas", () => {
  it("medição: mês, ano, valor não negativo; o período é o 1.º dia do mês", () => {
    expect(errosMedicao({ mes: "13", ano: "26", valor: "-1", fonte: "", notas: "" })).toEqual({ mes: "Escolha o mês.", ano: "Ano com 4 algarismos.", valor: "Valor não negativo, até 4 casas decimais." });
    expect(medicaoParaApi({ mes: "3", ano: "2026", valor: "1 250,75", fonte: " Facturas ", notas: "" })).toEqual({ period: "2026-03-01", value: "1250.75", source: "Facturas", notes: null });
  });
  it("iniciativa: título, datas por ordem, orçamento, moeda e progresso 0–100", () => {
    const v: CamposIniciativa = { titulo: "", pilar: "Social", descricao: "", indicador: "", responsavel: "", inicio: "2026-05-01", fim: "2026-04-01", orcamento: "-1", moeda: "Kz", progresso: "101" };
    expect(errosIniciativa(v)).toEqual({
      titulo: "Indique o título.",
      fim: "A iniciativa não pode acabar antes de começar.",
      orcamento: "Orçamento não negativo (até 2 casas).",
      moeda: "Código de 3 letras (por exemplo, AOA).",
      progresso: "De 0 a 100.",
    });
    expect(iniciativaParaApi({ ...v, titulo: " Painéis solares ", fim: "", orcamento: "2 500 000", moeda: "aoa", progresso: "20" })).toEqual({
      title: "Painéis solares",
      pillar: "Social",
      description: null,
      indicatorId: null,
      ownerEmployeeId: null,
      startsOn: "2026-05-01",
      endsOn: null,
      budget: "2500000.00",
      currency: "AOA",
      progress: 20,
    });
  });
  it("números do ESG com as casas que têm, até 4", () => {
    expect(numeroEsg(1250.75)).toMatch(/^1\s?250,75$/);
    expect(numeroEsg("2.680000")).toBe("2,68");
    expect(numeroEsg(3)).toBe("3");
  });
});
