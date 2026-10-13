import { describe, expect, it, vi } from "vitest";
import { aplicarErrosDoServidor, nomeDeCampo } from "@/lib/api/formulario";
import { seVersao } from "@/lib/api/client";
import { ApiError } from "@/lib/api/problem";
import { dataIsoDeInstante, formatarDataDeInstante, inicioDoDiaEmLuanda } from "@/lib/format/data";
import { contaProtegida, nomePerfil } from "@/features/administracao/perfis";

describe("erros do servidor → campos (§4.6)", () => {
  it("converte os nomes do servidor", () => {
    expect(nomeDeCampo("Lines[0].Quantity")).toBe("lines.0.quantity");
    expect(nomeDeCampo("NewPassword")).toBe("newPassword");
    expect(nomeDeCampo("email")).toBe("email");
  });

  it("coloca os erros nos campos, sem distinguir maiúsculas, e devolve os que sobram", () => {
    const setError = vi.fn();
    const erro = new ApiError({
      tipo: "http",
      status: 400,
      errors: { Email: ["E-mail repetido."], pedido: ["Nome em falta."], outro: ["Sem campo."] },
    });
    const soltas = aplicarErrosDoServidor(erro, setError, ["email", "fullName"] as const, { pedido: "fullName" });
    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "E-mail repetido." }, { shouldFocus: true });
    expect(setError).toHaveBeenCalledWith("fullName", { type: "server", message: "Nome em falta." }, { shouldFocus: false });
    expect(soltas).toEqual(["Sem campo."]);
  });

  it("ignora o que não é 400", () => {
    const setError = vi.fn();
    expect(aplicarErrosDoServidor(new ApiError({ tipo: "http", status: 409, detail: "x" }), setError, ["email"] as const)).toEqual([]);
    expect(aplicarErrosDoServidor(new Error("x"), setError, ["email"] as const)).toEqual([]);
    expect(setError).not.toHaveBeenCalled();
  });
});

describe("datas da F1 (D15)", () => {
  it("um instante mostra-se na data de Luanda", () => {
    // 23:30 UTC já é o dia seguinte em Luanda (UTC+1).
    expect(formatarDataDeInstante("2026-10-12T23:30:00Z")).toBe("13/10/2026");
    expect(dataIsoDeInstante("2026-10-12T23:30:00Z")).toBe("2026-10-13");
    expect(formatarDataDeInstante("lixo")).toBe("—");
  });

  it("uma data sobe como início do dia em Luanda", () => {
    expect(inicioDoDiaEmLuanda("2026-10-13")).toBe("2026-10-13T00:00:00+01:00");
    expect(() => inicioDoDiaEmLuanda("13/10/2026")).toThrow();
  });
});

describe("versão das edições (ADR-080)", () => {
  it("só envia If-Match com versão", () => {
    expect(seVersao('"3"')).toEqual({ "If-Match": '"3"' });
    expect(seVersao(null)).toEqual({});
    expect(seVersao(undefined)).toEqual({});
  });
});

describe("perfis (ADR-058, ADR-070)", () => {
  it("traduz os nomes conhecidos e deixa os outros como vêm", () => {
    expect(nomePerfil("HR")).toBe("Recursos Humanos");
    expect(nomePerfil("PerfilNovo")).toBe("PerfilNovo");
  });

  it("uma conta SuperAdmin só é gerível por um SuperAdmin", () => {
    expect(contaProtegida(["SuperAdmin"], false)).toBe(true);
    expect(contaProtegida(["SuperAdmin"], true)).toBe(false);
    expect(contaProtegida(["Admin"], false)).toBe(false);
  });
});
