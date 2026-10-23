import { describe, expect, it } from "vitest";
import { estadoChecklist } from "@/features/aprovacoes/comum";

const itens = [{ itemId: "a" }, { itemId: "b" }, { itemId: "c" }];

describe("checklist de validação (K4)", () => {
  it("só valida com todos os itens respondidos e nenhum não conforme", () => {
    expect(estadoChecklist(itens, {})).toEqual({ naoConforme: false, completo: false, podeValidar: false });
    expect(estadoChecklist(itens, { a: "Compliant", b: "Compliant" }).podeValidar).toBe(false);
    expect(estadoChecklist(itens, { a: "Compliant", b: "Compliant", c: "NotApplicable" })).toEqual({ naoConforme: false, completo: true, podeValidar: true });
  });

  it("um «não conforme» bloqueia a validação, mesmo com tudo respondido", () => {
    expect(estadoChecklist(itens, { a: "Compliant", b: "NonCompliant", c: "Compliant" })).toEqual({ naoConforme: true, completo: true, podeValidar: false });
    expect(estadoChecklist(itens, { b: "NonCompliant" })).toEqual({ naoConforme: true, completo: false, podeValidar: false });
  });

  it("respostas de itens que não são do passo não contam", () => {
    expect(estadoChecklist(itens, { a: "Compliant", b: "Compliant", x: "NonCompliant" }).naoConforme).toBe(false);
  });
});
