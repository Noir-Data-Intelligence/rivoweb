import { describe, expect, it } from "vitest";
import { manutencaoEmAtraso } from "@/features/activos/comum";
import { estadoPagamento } from "@/features/pagar/comum";
import { nomeCategoria, temEmFalta } from "@/features/portalcliente/comum";
import { erroAlcancado, erroFecho, errosTempo } from "@/features/projectos/regras";
import { formatarMes, mesDe } from "@/lib/format/data";

describe("pedidos de pagamento: o estado pela decisão (nota 54)", () => {
  it("um Eligible diz-se pelo approvalStatus; sem ele, «Por pagar»", () => {
    expect(estadoPagamento({ status: "Eligible", approvalStatus: "Pending" })).toBe("PorAprovar");
    expect(estadoPagamento({ status: "Eligible", approvalStatus: "Approved" })).toBe("Aprovado");
    expect(estadoPagamento({ status: "Eligible", approvalStatus: "Refused" })).toBe("Rejeitado");
    expect(estadoPagamento({ status: "Eligible", approvalStatus: "Unknown" })).toBe("SemDecisao");
    expect(estadoPagamento({ status: "Eligible", approvalStatus: null })).toBe("PorPagar");
    expect(estadoPagamento({ status: "Executed", approvalStatus: "Approved" })).toBe("Pago");
    expect(estadoPagamento({ status: "Cancelled", approvalStatus: null })).toBe("Cancelado");
  });
});

describe("extracto por mês (nota 54)", () => {
  it("o primeiro e o último dia, com a mudança de ano e Fevereiro", () => {
    expect(mesDe("2026-11-20")).toEqual({ de: "2026-11-01", ate: "2026-11-30" });
    expect(mesDe("2026-01-15", -1)).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
    expect(mesDe("2026-12-31", 1)).toEqual({ de: "2027-01-01", ate: "2027-01-31" });
    expect(mesDe("2028-03-01", -1)).toEqual({ de: "2028-02-01", ate: "2028-02-29" });
  });
  it("o nome do mês", () => {
    expect(formatarMes("2026-11-01")).toBe("Novembro de 2026");
  });
});

describe("manutenção de um activo em atraso", () => {
  it("só agendada e com o dia já passado", () => {
    expect(manutencaoEmAtraso({ status: "Scheduled", scheduledOn: "2026-11-19" }, "2026-11-20")).toBe(true);
    expect(manutencaoEmAtraso({ status: "Scheduled", scheduledOn: "2026-11-20" }, "2026-11-20")).toBe(false);
    expect(manutencaoEmAtraso({ status: "Completed", scheduledOn: "2026-01-01" }, "2026-11-20")).toBe(false);
  });
});

describe("datas do trabalho do projecto (ADR-140)", () => {
  const v = { pessoa: "e1", tarefa: "", dia: "2026-10-20", horas: "7,5", descricao: "", facturavel: true };
  it("tempo: não antes do início do projecto", () => {
    expect(errosTempo(v, "2026-10-22", "2026-10-20").dia).toBeUndefined();
    expect(errosTempo(v, "2026-10-22", "2026-10-21").dia).toBe("Não se regista tempo antes do início do projecto (21/10/2026).");
  });
  it("marco alcançado: entre o início e hoje", () => {
    expect(erroAlcancado("2026-11-20", "2026-01-01", "2026-11-20")).toBeUndefined();
    expect(erroAlcancado("2026-11-21", "2026-01-01", "2026-11-20")).toBe("A data em que o marco foi alcançado não pode ser futura.");
    expect(erroAlcancado("2025-12-31", "2026-01-01", "2026-11-20")).toBe("Um marco não pode ser alcançado antes do início do projecto.");
    expect(erroAlcancado("", "2026-01-01", "2026-11-20")).toBe("Indique a data.");
  });
  it("fecho: não futuro", () => {
    expect(erroFecho("2026-11-21", "2026-01-01", "2026-11-20")).toBe("A data de fecho não pode ser futura.");
    expect(erroFecho("2026-11-20", "2026-01-01", "2026-11-20")).toBeUndefined();
  });
});

describe("portal do cliente (ADR-141)", () => {
  it("comprovativo só com valor em falta numa factura em vigor", () => {
    expect(temEmFalta({ status: "Normal", outstanding: 500000 })).toBe(true);
    expect(temEmFalta({ status: "Normal", outstanding: "0" })).toBe(false);
    expect(temEmFalta({ status: "Cancelled", outstanding: 80000 })).toBe(false);
  });
  it("a categoria do comprovativo em português", () => {
    expect(nomeCategoria("finance.payment-proof")).toBe("Comprovativo de pagamento");
    expect(nomeCategoria("Contratos")).toBe("Contratos");
    expect(nomeCategoria(null)).toBeNull();
  });
});
