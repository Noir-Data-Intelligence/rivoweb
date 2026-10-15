/**
 * Tesouraria (§5.6): contas bancárias e extracto, reconciliação, câmbios,
 * caixa pequena, letras e livranças, fluxo de caixa.
 *
 * Facto (`PayablesEndpoints.cs`): as contas lêem com `finance.payables.read`
 * e escrevem com `finance.payables.write`; o resto da tesouraria usa
 * `finance.treasury.*` e o fluxo realizado e previsto `finance.reports.read`.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Conta = S["BankAccountView"];
export type Extracto = S["AccountStatementView"];
export type Movimento = S["BankMovementView"];
export type ResumoReconciliacao = S["ReconciliationSummary"];
export type LinhaExtracto = S["StatementLineView"];
export type Cambio = S["ExchangeRateView"];
export type FundoCaixa = S["PettyCashFundView"];
export type MovimentoCaixa = S["PettyCashMovementView"];
export type PedidoFundo = S["FundRequest"];
export type PedidoMovimentoCaixa = S["PettyMovementRequest"];
export type Letra = S["BillView"];
export type PedidoLetra = S["BillRequest"];
export type FluxoRealizado = S["CashFlowActual"];
export type FluxoPrevisto = S["CashForecast"];
export type ItemPrevisao = S["CashForecastItemView"];
export type PedidoItemPrevisao = S["ForecastItemRequest"];

export const chaves = {
  contas: ["finance", "accounts"] as const,
  listaContas: (p: { pagina: number; tamanho: number; fechadas: boolean }) => ["finance", "accounts", "list", p.pagina, p.tamanho, p.fechadas] as const,
  extracto: (id: string, de: string | null, ate: string | null) => ["finance", "accounts", id, "statement", de, ate] as const,
  reconciliacao: (id: string) => ["finance", "accounts", id, "reconciliation"] as const,
  linhas: (id: string, estado: string | null) => ["finance", "accounts", id, "reconciliation", "lines", estado] as const,
  cambios: ["finance", "exchange-rates"] as const,
  listaCambios: (p: { moeda: string | null; de: string | null; ate: string | null }) => ["finance", "exchange-rates", "list", p.moeda, p.de, p.ate] as const,
  conversao: (p: { valor: string; de: string; para: string; em: string | null }) => ["finance", "exchange-rates", "conversion", p.valor, p.de, p.para, p.em] as const,
  caixas: ["finance", "petty-cash"] as const,
  movimentosCaixa: (id: string, de: string | null, ate: string | null) => ["finance", "petty-cash", id, "movements", de, ate] as const,
  letras: ["finance", "bills"] as const,
  listaLetras: (p: { sentido: string | null; estado: string | null }) => ["finance", "bills", "list", p.sentido, p.estado] as const,
  letra: (id: string) => ["finance", "bills", "detail", id] as const,
  fluxo: ["finance", "cash-flow"] as const,
  realizado: (de: string, ate: string, conta: string | null) => ["finance", "cash-flow", "actual", de, ate, conta] as const,
  previsto: (ate: string, moeda: string | null) => ["finance", "cash-flow", "forecast", ate, moeda] as const,
  itens: ["finance", "cash-flow", "items"] as const,
};

const comValor = <K extends string>(k: K, v: string | null | undefined) => (v ? ({ [k]: v } as Record<K, string>) : {});

// Contas bancárias

export function useContas(p: { pagina: number; tamanho: number; fechadas: boolean }, activo = true) {
  return useQuery({
    queryKey: chaves.listaContas(p),
    queryFn: ({ signal }) => lerPagina(api.GET("/finance/accounts", { params: { query: { includeClosed: p.fechadas, page: p.pagina, pageSize: p.tamanho } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Lista de apoio (escolher a conta de um pagamento): só abertas, até ao tecto do servidor. */
export const useContasAbertas = (activo = true) => useContas({ pagina: 1, tamanho: 200, fechadas: false }, activo);

