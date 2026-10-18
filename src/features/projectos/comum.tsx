/** Peças comuns dos projectos: estados, etapas, prioridades e nomes. */
import { useUtilizador } from "@/features/identity";
import { useTodosColaboradores } from "@/features/rh";
import { Badge, type TomBadge } from "@/ui/Badge";
import type { Etapa, Prioridade } from "./api";

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

/**
 * Colaboradores para quem lê os RH (B38): dão nome às atribuições e deixam
 * atribuir. Sem eles, «—» e não se atribui.
 */
export function usePessoas() {
  const { pode } = useUtilizador();
  const le = pode("hr.employees.read");
  const lista = useTodosColaboradores(le);
  const activos = (lista.data?.items ?? []).filter((c) => c.status === "Active");
  return {
    le,
    activos,
    nome: (id: string | null | undefined) => (id ? (lista.data?.items.find((c) => c.employeeId === id)?.fullName ?? null) : null),
  };
}
