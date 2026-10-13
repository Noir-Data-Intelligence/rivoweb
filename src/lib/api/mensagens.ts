/** Texto para a pessoa a partir de um erro (§2.2). Nunca mostra detalhe interno (S27). */
import { eApiError } from "./problem";

export type MensagemErro = { readonly titulo: string; readonly detalhe: string | null; readonly codigoSuporte: string | null };

export function mensagemErro(e: unknown): MensagemErro {
  if (e instanceof DOMException && e.name === "AbortError") {
    return { titulo: "Pedido cancelado.", detalhe: null, codigoSuporte: null };
  }
  if (!eApiError(e)) return { titulo: "Ocorreu um erro inesperado.", detalhe: null, codigoSuporte: null };
  if (e.tipo === "rede") return { titulo: "Sem ligação ao servidor.", detalhe: "Verifique a ligação e tente de novo.", codigoSuporte: null };
  if (e.tipo === "tempo") return { titulo: "O servidor demorou demasiado a responder.", detalhe: "Tente de novo.", codigoSuporte: null };
  const codigo = e.traceId;
  switch (e.status) {
    case 400: {
      // O título genérico do ASP.NET não diz nada; o motivo vem em `errors`.
      const motivos = Object.values(e.errors).flat().join(" ");
      const generico = !e.title || /validation errors occurred/i.test(e.title);
      return { titulo: generico ? "Há dados por corrigir." : (e.title as string), detalhe: e.detail ?? (motivos || null), codigoSuporte: null };
    }
    case 401:
      return { titulo: "A sessão terminou. Entre de novo.", detalhe: null, codigoSuporte: null };
    case 403:
      return { titulo: "Não pode fazer isto.", detalhe: e.detail ?? "Não tem permissão para esta acção.", codigoSuporte: null };
    case 404:
      return { titulo: "Não encontrado, ou não tem acesso.", detalhe: null, codigoSuporte: null };
    case 409:
      return { titulo: "Não foi possível concluir.", detalhe: e.detail ?? "O registo foi alterado entretanto. Recarregue e reveja.", codigoSuporte: null };
    case 413:
      return { titulo: "Ficheiro grande de mais.", detalhe: e.detail, codigoSuporte: null };
    case 415:
      return { titulo: "Este tipo de ficheiro não é aceite.", detalhe: e.detail, codigoSuporte: null };
    case 429:
      return {
        titulo: "Limite de pedidos atingido.",
        detalhe:
          e.retryAfterSeconds !== null
            ? `Tente dentro de ${Math.max(1, Math.ceil(e.retryAfterSeconds / 60))} min.`
            : "Tente dentro de alguns minutos.",
        codigoSuporte: null,
      };
    case 501:
      return { titulo: "Esta funcionalidade não está configurada.", detalhe: e.detail, codigoSuporte: null };
    case 503:
      return { titulo: "Sem ligação ao servidor.", detalhe: "O serviço está indisponível. Tente dentro de momentos.", codigoSuporte: codigo };
    default:
      if (e.status >= 500) return { titulo: "Ocorreu um erro no servidor.", detalhe: null, codigoSuporte: codigo };
      return { titulo: e.title ?? "Não foi possível concluir o pedido.", detalhe: e.detail, codigoSuporte: codigo };
  }
}
