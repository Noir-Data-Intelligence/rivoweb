/** Clientes (§5.4): lista, ficha, contactos e importação CSV. */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerComVersao, lerPagina, seVersao } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type ResumoCliente = S["CustomerListItem"];
export type FichaCliente = S["CustomerDetailView"];
export type Contacto = S["CustomerContactView"];
export type PedidoContacto = S["ContactRequest"];
export type PedidoNovoCliente = S["RegisterCustomerRequest"];
export type PedidoCorrigirCliente = S["UpdateCustomerRequest"];
export type ResumoImportacao = S["CsvImportSummary"];

export const MAXIMO_POR_PAGINA = 200;

export const chaves = {
  todos: ["commercial", "customers"] as const,
  lista: (p: { pagina: number; tamanho: number; inactivos: boolean }) => ["commercial", "customers", "list", p.pagina, p.tamanho, p.inactivos] as const,
  ficha: (id: string) => ["commercial", "customers", "detail", id] as const,
  contactos: (id: string) => ["commercial", "customers", "detail", id, "contacts"] as const,
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

/** Importação CSV separado por vírgulas (`Nome,NIF,Morada,Cidade,Pais`, até 5 MB). Multipart, campo `file`. */
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
