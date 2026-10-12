import { afterEach, describe, expect, it } from "vitest";
import { eFimDeSessao } from "@/lib/api/client";
import { lerPaginacao } from "@/lib/api/pagination";
import { eTransitorio, paraApiError } from "@/lib/api/problem";
import { avaliarRelogio } from "@/lib/auth/actividade";
import { pode, shellInicial } from "@/lib/auth/permissions";
import { iniciarSessao, motivoUltimoFim, obterToken, restaurarSessao, terminarSessaoLocal } from "@/lib/auth/session";

const login = (expira = "2099-01-01T00:00:00Z") => ({ accessToken: "tok", expiresAt: expira, idleTimeoutSeconds: "900" });

afterEach(() => {
  terminarSessaoLocal("saiu");
  sessionStorage.clear();
  localStorage.clear();
});

describe("sessão (S1, D3)", () => {
  it("guarda só em sessionStorage, nunca em localStorage", () => {
    iniciarSessao(login());
    expect(obterToken()).toBe("tok");
    expect(sessionStorage.getItem("rivo.sessao")).toContain("tok");
    expect(localStorage.length).toBe(0);
  });
  it("restaura depois do F5 e descarta sessões expiradas", () => {
    iniciarSessao(login());
    terminarSessaoLocalSemLimpar();
    expect(restaurarSessao()?.token).toBe("tok");
    sessionStorage.setItem("rivo.sessao", JSON.stringify({ token: "x", expiraEm: 1, inactividadeSegundos: 900 }));
    expect(restaurarSessao()).toBeNull();
    expect(sessionStorage.getItem("rivo.sessao")).toBeNull();
  });
  it("termina de forma idempotente e lembra o motivo", () => {
    iniciarSessao(login());
    terminarSessaoLocal("inactividade");
    terminarSessaoLocal("terminada");
    expect(obterToken()).toBeNull();
    expect(motivoUltimoFim()).toBe("inactividade");
  });
  it("recusa respostas de login inválidas", () => {
    expect(() => iniciarSessao(login("2000-01-01T00:00:00Z"))).toThrow();
  });
});

// Simula o F5: a memória perde-se, o sessionStorage fica.
function terminarSessaoLocalSemLimpar() {
  const guardado = sessionStorage.getItem("rivo.sessao");
  terminarSessaoLocal("saiu");
  if (guardado) sessionStorage.setItem("rivo.sessao", guardado);
}

describe("relógio de inactividade (S5)", () => {
  const base = { inactividadeSegundos: 900, agoraEpoch: 0, expiraEm: 10_000_000 };
  it("activa, aviso 2 min antes, fim", () => {
    expect(avaliarRelogio({ ...base, msDesdePedido: 0 }).fase).toBe("activa");
    expect(avaliarRelogio({ ...base, msDesdePedido: 13 * 60_000 + 1 }).fase).toBe("aviso-inactividade");
    expect(avaliarRelogio({ ...base, msDesdePedido: 15 * 60_000 }).fase).toBe("fim-inactividade");
  });
  it("prazo absoluto com 30 s de margem", () => {
    expect(avaliarRelogio({ ...base, msDesdePedido: 0, agoraEpoch: base.expiraEm - 30_000 }).fase).toBe("fim-expirada");
  });
});

describe("401 (§7.1)", () => {
  it("fim de sessão só com WWW-Authenticate ou sem corpo JSON", () => {
    expect(eFimDeSessao(new Response(null, { status: 401, headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' } }))).toBe(true);
    expect(eFimDeSessao(new Response(null, { status: 401 }))).toBe(true);
    expect(
      eFimDeSessao(new Response("{}", { status: 401, headers: { "Content-Type": "application/problem+json" } })),
    ).toBe(false);
    expect(eFimDeSessao(new Response(null, { status: 403 }))).toBe(false);
  });
});

describe("Problem Details (§2.2)", () => {
  it("lê RFC 9457, a forma antiga e corpo vazio", () => {
    const e = paraApiError(400, { title: "T", detail: "D", errors: { "Lines[0].Quantity": ["x"] }, traceId: "abc" }, new Headers());
    expect([e.title, e.detail, e.errors["Lines[0].Quantity"], e.traceId]).toEqual(["T", "D", ["x"], "abc"]);
    expect(paraApiError(409, { erro: "Duplicado" }, new Headers()).detail).toBe("Duplicado");
    expect(paraApiError(401, "", new Headers()).detail).toBeNull();
    expect(paraApiError(429, null, new Headers({ "Retry-After": "120" })).retryAfterSeconds).toBe(120);
  });
  it("só repete falhas transitórias, nunca 4xx (S30)", () => {
    expect(eTransitorio(paraApiError(503, null, new Headers()))).toBe(true);
    expect(eTransitorio(paraApiError(429, null, new Headers()))).toBe(false);
    expect(eTransitorio(paraApiError(400, null, new Headers()))).toBe(false);
  });
});

describe("paginação (ADR-068)", () => {
  it("lê os cabeçalhos", () => {
    const p = lerPaginacao([1, 2], new Headers({ "X-Page": "2", "X-Page-Size": "25", "X-Total-Count": "27" }));
    expect(p).toEqual({ items: [1, 2], page: 2, pageSize: 25, total: 27 });
  });
});

describe("permissões e shells (§3)", () => {
  const perms = new Set(["a", "b"]);
  it("pode", () => {
    expect(pode(perms, "a")).toBe(true);
    expect(pode(perms, { anyOf: ["x", "b"] })).toBe(true);
    expect(pode(perms, { allOf: ["a", "x"] })).toBe(false);
    expect(pode(new Set(), "autenticado")).toBe(true);
  });
  it("shell inicial", () => {
    expect(shellInicial(["Cliente"], ["documents.write"])).toBe("cliente");
    expect(shellInicial(["Finance"], ["finance.read"])).toBe("backoffice");
    expect(shellInicial(["Colaborador"], [])).toBe("colaborador");
  });
});
