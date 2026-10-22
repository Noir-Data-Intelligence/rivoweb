import { describe, expect, it } from "vitest";
import { proximoPlano } from "@/features/frota/comum";
import {
  apoliceParaApi,
  despesaParaApi,
  erroFimAtribuicao,
  erroMotivo,
  erroPagamento,
  errosApolice,
  errosAtribuicao,
  errosDespesa,
  errosDocumento,
  errosFecho,
  errosManutencao,
  errosPlano,
  errosSinistro,
  errosViagem,
  errosViatura,
  planoParaApi,
  sinistroParaApi,
  viagemParaApi,
  viaturaParaApi,
  type CamposApolice,
} from "@/features/frota/regras";

describe("viatura e manutenção", () => {
  it("matrícula (20) e modelo (100); a matrícula sobe em maiúsculas", () => {
    expect(errosViatura({ matricula: " ", modelo: "" })).toEqual({ matricula: "Indique a matrícula.", modelo: "Indique o modelo." });
    expect(errosViatura({ matricula: "x".repeat(21), modelo: "m".repeat(101) })).toEqual({ matricula: "No máximo 20 caracteres.", modelo: "No máximo 100 caracteres." });
    expect(viaturaParaApi({ matricula: " ld-12-34-ab ", modelo: " Toyota Hilux " })).toEqual({ plateNumber: "LD-12-34-AB", model: "Toyota Hilux" });
  });
  it("manutenção com descrição e início; fecho não antes do início, custo opcional ≥ 0", () => {
    expect(errosManutencao({ tipo: "Corrective", descricao: " ", inicio: "" })).toEqual({ descricao: "Descreva a manutenção.", inicio: "Indique o início." });
    expect(errosFecho({ fim: "2026-03-01", custo: "-1" }, "2026-03-02")).toEqual({ fim: "O fim não pode ser anterior ao início da manutenção.", custo: "O custo não pode ser negativo (até 2 casas)." });
    expect(errosFecho({ fim: "2026-03-02", custo: "" }, "2026-03-02")).toEqual({});
  });
  it("plano: dias inteiros positivos e primeira data", () => {
    expect(errosPlano({ descricao: "", intervalo: "0", primeira: "" })).toEqual({ descricao: "Descreva o plano.", intervalo: "Dias inteiros, de 1 a 9999.", primeira: "Indique a primeira data." });
    expect(errosPlano({ descricao: "Óleo", intervalo: "1,5", primeira: "2026-04-01" }).intervalo).toBe("Dias inteiros, de 1 a 9999.");
    expect(planoParaApi({ descricao: " Revisão geral ", intervalo: " 180 ", primeira: "2026-04-01" })).toEqual({ description: "Revisão geral", intervalDays: 180, firstDueOn: "2026-04-01" });
  });
  it("o próximo plano é o activo com a data mais próxima", () => {
    const p = (id: string, data: string, activo = true) => ({ planId: id, description: id, intervalDays: 30, nextDueOn: data, isActive: activo, isOverdue: false });
    expect(proximoPlano([p("a", "2026-05-01"), p("b", "2026-04-01", false), p("c", "2026-04-15")])?.planId).toBe("c");
    expect(proximoPlano([p("b", "2026-04-01", false)])).toBeNull();
  });
});

