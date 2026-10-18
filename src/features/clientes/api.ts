/** Clientes (§5.4): lista, ficha, contactos e importação CSV. */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerComVersao, lerPagina, seVersao } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { normalizarTexto } from "@/lib/validation/normalizar";

type S = components["schemas"];
export type ResumoCliente = S["CustomerListItem"];
export type FichaCliente = S["CustomerDetailView"];
export type Contacto = S["CustomerContactView"];
export type PedidoContacto = S["ContactRequest"];
export type PedidoNovoCliente = S["RegisterCustomerRequest"];
export type PedidoCorrigirCliente = S["UpdateCustomerRequest"];
export type ResumoImportacao = S["CsvImportSummary"];
export type LigacaoConta = S["CustomerAccountLinkView"];
export type CandidataConta = S["CustomerAccountCandidate"];
export type Partilha = S["SharedDocumentView"];

export const MAXIMO_POR_PAGINA = 200;

export const chaves = {
  todos: ["commercial", "customers"] as const,
  lista: (p: { pagina: number; tamanho: number; inactivos: boolean }) => ["commercial", "customers", "list", p.pagina, p.tamanho, p.inactivos] as const,
  ficha: (id: string) => ["commercial", "customers", "detail", id] as const,
  contactos: (id: string) => ["commercial", "customers", "detail", id, "contacts"] as const,
  conta: (id: string) => ["commercial", "customers", "detail", id, "account-history"] as const,
  candidatas: ["commercial", "customers", "account-candidates"] as const,
  partilhas: (id: string) => ["commercial", "customers", "detail", id, "shared-documents"] as const,
};

