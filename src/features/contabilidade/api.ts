/**
 * Contabilidade e relatórios (§5.7): plano de contas, diários, lançamentos,
 * períodos, regras de lançamento e de reporte; balancete, balanço,
 * demonstração de resultados, antiguidade de saldos, resumos de IVA e de
 * retenções e o ficheiro SAF-T AO de facturação.
 *
 * Facto (`LedgerEndpoints.cs`, `TreasuryEndpoints.cs`, `SpendingEndpoints.cs`):
 * - `finance.ledger.read` lê o razão, o balancete e as regras;
 * - `finance.ledger.write` abre contas e diários, lança, estorna, abre
 *   períodos e mexe nas classes de reporte;
 * - `finance.ledger.close` fecha e reabre períodos, cria versões do plano e
 *   define as regras de lançamento automático e as contabilísticas;
 * - `finance.reports.read` lê balanço, resultados, antiguidade, IVA,
 *   retenções e SAF-T.
 * Fechar um período não leva corpo: quem fecha é a conta autenticada (ADR-057).
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEscrita } from "@/lib/api/escrita";
import { api, enviar, ler, lerPagina } from "@/lib/api/client";
import { descarregar } from "@/lib/api/download";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type ContaRazao = S["LedgerAccountView"];
export type PedidoContaRazao = S["LedgerAccountRequest"];
export type Diario = S["JournalView"];
export type Lancamento = S["JournalEntryView"];
export type LinhaLancamento = S["JournalEntryLineView"];
export type PedidoLancamento = S["PostEntryRequest"];
export type Periodo = S["AccountingPeriodView"];
export type Balancete = S["TrialBalanceView"];
export type RegraLancamento = S["PostingRuleView"];
export type PedidoRegraLancamento = S["PostingRuleRequest"];
export type VersaoPlano = S["ChartOfAccountsVersionView"];
export type PedidoVersaoPlano = S["CreateChartVersionRequest"];
export type RegraContabilistica = S["AccountingRuleView"];
export type PedidoRegraContabilistica = S["CreateAccountingRuleRequest"];
export type ClasseReporte = S["ReportingRuleView"];
export type PedidoClasseReporte = S["ReportingRuleRequest"];
export type Balanco = S["BalanceSheet"];
export type Resultados = S["IncomeStatement"];
export type SeccaoDemonstracao = S["StatementSection"];
export type ContaDemonstracao = S["StatementAccount"];
export type Antiguidade = S["AgingReport"];
export type ResumoIva = S["VatSummary"];
export type ResumoRetencoes = S["WithholdingSummary"];

export const chaves = {
  razao: ["finance", "ledger"] as const,
  contas: (inactivas: boolean) => ["finance", "ledger", "accounts", inactivas] as const,
  diarios: (inactivos: boolean) => ["finance", "ledger", "journals", inactivos] as const,
  lancamentos: (p: { diario: string | null; ano: number | null; periodo: number | null; pagina: number; tamanho: number }) =>
    ["finance", "ledger", "entries", p.diario, p.ano, p.periodo, p.pagina, p.tamanho] as const,
  lancamento: (id: string) => ["finance", "ledger", "entries", "detail", id] as const,
  periodos: (ano: number) => ["finance", "ledger", "periods", ano] as const,
  balancete: (ano: number, periodo: number | null) => ["finance", "ledger", "trial-balance", ano, periodo] as const,
  regrasLancamento: (inactivas: boolean) => ["finance", "ledger", "posting-rules", inactivas] as const,
  versoesPlano: ["finance", "ledger", "chart-versions"] as const,
  regrasContabilisticas: (inactivas: boolean) => ["finance", "ledger", "accounting-rules", inactivas] as const,
  classesReporte: ["finance", "ledger", "reporting-rules"] as const,
  relatorios: ["finance", "reports"] as const,
  balanco: (ano: number, periodo: number | null) => ["finance", "reports", "balance-sheet", ano, periodo] as const,
  resultados: (ano: number, periodo: number | null, acumulado: boolean) => ["finance", "reports", "income-statement", ano, periodo, acumulado] as const,
  antiguidade: (lado: "clientes" | "fornecedores", data: string | null, moeda: string | null) => ["finance", "reports", "aging", lado, data, moeda] as const,
  iva: (de: string, ate: string, moeda: string | null) => ["finance", "reports", "vat", de, ate, moeda] as const,
  retencoes: (de: string, ate: string, moeda: string | null) => ["finance", "reports", "withholdings", de, ate, moeda] as const,
};

/** Listas de configuração: cabem numa página com o tecto do servidor. */
const TUDO = { page: 1, pageSize: 200 } as const;
const comPeriodo = (periodo: number | null) => (periodo === null ? {} : { period: periodo });
const comMoeda = (moeda: string | null) => (moeda ? { currency: moeda } : {});

