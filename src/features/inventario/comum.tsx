/** Peças partilhadas do inventário: estados, tipos de movimento e formatação (valores em kwanzas). */
import Big from "big.js";
import { formatarMoeda, formatarNumeroDecimal } from "@/lib/format/numero";
import { dinheiro } from "@/lib/money/money";
import { Badge, type TomBadge } from "@/ui/Badge";

/** Com as casas que o valor tem (até 4): «2,5», não «2,5000». */
export const qtd = (v: number | string) => formatarNumeroDecimal(String(v), Math.min((String(v).split(".")[1] ?? "").length, 4));

/** O inventário não tem moeda: os custos são em kwanzas. Até 2 casas no ecrã (o servidor guarda 4). */
export const kz = (v: number | string | Big) => formatarMoeda(dinheiro(new Big(v).round(2, Big.roundHalfUp).toFixed(2)), "AOA");

export const TIPO_MOVIMENTO: Record<string, string> = {
  Receipt: "Entrada",
  Issue: "Saída",
  Adjustment: "Ajuste",
  TransferOut: "Transferência (saída)",
  TransferIn: "Transferência (entrada)",
};

function estado(mapa: Record<string, { texto: string; tom: TomBadge }>) {
  return function Estado({ estado: e }: { estado: string }) {
    const x = mapa[e];
    return <Badge tom={x?.tom ?? "neutro"}>{x?.texto ?? e}</Badge>;
  };
}

export const EstadoActivo = estado({ Active: { texto: "Activo", tom: "sucesso" }, Inactive: { texto: "Inactivo", tom: "neutro" } });

export const EstadoContagem = estado({
  Open: { texto: "Aberta", tom: "info" },
  PendingApproval: { texto: "Por aprovar", tom: "aviso" },
  Closed: { texto: "Fechada", tom: "sucesso" },
  Refused: { texto: "Recusada", tom: "erro" },
  Cancelled: { texto: "Cancelada", tom: "neutro" },
});
