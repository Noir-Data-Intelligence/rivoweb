import { describe, expect, it } from "vitest";
import { motivoParaRecusar } from "@/features/documentos/api";
import { porPedir } from "@/features/pagar/pages/FacturaCompra";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { ApiError } from "@/lib/api/problem";
import { ibanValido } from "@/lib/validation/text";

describe("IBAN (ISO 13616)", () => {
  it("aceita IBAN válidos, com ou sem espaços", () => {
    expect(ibanValido("AO30 0040 0000 1234 5678 9012 3")).toBe(true);
    expect(ibanValido("pt50000201231234567890154")).toBe(true);
  });
  it("recusa dígitos de controlo errados e formatos impossíveis", () => {
    expect(ibanValido("AO06004000001234567890123")).toBe(false);
    expect(ibanValido("AO30")).toBe(false);
    expect(ibanValido("")).toBe(false);
  });
});

describe("falta pedir", () => {
  it("total menos os pedidos não cancelados, nunca abaixo de zero", () => {
    const f = { grossTotal: 1140000 };
    expect(porPedir(f, [{ status: "Eligible", amount: 640000 }, { status: "Cancelled", amount: 500000 }]).toFixed(2)).toBe("500000.00");
    expect(porPedir(f, [{ status: "Executed", amount: "1140000.00" }]).toFixed(2)).toBe("0.00");
    expect(porPedir({ grossTotal: "0.1" }, [{ status: "Eligible", amount: "0.2" }]).toFixed(2)).toBe("0.00");
  });
});

describe("ficheiros recusados antes de enviar", () => {
  const f = (nome: string, tamanho: number) => new File([new Uint8Array(tamanho)], nome);
  it("vazio, grande de mais ou de formato não aceite", () => {
    expect(motivoParaRecusar(f("a.pdf", 0), false)).toBe("O ficheiro está vazio.");
    expect(motivoParaRecusar(f("a.pdf", 10 * 1024 * 1024 + 1), false)).toBe("O ficheiro passa de 10 MB.");
    expect(motivoParaRecusar(f("a.pdf", 10 * 1024 * 1024 + 1), true)).toBeNull();
    expect(motivoParaRecusar(f("a.exe", 10), true)).toContain("Formato não aceite");
    expect(motivoParaRecusar(f("Recibo.JPG", 10), false)).toBeNull();
  });
});

describe("400 só com detalhe", () => {
  it("devolve o detalhe para aparecer no formulário", () => {
    const erro = new ApiError({ tipo: "http", status: 400, title: "Bad Request", detail: "O IBAN não passa a verificação." });
    expect(aplicarErrosDoServidor(erro, () => undefined, [])).toEqual(["O IBAN não passa a verificação."]);
  });
});
