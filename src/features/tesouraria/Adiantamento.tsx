/**
 * Peças do adiantamento de salário (ADR-114, ADR-123), partilhadas pela
 * Tesouraria e pelo portal do colaborador: o estado do pedido e a validação
 * do valor e do mês da folha que o desconta.
 */
import { nomeMes } from "@/lib/format/periodo";
import { lerDinheiroDigitado, type Dinheiro } from "@/lib/money/money";
import { Badge } from "@/ui/Badge";

/** PendingApproval (em Aprovações), Approved (por pagar), Refused, Paid. */
export function EstadoAdiantamento({ estado }: { estado: string }) {
  if (estado === "PendingApproval") return <Badge tom="aviso">Por aprovar</Badge>;
  if (estado === "Approved") return <Badge tom="info">Aprovado, por pagar</Badge>;
  if (estado === "Refused") return <Badge tom="erro">Recusado</Badge>;
  if (estado === "Paid") return <Badge tom="sucesso">Pago</Badge>;
  return <Badge>{estado}</Badge>;
}

export const folhaDe = (ano: number | string | null | undefined, mes: number | string | null | undefined) =>
  ano && mes ? `${nomeMes(Number(mes))} de ${String(ano)}` : "—";

export type CamposAdiantamento = { valor: string; folha: string };

/** O valor (maior que zero) e o mês da folha que o desconta: o corrente ou um seguinte (o servidor recusa uma folha já lançada). */
export function errosAdiantamento(v: CamposAdiantamento, hoje: string): { valor?: string; folha?: string } {
  const valor = lerDinheiroDigitado(v.valor, 2);
  const erros: { valor?: string; folha?: string } = {};
  if (!valor || valor.lte(0)) erros.valor = "Indique o valor, maior que zero, até 2 casas.";
  if (!/^\d{4}-\d{2}$/.test(v.folha)) erros.folha = "Escolha o mês da folha.";
  else if (v.folha < hoje.slice(0, 7)) erros.folha = "Não pode ser uma folha de um mês que já passou.";
  return erros;
}

export const valorAdiantamento = (v: CamposAdiantamento): Dinheiro | null => lerDinheiroDigitado(v.valor, 2);
