/**
 * Apoio ao cliente, o lado da equipa (§5.13, F10): conversas e pedidos de
 * suporte do portal, e a base de conhecimento.
 *
 * Factos (`MessagingModuleEndpoints.cs`, `ManageConversations.cs`,
 * `KnowledgeBaseEndpoints.cs`, `ManageSupport.cs`, `KnowledgeArticle.cs`):
 * - conversas: ler com `messaging.conversations.read`, responder e fechar com
 *   `.write`; filtros `status` (0 Open, 1 Closed) e `kind` (0 Message,
 *   1 Ticket; o OpenAPI descreve-os como inteiros), paginadas; a conversa não diz o cliente (vem da lista); resposta até 4000
 *   caracteres; numa conversa fechada não se responde (409); fechar duas vezes
 *   dá 409;
 * - base de conhecimento: ler com `messaging.conversations.read` (todos os
 *   estados; abrir um artigo aqui não conta visualização), escrever com
 *   `messaging.knowledge_base.write`; título até 200, texto até 20 000,
 *   categoria até 100; o identificador (`slug`) gera-se do título se vier
 *   vazio e é único (409); audiência Internal, Customers ou Everyone; um
 *   artigo publicado corrige-se em vigor; arquivado não se corrige nem se
 *   publica.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";
import { normalizarTexto } from "@/lib/validation/normalizar";

type S = components["schemas"];
export type ResumoConversa = S["ConversationSummaryView"];
export type Artigo = S["KnowledgeArticleView"];
export type EstadoConversaFiltro = "Open" | "Closed";
export type TipoConversaFiltro = "Message" | "Ticket";
export type EstadoArtigo = "Draft" | "Published" | "Archived";

const CODIGO_ESTADO: Readonly<Record<EstadoConversaFiltro, number>> = {
  Open: 0,
  Closed: 1,
};
const CODIGO_TIPO: Readonly<Record<TipoConversaFiltro, number>> = {
  Message: 0,
  Ticket: 1,
};

export const MAXIMO_TITULO = 200;
export const MAXIMO_TEXTO = 20_000;
export const MAXIMO_CATEGORIA = 100;
export const MAXIMO_SLUG = 120;

export const ESTADOS_ARTIGO: Readonly<Record<EstadoArtigo, string>> = {
  Draft: "Rascunho",
  Published: "Publicado",
  Archived: "Arquivado",
};
export type Audiencia = "Customers" | "Everyone" | "Internal";
export const AUDIENCIAS: Readonly<Record<Audiencia, string>> = {
  Customers: "Clientes",
  Everyone: "Clientes e equipa",
  Internal: "Só a equipa",
};

export const chaves = {
  conversas: ["messaging", "conversations"] as const,
  conversa: (id: string) => ["messaging", "conversations", "detail", id] as const,
  artigos: ["messaging", "knowledge-base"] as const,
  artigo: (id: string) => ["messaging", "knowledge-base", "detail", id] as const,
};

// --- Conversas

export function useConversas(f: { estado: EstadoConversaFiltro | null; tipo: TipoConversaFiltro | null; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: [...chaves.conversas, "list", f],
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/messaging/conversations", {
          params: {
            query: {
              page: f.pagina,
              pageSize: f.tamanho,
              ...(f.estado ? { status: CODIGO_ESTADO[f.estado] } : {}),
              ...(f.tipo ? { kind: CODIGO_TIPO[f.tipo] } : {}),
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useConversa(id: string) {
  return useQuery({
    queryKey: chaves.conversa(id),
    queryFn: ({ signal }) =>
      ler(
        api.GET("/messaging/conversations/{conversationId}", {
          params: { path: { conversationId: id } },
          signal,
        }),
      ),
  });
}

export function useResponder(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (texto: string) =>
      ler(
        api.POST("/messaging/conversations/{conversationId}/messages", {
          params: { path: { conversationId: id } },
          body: { body: texto },
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.conversas }),
  });
}

export function useFecharConversa(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () =>
      enviar(
        api.POST("/messaging/conversations/{conversationId}/closure", {
          params: { path: { conversationId: id } },
        }),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.conversas }),
  });
}

// --- Base de conhecimento

export function useArtigosEquipa(f: { estado: EstadoArtigo | null; pesquisa: string; categoria: string }) {
  return useQuery({
    queryKey: [...chaves.artigos, "list", f],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/messaging/knowledge-base", {
          params: {
            query: {
              ...(f.estado ? { status: f.estado } : {}),
              ...(f.pesquisa ? { search: f.pesquisa } : {}),
              ...(f.categoria ? { category: f.categoria } : {}),
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useArtigoEquipa(id: string) {
  return useQuery({
    queryKey: chaves.artigo(id),
    queryFn: ({ signal }) =>
      ler(
        api.GET("/messaging/knowledge-base/{articleId}", {
          params: { path: { articleId: id } },
          signal,
        }),
      ),
  });
}

export function useGuardarArtigo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: async ({ id, corpo }: { id: string | null; corpo: S["KnowledgeArticleRequest"] }): Promise<string> => {
      if (id === null) return (await ler(api.POST("/messaging/knowledge-base", { body: corpo }))).articleId;
      await enviar(
        api.PUT("/messaging/knowledge-base/{articleId}", {
          params: { path: { articleId: id } },
          body: corpo,
        }),
      );
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.artigos }),
  });
}

export function useMudarEstadoArtigo(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (accao: "publicar" | "arquivar") =>
      enviar(
        accao === "publicar"
          ? api.POST("/messaging/knowledge-base/{articleId}/publication", {
              params: { path: { articleId: id } },
            })
          : api.POST("/messaging/knowledge-base/{articleId}/archive", {
              params: { path: { articleId: id } },
            }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.artigos }),
  });
}

export interface CamposArtigo {
  titulo: string;
  slug: string;
  categoria: string;
  audiencia: Audiencia;
  texto: string;
}

const limite = (t: string, max: number) => (t.length > max ? `No máximo ${max.toLocaleString("pt-PT")} caracteres.` : undefined);

export function errosArtigo(v: CamposArtigo) {
  const titulo = normalizarTexto(v.titulo);
  const texto = normalizarTexto(v.texto, true);
  const slug = v.slug.trim();
  return {
    titulo: titulo === "" ? "Indique o título." : limite(titulo, MAXIMO_TITULO),
    slug: slug !== "" && !/[a-z0-9]/i.test(slug) ? "Use letras ou algarismos." : limite(slug, MAXIMO_SLUG),
    categoria: limite(normalizarTexto(v.categoria), MAXIMO_CATEGORIA),
    texto: texto === "" ? "Escreva o texto." : limite(texto, MAXIMO_TEXTO),
  };
}

export function artigoParaApi(v: CamposArtigo): S["KnowledgeArticleRequest"] {
  const opc = (t: string) => (t === "" ? null : t);
  return {
    title: normalizarTexto(v.titulo),
    slug: opc(v.slug.trim()),
    body: normalizarTexto(v.texto, true),
    category: opc(normalizarTexto(v.categoria)),
    audience: v.audiencia,
  };
}