export function useClientes(p: { pagina: number; tamanho: number; inactivos: boolean }, activo = true) {
  return useQuery({
    queryKey: chaves.lista(p),
    queryFn: ({ signal }) =>
      lerPagina(api.GET("/commercial/customers", { params: { query: { includeInactive: p.inactivos, page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Lista de apoio (escolher o cliente de um documento): só activos, até ao tecto do servidor. */
export const useClientesActivos = (activo = true) => useClientes({ pagina: 1, tamanho: MAXIMO_POR_PAGINA, inactivos: false }, activo);

export function useCliente(id: string) {
  return useQuery({
    queryKey: chaves.ficha(id),
    queryFn: ({ signal }) => lerComVersao(api.GET("/commercial/customers/{customerId}", { params: { path: { customerId: id } }, signal })),
  });
}

export function useRegistarCliente() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoNovoCliente) => ler(api.POST("/commercial/customers", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}

export function useCorrigirCliente(id: string, versao: string | null) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoCorrigirCliente) =>
      enviar(api.POST("/commercial/customers/{customerId}/details", { params: { path: { customerId: id } }, headers: seVersao(versao), body: b })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}

export function useEstadoCliente(id: string, versao: string | null) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (active: boolean) =>
      enviar(api.POST("/commercial/customers/{customerId}/status", { params: { path: { customerId: id } }, headers: seVersao(versao), body: { active } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}

/** Eliminar só passa sem história; com documentos, o servidor responde 409 e oferece-se desactivar. */
export function useEliminarCliente() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (id: string) => enviar(api.DELETE("/commercial/customers/{customerId}", { params: { path: { customerId: id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}

export function useContactos(id: string) {
  return useQuery({
    queryKey: chaves.contactos(id),
    queryFn: ({ signal }) => ler(api.GET("/commercial/customers/{customerId}/contacts", { params: { path: { customerId: id } }, signal })),
  });
}

export function useGuardarContacto(customerId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ contactId, corpo }: { contactId: string | null; corpo: PedidoContacto }) =>
      contactId
        ? enviar(api.PUT("/commercial/customers/{customerId}/contacts/{contactId}", { params: { path: { customerId, contactId } }, body: corpo }))
        : enviar(api.POST("/commercial/customers/{customerId}/contacts", { params: { path: { customerId } }, body: corpo })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.contactos(customerId) }),
  });
}

export function useRemoverContacto(customerId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (contactId: string) => enviar(api.DELETE("/commercial/customers/{customerId}/contacts/{contactId}", { params: { path: { customerId, contactId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.contactos(customerId) }),
  });
}

/** Importação CSV com `,` ou `;` (`Nome,NIF,Morada,Cidade,Pais`, até 5 MB; B18). Multipart, campo `file`. */
export function useImportarClientes() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: async (ficheiro: File) => {
      const corpo = new FormData();
      corpo.append("file", ficheiro, ficheiro.name);
      return ler(api.POST("/settings/import/customers", { body: corpo as never, bodySerializer: (b: unknown) => b as FormData }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.todos }),
  });
}

// --- Portal do cliente (F10): a conta ligada e os documentos partilhados.
//
// Factos (`CommercialModuleEndpoints.cs`, `ManageCustomers.cs`,
// `ManageRelationships.cs`, B33/ADR-087):
// - ligar e desligar pedem `commercial.customers.write`; recusa a própria conta,
//   uma conta inexistente, uma conta já ligada a outro cliente e um cliente que
//   já tem conta (409 `{erro}`); a ficha não diz a conta: está no histórico
//   (a ligação em vigor não tem `unlinkedOn`);
// - as contas por ligar (perfil Cliente, sem cliente) vêm de
//   `/commercial/customers/account-candidates`, com a mesma permissão;
// - partilhar pede um documento carregado em `/documents` por quem partilha
//   (ou qualquer um, com `documents.read`; outro dá 404); título até 200,
//   categoria até 100; o mesmo documento não se partilha duas vezes (409);
//   revogar deixa a partilha no histórico.

/** Categoria dos ficheiros carregados para partilhar (vê-se no arquivo). */
export const CATEGORIA_PARTILHA = "Partilhado com cliente";
export const MAXIMO_TITULO = 200;
export const MAXIMO_CATEGORIA = 100;

/** A ligação em vigor, se houver. */
export const contaLigada = (h: readonly LigacaoConta[] | undefined) => h?.find((l) => l.unlinkedOn === null) ?? null;

export function useHistoricoContaCliente(id: string) {
  return useQuery({ queryKey: chaves.conta(id), queryFn: ({ signal }) => ler(api.GET("/commercial/customers/{customerId}/account-history", { params: { path: { customerId: id } }, signal })) });
}

export function useContasPorLigar(activo: boolean) {
  return useQuery({ queryKey: chaves.candidatas, queryFn: ({ signal }) => ler(api.GET("/commercial/customers/account-candidates", { signal })), enabled: activo });
}

export function useLigarContaCliente(customerId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (userId: string) => enviar(api.POST("/commercial/customers/{customerId}/account", { params: { path: { customerId } }, body: { userId } })),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.conta(customerId) }), qc.invalidateQueries({ queryKey: chaves.candidatas })]),
  });
}

export function useDesligarContaCliente(customerId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => enviar(api.DELETE("/commercial/customers/{customerId}/account", { params: { path: { customerId } } })),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.conta(customerId) }), qc.invalidateQueries({ queryKey: chaves.candidatas })]),
  });
}

export function usePartilhas(id: string) {
  return useQuery({
    queryKey: chaves.partilhas(id),
    queryFn: ({ signal }) => ler(api.GET("/commercial/customers/{customerId}/shared-documents", { params: { path: { customerId: id }, query: { includeRevoked: true } }, signal })),
  });
}

export function usePartilhar(customerId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["ShareDocumentRequest"]) => ler(api.POST("/commercial/customers/{customerId}/shared-documents", { params: { path: { customerId } }, body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.partilhas(customerId) }),
  });
}

export function useRevogarPartilha(customerId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (shareId: string) => enviar(api.POST("/commercial/customers/{customerId}/shared-documents/{shareId}/revocation", { params: { path: { customerId, shareId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.partilhas(customerId) }),
  });
}

export function errosPartilha(v: { titulo: string; categoria: string; documento: { documentId: string } | null }) {
  const titulo = normalizarTexto(v.titulo);
  const categoria = normalizarTexto(v.categoria);
  return {
    documento: v.documento === null ? "Carregue o ficheiro." : undefined,
    titulo: titulo === "" ? "Dê um título ao documento." : titulo.length > MAXIMO_TITULO ? `No máximo ${String(MAXIMO_TITULO)} caracteres.` : undefined,
    categoria: categoria.length > MAXIMO_CATEGORIA ? `No máximo ${String(MAXIMO_CATEGORIA)} caracteres.` : undefined,
  };
}