// Relatórios

export function useBalancete(ano: number, periodo: number | null) {
  return useQuery({
    queryKey: chaves.balancete(ano, periodo),
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/trial-balance", { params: { query: { fiscalYear: ano, ...comPeriodo(periodo) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useBalanco(ano: number, periodo: number | null) {
  return useQuery({
    queryKey: chaves.balanco(ano, periodo),
    queryFn: ({ signal }) => ler(api.GET("/finance/reports/balance-sheet", { params: { query: { fiscalYear: ano, ...comPeriodo(periodo) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useResultados(ano: number, periodo: number | null, acumulado: boolean) {
  return useQuery({
    queryKey: chaves.resultados(ano, periodo, acumulado),
    queryFn: ({ signal }) =>
      ler(api.GET("/finance/reports/income-statement", { params: { query: { fiscalYear: ano, ...comPeriodo(periodo), ...(periodo === null ? {} : { yearToDate: acumulado }) } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useAntiguidade(lado: "clientes" | "fornecedores", data: string | null, moeda: string | null) {
  return useQuery({
    queryKey: chaves.antiguidade(lado, data, moeda),
    queryFn: ({ signal }) => {
      const query = { ...(data ? { asOf: data } : {}), ...comMoeda(moeda) };
      return lado === "clientes"
        ? ler(api.GET("/finance/receivables/aging", { params: { query }, signal }))
        : ler(api.GET("/finance/payables/aging", { params: { query }, signal }));
    },
    placeholderData: keepPreviousData,
  });
}

export function useResumoIva(de: string, ate: string, moeda: string | null, activo = true) {
  return useQuery({
    queryKey: chaves.iva(de, ate, moeda),
    queryFn: ({ signal }) => ler(api.GET("/finance/tax-summaries/vat", { params: { query: { from: de, to: ate, ...comMoeda(moeda) } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

export function useResumoRetencoes(de: string, ate: string, moeda: string | null, activo = true) {
  return useQuery({
    queryKey: chaves.retencoes(de, ate, moeda),
    queryFn: ({ signal }) => ler(api.GET("/finance/tax-summaries/withholdings", { params: { query: { from: de, to: ate, ...comMoeda(moeda) } }, signal })),
    placeholderData: keepPreviousData,
    enabled: activo,
  });
}

/** Ficheiro SAF-T AO de facturação do período (dentro de um ano), descarregado como anexo. */
export function useDescarregarSaft() {
  return useEscrita({
    mutationFn: ({ de, ate }: { de: string; ate: string }) =>
      descarregar(`/finance/saft-ao?from=${encodeURIComponent(de)}&to=${encodeURIComponent(ate)}`, `SAF-T AO ${de} a ${ate}.xml`),
  });
}

// Plano de contas

/** O plano inteiro: passa das 200 contas de uma página, por isso lê as páginas todas. */
export function useContasRazao(inactivas = false, activo = true) {
  return useQuery({
    queryKey: chaves.contas(inactivas),
    queryFn: async ({ signal }) => {
      const todas: ContaRazao[] = [];
      for (let pagina = 1; pagina <= 50; pagina++) {
        const r = await lerPagina(api.GET("/finance/ledger/accounts", { params: { query: { includeInactive: inactivas, page: pagina, pageSize: TUDO.pageSize } }, signal }));
        todas.push(...r.items);
        if (r.items.length < TUDO.pageSize || todas.length >= r.total) break;
      }
      // Ordem do plano: 11, 111, 12 (texto, não número).
      return todas.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
    },
    enabled: activo,
  });
}

export function useAbrirContaRazao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoContaRazao) => enviar(api.POST("/finance/ledger/accounts", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.razao }),
  });
}

export function useDesactivarContaRazao() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (accountId: string) => enviar(api.POST("/finance/ledger/accounts/{accountId}/deactivation", { params: { path: { accountId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.razao }),
  });
}

export function useVersoesPlano() {
  return useQuery({
    queryKey: chaves.versoesPlano,
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/chart-versions", { params: { query: { includeInactive: true, ...TUDO } }, signal })),
  });
}

export function useCriarVersaoPlano() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoVersaoPlano) => enviar(api.POST("/finance/ledger/chart-versions", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: chaves.versoesPlano }),
  });
}

export function useClassesReporte() {
  return useQuery({
    queryKey: chaves.classesReporte,
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/reporting-rules", { signal })),
  });
}

export function useGuardarClasseReporte() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ ruleId, ...b }: PedidoClasseReporte & { ruleId: string | null }) =>
      ruleId
        ? enviar(api.PUT("/finance/ledger/reporting-rules/{ruleId}", { params: { path: { ruleId } }, body: b }))
        : enviar(api.POST("/finance/ledger/reporting-rules", { body: b })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.classesReporte }), qc.invalidateQueries({ queryKey: chaves.relatorios })]),
  });
}

export function useApagarClasseReporte() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (ruleId: string) => enviar(api.DELETE("/finance/ledger/reporting-rules/{ruleId}", { params: { path: { ruleId } } })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.classesReporte }), qc.invalidateQueries({ queryKey: chaves.relatorios })]),
  });
}

// Diários e lançamentos

export function useDiarios(inactivos = false, activo = true) {
  return useQuery({
    queryKey: chaves.diarios(inactivos),
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/journals", { params: { query: { includeInactive: inactivos, ...TUDO } }, signal })),
    enabled: activo,
  });
}

export function useAbrirDiario() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: S["JournalRequest"]) => enviar(api.POST("/finance/ledger/journals", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "journals"] }),
  });
}

