import { describe, expect, it } from "vitest";
import "@/app/router";
import { rotaConhecida } from "@/app/rotasConhecidas";

describe("rotas conhecidas (S6)", () => {
  it("casa com as rotas da tabela e não com o 404", () => {
    expect(rotaConhecida("/")).toBe(true);
    expect(rotaConhecida("/conta")).toBe(true);
    expect(rotaConhecida("/eu/conta")).toBe(true);
    expect(rotaConhecida("/cliente")).toBe(true);
    expect(rotaConhecida("/nao-existe")).toBe(false);
  });
});
