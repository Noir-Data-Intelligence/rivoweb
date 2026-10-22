/** Peças comuns da frota: estados, tipos, categorias e nomes de colaboradores. */
import { useEscolhasActivos } from "@/features/activos";
import { useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { Badge, type TomBadge } from "@/ui/Badge";
import type { Plano } from "./api";
import type { CategoriaDespesa } from "./regras";

function estado(mapa: Record<string, { texto: string; tom: TomBadge }>) {
  return function Estado({ estado: e }: { estado: string }) {
    const x = mapa[e];
    return <Badge tom={x?.tom ?? "neutro"}>{x?.texto ?? e}</Badge>;
  };
}

export const EstadoViatura = estado({ Active: { texto: "Activa", tom: "sucesso" }, InMaintenance: { texto: "Em manutenção", tom: "aviso" }, Inactive: { texto: "Inactiva", tom: "neutro" } });
export const EstadoApolice = estado({
  Scheduled: { texto: "Por começar", tom: "info" },
  Active: { texto: "Em vigor", tom: "sucesso" },
  Expired: { texto: "Caducada", tom: "aviso" },
  Cancelled: { texto: "Anulada", tom: "neutro" },
});
export const EstadoSinistro = estado({ Open: { texto: "Aberto", tom: "info" }, Settled: { texto: "Pago", tom: "sucesso" }, Rejected: { texto: "Recusado", tom: "neutro" } });

export const TIPO_MANUTENCAO: Readonly<Record<"Preventive" | "Corrective", string>> = { Preventive: "Preventiva", Corrective: "Correctiva" };
export const CATEGORIA_DESPESA: Readonly<Record<CategoriaDespesa, string>> = { Fuel: "Combustível", Toll: "Portagem", Parking: "Estacionamento" };

/** O próximo plano activo a vencer, se houver. */
export function proximoPlano(planos: readonly Plano[]): Plano | null {
  return planos.filter((p) => p.isActive).sort((a, b) => a.nextDueOn.localeCompare(b.nextDueOn))[0] ?? null;
}

export function ProximaManutencao({ planos }: { planos: readonly Plano[] }) {
  const p = proximoPlano(planos);
  if (!p) return <>—</>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {formatarData(p.nextDueOn)}
      {p.isOverdue ? <Badge tom="erro">Em atraso</Badge> : null}
    </span>
  );
}

/**
 * Colaboradores activos para atribuir e conduzir, e os seus nomes: as vistas
 * da frota só trazem ids (B40), por isso vêm de `/finance/assets/lookups`
 * (B31), para quem gere activos. Sem isso, «—» e não se escolhe.
 */
export function useMotoristas() {
  const { pode } = useUtilizador();
  const le = pode("finance.assets.write");
  const q = useEscolhasActivos(le);
  const activos = q.data?.employees ?? [];
  return { le, activos, nome: (id: string | null | undefined) => (id ? (activos.find((c) => c.id === id)?.name ?? null) : null) };
}
