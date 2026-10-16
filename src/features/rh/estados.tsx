/**
 * Nomes e estados do RH, partilhados pelo backoffice e pelo portal do
 * colaborador. Os valores vêm dos enums do domínio (`Rivo.Hr.Domain`); um
 * valor desconhecido aparece tal como vem, nunca escondido.
 */
import { Badge, type TomBadge } from "@/ui/Badge";

type Estado = { readonly texto: string; readonly tom: TomBadge };

function badge(mapa: Readonly<Record<string, Estado>>) {
  return function EstadoRh({ estado }: { estado: string }) {
    const e = mapa[estado];
    return <Badge tom={e?.tom ?? "neutro"}>{e?.texto ?? estado}</Badge>;
  };
}

export const nome = (mapa: Readonly<Record<string, string>>, v: string) => mapa[v] ?? v;

export const TIPO_AUSENCIA: Readonly<Record<string, string>> = {
  Annual: "Férias",
  Sick: "Baixa médica",
  Parental: "Licença parental",
  Unpaid: "Sem retribuição",
};

export const EstadoAusencia = badge({
  Pending: { texto: "Por decidir", tom: "aviso" },
  Approved: { texto: "Aprovado", tom: "sucesso" },
  Refused: { texto: "Recusado", tom: "erro" },
  Cancelled: { texto: "Retirado", tom: "neutro" },
});

export const EstadoMarcacao = badge({
  Present: { texto: "Presente", tom: "sucesso" },
  Late: { texto: "Atraso", tom: "aviso" },
  Absent: { texto: "Falta", tom: "erro" },
  Justified: { texto: "Falta justificada", tom: "info" },
});

export const CATEGORIA_PEDIDO: Readonly<Record<string, string>> = {
  HumanResources: "Recursos Humanos",
  It: "Informática",
  Facilities: "Instalações",
  Finance: "Finanças",
  SalaryAdvance: "Adiantamento salarial",
  DocumentRequest: "Pedido de documento",
  Other: "Outro",
};

export const PRIORIDADE_PEDIDO: Readonly<Record<string, string>> = {
  Low: "Baixa",
  Normal: "Normal",
  High: "Alta",
  Urgent: "Urgente",
};

export const EstadoPedido = badge({
  Open: { texto: "Aberto", tom: "info" },
  InProgress: { texto: "Em curso", tom: "aviso" },
  Resolved: { texto: "Resolvido", tom: "sucesso" },
  Closed: { texto: "Fechado", tom: "neutro" },
});

export const EstadoInscricao = badge({
  Enrolled: { texto: "Inscrito", tom: "info" },
  Completed: { texto: "Concluída", tom: "sucesso" },
  Cancelled: { texto: "Cancelada", tom: "neutro" },
});

export const EstadoTroca = badge({
  Pending: { texto: "Por decidir", tom: "aviso" },
  Approved: { texto: "Aprovada", tom: "sucesso" },
  Rejected: { texto: "Recusada", tom: "erro" },
  Cancelled: { texto: "Cancelada", tom: "neutro" },
});

export const EstadoCiclo = badge({
  Planned: { texto: "Planeado", tom: "neutro" },
  Active: { texto: "Em curso", tom: "info" },
  Closed: { texto: "Fechado", tom: "neutro" },
});
