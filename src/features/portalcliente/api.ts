/**
 * Portal do cliente (§5.11): o próprio, pelo token. Nenhuma rota aceita
 * `customerId` (S9); o 403 é sempre por falta de vínculo ao cliente (o shell
 * trata-o).
 *
 * Factos (`CustomerPortal*Endpoints.cs`, `Conversation.cs`): o resumo e o
 * extracto pedem um período; escrever uma mensagem cai na conversa aberta ou
 * abre outra (uma por cliente de cada vez); um ticket tem assunto e pode haver
 * vários abertos; só se avalia um ticket fechado, uma vez. **Ler um artigo
 * conta uma visualização** (`RecordView`): por isso não se volta a pedir
 * enquanto a página está aberta. O comprovativo carrega-se primeiro em
 * `POST /documents` (10 MB, 20 por 24 h) e o pedido leva o `documentId`.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { descarregar } from "@/lib/api/download";
import { api, enviar, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Resumo = S["MyOverviewView"];
export type FacturaCliente = S["CustomerInvoiceView"];
export type Extracto = S["CustomerStatementView"];
export type LinhaExtracto = S["CustomerStatementLine"];
export type Comprovativo = S["PaymentClaimView"];
export type Conversa = S["ConversationView"];
export type Mensagem = S["MessageView"];
export type Partilhado = S["CustomerDocumentShare"];
export type Ficheiro = S["DocumentDescriptor"];
export type ArtigoResumo = S["KnowledgeArticleSummary"];
export type Artigo = S["KnowledgeArticleView"];

const base = ["customer-portal", "me"] as const;
export const chaves = {
  resumo: (de: string, ate: string) => [...base, de, ate] as const,
  extracto: (de: string, ate: string) => [...base, "statement", de, ate] as const,
  comprovativos: [...base, "payment-claims"] as const,
  mensagens: [...base, "messages"] as const,
  tickets: [...base, "tickets"] as const,
  partilhados: [...base, "documents"] as const,
  ficheiros: ["documents", "me"] as const,
  artigos: (pesquisa: string, categoria: string) => [...base, "knowledge-base", pesquisa, categoria] as const,
  artigo: (idOuSlug: string) => [...base, "knowledge-base", "detail", idOuSlug] as const,
};

export function useResumo(de: string, ate: string, activo = true) {
  return useQuery({
    queryKey: chaves.resumo(de, ate),
    queryFn: ({ signal }) => ler(api.GET("/customer-portal/me", { params: { query: { from: de, to: ate } }, signal })),
    enabled: activo,
  });
}

export function useExtracto(de: string, ate: string, activo = true) {
  return useQuery({
    queryKey: chaves.extracto(de, ate),
    queryFn: ({ signal }) => ler(api.GET("/customer-portal/me/statement", { params: { query: { from: de, to: ate } }, signal })),
    enabled: activo,
  });
}

export function useComprovativos() {
  return useQuery({ queryKey: chaves.comprovativos, queryFn: ({ signal }) => ler(api.GET("/customer-portal/me/payment-claims", { signal })) });
}

export function useEnviarComprovativo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["SubmitPaymentProofRequest"]) => ler(api.POST("/customer-portal/me/payment-claims", { body: b })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.comprovativos }), qc.invalidateQueries({ queryKey: chaves.ficheiros })]),
  });
}

export function useMensagens() {
  return useQuery({ queryKey: chaves.mensagens, queryFn: ({ signal }) => ler(api.GET("/customer-portal/me/messages", { signal })) });
}

export function useEscreverMensagem() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (body: string) => ler(api.POST("/customer-portal/me/messages", { body: { body } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.mensagens }),
  });
}

export function useTickets() {
  return useQuery({ queryKey: chaves.tickets, queryFn: ({ signal }) => ler(api.GET("/customer-portal/me/tickets", { signal })) });
}

export function useAbrirTicket() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["OpenTicketRequest"]) => ler(api.POST("/customer-portal/me/tickets", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.tickets }),
  });
}

export function useResponderTicket() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      ler(api.POST("/customer-portal/me/tickets/{conversationId}/messages", { params: { path: { conversationId } }, body: { body } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.tickets }),
  });
}

export function useAvaliarTicket() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ conversationId, ...b }: { conversationId: string } & S["TicketRatingRequest"]) =>
      enviar(api.POST("/customer-portal/me/tickets/{conversationId}/rating", { params: { path: { conversationId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.tickets }),
  });
}

export function usePartilhados() {
  return useQuery({ queryKey: chaves.partilhados, queryFn: ({ signal }) => ler(api.GET("/customer-portal/me/documents", { signal })) });
}

export function useDescarregarPartilhado() {
  return useEscrita({
    mutationFn: (d: Pick<Partilhado, "shareId" | "fileName" | "title">) => descarregar(`/customer-portal/me/documents/${encodeURIComponent(d.shareId)}/content`, d.fileName ?? d.title),
  });
}

/** O que o próprio carregou (os comprovativos). */
export function useMeusFicheiros() {
  return useQuery({ queryKey: chaves.ficheiros, queryFn: ({ signal }) => ler(api.GET("/documents/me", { signal })) });
}

export function useDescarregarFicheiro() {
  return useEscrita({
    mutationFn: (d: Pick<Ficheiro, "documentId" | "fileName">) => descarregar(`/documents/me/${encodeURIComponent(d.documentId)}`, d.fileName),
  });
}

export function useArtigos(pesquisa: string, categoria: string) {
  return useQuery({
    queryKey: chaves.artigos(pesquisa, categoria),
    queryFn: ({ signal }) =>
      ler(api.GET("/customer-portal/me/knowledge-base", { params: { query: { ...(pesquisa ? { search: pesquisa } : {}), ...(categoria ? { category: categoria } : {}) } }, signal })),
  });
}

/** Cada pedido conta uma visualização: não se repete sozinho. */
export function useArtigo(idOuSlug: string) {
  return useQuery({
    queryKey: chaves.artigo(idOuSlug),
    queryFn: ({ signal }) => ler(api.GET("/customer-portal/me/knowledge-base/{idOrSlug}", { params: { path: { idOrSlug: idOuSlug } }, signal })),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useAvaliarArtigo() {
  return useEscrita({
    mutationFn: ({ articleId, helpful }: { articleId: string; helpful: boolean }) =>
      enviar(api.POST("/customer-portal/me/knowledge-base/{articleId}/feedback", { params: { path: { articleId } }, body: { helpful } })),
  });
}