export function useExtracto(id: string, de: string | null, ate: string | null) {
  return useQuery({
    queryKey: chaves.extracto(id, de, ate),
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/accounts/{accountId}/statement", { params: { path: { accountId: id }, query: { ...comValor("from", de), ...comValor("to", ate) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useAbrirConta() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["OpenAccountRequest"]) => ler(api.POST("/finance/accounts", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.contas }),
  });
}

export function useDepositar(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["DepositRequest"]) => enviar(api.POST("/finance/accounts/{accountId}/deposits", { params: { path: { accountId: id } }, body: b })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.contas }),
  });
}

export function useLevantar(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["WithdrawalRequest"]) => enviar(api.POST("/finance/accounts/{accountId}/withdrawals", { params: { path: { accountId: id } }, body: b })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.contas }),
  });
}

export function useFecharConta(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (reason: string) => enviar(api.POST("/finance/accounts/{accountId}/closure", { params: { path: { accountId: id } }, body: { reason } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.contas }),
  });
}

export function useReabrirConta(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => enviar(api.POST("/finance/accounts/{accountId}/reopening", { params: { path: { accountId: id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.contas }),
  });
}

// Reconciliação

export function useReconciliacao(id: string, activo = true) {
  return useQuery({
    queryKey: chaves.reconciliacao(id),
    queryFn: ({ signal }) => ler(api.GET("/finance/accounts/{accountId}/reconciliation", { params: { path: { accountId: id } }, signal })),
    enabled: activo,
  });
}

export function useLinhasExtracto(id: string, estado: "Unmatched" | "Matched" | "Ignored" | null, activo = true) {
  return useQuery({
    queryKey: chaves.linhas(id, estado),
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/accounts/{accountId}/statement-lines", { params: { path: { accountId: id }, query: estado ? { status: estado } : {} }, signal })),
    enabled: activo,
  });
}

export function useImportarExtracto(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (csv: string) => ler(api.POST("/finance/accounts/{accountId}/statement-imports", { params: { path: { accountId: id } }, body: { csv } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.reconciliacao(id) }),
  });
}

export function useConciliarAutomatico(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: () => ler(api.POST("/finance/accounts/{accountId}/reconciliation/auto", { params: { path: { accountId: id } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.reconciliacao(id) }),
  });
}

export function useAccaoLinha(contaId: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (a: { lineId: string; accao: "match"; movementId: string } | { lineId: string; accao: "unmatch" | "ignore" }) => {
      const path = { lineId: a.lineId };
      if (a.accao === "match") return enviar(api.POST("/finance/statement-lines/{lineId}/match", { params: { path }, body: { movementId: a.movementId } }));
      if (a.accao === "unmatch") return enviar(api.POST("/finance/statement-lines/{lineId}/unmatch", { params: { path } }));
      return enviar(api.POST("/finance/statement-lines/{lineId}/ignore", { params: { path } }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.reconciliacao(contaId) }),
  });
}

// Câmbios

export function useCambios(p: { moeda: string | null; de: string | null; ate: string | null }) {
  return useQuery({
    queryKey: chaves.listaCambios(p),
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/exchange-rates", { params: { query: { ...comValor("currency", p.moeda), ...comValor("from", p.de), ...comValor("to", p.ate) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useRegistarCambio() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["RateRequest"]) => ler(api.POST("/finance/exchange-rates", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.cambios }),
  });
}

export function useConversao(p: { valor: string; de: string; para: string; em: string | null } | null) {
  return useQuery({
    queryKey: p ? chaves.conversao(p) : ["finance", "exchange-rates", "conversion", "nenhuma"],
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/exchange-rates/conversion", { params: { query: { amount: p?.valor ?? "0", from: p?.de ?? "", to: p?.para ?? "", ...comValor("on", p?.em) } }, signal })),
    enabled: p !== null,
    retry: false,
  });
}

// Caixa pequena

