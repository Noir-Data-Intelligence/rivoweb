import Big from "big.js";
import { describe, expect, it } from "vitest";
import {
  conclusaoAdmissoes,
  conclusaoEquipas,
  conclusaoGanhas,
  conclusaoPipeline,
  conclusaoReceitaDespesa,
  mesesDaJanela,
  SEM_DADOS,
} from "@/features/dashboard/conclusoes";
import { podeFazerPolling, registarInteraccao, registarPedidoAutenticado } from "@/lib/auth/actividade";
import { janelaDe, lerAnoMes, lerPeriodo, mesCurto } from "@/lib/format/periodo";

const mes = (m: number, receita: string, despesa: string) => ({ ano: 2026, mes: m, receita: new Big(receita), despesa: new Big(despesa) });

describe("períodos do dashboard (D15)", () => {
  it("calcula as janelas a partir de hoje em Luanda", () => {
    expect(janelaDe("mes", "2026-10-13")).toEqual({ from: "2026-10-01", to: "2026-10-13" });
    expect(janelaDe("trimestre", "2026-10-13")).toEqual({ from: "2026-08-01", to: "2026-10-13" });
    expect(janelaDe("trimestre", "2026-02-10")).toEqual({ from: "2025-12-01", to: "2026-02-10" });
    expect(janelaDe("ano", "2026-10-13")).toEqual({ from: "2026-01-01", to: "2026-10-13" });
    expect(janelaDe("ano-anterior", "2026-10-13")).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("um período desconhecido no URL volta ao de omissão", () => {
    expect(lerPeriodo("lixo")).toBe("ano");
    expect(lerPeriodo(null)).toBe("ano");
    expect(lerPeriodo("mes")).toBe("mes");
  });

  it("meses da janela, incluindo os que não têm dados", () => {
    expect(mesesDaJanela("2025-11-01", "2026-02-10").map((m) => m.chave)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(lerAnoMes("2026-03")).toEqual({ ano: 2026, mes: 3 });
    expect(lerAnoMes("2026-13")).toBeNull();
    expect(mesCurto(2026, 3)).toBe("mar 2026");
  });
});

describe("títulos dos gráficos são conclusões (§4.5)", () => {
  it("receita e despesa", () => {
    expect(conclusaoReceitaDespesa([])).toBe(SEM_DADOS);
    expect(conclusaoReceitaDespesa([mes(1, "0", "0"), mes(2, "10", "5")])).toBe(SEM_DADOS);
    expect(conclusaoReceitaDespesa([mes(1, "10", "5"), mes(2, "10", "5")])).toBe("Receita acima da despesa em todos os meses com movimento");
    expect(conclusaoReceitaDespesa([mes(1, "1", "5"), mes(2, "1", "5"), mes(3, "10", "5"), mes(4, "10", "5")])).toBe("Receita acima da despesa desde Março");
    expect(conclusaoReceitaDespesa([mes(1, "10", "5"), mes(2, "1", "5"), mes(3, "10", "5")])).toBe("Receita voltou a superar a despesa em Março");
    expect(conclusaoReceitaDespesa([mes(1, "10", "5"), mes(2, "1", "5"), mes(3, "1", "5")])).toBe("Despesa acima da receita desde Fevereiro");
    expect(conclusaoReceitaDespesa([mes(1, "10", "5"), mes(2, "1", "5")])).toBe("Despesa superou a receita em Fevereiro");
    // Exactidão: 0,1 + 0,2 contra 0,3 não é «maior» por erro de vírgula flutuante.
    expect(conclusaoReceitaDespesa([mes(1, "0.3", "0.3"), mes(2, "0.3", "0.30")])).toBe("Despesa acima da receita em todos os meses com movimento");
  });

  it("admissões, equipas, pipeline e ganhas", () => {
    expect(conclusaoAdmissoes([{ month: "2026-01", count: 0 }])).toBe("Sem admissões no período");
    expect(conclusaoAdmissoes([{ month: "2026-01", count: 1 }])).toBe("1 admissão no período");
    expect(conclusaoAdmissoes([{ month: "2026-01", count: 1 }, { month: "2026-02", count: 3 }])).toBe("4 admissões no período, mais em Fevereiro");
    expect(conclusaoEquipas([])).toBe("Ainda não há colaboradores activos");
    expect(conclusaoEquipas([{ department: "Operações", count: 2 }])).toBe("Todos os colaboradores activos em Operações");
    expect(conclusaoEquipas([{ department: "Operações", count: 2 }, { department: "Finanças", count: 1 }])).toBe("Maior equipa: Operações (2 pessoas)");
    expect(conclusaoPipeline([], (s) => s)).toBe("Sem oportunidades em aberto");
    expect(conclusaoPipeline([{ stage: "Proposal", totalValue: new Big("10") }, { stage: "Negotiation", totalValue: new Big("20") }], (s) => (s === "Negotiation" ? "Negociação" : s))).toBe(
      "Maior valor em aberto na etapa Negociação",
    );
    expect(conclusaoGanhas([{ month: "2026-05", count: 0 }])).toBe("Sem oportunidades ganhas no período");
    expect(conclusaoGanhas([{ month: "2026-05", count: 2 }, { month: "2026-06", count: 1 }])).toBe("3 oportunidades ganhas, mais em mai 2026");
  });
});

describe("polling do sino (§5.3, ADR-067)", () => {
  it("só com o documento visível e interacção depois do último pedido", () => {
    expect(podeFazerPolling(true, true)).toBe(true);
    expect(podeFazerPolling(false, true)).toBe(false);
    expect(podeFazerPolling(true, false)).toBe(false);
  });

  it("um pedido sem interacção a seguir pára o polling: a sessão pode terminar", () => {
    registarInteraccao(1000);
    registarPedidoAutenticado(2000);
    expect(podeFazerPolling(true)).toBe(false);
    registarInteraccao(3000);
    expect(podeFazerPolling(true)).toBe(true);
  });
});
