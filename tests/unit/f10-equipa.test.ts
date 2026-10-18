import { describe, expect, it } from "vitest";
import { artigoParaApi, errosArtigo, type CamposArtigo } from "@/features/apoio/api";
import { contaLigada, errosPartilha } from "@/features/clientes/api";
import { erroMotivo } from "@/features/comprovativos/api";

const artigo: CamposArtigo = { titulo: "  Como pagar  ", slug: "", categoria: "", audiencia: "Customers", texto: "Linha 1\n\nLinha 2  " };

describe("base de conhecimento", () => {
  it("título e texto obrigatórios, nos limites do servidor", () => {
    expect(errosArtigo(artigo)).toEqual({ titulo: undefined, slug: undefined, categoria: undefined, texto: undefined });
    expect(errosArtigo({ ...artigo, titulo: " ", texto: "" })).toMatchObject({ titulo: "Indique o título.", texto: "Escreva o texto." });
    expect(errosArtigo({ ...artigo, titulo: "x".repeat(201) }).titulo).toBe("No máximo 200 caracteres.");
    expect(errosArtigo({ ...artigo, texto: "x".repeat(20_001) }).texto).toMatch(/^No máximo 20.000 caracteres\.$/);
    expect(errosArtigo({ ...artigo, categoria: "x".repeat(101) }).categoria).toBe("No máximo 100 caracteres.");
  });
  it("o endereço pode ficar vazio, mas não só com símbolos", () => {
    expect(errosArtigo({ ...artigo, slug: "--" }).slug).toBe("Use letras ou algarismos.");
    expect(errosArtigo({ ...artigo, slug: "como-pagar" }).slug).toBeUndefined();
  });
  it("vai à API aparado, com as quebras de linha e os opcionais a null", () => {
    expect(artigoParaApi(artigo)).toEqual({ title: "Como pagar", slug: null, body: "Linha 1\n\nLinha 2", category: null, audience: "Customers" });
    expect(artigoParaApi({ ...artigo, slug: " guia ", categoria: " Pagamentos ", audiencia: "Internal" })).toMatchObject({ slug: "guia", category: "Pagamentos", audience: "Internal" });
  });
});

describe("comprovativos e portal na ficha do cliente", () => {
  it("rejeitar pede o motivo, até 500 caracteres", () => {
    expect(erroMotivo("   ")).toBe("Diga ao cliente porque rejeita.");
    expect(erroMotivo("x".repeat(501))).toBe("No máximo 500 caracteres.");
    expect(erroMotivo("O valor não confere.")).toBeUndefined();
  });
  it("partilhar pede o ficheiro carregado e o título", () => {
    expect(errosPartilha({ titulo: "", categoria: "", documento: null })).toEqual({ documento: "Carregue o ficheiro.", titulo: "Dê um título ao documento.", categoria: undefined });
    expect(errosPartilha({ titulo: "x".repeat(201), categoria: "y".repeat(101), documento: { documentId: "d" } })).toEqual({
      documento: undefined,
      titulo: "No máximo 200 caracteres.",
      categoria: "No máximo 100 caracteres.",
    });
  });
  it("a conta ligada é a ligação sem data de fim", () => {
    const h = [
      { userId: "u1", linkedOn: "2026-01-01T00:00:00Z", linkedByUserId: null, unlinkedOn: "2026-02-01T00:00:00Z", unlinkedByUserId: null },
      { userId: "u2", linkedOn: "2026-03-01T00:00:00Z", linkedByUserId: null, unlinkedOn: null, unlinkedByUserId: null },
    ];
    expect(contaLigada(h)?.userId).toBe("u2");
    expect(contaLigada(h.slice(0, 1))).toBeNull();
    expect(contaLigada(undefined)).toBeNull();
  });
});
