import Big from "big.js";
import { describe, expect, it } from "vitest";
import { errosLinha, errosOrdem, errosRecepcao, errosRequisicao, linhasParaApi, temErros, totalLinhas } from "@/features/compras/regras";

const l = (descricao: string, quantidade: string, preco: string) => ({ descricao, quantidade, preco });

describe("linhas", () => {
  it("descrição, quantidade positiva até 4 casas e preço até 2, não negativo", () => {
    expect(errosLinha(l("Papel A4", "10", "2 500"), true)).toBeUndefined();
    expect(errosLinha(l("", "1", "1"), true)).toBe("Falta a descrição.");
    expect(errosLinha(l("x", "0", "1"), true)).toBe("Quantidade positiva (até 4 casas decimais).");
    expect(errosLinha(l("x", "1,23456", "1"), true)).toBe("Quantidade positiva (até 4 casas decimais).");
    expect(errosLinha(l("x", "1", "-1"), true)).toBe("Preço inválido (até 2 casas, não negativo).");
    // Na requisição o preço pode faltar (por cotar); na ordem não.
    expect(errosLinha(l("x", "1", ""), false)).toBeUndefined();
    expect(errosLinha(l("x", "1", ""), true)).toBe("Falta o preço.");
  });
  it("total em Big, arredondado ao cêntimo por linha; linhas em branco ignoradas", () => {
    expect(totalLinhas([l("a", "0,1", "0,2"), l("b", "3", "0,1")]).toFixed(2)).toBe("0.32");
    expect(totalLinhas([l("a", "1,5", "33,33")]).toFixed(2)).toBe("50.00");
    expect(linhasParaApi([l("Papel", "2,5", "1 000"), l("", "1", "")])).toEqual([{ description: "Papel", quantity: "2.5", preco: "1000.00" }]);
  });
});

describe("requisição", () => {
  it("justificação e pelo menos uma linha", () => {
    const e = errosRequisicao({ justificacao: " ", linhas: [l("", "1", "")] });
    expect(e.justificacao).toBe("Diga o que se pretende comprar e porquê: é o que quem decide vai ler.");
    expect(e.linhas).toBe("Indique pelo menos uma linha.");
    expect(temErros(e)).toBe(true);
    expect(temErros(errosRequisicao({ justificacao: "Papel para o trimestre", linhas: [l("Papel", "10", "")] }))).toBe(false);
  });
});

describe("ordem de compra", () => {
  const base = { fornecedor: "f", emissao: "2026-10-17", esperada: "", linhas: [l("Papel", "10", "2500")], disponivel: new Big(25000) };
  it("fornecedor, entrega não antes da emissão, sem passar o disponível", () => {
    expect(temErros(errosOrdem(base))).toBe(false);
    expect(errosOrdem({ ...base, fornecedor: "" }).fornecedor).toBe("Escolha o fornecedor.");
    expect(errosOrdem({ ...base, esperada: "2026-10-16" }).esperada).toBe("A entrega esperada não pode ser anterior à emissão.");
    expect(errosOrdem({ ...base, linhas: [l("Papel", "10", "2500,01")] }).total).toMatch(/^Passa o valor aprovado/);
  });
});

describe("recepção", () => {
  it("uma quantidade por linha, sem passar o que falta; pelo menos uma", () => {
    expect(errosRecepcao([{ quantidade: "4", falta: new Big(4) }, { quantidade: "", falta: new Big(2) }])).toEqual({ porLinha: {} });
    expect(errosRecepcao([{ quantidade: "5", falta: new Big(4) }]).porLinha).toEqual({ 0: "Passa o que falta receber desta linha." });
    expect(errosRecepcao([{ quantidade: "0", falta: new Big(4) }]).linhas).toBe("Indique pelo menos uma quantidade recebida.");
  });
});
