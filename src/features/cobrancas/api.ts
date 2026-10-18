/**
 * Cobranças (§5.12, F11): as facturas vencidas a cobrar e as acções de
 * cobrança (chamadas, e-mails, cartas, visitas, promessas de pagamento,
 * escalamentos).
 *
 * Factos (`CrmEndpoints.cs`, `ManageCrm.cs` — `ManageCollections` —, `Crm.cs`,
 * `TreasuryEndpoints.cs`):
 * - acções: ler com `commercial.collections.read`, registar com `.write`;
 *   sobre um cliente e, se quiser, uma factura desse cliente (404 se não for);
 *   notas obrigatórias (2000); uma promessa de pagamento exige valor > 0 e
 *   data; data da acção (por omissão, agora), próximo contacto; as mais
 *   recentes primeiro, com o cliente, a factura e o responsável pelo nome,
 *   paginadas com `page` (B35); não se corrigem nem apagam;
 * - o cliente e o responsável escolhem-se em `/commercial/lookups` (B35);
 * - vencidas: `GET /finance/receivables/overdue` (`finance.invoices.read`), com
 *   o cliente, o número e a moeda da factura (a da promessa).
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ler, lerPagina } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";
import { instanteDeDataHoraLocal } from "@/lib/format/data";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";

type S = components["schemas"];
export type AccaoCobranca = S["CollectionActionView"];
export type Vencida = S["OverdueReceivable"];
export type TipoAccao = S["CollectionRequest"]["kind"];

export const TIPOS_ACCAO: Readonly<Record<TipoAccao, string>> = {
  Call: "Chamada",
  Email: "E-mail",
  Letter: "Carta",
  Visit: "Visita",
  PaymentPromise: "Promessa de pagamento",
  Escalation: "Escalamento",
};

export function useAccoesCobranca(f: { cliente?: string; factura?: string } = {}) {
  return useQuery({
    queryKey: ["commercial", "collections", f],
    queryFn: ({ signal }) => ler(api.GET("/commercial/collections/actions", { params: { query: { ...(f.cliente ? { customerId: f.cliente } : {}), ...(f.factura ? { salesInvoiceId: f.factura } : {}) } }, signal })),
  });
}

export function useAccoesPagina(f: { pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: ["commercial", "collections", "page", f],
    queryFn: ({ signal }) => lerPagina(api.GET("/commercial/collections/actions", { params: { query: { page: f.pagina, pageSize: f.tamanho } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useVencidas(activo = true) {
  return useQuery({ queryKey: ["finance", "receivables", "overdue"], queryFn: ({ signal }) => ler(api.GET("/finance/receivables/overdue", { signal })), enabled: activo });
}

export function useRegistarAccao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (corpo: S["CollectionRequest"]) => ler(api.POST("/commercial/collections/actions", { body: corpo })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commercial", "collections"] }),
  });
}

export interface CamposAccao {
  cliente: string;
  factura: string;
  tipo: TipoAccao;
  notas: string;
  quando: string;
  valorPrometido: string;
  dataPrometida: string;
  proximo: string;
  responsavel: string;
}

export function errosAccao(v: CamposAccao) {
  const notas = normalizarTexto(v.notas, true);
  const promessa = v.tipo === "PaymentPromise";
  const valor = v.valorPrometido.trim() === "" ? null : lerDinheiroDigitado(v.valorPrometido);
  const data = (x: string) => x === "" || IsoDate.safeParse(x).success;
  return {
    cliente: v.cliente === "" ? "Escolha o cliente." : undefined,
    notas: notas === "" ? "Registe o que foi feito ou combinado." : notas.length > 2000 ? "No máximo 2000 caracteres." : undefined,
    quando: v.quando !== "" && instanteDeDataHoraLocal(v.quando) === null ? "Data e hora inválidas." : undefined,
    valorPrometido: promessa && (valor === null || !valor.gt(0)) ? "Uma promessa precisa de valor positivo." : !promessa && v.valorPrometido.trim() !== "" && valor === null ? "Valor com até 2 casas decimais." : undefined,
    dataPrometida: promessa && v.dataPrometida === "" ? "Uma promessa precisa de data." : data(v.dataPrometida) ? undefined : "Data inválida.",
    proximo: data(v.proximo) ? undefined : "Data inválida.",
  };
}

export function accaoParaApi(v: CamposAccao): S["CollectionRequest"] {
  const valor = v.valorPrometido.trim() === "" ? null : lerDinheiroDigitado(v.valorPrometido);
  return {
    customerId: v.cliente,
    salesInvoiceId: v.factura === "" ? null : v.factura,
    kind: v.tipo,
    notes: normalizarTexto(v.notas, true),
    occurredAt: v.quando === "" ? null : instanteDeDataHoraLocal(v.quando),
    promisedAmount: valor ? paraApi(valor) : null,
    promisedDate: v.dataPrometida === "" ? null : v.dataPrometida,
    nextFollowUpOn: v.proximo === "" ? null : v.proximo,
    ownerEmployeeId: v.responsavel === "" ? null : v.responsavel,
  };
}
