import { describe, expect, it } from "vitest";
import { validarVoltar } from "@/lib/auth/returnTo";
import { celulaCsv, gerarCsv } from "@/lib/security/csv";
import { sanitizarNomeFicheiro } from "@/lib/security/filename";
import { urlSegura } from "@/lib/security/safeUrl";
import { normalizarTexto } from "@/lib/validation/text";

const ORIGEM = "https://rivo.exemplo";
const conhecida = (p: string) => ["/", "/conta", "/eu", "/eu/conta", "/cliente"].includes(p);

describe("validarVoltar (S6)", () => {
  it.each([
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "%2F%2Fevil.com",
    "/%2F%2Fevil.com",
    " /conta",
    "/conta\n",
    "/entrar",
    "/convite?u=1&t=2",
    "/nao-existe",
    "",
    null,
  ])("recusa %s", (v) => {
    expect(validarVoltar(v, ORIGEM, conhecida)).toBe("/");
  });

  it("aceita caminhos internos conhecidos, com query e hash", () => {
    expect(validarVoltar("/conta?x=1#a", ORIGEM, conhecida)).toBe("/conta?x=1#a");
    expect(validarVoltar("/eu/conta", ORIGEM, conhecida)).toBe("/eu/conta");
  });
});

describe("urlSegura (S12)", () => {
  it.each(["javascript:alert(1)", "data:text/html,x", "http://site.ao", "blob:https://a/b", "vbscript:x", " java\u0000script:x", ""])(
    "recusa %s",
    (v) => expect(urlSegura(v)).toBeNull(),
  );
  it("aceita https e mailto", () => {
    expect(urlSegura("https://site.ao/a")).toBe("https://site.ao/a");
    expect(urlSegura("mailto:geral@site.ao")).toBe("mailto:geral@site.ao");
  });
});

describe("CSV (S18)", () => {
  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\t=1", "\r=1"])("neutraliza %j", (v) => {
    expect(celulaCsv(v).replace(/^"/, "").startsWith("'")).toBe(true);
  });
  it("números ficam números, com vírgula", () => {
    expect(celulaCsv(-2.5)).toBe("-2,5");
  });
  it("aspas, separador e BOM", () => {
    expect(celulaCsv('a;"b"')).toBe('"a;""b"""');
    expect(gerarCsv([["a", 1]]).startsWith("﻿")).toBe(true);
  });
});

describe("sanitizarNomeFicheiro", () => {
  it("remove caminhos, controlos e invisíveis", () => {
    expect(sanitizarNomeFicheiro("../../FT 2026/17.pdf")).toBe("-..-FT 2026-17.pdf");
    expect(sanitizarNomeFicheiro("a‮fdp.exe")).toBe("afdp.exe");
    expect(sanitizarNomeFicheiro("CON")).toBe("ficheiro");
    expect(sanitizarNomeFicheiro("...")).toBe("ficheiro");
  });
});

describe("normalizarTexto (S23)", () => {
  it("NFC, invisíveis, bidi e controlos", () => {
    expect(normalizarTexto("  João​ ")).toBe("João");
    expect(normalizarTexto("a‮b\u0007c")).toBe("abc");
    expect(normalizarTexto("a\nb")).toBe("a b");
    expect(normalizarTexto("a\r\nb\u0000", true)).toBe("a\nb");
  });
});
