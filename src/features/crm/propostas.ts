/**
 * Propostas comerciais e modelos (§5.12, F11).
 *
 * Factos (`CrmEndpoints.cs`, `ManageCrm.cs` — `ManageProposals`,
 * `ManageCrmCatalogue` —, `Crm.cs`, `CommercialDbContext.cs`):
 * - ler com `commercial.crm.read`, escrever com `commercial.crm.write`;
 * - proposta: título (200), a um cliente ou a um lead, oportunidade opcional,
 *   moeda (não muda depois), validade, texto e notas (2000, saem no PDF); número
 *   `PROP-AAAAMMDD-XXXXXX`; com modelo e sem texto, o texto vem do modelo com
 *   `{{cliente}}`, `{{titulo}}`, `{{validade}}` e `{{data}}` substituídos;
 *   a lista vem das mais recentes para as mais antigas;
 * - só o rascunho se corrige (título, validade, texto, notas) e muda de
 *   linhas; linha: descrição (500; com tipo de serviço e sem descrição, a do
 *   tipo), quantidade > 0 (4 casas), preço ≥ 0 (2 casas; com tipo de serviço e
 *   sem preço, o do tipo), desconto 0–100 (2 casas; a posição repete-se
 *   depois de tirar uma linha, B36); total = quantidade ×
 *   preço × (1 − desconto), arredondado a 2 casas (metade para cima);
 * - enviar exige linhas; aceitar ou recusar só a enviada, com notas
 *   opcionais (2000);
 * - cada correcção e cada envio deixam uma versão (fotografia em JSON: título,
 *   texto, linhas, total);
 * - o PDF compõe-se a pedido e não fica guardado (não é documento fiscal): o
 *   `GET …/document` não tem efeitos;
 * - modelo: nome (200) e texto obrigatórios; desactivado não aparece para
 *   propostas novas.
 */
import Big from "big.js";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { descarregar } from "@/lib/api/download";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";
import { lerDecimalDigitado, lerDinheiroDigitado, paraApi, decimalParaApi, type Dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";

type S = components["schemas"];
export type Proposta = S["ProposalView"];
export type LinhaProposta = S["ProposalLineView"];
export type Modelo = S["ProposalTemplateView"];
export type VersaoProposta = S["ProposalVersionView"];
export type EstadoProposta = "Draft" | "Sent" | "Accepted" | "Rejected";

export const ESTADOS_PROPOSTA: Readonly<Record<EstadoProposta, string>> = { Draft: "Rascunho", Sent: "Enviada", Accepted: "Aceite", Rejected: "Recusada" };

const chaves = {
  propostas: ["commercial", "crm", "proposals"] as const,
  proposta: (id: string) => ["commercial", "crm", "proposals", "detail", id] as const,
  modelos: ["commercial", "crm", "proposal-templates"] as const,
};

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["commercial", "crm"] });
}

