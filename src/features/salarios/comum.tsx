/** Peças partilhadas dos salários: estado da folha, período e totais (somados em Big, nunca em number). */
import Big from "big.js";
import { formatarMoeda } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro, type Dinheiro } from "@/lib/money/money";
import { Badge, type TomBadge } from "@/ui/Badge";
import type { Folha, ItemFolha } from "./api";

const ESTADO: Record<string, { texto: string; tom: TomBadge }> = {
  Draft: { texto: "Rascunho", tom: "neutro" },
  PendingApproval: { texto: "Por aprovar", tom: "aviso" },
  Approved: { texto: "Aprovada", tom: "sucesso" },
  Refused: { texto: "Recusada", tom: "erro" },
  Cancelled: { texto: "Anulada", tom: "neutro" },
};

/** Estados que deixam o mês livre para outra folha (B27). */
export const libertaOMes = (estado: string) => estado === "Refused" || estado === "Cancelled";

export function EstadoFolha({ estado }: { estado: string }) {
  const e = ESTADO[estado];
  return <Badge tom={e?.tom ?? "neutro"}>{e?.texto ?? estado}</Badge>;
}

export const periodoFolha = (f: Pick<Folha, "year" | "month">) => `${nomeMes(Number(f.month))} ${String(f.year)}`;

/** Salários em kwanzas (a folha não tem moeda: o cálculo fiscal é em AOA). */
export const kz = (v: number | string | Dinheiro | null) => (v === null ? "—" : formatarMoeda(typeof v === "object" ? v : dinheiro(v), "AOA"));

export type Totais = { bruto: Dinheiro; irt: Dinheiro; inss: Dinheiro; liquido: Dinheiro };

const somar = (vs: readonly (number | string | null)[]) => dinheiro(vs.reduce<Big>((t, v) => t.plus(new Big(v ?? 0)), new Big(0)).toFixed(2));

export function totais(itens: readonly ItemFolha[]): Totais {
  return {
    bruto: somar(itens.map((i) => i.grossSalary)),
    irt: somar(itens.map((i) => i.withholdingTax)),
    inss: somar(itens.map((i) => i.socialSecurityContribution)),
    liquido: somar(itens.map((i) => i.netSalary)),
  };
}

export const subsidiosDe = (i: ItemFolha) => somar([i.foodAllowance, i.transportAllowance, i.vacationAllowance, i.christmasAllowance]);
