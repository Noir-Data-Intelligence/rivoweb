/**
 * Descarga autenticada (§2.5): fetch com o token → Blob → <a download>. Nunca
 * iframe, window.open nem navegação para blob:.
 */
import { obterToken } from "@/lib/auth/session";
import { API_URL } from "@/lib/env";
import { sanitizarNomeFicheiro } from "@/lib/security/filename";
import { ApiError, paraApiError } from "./problem";

export async function descarregar(caminho: string, nomeSugerido: string, signal?: AbortSignal): Promise<void> {
  if (!caminho.startsWith("/") || caminho.startsWith("//")) throw new Error("Caminho inválido.");
  const token = obterToken();
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ApiError({ tipo: "rede", status: 0 });
  }
  if (!resposta.ok) {
    let corpo: unknown = null;
    try {
      corpo = await resposta.json();
    } catch {
      // corpo vazio ou não-JSON
    }
    throw paraApiError(resposta.status, corpo, resposta.headers);
  }
  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitizarNomeFicheiro(nomeSugerido);
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
