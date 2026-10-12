import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { descarregar } from "@/lib/api/download";
import { mensagemErro } from "@/lib/api/mensagens";
import { ApiError } from "@/lib/api/problem";
import { msDesdeUltimoPedido } from "@/lib/auth/actividade";
import { iniciarSessao, motivoUltimoFim, obterToken, terminarSessaoLocal } from "@/lib/auth/session";
import { gravarPrefs, lerPrefs } from "@/lib/prefs";

type Chamada = { url: string; metodo: string; auth: string | null };
let chamadas: Chamada[] = [];

function responder(r: () => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string, init?: RequestInit) => {
      const req = input instanceof Request ? input : new Request(input, init);
      chamadas.push({ url: req.url, metodo: req.method, auth: req.headers.get("Authorization") });
      return r();
    }),
  );
}

const json = (corpo: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json", ...headers } });

beforeEach(() => {
  chamadas = [];
  iniciarSessao({ accessToken: "tok", expiresAt: "2099-01-01T00:00:00Z", idleTimeoutSeconds: 900 });
});
afterEach(() => {
  terminarSessaoLocal("saiu");
  vi.unstubAllGlobals();
});

describe("cliente HTTP (§2)", () => {
  it("junta o token só nos pedidos à API (S2) e reinicia o relógio", async () => {
    responder(() => json({ status: "ok", database: "up" }));
    await ler(api.GET("/health"));
    expect(chamadas[0]).toMatchObject({ url: "https://api.teste/health", auth: "Bearer tok" });
    expect(msDesdeUltimoPedido()).toBeLessThan(1000);
  });

  it("401 com WWW-Authenticate termina a sessão (S3)", async () => {
    responder(() => new Response(null, { status: 401, headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' } }));
    await expect(ler(api.GET("/identity/me"))).rejects.toBeInstanceOf(ApiError);
    expect(obterToken()).toBeNull();
    expect(motivoUltimoFim()).toBe("terminada");
  });

  it("401 no login é credencial errada, não fim de sessão", async () => {
    responder(() => new Response(null, { status: 401, headers: { "WWW-Authenticate": "Bearer" } }));
    await expect(ler(api.POST("/identity/login", { body: { email: "a@b.ao", password: "x" } }))).rejects.toMatchObject({ status: 401 });
    expect(obterToken()).toBe("tok");
  });

  it("Problem Details vira ApiError com campos", async () => {
    responder(() => json({ title: "Inválido", errors: { newPassword: ["curta"] } }, 400, { "Content-Type": "application/problem+json" }));
    const e = await enviar(api.POST("/identity/me/password", { body: { currentPassword: "a", newPassword: "b" } })).catch((x: unknown) => x);
    expect(e).toMatchObject({ status: 400, title: "Inválido", errors: { newPassword: ["curta"] } });
  });

  it("falha de rede e tempo esgotado", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(ler(api.GET("/health"))).rejects.toMatchObject({ tipo: "rede", status: 0 });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("t", "TimeoutError"); }));
    await expect(ler(api.GET("/health"))).rejects.toMatchObject({ tipo: "tempo" });
  });

  it("204 e paginação por cabeçalhos", async () => {
    responder(() => new Response(null, { status: 204 }));
    expect(await enviar(api.POST("/identity/logout"))).toEqual({ status: 204 });
    responder(() => json([], 200, { "X-Page": "3", "X-Page-Size": "25", "X-Total-Count": "51" }));
    const p = await lerPagina(api.GET("/identity/me/sessions") as never);
    expect(p).toMatchObject({ page: 3, pageSize: 25, total: 51 });
  });
});

describe("mensagens de erro (§2.2, S27)", () => {
  it.each([
    [400, "Há dados por corrigir."],
    [403, "Não pode fazer isto."],
    [404, "Não encontrado, ou não tem acesso."],
    [413, "Ficheiro grande de mais."],
    [415, "Este tipo de ficheiro não é aceite."],
    [429, "Limite de pedidos atingido."],
    [501, "Esta funcionalidade não está configurada."],
    [503, "Sem ligação ao servidor."],
    [500, "Ocorreu um erro no servidor."],
  ])("%i", (status, titulo) => {
    expect(mensagemErro(new ApiError({ tipo: "http", status })).titulo).toBe(titulo);
  });
  it("só o traceId chega ao ecrã nos 5xx", () => {
    const m = mensagemErro(new ApiError({ tipo: "http", status: 500, detail: "System.NullReferenceException at…", traceId: "00-abc" }));
    expect(m).toEqual({ titulo: "Ocorreu um erro no servidor.", detalhe: null, codigoSuporte: "00-abc" });
  });
  it("429 sem Retry-After não inventa contagem", () => {
    expect(mensagemErro(new ApiError({ tipo: "http", status: 429 })).detalhe).toBe("Tente dentro de alguns minutos.");
    expect(mensagemErro(new ApiError({ tipo: "http", status: 429, retryAfterSeconds: 90 })).detalhe).toBe("Tente dentro de 2 min.");
  });
  it("rede, tempo, cancelamento e desconhecidos", () => {
    expect(mensagemErro(new ApiError({ tipo: "rede", status: 0 })).titulo).toBe("Sem ligação ao servidor.");
    expect(mensagemErro(new ApiError({ tipo: "tempo", status: 0 })).titulo).toContain("demorou");
    expect(mensagemErro(new DOMException("x", "AbortError")).titulo).toBe("Pedido cancelado.");
    expect(mensagemErro(new Error("x")).titulo).toBe("Ocorreu um erro inesperado.");
  });
});

describe("descargas (§2.5, S17)", () => {
  it("descarrega como anexo com nome sanitizado e revoga o blob", async () => {
    responder(() => new Response(new Blob(["%PDF"]), { status: 200 }));
    const criar = vi.fn(() => "blob:teste");
    const revogar = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: criar, revokeObjectURL: revogar }));
    let nome = "";
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      nome = this.download;
    });
    await descarregar("/finance/invoices/1/pdf", "FT 2026/17.pdf");
    expect(chamadas[0]?.auth).toBe("Bearer tok");
    expect(nome).toBe("FT 2026-17.pdf");
    expect(clicar).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(revogar).toHaveBeenCalledWith("blob:teste");
  });
  it("recusa caminhos externos e converte erros", async () => {
    await expect(descarregar("//evil/x", "a")).rejects.toThrow();
    responder(() => json({ detail: "Não é seu" }, 404));
    await expect(descarregar("/x", "a")).rejects.toMatchObject({ status: 404 });
  });
});

describe("preferências (§1.4)", () => {
  it("só tema e barra, com valores inválidos a cair na omissão", () => {
    localStorage.setItem("rivo.prefs", JSON.stringify({ tema: "roxo", barraColapsada: "sim", token: "x" }));
    expect(lerPrefs()).toEqual({ tema: "sistema", barraColapsada: false });
    gravarPrefs({ tema: "escuro" });
    expect(JSON.parse(localStorage.getItem("rivo.prefs") ?? "{}")).toEqual({ tema: "escuro", barraColapsada: false });
    localStorage.setItem("rivo.prefs", "{corrompido");
    expect(lerPrefs().tema).toBe("sistema");
  });
});
