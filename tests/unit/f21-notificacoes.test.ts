import { describe, expect, it } from "vitest";
import { destinoDaAccao } from "@/features/notificacoes/accao";

describe("botão das notificações (ADR-142)", () => {
  const origem = "https://rivoweb-coral.vercel.app";
  it("na mesma origem, o caminho para o router (com a pesquisa e a âncora)", () => {
    expect(destinoDaAccao("https://rivoweb-coral.vercel.app/cliente/suporte/abc", origem)).toEqual({ tipo: "interno", caminho: "/cliente/suporte/abc" });
    expect(destinoDaAccao("https://rivoweb-coral.vercel.app/cliente/pagamentos?factura=1#x", origem)).toEqual({ tipo: "interno", caminho: "/cliente/pagamentos?factura=1#x" });
  });
  it("noutra origem, uma ligação normal", () => {
    expect(destinoDaAccao("https://outro.exemplo/cliente/suporte/abc", origem)).toEqual({ tipo: "externo", href: "https://outro.exemplo/cliente/suporte/abc" });
  });
  it("sem ligação, inválida ou com outro esquema: sem botão", () => {
    expect(destinoDaAccao(null, origem)).toBeNull();
    expect(destinoDaAccao(undefined, origem)).toBeNull();
    expect(destinoDaAccao("", origem)).toBeNull();
    expect(destinoDaAccao("/cliente/suporte/abc", origem)).toBeNull();
    expect(destinoDaAccao("javascript:alert(1)", origem)).toBeNull();
    expect(destinoDaAccao("data:text/html,x", origem)).toBeNull();
  });
});