export function useCaixas() {
  return useQuery({ queryKey: chaves.caixas, queryFn: ({ signal }) => ler(api.GET("/finance/petty-cash", { signal })) });
}

export function useMovimentosCaixa(id: string, de: string | null, ate: string | null, activo = true) {
  return useQuery({
    queryKey: chaves.movimentosCaixa(id, de, ate),
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/petty-cash/{fundId}/movements", { params: { path: { fundId: id }, query: { ...comValor("from", de), ...comValor("to", ate) } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}

export function useGuardarCaixa() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ fundId, corpo }: { fundId: string | null; corpo: PedidoFundo }): Promise<unknown> =>
      fundId ? enviar(api.PUT("/finance/petty-cash/{fundId}", { params: { path: { fundId } }, body: corpo })) : ler(api.POST("/finance/petty-cash", { body: corpo })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.caixas }),
  });
}

export function useMovimentarCaixa(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoMovimentoCaixa) => ler(api.POST("/finance/petty-cash/{fundId}/movements", { params: { path: { fundId: id } }, body: b })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.caixas }),
  });
}

// Letras e livranças

export function useLetras(p: { sentido: "Receivable" | "Payable" | null; estado: "Pending" | "Accepted" | "Discounted" | "Paid" | "Protested" | "Cancelled" | null }) {
  return useQuery({
    queryKey: chaves.listaLetras(p),
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/bills", { params: { query: { ...(p.sentido ? { direction: p.sentido } : {}), ...(p.estado ? { status: p.estado } : {}) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useLetra(id: string) {
  return useQuery({ queryKey: chaves.letra(id), queryFn: ({ signal }) => ler(api.GET("/finance/bills/{billId}", { params: { path: { billId: id } }, signal })) });
}

export function useSacarLetra() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoLetra) => ler(api.POST("/finance/bills", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.letras }),
  });
}

export type AccaoLetra = "acceptance" | "discount" | "settlement" | "protest" | "cancellation" | "endorsement";

export function useAccaoLetra(id: string) {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ accao, corpo }: { accao: AccaoLetra; corpo: S["BillActionRequest"] | null }) =>
      enviar(api.POST("/finance/bills/{billId}/{action}", { params: { path: { billId: id, action: accao } }, body: corpo })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.letras }),
  });
}

// Fluxo de caixa

export function useFluxoRealizado(de: string, ate: string, conta: string | null, activo = true) {
  return useQuery({
    queryKey: chaves.realizado(de, ate, conta),
    queryFn: ({ signal }) => ler(api.GET("/finance/cash-flow/actual", { params: { query: { from: de, to: ate, ...comValor("bankAccountId", conta) } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}

export function useFluxoPrevisto(ate: string, moeda: string | null, activo = true) {
  return useQuery({
    queryKey: chaves.previsto(ate, moeda),
    queryFn: ({ signal }) => ler(api.GET("/finance/cash-flow/forecast", { params: { query: { to: ate, ...comValor("currency", moeda) } }, signal })),
    enabled: activo,
    placeholderData: keepPreviousData,
  });
}

export function useItensPrevisao(activo = true) {
  return useQuery({ queryKey: chaves.itens, queryFn: ({ signal }) => ler(api.GET("/finance/cash-flow/items", { signal })), enabled: activo });
}

export function useGuardarItemPrevisao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ itemId, corpo }: { itemId: string | null; corpo: PedidoItemPrevisao }): Promise<unknown> =>
      itemId ? enviar(api.PUT("/finance/cash-flow/items/{itemId}", { params: { path: { itemId } }, body: corpo })) : ler(api.POST("/finance/cash-flow/items", { body: corpo })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.fluxo }),
  });
}

export function useApagarItemPrevisao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (itemId: string) => enviar(api.DELETE("/finance/cash-flow/items/{itemId}", { params: { path: { itemId } } })),
    onSettled: () => qc.invalidateQueries({ queryKey: chaves.fluxo }),
  });
}
