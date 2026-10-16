import { describe, expect, it } from "vitest";
import {
  diasDeCalendario,
  erroJanelaAssiduidade,
  erroJanelaTurnos,
  inicioDoMes,
  lerValorResultado,
  ordenarAnuncios,
  percentagemBarra,
  somarDias,
  validarFerias,
} from "@/features/portal/regras";
import type { Anuncio } from "@/features/portal/api";

describe("datas do portal", () => {
  it("conta os dias de calendário com os dois extremos, como calendarDays", () => {
    expect(diasDeCalendario("2026-11-22", "2026-12-01")).toBe(10);
    expect(diasDeCalendario("2026-10-16", "2026-10-16")).toBe(1);
    expect(diasDeCalendario("2028-02-28", "2028-03-01")).toBe(3);
    expect(diasDeCalendario("2026-10-17", "2026-10-16")).toBeNull();
    expect(diasDeCalendario("2026-02-30", "2026-03-01")).toBeNull();
  });
  it("soma dias e encontra o início do mês", () => {
    expect(somarDias("2026-10-16", 30)).toBe("2026-11-15");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(inicioDoMes("2026-10-16")).toBe("2026-10-01");
  });
  it("a janela dos turnos vai até 93 dias, como o servidor", () => {
    expect(erroJanelaTurnos("2026-10-16", somarDias("2026-10-16", 93))).toBeUndefined();
    expect(erroJanelaTurnos("2026-10-16", somarDias("2026-10-16", 94))).toBe("No máximo 93 dias.");
    expect(erroJanelaTurnos("2026-10-16", "2026-10-15")).toBe("A data final tem de ser igual ou posterior à inicial.");
    expect(erroJanelaTurnos("", "2026-10-15")).toBe("Indique as duas datas.");
  });
  it("a janela da assiduidade só recusa o fim antes do início", () => {
    expect(erroJanelaAssiduidade("2025-01-01", "2026-10-16")).toBeUndefined();
    expect(erroJanelaAssiduidade("2026-10-16", "2026-10-15")).toBe("A data final não pode ser anterior à inicial.");
  });
});

describe("pedido de férias", () => {
  it("exige tipo e datas, e o último dia não antes do primeiro", () => {
    expect(validarFerias({ tipo: "Annual", de: "2026-11-22", ate: "2026-12-01" })).toEqual({});
    expect(validarFerias({ tipo: "", de: "", ate: "" })).toEqual({ tipo: "Escolha o tipo.", de: "Indique o primeiro dia.", ate: "Indique o último dia." });
    expect(validarFerias({ tipo: "Sick", de: "2026-12-02", ate: "2026-12-01" })).toEqual({ ate: "O último dia não pode ser anterior ao primeiro." });
  });
});

describe("resultados-chave", () => {
  it("lê o valor em pt-AO, com até 4 casas, para texto da API", () => {
    expect(lerValorResultado("35")).toBe("35");
    expect(lerValorResultado("12,5")).toBe("12.5");
    expect(lerValorResultado("1 234,1234")).toBe("1234.1234");
    expect(lerValorResultado("1,23456")).toBeNull();
    expect(lerValorResultado("abc")).toBeNull();
  });
  it("a barra fica entre 0 e 100", () => {
    expect(percentagemBarra(35)).toBe(35);
    expect(percentagemBarra("120.5")).toBe(100);
    expect(percentagemBarra(-3)).toBe(0);
    expect(percentagemBarra("x")).toBe(0);
  });
});

describe("anúncios", () => {
  const a = (id: string, pinned: boolean, publishedAt: string): Anuncio => ({ announcementId: id, title: id, body: "", pinned, publishedAt, expiresAt: null });
  it("fixados primeiro, depois o mais recente", () => {
    const lista = [a("antigo", false, "2026-10-01T10:00:00Z"), a("fixo", true, "2026-09-01T10:00:00Z"), a("novo", false, "2026-10-10T10:00:00Z")];
    expect(ordenarAnuncios(lista).map((x) => x.announcementId)).toEqual(["fixo", "novo", "antigo"]);
  });
});