export function usePropostas(f: { estado: EstadoProposta | null; cliente?: string; oportunidade?: string }) {
  return useQuery({
    queryKey: [...chaves.propostas, "list", f],
    queryFn: ({ signal }) =>
      ler(
        api.GET("/commercial/proposals", {
          params: { query: { ...(f.estado ? { status: f.estado } : {}), ...(f.cliente ? { customerId: f.cliente } : {}), ...(f.oportunidade ? { opportunityId: f.oportunidade } : {}) } },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useProposta(id: string) {
  return useQuery({ queryKey: chaves.proposta(id), queryFn: ({ signal }) => ler(api.GET("/commercial/proposals/{proposalId}", { params: { path: { proposalId: id } }, signal })) });
}

export function useVersoes(id: string) {
  return useQuery({
    queryKey: [...chaves.proposta(id), "versions"],
    queryFn: ({ signal }) => ler(api.GET("/commercial/proposals/{proposalId}/versions", { params: { path: { proposalId: id } }, signal })),
  });
}

export function useGuardarProposta() {
  const invalidar = useInvalidar();
  return useEscrita({
    mutationFn: async ({ id, corpo }: { id: string | null; corpo: S["ProposalRequest"] }): Promise<string> => {
      if (id === null) return (await ler(api.POST("/commercial/proposals", { body: corpo }))).proposalId;
      await enviar(api.PUT("/commercial/proposals/{proposalId}", { params: { path: { proposalId: id } }, body: corpo }));
      return id;
    },
    onSuccess: invalidar,
  });
}

export function useAcrescentarLinha(id: string) {
  const invalidar = useInvalidar();
  return useEscrita({ mutationFn: (corpo: S["ProposalLineRequest"]) => ler(api.POST("/commercial/proposals/{proposalId}/lines", { params: { path: { proposalId: id } }, body: corpo })), onSuccess: invalidar });
}

export function useTirarLinha(id: string) {
  const invalidar = useInvalidar();
  return useEscrita({
    mutationFn: (lineId: string) => enviar(api.DELETE("/commercial/proposals/{proposalId}/lines/{lineId}", { params: { path: { proposalId: id, lineId } } })),
    onSuccess: invalidar,
  });
}

export function useAcaoProposta(id: string) {
  const invalidar = useInvalidar();
  return useEscrita({
    mutationFn: ({ accao, notas }: { accao: "enviar" | "aceitar" | "recusar"; notas?: string | null }) => {
      const path = { params: { path: { proposalId: id } } };
      if (accao === "enviar") return enviar(api.POST("/commercial/proposals/{proposalId}/sending", path));
      const body = { notes: notas ?? null };
      return accao === "aceitar"
        ? enviar(api.POST("/commercial/proposals/{proposalId}/acceptance", { ...path, body }))
        : enviar(api.POST("/commercial/proposals/{proposalId}/rejection", { ...path, body }));
    },
    onSuccess: invalidar,
  });
}

export function useDescarregarProposta() {
  return useEscrita({ mutationFn: (p: Pick<Proposta, "proposalId" | "number">) => descarregar(`/commercial/proposals/${encodeURIComponent(p.proposalId)}/document`, `${p.number}.pdf`) });
}

export function useModelos(inactivos: boolean, activo = true) {
  return useQuery({
    queryKey: [...chaves.modelos, inactivos],
    queryFn: ({ signal }) => ler(api.GET("/commercial/proposal-templates", { params: { query: { includeInactive: inactivos } }, signal })),
    enabled: activo,
  });
}

export function useGuardarModelo() {
  const invalidar = useInvalidar();
  return useEscrita({
    mutationFn: async ({ id, corpo }: { id: string | null; corpo: S["TemplateRequest"] }) => {
      if (id === null) await ler(api.POST("/commercial/proposal-templates", { body: corpo }));
      else await enviar(api.PUT("/commercial/proposal-templates/{templateId}", { params: { path: { templateId: id } }, body: corpo }));
    },
    onSuccess: invalidar,
  });
}

// --- Regras

const max = (t: string, n: number) => (t.length > n ? `No máximo ${n.toLocaleString("pt-PT")} caracteres.` : undefined);
const opc = (t: string, multilinha = false) => {
  const v = normalizarTexto(t, multilinha);
  return v === "" ? null : v;
};

export interface CamposProposta {
  titulo: string;
  para: "cliente" | "lead";
  cliente: string;
  lead: string;
  oportunidade: string;
  moeda: string;
  validade: string;
  modelo: string;
  texto: string;
  notas: string;
}

export function errosProposta(v: CamposProposta, nova: boolean, hoje: string) {
  const titulo = normalizarTexto(v.titulo);
  return {
    titulo: titulo === "" ? "Indique o título." : max(titulo, 200),
    cliente: nova && v.para === "cliente" && v.cliente === "" ? "Escolha o cliente." : undefined,
    lead: nova && v.para === "lead" && v.lead === "" ? "Escolha o lead." : undefined,
    validade: v.validade !== "" && !IsoDate.safeParse(v.validade).success ? "Data inválida." : nova && v.validade !== "" && v.validade < hoje ? "A validade não pode ser passada." : undefined,
    notas: max(normalizarTexto(v.notas, true), 2000),
  };
}

/** Ao corrigir, o servidor só muda título, validade, texto e notas; o resto vai como estava. */
export function propostaParaApi(v: CamposProposta, original?: Proposta): S["ProposalRequest"] {
  return {
    title: normalizarTexto(v.titulo),
    customerId: original ? original.customerId : v.para === "cliente" ? v.cliente : null,
    leadId: original ? original.leadId : v.para === "lead" ? v.lead : null,
    opportunityId: original ? original.opportunityId : v.oportunidade === "" ? null : v.oportunidade,
    currency: original ? original.currency : v.moeda,
    validUntil: v.validade === "" ? null : v.validade,
    templateId: original || v.modelo === "" ? null : v.modelo,
    body: opc(v.texto, true),
    notes: opc(v.notas, true),
  };
}

export interface CamposLinha {
  servico: string;
  descricao: string;
  quantidade: string;
  preco: string;
  desconto: string;
}

export function errosLinha(v: CamposLinha) {
  const descricao = normalizarTexto(v.descricao);
  const q = lerDecimalDigitado(v.quantidade, 4);
  const preco = v.preco.trim() === "" ? null : lerDinheiroDigitado(v.preco);
  const d = v.desconto.trim() === "" ? new Big(0) : lerDecimalDigitado(v.desconto, 2);
  return {
    descricao: descricao === "" && v.servico === "" ? "Indique a descrição (ou escolha um serviço)." : max(descricao, 500),
    quantidade: q === null || !q.gt(0) ? "Quantidade positiva (até 4 casas decimais)." : undefined,
    preco: v.preco.trim() === "" ? (v.servico === "" ? "Indique o preço (ou escolha um serviço)." : undefined) : preco === null || preco.lt(0) ? "Preço não negativo (até 2 casas decimais)." : undefined,
    desconto: d === null || d.lt(0) || d.gt(100) ? "Entre 0 e 100 (até 2 casas decimais)." : undefined,
  };
}

/** Vazios com um serviço escolhido: o servidor usa a descrição e o preço do serviço. */
export function linhaParaApi(v: CamposLinha): S["ProposalLineRequest"] {
  const q = lerDecimalDigitado(v.quantidade, 4) as Big;
  const d = v.desconto.trim() === "" ? null : lerDecimalDigitado(v.desconto, 2);
  return {
    serviceTypeId: v.servico === "" ? null : v.servico,
    description: opc(v.descricao),
    quantity: decimalParaApi(q),
    unitPrice: v.preco.trim() === "" ? null : paraApi(lerDinheiroDigitado(v.preco) as Dinheiro),
    discountPercent: d === null ? null : decimalParaApi(d),
  };
}

/** O total que o servidor vai calcular: quantidade × preço × (1 − desconto/100), 2 casas, metade para cima. */
export function totalLinha(quantidade: Big, preco: Big, desconto: Big): Big {
  return quantidade.times(preco).times(new Big(1).minus(desconto.div(100))).round(2, Big.roundHalfUp);
}

export function errosModelo(v: { nome: string; texto: string }) {
  const nome = normalizarTexto(v.nome);
  return {
    nome: nome === "" ? "Indique o nome." : max(nome, 200),
    texto: normalizarTexto(v.texto, true) === "" ? "Escreva o texto do modelo." : undefined,
  };
}
