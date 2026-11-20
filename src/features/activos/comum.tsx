/** Peças partilhadas dos activos: estados e nomes. */
import { hojeIso } from "@/lib/format/data";
import { Badge, type TomBadge } from "@/ui/Badge";

function estado(mapa: Record<string, { texto: string; tom: TomBadge }>) {
  return function Estado({ estado: e }: { estado: string }) {
    const x = mapa[e];
    return <Badge tom={x?.tom ?? "neutro"}>{x?.texto ?? e}</Badge>;
  };
}

export const EstadoActivo = estado({ Active: { texto: "Em uso", tom: "sucesso" }, Disposed: { texto: "Abatido", tom: "neutro" } });
export const EstadoManutencao = estado({
  Scheduled: { texto: "Agendada", tom: "info" },
  Completed: { texto: "Concluída", tom: "sucesso" },
  Cancelled: { texto: "Cancelada", tom: "neutro" },
});

/** Uma manutenção agendada para um dia que já passou está em atraso, como na frota. */
export const manutencaoEmAtraso = (m: { status: string; scheduledOn: string }, hoje = hojeIso()) => m.status === "Scheduled" && m.scheduledOn < hoje;

/** O estado da manutenção, com «Em atraso» quando o dia agendado passou. */
export function EstadoDaManutencao({ m }: { m: { status: string; scheduledOn: string } }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <EstadoManutencao estado={m.status} />
      {manutencaoEmAtraso(m) ? <Badge tom="erro">Em atraso</Badge> : null}
    </span>
  );
}

export const TIPO_MANUTENCAO: Record<"Preventive" | "Corrective" | "Inspection", string> = { Preventive: "Preventiva", Corrective: "Correctiva", Inspection: "Inspecção" };
