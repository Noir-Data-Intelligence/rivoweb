/** Peças comuns da IA: o aviso do custo e o estado (ligada ou não). */
import { Alert } from "@/ui/Alert";
import { useEstadoIa } from "./api";

/** Dito antes de cada botão que gasta: o pedido é pago e há um tecto por hora. */
export function AvisoCusto() {
  return <p className="text-xs text-muted-foreground">Cada pedido gasta saldo pago e conta para o limite de 20 pedidos por hora. A resposta é uma sugestão: confirme antes de a usar.</p>;
}

/** `ligada` só quando o servidor o confirma; desligada, um aviso em vez dos botões. */
export function useIaLigada() {
  const q = useEstadoIa();
  return { ligada: q.data?.enabled === true, aCarregar: q.isPending, estado: q.data };
}

export function IaDesligada() {
  return <Alert tom="info" titulo="As funcionalidades de IA não estão ligadas neste servidor." />;
}
