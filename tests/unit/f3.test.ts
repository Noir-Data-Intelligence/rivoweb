import Big from "big.js";
import { describe, expect, it } from "vitest";
import { calcularTotais, impostoDaLinha, liquidoDaLinha } from "@/features/facturacao/calculos";
import { nomeFicheiroPdf } from "@/features/facturacao/ficheiro";
import { taxaEmVigor } from "@/features/facturacao/pages/Rascunho";
import { lerDecimalDigitado } from "@/lib/money/money";

const B = (v: string) => new Big(v);

describe("totais de um documento (§2.6, regras do servidor)", () => {
  it("arredonda cada linha a 2 casas, meio para cima, antes de somar", () => {
    expect(liquidoDaLinha({ quantidade: B("3"), preco: B("0.335") }).toFixed(2)).toBe("1.01");
    expect(impostoDaLinha({ quantidade: B("1"), preco: B("0.05"), taxa: B("14") })?.toFixed(2)).toBe("0.01");
    const t = calcularTotais(
      [
        { quantidade: B("3"), preco: B("0.335"), taxa: B("14") },
        { quantidade: B("2.5"), preco: B("1000.10"), taxa: B("14") },
      ],
      null,
    );
    // 1,01 + 2500,25 = 2501,26; IVA 0,14 + 350,04 = 350,18.
    expect(t.liquido.toFixed(2)).toBe("2501.26");
    expect(t.imposto?.toFixed(2)).toBe("350.18");
    expect(t.total?.toFixed(2)).toBe("2851.44");
  });

  it("retenção sobre o líquido total, arredondada", () => {
    const t = calcularTotais([{ quantidade: B("1"), preco: B("100000"), taxa: B("14") }], B("6.5"));
    expect(t.retencao.toFixed(2)).toBe("6500.00");
    expect(t.aPagar?.toFixed(2)).toBe("107500.00");
  });

  it("sem taxa conhecida, não inventa o IVA", () => {
    const t = calcularTotais([{ quantidade: B("2"), preco: B("10"), taxa: null }], null);
    expect(t.liquido.toFixed(2)).toBe("20.00");
    expect(t.imposto).toBeNull();
    expect(t.total).toBeNull();
    expect(t.aPagar).toBeNull();
  });

  it("quantidades decimais com até 4 casas", () => {
    expect(lerDecimalDigitado("1,2345", 4)?.toString()).toBe("1.2345");
    expect(lerDecimalDigitado("1,23456", 4)).toBeNull();
    expect(lerDecimalDigitado("1 000,5", 4)?.toString()).toBe("1000.5");
  });
});

describe("taxa de IVA em vigor (pautas)", () => {
  const pautas = [
    {
      scheduleId: "s",
      kind: 0,
      code: "NOR",
      description: "Normal",
      requiresExemptionCode: false,
      versions: [
        { versionId: "a", percentage: 14, effectiveFrom: "2019-10-01", effectiveTo: "2026-06-30", legalInstrument: "Lei A" },
        { versionId: "b", percentage: 16, effectiveFrom: "2026-07-01", effectiveTo: null, legalInstrument: "Lei B" },
      ],
    },
  ] as never;
  it("escolhe a versão em vigor na data", () => {
    expect(taxaEmVigor(pautas, "nor", "2026-03-01")?.toString()).toBe("14");
    expect(taxaEmVigor(pautas, "NOR", "2026-10-13")?.toString()).toBe("16");
    expect(taxaEmVigor(pautas, "RED", "2026-10-13")).toBeNull();
    expect(taxaEmVigor(undefined, "NOR", "2026-10-13")).toBeNull();
  });
});

import { mensagemErro } from "@/lib/api/mensagens";
import { ApiError } from "@/lib/api/problem";

describe("400 com o título genérico do ASP.NET", () => {
  it("mostra o motivo que vem em errors", () => {
    const m = mensagemErro(new ApiError({ tipo: "http", status: 400, title: "One or more validation errors occurred.", errors: { factura: ["A série FT não existe."] } }));
    expect(m.titulo).toBe("Há dados por corrigir.");
    expect(m.detalhe).toBe("A série FT não existe.");
  });
});

describe("nome do PDF a partir do número", () => {
  it("troca as barras da série por hífen e limpa o resto", () => {
    expect(nomeFicheiroPdf("FT S001/17")).toBe("FT S001-17.pdf");
    expect(nomeFicheiroPdf("FT S001\\17")).toBe("FT S001-17.pdf");
    expect(nomeFicheiroPdf("  NC  A/2026/3 ")).toBe("NC A-2026-3.pdf");
    expect(nomeFicheiroPdf('RC "x"?')).toBe("RC -x--.pdf");
    expect(nomeFicheiroPdf("   ")).toBe("documento.pdf");
  });
});
