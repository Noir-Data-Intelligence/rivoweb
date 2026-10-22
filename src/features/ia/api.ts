/**
 * Inteligência artificial (§5.14, F13): estado, fornecedor e as
 * funcionalidades, sempre por botão.
 *
 * Factos (`AiModuleEndpoints.cs`, `AiFeatures.cs`):
 * - `GET /ai/status` (qualquer conta): ligada ou não, fornecedor e modelo;
 *   desligada, as outras rotas dão 501;
 * - `GET/PUT /ai/provider` (`ai.provider.manage`): fornecedor activo
 *   (anthropic, openai) e recurso ao outro quando falha; sem chave no
 *   servidor, 409; vale a partir do pedido seguinte;
 * - cada `POST /ai/*` gasta saldo pago e conta para o tecto de 20 por hora
 *   por conta (429): nunca se chama sem a pessoa carregar no botão, nem se
 *   repete sozinho (sem novas tentativas);
 * - leitura do período (`ai.assistant.use`): janela por ordem, moeda; só as
 *   áreas que a conta lê (finanças, RH, vendas); resumo e observações
 *   (informação, atenção, crítico);
 * - previsão de receita e despesa: 1 a 12 meses a partir dos últimos 12
 *   reais; exige ler receita e despesa (403); sem dados, 422; estimativa,
 *   não entra em contas;
 * - rascunho: tipo, instruções (1–4000), contexto (20 000);
 * - leitura de factura (`finance.payables.write`): PDF ou imagem até 10 MB,
 *   devolve os campos para pré-preencher; nada é gravado;
 * - assistente do cliente (conta Cliente ligada): pergunta até 2000.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, enviar, ler } from "@/lib/api/client";
import { useEscrita } from "@/lib/api/escrita";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type EstadoIa = S["AiStatusResponse"];
export type Leitura = S["InsightsView"];
export type Previsao = S["RevenueForecastView"];
export type Rascunho = S["DraftView"];
export type FacturaLida = S["ExtractedInvoice"];
export type TipoRascunho = S["AiDraftRequest"]["kind"];

const CHAVE = ["ai"] as const;

export function useEstadoIa() {
  return useQuery({ queryKey: [...CHAVE, "status"], queryFn: ({ signal }) => ler(api.GET("/ai/status", { signal })), staleTime: 60_000 });
}

export function useFornecedorIa() {
  return useQuery({ queryKey: [...CHAVE, "provider"], queryFn: ({ signal }) => ler(api.GET("/ai/provider", { signal })) });
}

export function useMudarFornecedor() {
  const qc = useQueryClient();
  return useEscrita({ mutationFn: (b: S["AiProviderRequest"]) => enviar(api.PUT("/ai/provider", { body: b })), onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }) });
}

// Os pedidos pagos: `retry: false` para nunca gastar duas vezes.
export const useLeituraIa = () => useEscrita({ mutationFn: (b: S["InsightsRequest"]) => ler(api.POST("/ai/insights", { body: b })), retry: false });
export const usePrevisaoIa = () => useEscrita({ mutationFn: (b: S["ForecastRequest"]) => ler(api.POST("/ai/forecasts/revenue", { body: b })), retry: false });
export const useRascunhoIa = () => useEscrita({ mutationFn: (b: S["AiDraftRequest"]) => ler(api.POST("/ai/drafts", { body: b })), retry: false });
export const useAssistenteCliente = () => useEscrita({ mutationFn: (b: S["AssistantRequest"]) => ler(api.POST("/ai/customer-assistant", { body: b })), retry: false });

export function useLerFactura() {
  return useEscrita({
    mutationFn: (ficheiro: File) => {
      const corpo = new FormData();
      corpo.append("file", ficheiro, ficheiro.name);
      return ler(api.POST("/ai/invoice-extraction", { body: corpo as never, bodySerializer: (b: unknown) => b as FormData })) as Promise<FacturaLida>;
    },
    retry: false,
  });
}
