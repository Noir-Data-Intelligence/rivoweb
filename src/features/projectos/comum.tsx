/** Peças comuns dos projectos: estados, etapas, prioridades e nomes. */
import { useUtilizador } from "@/features/identity";
import { Badge, type TomBadge } from "@/ui/Badge";
import { useEscolhasProjecto, type Etapa, type Prioridade } from "./api";

export const ETAPAS: Readonly<Record<Etapa, string>> = { Backlog: "Por planear", ToDo: "A fazer", InProgress: "Em curso", Review: "Em revisão", Done: "Feita" };
export const ETAPAS_ABERTAS: readonly Etapa[] = ["Backlog", "ToDo", "InProgress", "Review"];
export const PRIORIDADES: Readonly<Record<Prioridade, string>> = { Low: "Baixa", Normal: "Normal", High: "Alta", Urgent: "Urgente" };

const TOM_TAREFA: Record<string, TomBadge> = { Pending: "info", Done: "sucesso", Cancelled: "neutro" };
const TEXTO_TAREFA: Record<string, string> = { Pending: "Em curso", Done: "Feita", Cancelled: "Cancelada" };
export const EstadoTarefa = ({ estado }: { estado: string }) => <Badge tom={TOM_TAREFA[estado] ?? "neutro"}>{TEXTO_TAREFA[estado] ?? estado}</Badge>;
export const EstadoProjecto = ({ estado }: { estado: string }) => (estado === "Closed" ? <Badge tom="neutro">Fechado</Badge> : <Badge tom="sucesso">Activo</Badge>);
export const EstadoMarco = ({ estado }: { estado: string }) => (estado === "Reached" ? <Badge tom="sucesso">Alcançado</Badge> : <Badge tom="info">Por alcançar</Badge>);
const TOM_PRIORIDADE: Record<string, TomBadge> = { Low: "neutro", Normal: "info", High: "aviso", Urgent: "erro" };
export const PrioridadeBadge = ({ p }: { p: string }) => <Badge tom={TOM_PRIORIDADE[p] ?? "neutro"}>{PRIORIDADES[p as Prioridade] ?? p}</Badge>;

/** Colaboradores, viaturas e clientes activos (id e nome), para quem escreve nos projectos (B38). */
export function useEscolhas() {
  const { pode } = useUtilizador();
  const q = useEscolhasProjecto(pode("projects.projects.write"));
  return { pessoas: q.data?.employees ?? [], viaturas: q.data?.vehicles ?? [], clientes: q.data?.customers ?? [] };
}
