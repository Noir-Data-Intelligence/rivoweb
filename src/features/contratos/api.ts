/**
 * Contratos de clientes (§5.12, F11): registo, ciclo de vida, aditamentos e
 * anexos.
 *
 * Factos (`CrmEndpoints.cs`, `RelationshipEndpoints.cs`, `ManageCrm.cs` —
 * `ManageCustomerContracts` —, `ManageRelationships.cs`, `Crm.cs`,
 * `Relationships.cs`, `CommercialDbContext.cs`):
 * - ler com `commercial.contracts.read`, escrever com `.write`;
 * - registo: referência única (60, 409 se repetida), título (200), cliente,
 *   tipo Commercial ou Legal, início, fim opcional (não antes do início),
 *   valor ≥ 0 (sem valor, sem moeda; com valor e sem moeda, AOA), SLA de
 *   resposta e de resolução em horas > 0, aviso de renovação em dias ≥ 0,
 *   renovação automática, notas (4000); começa em rascunho;
 * - corrigir (`PUT`): tudo salvo a referência, o cliente e o tipo; enquanto
 *   não terminado; o `autoRenew` em falta vira `false`;
 * - activar um rascunho ou suspenso; suspender um activo; renovar estende o
 *   fim (tem de ser depois do actual); terminar exige o motivo (500), na data
 *   indicada (ou hoje); terminado não muda mais;
 * - aditamento: descrição (2000), data de efeito (ou hoje), soma ao valor e/ou
 *   muda o fim (pelo menos um), sem deixar o valor negativo; numerado; o
 *   contrato fica com os valores novos;
 * - anexo: um documento carregado em `/documents` e a categoria (60; vazia,
 *   «contrato»); a lista não traz o nome do ficheiro nem há como o descarregar
 *   pelo contrato (B37): só quem lê o arquivo o abre;
 * - a lista vem ordenada pelo fim (sem fim, no fim) e diz os dias até
 *   acabar; `expiringWithinDays` filtra os que acabam dentro desse prazo.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { descarregar } from "@/lib/api/download";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Contrato = S["CustomerContractView"];
export type PedidoContrato = S["ContractRequest"];
export type Aditamento = S["ContractAmendmentView"];
export type Anexo = S["ContractDocumentView"];
export type EstadoContrato = "Draft" | "Active" | "Suspended" | "Terminated";
export type TipoContrato = "Commercial" | "Legal";

export const ESTADOS_CONTRATO: Readonly<Record<EstadoContrato, string>> = { Draft: "Rascunho", Active: "Activo", Suspended: "Suspenso", Terminated: "Terminado" };
export const TIPOS_CONTRATO: Readonly<Record<TipoContrato, string>> = { Commercial: "Comercial", Legal: "Jurídico" };

const chaves = {
  contratos: ["commercial", "contracts"] as const,
  contrato: (id: string) => ["commercial", "contracts", "detail", id] as const,
};

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: chaves.contratos });
}

export function useContratosClientes(f: { estado: EstadoContrato | null; tipo: TipoContrato | null; aExpirar: number | null; cliente?: string }) {
  return useQuery({
    queryKey: [...chaves.contratos, "list", f],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/commercial/contracts", {
          params: {
            query: { ...(f.estado ? { status: f.estado } : {}), ...(f.tipo ? { kind: f.tipo } : {}), ...(f.aExpirar !== null ? { expiringWithinDays: f.aExpirar } : {}), ...(f.cliente ? { customerId: f.cliente } : {}) },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useContratoCliente(id: string) {
  return useQuery({ queryKey: chaves.contrato(id), queryFn: ({ signal }) => ler(api.GET("/commercial/contracts/{contractId}", { params: { path: { contractId: id } }, signal })) });
}

export function useAditamentos(id: string) {
  return useQuery({ queryKey: [...chaves.contrato(id), "amendments"], queryFn: ({ signal }) => ler(api.GET("/commercial/contracts/{contractId}/amendments", { params: { path: { contractId: id } }, signal })) });
}

export function useAnexos(id: string) {
  return useQuery({ queryKey: [...chaves.contrato(id), "documents"], queryFn: ({ signal }) => ler(api.GET("/commercial/contracts/{contractId}/documents", { params: { path: { contractId: id } }, signal })) });
}

export function useGuardarContrato() {
  const invalidar = useInvalidar();
  return useEscrita({
    mutationFn: async ({ id, corpo }: { id: string | null; corpo: PedidoContrato }): Promise<string> => {
      if (id === null) return (await ler(api.POST("/commercial/contracts", { body: corpo }))).contractId;
      await enviar(api.PUT("/commercial/contracts/{contractId}", { params: { path: { contractId: id } }, body: corpo }));
      return id;
    },
    onSuccess: invalidar,
  });
}

export function useCicloContrato(id: string) {
  const invalidar = useInvalidar();
  return useEscrita({
    mutationFn: (a: { accao: "activar" } | { accao: "suspender" } | { accao: "renovar"; fim: string } | { accao: "terminar"; em: string | null; motivo: string }) => {
      const path = { params: { path: { contractId: id } } };
      switch (a.accao) {
        case "activar":
          return enviar(api.POST("/commercial/contracts/{contractId}/activation", path));
        case "suspender":
          return enviar(api.POST("/commercial/contracts/{contractId}/suspension", path));
        case "renovar":
          return enviar(api.POST("/commercial/contracts/{contractId}/renewal", { ...path, body: { endsOn: a.fim } }));
        case "terminar":
          return enviar(api.POST("/commercial/contracts/{contractId}/termination", { ...path, body: { on: a.em, reason: a.motivo } }));
      }
    },
    onSuccess: invalidar,
  });
}

export function useAditar(id: string) {
  const invalidar = useInvalidar();
  return useEscrita({ mutationFn: (corpo: S["AmendmentRequest"]) => ler(api.POST("/commercial/contracts/{contractId}/amendments", { params: { path: { contractId: id } }, body: corpo })), onSuccess: invalidar });
}

export function useAnexar(id: string) {
  const invalidar = useInvalidar();
  return useEscrita({ mutationFn: (corpo: S["AttachRequest"]) => ler(api.POST("/commercial/contracts/{contractId}/documents", { params: { path: { contractId: id } }, body: corpo })), onSuccess: invalidar });
}

/** Só com `documents.read` (B37): pelo arquivo, sempre em anexo. */
export function useDescarregarAnexo() {
  return useEscrita({ mutationFn: (a: { documentId: string; nome: string }) => descarregar(`/documents/${encodeURIComponent(a.documentId)}`, a.nome) });
}

/** Nome do ficheiro anexado, pelo arquivo (`documents.read`, B37). */
export function useMetadadosDocumento(documentId: string) {
  return useQuery({ queryKey: ["documents", "metadata", documentId], queryFn: ({ signal }) => ler(api.GET("/documents/{documentId}/metadata", { params: { path: { documentId } }, signal })) });
}
