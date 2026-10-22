/** Peças comuns do ESG: pilares, agregações, direcções, estados e números. */
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Badge, type TomBadge } from "@/ui/Badge";
import type { Agregacao, Direccao, Pilar } from "./regras";

export const PILARES: Readonly<Record<Pilar, string>> = { Environmental: "Ambiental", Social: "Social", Governance: "Governação" };
export const AGREGACOES: Readonly<Record<Agregacao, string>> = { Sum: "Soma dos meses", Average: "Média dos meses", Last: "Último mês" };
export const DIRECCOES: Readonly<Record<Direccao, string>> = { LowerIsBetter: "Menos é melhor", HigherIsBetter: "Mais é melhor" };

const TOM_INICIATIVA: Record<string, TomBadge> = { Planned: "info", InProgress: "aviso", Completed: "sucesso", Cancelled: "neutro" };
const TEXTO_INICIATIVA: Record<string, string> = { Planned: "Planeada", InProgress: "Em curso", Completed: "Concluída", Cancelled: "Cancelada" };
export const EstadoIniciativa = ({ estado }: { estado: string }) => <Badge tom={TOM_INICIATIVA[estado] ?? "neutro"}>{TEXTO_INICIATIVA[estado] ?? estado}</Badge>;
export const iniciativaEncerrada = (estado: string) => estado === "Completed" || estado === "Cancelled";

/** Um número do ESG com as casas que tem (até 4), sem zeros à direita. */
export function numeroEsg(v: number | string): string {
  const s = String(v);
  const casas = Math.min(4, s.includes(".") ? (s.split(".")[1] ?? "").replace(/0+$/, "").length : 0);
  return formatarNumeroDecimal(s, casas);
}

export const pilarDe = (p: string) => PILARES[p as Pilar] ?? p;