export function useLancamentos(p: { diario: string | null; ano: number | null; periodo: number | null; pagina: number; tamanho: number }) {
  return useQuery({
    queryKey: chaves.lancamentos(p),
    queryFn: ({ signal }) =>
      lerPagina(
        api.GET("/finance/ledger/entries", {
          params: {
            query: {
              ...(p.diario ? { journalId: p.diario } : {}),
              ...(p.ano !== null ? { fiscalYear: p.ano } : {}),
              ...(p.ano !== null && p.periodo !== null ? { period: p.periodo } : {}),
              page: p.pagina,
              pageSize: p.tamanho,
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useLancamento(id: string) {
  return useQuery({
    queryKey: chaves.lancamento(id),
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/entries/{entryId}", { params: { path: { entryId: id } }, signal })),
  });
}

export function useLancar() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoLancamento) => ler(api.POST("/finance/ledger/entries", { body: b })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.razao }), qc.invalidateQueries({ queryKey: chaves.relatorios })]),
  });
}

export function useEstornar() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) =>
      enviar(api.POST("/finance/ledger/entries/{entryId}/void", { params: { path: { entryId } }, body: { reason } })),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: chaves.razao }), qc.invalidateQueries({ queryKey: chaves.relatorios })]),
  });
}

// Períodos

export function usePeriodos(ano: number) {
  return useQuery({
    queryKey: chaves.periodos(ano),
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/periods", { params: { query: { fiscalYear: ano } }, signal })),
    placeholderData: keepPreviousData,
  });
}

export function useAbrirPeriodo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: { fiscalYear: number; number: number }) => enviar(api.POST("/finance/ledger/periods", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "periods"] }),
  });
}

export function useFecharPeriodo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ ano, numero }: { ano: number; numero: number }) =>
      enviar(api.POST("/finance/ledger/periods/{fiscalYear}/{number}/closure", { params: { path: { fiscalYear: ano, number: numero } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "periods"] }),
  });
}

export function useReabrirPeriodo() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: ({ ano, numero, motivo }: { ano: number; numero: number; motivo: string }) =>
      enviar(api.POST("/finance/ledger/periods/{fiscalYear}/{number}/reopening", { params: { path: { fiscalYear: ano, number: numero } }, body: { reason: motivo } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "periods"] }),
  });
}

// Regras

export function useRegrasLancamento(inactivas = true) {
  return useQuery({
    queryKey: chaves.regrasLancamento(inactivas),
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/posting-rules", { params: { query: { includeInactive: inactivas, ...TUDO } }, signal })),
  });
}

export function useDefinirRegraLancamento() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoRegraLancamento) => enviar(api.POST("/finance/ledger/posting-rules", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "posting-rules"] }),
  });
}

export function useDesactivarRegraLancamento() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (ruleId: string) => enviar(api.POST("/finance/ledger/posting-rules/{ruleId}/deactivation", { params: { path: { ruleId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "posting-rules"] }),
  });
}

export function useRegrasContabilisticas(inactivas = true) {
  return useQuery({
    queryKey: chaves.regrasContabilisticas(inactivas),
    queryFn: ({ signal }) => ler(api.GET("/finance/ledger/accounting-rules", { params: { query: { includeInactive: inactivas, ...TUDO } }, signal })),
  });
}

export function useCriarRegraContabilistica() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (b: PedidoRegraContabilistica) => enviar(api.POST("/finance/ledger/accounting-rules", { body: b })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "accounting-rules"] }),
  });
}

export function useDesactivarRegraContabilistica() {
  const qc = useQueryClient();
  return useEscrita({
    mutationFn: (ruleId: string) => enviar(api.POST("/finance/ledger/accounting-rules/{ruleId}/deactivation", { params: { path: { ruleId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "ledger", "accounting-rules"] }),
  });
}