describe("atribuições, viagens e despesas", () => {
  it("atribuição com colaborador e início; fim não antes do início", () => {
    expect(errosAtribuicao({ pessoa: "", inicio: "" })).toEqual({ pessoa: "Escolha o colaborador.", inicio: "Indique o início." });
    expect(erroFimAtribuicao("2026-01-01", "2026-02-01")).toBe("O fim não pode ser anterior ao início da atribuição.");
    expect(erroFimAtribuicao("2026-02-01", "2026-02-01")).toBeUndefined();
  });
  it("viagem: datas por ordem, odómetro final não inferior ao inicial; quilómetros em texto", () => {
    const base = { motorista: "", inicio: "2026-03-02", fim: "2026-03-01", kmInicio: "-1", kmFim: "", motivo: "m".repeat(501) };
    expect(errosViagem(base)).toEqual({
      fim: "O fim não pode ser anterior ao início da viagem.",
      kmInicio: "Quilómetros não negativos (até 2 casas).",
      kmFim: "Quilómetros não negativos (até 2 casas).",
      motivo: "No máximo 500 caracteres.",
    });
    expect(errosViagem({ ...base, fim: "2026-03-02", kmInicio: "12 500", kmFim: "12 499,5", motivo: "" }).kmFim).toBe("O odómetro final não pode ser inferior ao inicial.");
    expect(viagemParaApi({ motorista: "e1", inicio: "2026-03-02", fim: "2026-03-02", kmInicio: "12 500", kmFim: "12 640,5", motivo: "  Cliente  " })).toEqual({
      driverId: "e1",
      startedOn: "2026-03-02",
      endedOn: "2026-03-02",
      startOdometer: "12500",
      endOdometer: "12640.5",
      purpose: "Cliente",
    });
    expect(viagemParaApi({ motorista: "", inicio: "2026-03-02", fim: "2026-03-02", kmInicio: "0", kmFim: "10", motivo: "" })).toMatchObject({ driverId: null, purpose: null });
  });
  it("despesa positiva, em AOA e em texto", () => {
    expect(errosDespesa({ categoria: "Fuel", valor: "0", data: "", descricao: "" })).toEqual({ valor: "Valor positivo (até 2 casas).", data: "Indique a data." });
    expect(despesaParaApi({ categoria: "Toll", valor: "1 500,5", data: "2026-03-02", descricao: " " })).toEqual({ category: "Toll", amount: "1500.50", occurredOn: "2026-03-02", description: null });
  });
});

describe("documentos, apólices e sinistros", () => {
  it("documento carregado e com categoria; retirar com motivo", () => {
    expect(errosDocumento({ doc: false, categoria: "" })).toEqual({ doc: "Carregue o ficheiro.", categoria: "Indique a categoria (por exemplo, livrete ou inspecção)." });
    expect(erroMotivo(" ")).toBe("Diga porque retira o documento da viatura.");
    expect(erroMotivo("x".repeat(501))).toBe("No máximo 500 caracteres.");
  });
  it("apólice: seguradora, número, vigência, prémio, moeda ISO e notas", () => {
    const v: CamposApolice = { seguradora: "", numero: "", cobertura: "c".repeat(201), inicio: "2026-02-01", fim: "2026-01-01", premio: "-1", moeda: "KZ", capital: "-5", notas: "n".repeat(1001) };
    expect(errosApolice(v)).toEqual({
      seguradora: "Indique a seguradora.",
      numero: "Indique o número da apólice.",
      cobertura: "No máximo 200 caracteres.",
      fim: "A apólice não pode acabar antes de começar.",
      premio: "Prémio não negativo (até 2 casas).",
      moeda: "Código de 3 letras (por exemplo, AOA).",
      capital: "Capital seguro não negativo (até 2 casas).",
      notas: "No máximo 1000 caracteres.",
    });
    expect(apoliceParaApi({ seguradora: " ENSA ", numero: "ap-1", cobertura: "", inicio: "2026-01-01", fim: "2026-12-31", premio: "250 000", moeda: "aoa", capital: "", notas: "" })).toEqual({
      insurer: "ENSA",
      policyNumber: "ap-1",
      coverage: null,
      startsOn: "2026-01-01",
      endsOn: "2026-12-31",
      premium: "250000.00",
      currency: "AOA",
      insuredValue: null,
      notes: null,
    });
  });
  it("sinistro dentro da vigência; pagamento não negativo", () => {
    const vig = { inicio: "2026-01-01", fim: "2026-12-31" };
    expect(errosSinistro({ data: "2027-01-01", descricao: "", valor: "-1", referencia: "r".repeat(61) }, vig)).toEqual({
      data: "O sinistro tem de ocorrer dentro da vigência da apólice.",
      descricao: "Descreva o sinistro.",
      valor: "Valor reclamado não negativo (até 2 casas).",
      referencia: "No máximo 60 caracteres.",
    });
    expect(sinistroParaApi({ data: "2026-03-01", descricao: " Toque ", valor: "80 000", referencia: "" })).toEqual({ occurredOn: "2026-03-01", description: "Toque", claimedAmount: "80000.00", reference: null });
    expect(erroPagamento("")).toBe("Valor pago não negativo (até 2 casas).");
    expect(erroPagamento("0")).toBeUndefined();
  });
});
