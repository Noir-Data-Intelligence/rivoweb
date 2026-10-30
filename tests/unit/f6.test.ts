import Big from "big.js";
import { describe, expect, it } from "vitest";
import { janelaDoPeriodo, janelasDoAno, problemaLancamento, regraEquilibra, somarHistorico, totaisLancamento } from "@/features/contabilidade/regras";
import { tipoImposto } from "@/features/fiscal/api";
import { ordenarVersoes, problemaEscaloes, versaoEmVigor, versaoSobreposta } from "@/features/fiscal/regras";
import { mensagemErro } from "@/lib/api/mensagens";
import { ApiError } from "@/lib/api/problem";

const B = (v: string) => new Big(v);
const v = (de: string, ate: string | null) => ({ effectiveFrom: de, effectiveTo: ate });

describe("versões fiscais", () => {
  const versoes = [v("2019-10-01", "2025-12-31"), v("2026-01-01", null)];
  it("encontra a versão em vigor numa data, incluindo os extremos", () => {
    expect(versaoEmVigor(versoes, "2025-12-31")).toBe(versoes[0]);
    expect(versaoEmVigor(versoes, "2026-01-01")).toBe(versoes[1]);
    expect(versaoEmVigor(versoes, "2019-09-30")).toBeUndefined();
  });
  it("avisa da sobreposição como o servidor (uma versão sem fim cobre tudo para a frente)", () => {
    expect(versaoSobreposta(versoes, "2027-01-01", null)).toBe(versoes[1]);
    expect(versaoSobreposta([v("2019-10-01", "2025-12-31")], "2026-01-01", null)).toBeUndefined();
    expect(versaoSobreposta([v("2019-10-01", "2025-12-31")], "2018-01-01", "2019-10-01")).toBeDefined();
  });
  it("ordena da mais recente para a mais antiga", () => {
    expect(ordenarVersoes(versoes).map((x) => x.effectiveFrom)).toEqual(["2026-01-01", "2019-10-01"]);
  });
  it("lê o tipo de imposto como número ou como nome", () => {
    expect(tipoImposto(0)?.texto).toBe("IVA");
    expect(tipoImposto("EmployerSocialSecurity")?.texto).toBe("INSS patronal");
    expect(tipoImposto(9)).toBeUndefined();
  });
});

describe("escalões do IRT (regras de IncomeTaxSchedule)", () => {
  const e = (limiar: string, parcela: string, taxa: string) => ({ limiar: B(limiar), parcela: B(parcela), taxa: B(taxa) });
  it("aceita uma tabela que começa em zero, sem limiares repetidos, em qualquer ordem", () => {
    expect(problemaEscaloes([e("150000", "12500", "16"), e("0", "0", "0")])).toBeNull();
  });
  it("recusa o que o servidor recusa", () => {
    expect(problemaEscaloes([])).toMatch(/pelo menos um escalão/);
    expect(problemaEscaloes([e("100", "0", "10")])).toMatch(/começar em zero/);
    expect(problemaEscaloes([e("0", "0", "0"), e("0", "1", "2")])).toMatch(/mesmo limiar/);
    expect(problemaEscaloes([e("0", "0", "100.5")])).toMatch(/entre 0 e 100/);
    expect(problemaEscaloes([e("0", "-1", "0")])).toMatch(/parcela fixa/);
    expect(problemaEscaloes([{ limiar: null, parcela: B("0"), taxa: B("0") }])).toMatch(/Preencha/);
  });
  it("compara limiares com Big (sem perder cêntimos)", () => {
    expect(problemaEscaloes([e("0", "0", "0"), e("1000000000000.01", "0", "1"), e("1000000000000.02", "0", "2")])).toBeNull();
  });
});

