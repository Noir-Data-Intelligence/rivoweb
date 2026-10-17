/** Peças partilhadas dos activos: estados e nomes. */
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

export const TIPO_MANUTENCAO: Record<"Preventive" | "Corrective" | "Inspection", string> = { Preventive: "Preventiva", Corrective: "Correctiva", Inspection: "Inspecção" };
