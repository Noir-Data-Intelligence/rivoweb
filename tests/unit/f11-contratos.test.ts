import { describe, expect, it } from "vitest";
import { accaoParaApi, errosAccao, type CamposAccao } from "@/features/cobrancas/api";
import type { Contrato } from "@/features/contratos/api";
import { aditamentoParaApi, contratoParaApi, erroRenovacao, errosAditamento, errosContrato, type CamposContrato } from "@/features/contratos/regras";

const base: CamposContrato = { referencia: " CT-2026/01 ", titulo: "Manutenção", cliente: "c1", tipo: "Commercial", inicio: "2026-01-01", fim: "2026-12-31", valor: "1 200 000", moeda: "USD", slaResposta: "4", slaResolucao: "24", aviso: "30", autoRenovar: true, notas: "" };

describe("contrato", () => {
  it("referência, título, cliente e início; fim não antes do início; SLA positivos", () => {
    expect(Object.values(errosContrato(base, true)).filter(Boolean)).toEqual([]);
    expect(errosContrato({ ...base, referencia: "", titulo: "", cliente: "", inicio: "", fim: "x" }, true)).toMatchObject({
      referencia: "Indique a referência.",
      titulo: "Indique o título.",
      cliente: "Escolha o cliente.",
      inicio: "Indique a data de início.",
      fim: "Data inválida.",
    });
    expect(errosContrato({ ...base, fim: "2025-12-31" }, true).fim).toBe("O fim não pode ser antes do início.");
    expect(errosContrato({ ...base, slaResposta: "0", aviso: "-1", valor: "-5" }, true)).toMatchObject({
      slaResposta: "Horas inteiras, maiores que zero.",
      aviso: "Dias inteiros (0 ou mais).",
      valor: "Valor não negativo (até 2 casas decimais).",
    });
    expect(errosContrato({ ...base, referencia: "", cliente: "" }, false)).toMatchObject({ referencia: undefined, cliente: undefined });
  });
  it("vai à API em texto; sem valor, sem moeda; ao corrigir, referência, cliente e tipo de origem", () => {
    expect(contratoParaApi(base)).toEqual({
      number: "CT-2026/01",
      title: "Manutenção",
      customerId: "c1",
      kind: "Commercial",
      startsOn: "2026-01-01",
      endsOn: "2026-12-31",
      value: "1200000.00",
      currency: "USD",
      slaResponseHours: 4,
      slaResolutionHours: 24,
      renewalNoticeDays: 30,
      autoRenew: true,
      notes: null,
    });
    const original = { number: "CT-9", customerId: "c9", kind: "Legal" } as Contrato;
    expect(contratoParaApi({ ...base, valor: "", slaResposta: "", fim: "" }, original)).toMatchObject({ number: "CT-9", customerId: "c9", kind: "Legal", value: null, currency: null, slaResponseHours: null, endsOn: null });
  });
  it("renovar estende o fim", () => {
    expect(erroRenovacao("", "2026-12-31")).toBe("Indique o novo fim.");
    expect(erroRenovacao("2026-12-31", "2026-12-31")).toBe("A renovação tem de estender o fim actual.");
    expect(erroRenovacao("2027-12-31", "2026-12-31")).toBeUndefined();
    expect(erroRenovacao("2027-12-31", null)).toBeUndefined();
  });
  it("aditamento muda o valor, o fim, ou os dois, sem deixar o valor negativo", () => {
    const c = { valor: 1000 as number | string | null, inicio: "2026-01-01" };
    expect(errosAditamento({ descricao: "", efeito: "", variacao: "", novoFim: "" }, c)).toMatchObject({ descricao: "Descreva o aditamento.", variacao: "Um aditamento muda o valor, o fim, ou os dois." });
    expect(errosAditamento({ descricao: "Reduz", efeito: "", variacao: "-1 000,01", novoFim: "" }, c).variacao).toBe("O aditamento deixaria o contrato com valor negativo.");
    expect(errosAditamento({ descricao: "Reduz", efeito: "", variacao: "-1 000", novoFim: "" }, c).variacao).toBeUndefined();
    expect(errosAditamento({ descricao: "Antes", efeito: "", variacao: "", novoFim: "2025-06-01" }, c).novoFim).toBe("O fim não pode ser antes do início.");
    expect(aditamentoParaApi({ descricao: " Mais horas ", efeito: "2026-06-01", variacao: "+250 000,5", novoFim: "" })).toEqual({ description: "Mais horas", effectiveOn: "2026-06-01", valueChange: "250000.50", newEndsOn: null });
  });
});

describe("acção de cobrança", () => {
  const acc: CamposAccao = { cliente: "c1", factura: "", tipo: "Call", notas: "Ligou, paga sexta.", quando: "2026-10-18T10:15", valorPrometido: "", dataPrometida: "", proximo: "2026-10-25" };
  it("notas obrigatórias; promessa exige valor positivo e data", () => {
    expect(Object.values(errosAccao(acc)).filter(Boolean)).toEqual([]);
    expect(errosAccao({ ...acc, cliente: "", notas: " " })).toMatchObject({ cliente: "Escolha o cliente.", notas: "Registe o que foi feito ou combinado." });
    expect(errosAccao({ ...acc, tipo: "PaymentPromise" })).toMatchObject({ valorPrometido: "Uma promessa precisa de valor positivo.", dataPrometida: "Uma promessa precisa de data." });
  });
  it("vai à API com a hora de Luanda e o valor em texto", () => {
    expect(accaoParaApi({ ...acc, tipo: "PaymentPromise", factura: "f1", valorPrometido: "150 000", dataPrometida: "2026-10-24" })).toEqual({
      customerId: "c1",
      salesInvoiceId: "f1",
      kind: "PaymentPromise",
      notes: "Ligou, paga sexta.",
      occurredAt: "2026-10-18T10:15:00+01:00",
      promisedAmount: "150000.00",
      promisedDate: "2026-10-24",
      nextFollowUpOn: "2026-10-25",
      ownerEmployeeId: null,
    });
  });
});