describe("lançamento em partida dobrada", () => {
  const l = (lado: "Debit" | "Credit", valor: string | null, conta = "11", descricao = "x") => ({ lado, valor: valor === null ? null : B(valor), conta, descricao });
  it("soma débitos e créditos em Big", () => {
    const t = totaisLancamento([l("Debit", "0.1"), l("Debit", "0.2"), l("Credit", "0.3")]);
    expect(t.debito.toFixed(2)).toBe("0.30");
    expect(t.diferenca.eq(0)).toBe(true);
  });
  it("só passa equilibrado, com linhas dos dois lados, contas e descrições", () => {
    expect(problemaLancamento([l("Debit", "100"), l("Credit", "100")])).toBeNull();
    expect(problemaLancamento([l("Debit", "100")])).toMatch(/duas linhas/);
    expect(problemaLancamento([l("Debit", "100"), l("Credit", "99.99")])).toMatch(/igualar/);
    expect(problemaLancamento([l("Debit", "100"), l("Debit", "100")])).toMatch(/débito e a crédito/);
    expect(problemaLancamento([l("Debit", "100", ""), l("Credit", "100")])).toMatch(/conta/);
    expect(problemaLancamento([l("Debit", "0"), l("Credit", "0")])).toMatch(/maior que zero/);
    expect(problemaLancamento([l("Debit", "100", "11", " "), l("Credit", "100")])).toMatch(/descrição/);
  });
});

describe("equilíbrio simbólico das regras (PostingRule.EnsureBalances)", () => {
  it("total contra líquido mais imposto equilibra", () => {
    expect(regraEquilibra([{ lado: "Debit", parcela: "Gross" }, { lado: "Credit", parcela: "Net" }, { lado: "Credit", parcela: "Tax" }])).toBe(true);
  });
  it("total contra só o líquido não equilibra", () => {
    expect(regraEquilibra([{ lado: "Debit", parcela: "Gross" }, { lado: "Credit", parcela: "Net" }])).toBe(false);
  });
  it("precisa de linhas dos dois lados", () => {
    expect(regraEquilibra([{ lado: "Debit", parcela: "Net" }])).toBe(false);
    expect(regraEquilibra([])).toBe(false);
  });
});

describe("janela de um período", () => {
  it("mês com o último dia certo, incluindo Fevereiro bissexto", () => {
    expect(janelaDoPeriodo(2026, 2)).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
    expect(janelaDoPeriodo(2028, 2)).toEqual({ de: "2028-02-01", ate: "2028-02-29" });
    expect(janelaDoPeriodo(2026, 12)).toEqual({ de: "2026-12-01", ate: "2026-12-31" });
  });
  it("ano inteiro", () => {
    expect(janelaDoPeriodo(2026, null)).toEqual({ de: "2026-01-01", ate: "2026-12-31" });
  });
});

describe("404 com detalhe do servidor", () => {
  it("mostra o que não foi encontrado quando o servidor diz", () => {
    const e = new ApiError({ tipo: "http", status: 404, detail: "Diário não encontrado." });
    expect(mensagemErro(e).detalhe).toBe("Diário não encontrado.");
    expect(mensagemErro(new ApiError({ tipo: "http", status: 404 })).detalhe).toBeNull();
  });
});

describe("lançar o histórico (PGC)", () => {
  it("o ano mês a mês até ao mês corrente, nunca no futuro", () => {
    expect(janelasDoAno(2025, "2026-10-30")).toHaveLength(12);
    expect(janelasDoAno(2026, "2026-10-30").map((j) => j.de)).toEqual(Array.from({ length: 10 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}-01`));
    expect(janelasDoAno(2026, "2026-10-30")[1]).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
    expect(janelasDoAno(2027, "2026-10-30")).toEqual([]);
  });

  it("soma os meses: totais, por tipo e os problemas de todos", () => {
    const vazio = { posted: 0, alreadyPosted: 0, cancelled: 0, withoutRule: 0, postedByKind: {}, problems: [] };
    const s = somarHistorico([
      { ...vazio, posted: 3, alreadyPosted: "2", postedByKind: { SalesInvoice: 2, Receipt: "1" }, problems: [{ document: "FT A/1", date: "2025-10-03", error: "Sem câmbio" }] },
      { ...vazio, posted: "1", cancelled: 1, withoutRule: 4, postedByKind: { SalesInvoice: 1 } },
    ]);
    expect(s).toEqual({ lancados: 4, jaLancados: 2, anulados: 1, semRegra: 4, porTipo: { SalesInvoice: 3, Receipt: 1 }, problemas: [{ document: "FT A/1", date: "2025-10-03", error: "Sem câmbio" }] });
  });
});
