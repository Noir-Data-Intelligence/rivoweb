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

// --- F7c: recrutamento, entradas e saídas

/** Pela ordem do funil (`CandidateStage`): só se avança um passo de cada vez. */
export const ETAPA_CANDIDATO: Readonly<Record<string, string>> = {
  Applied: "Candidatura",
  Screening: "Triagem",
  Interview: "Entrevista",
  Offer: "Proposta",
  Hired: "Contratado",
  Rejected: "Rejeitado",
};

export const EstadoCandidato = badge({
  Applied: { texto: "Candidatura", tom: "neutro" },
  Screening: { texto: "Triagem", tom: "info" },
  Interview: { texto: "Entrevista", tom: "info" },
  Offer: { texto: "Proposta", tom: "aviso" },
  Hired: { texto: "Contratado", tom: "sucesso" },
  Rejected: { texto: "Rejeitado", tom: "erro" },
});

export const EstadoVaga = badge({
  Open: { texto: "Aberta", tom: "sucesso" },
  Closed: { texto: "Fechada", tom: "neutro" },
});

export const TIPO_PROCESSO: Readonly<Record<string, string>> = {
  Onboarding: "Entrada",
  Offboarding: "Saída",
};

export const EstadoProcesso = badge({
  Pending: { texto: "Por começar", tom: "neutro" },
  InProgress: { texto: "Em curso", tom: "info" },
  Completed: { texto: "Concluído", tom: "sucesso" },
});

/** Texto livre no servidor; estas são as que a base usa. Outra aparece tal como vem. */
export const CATEGORIA_TAREFA: Readonly<Record<string, string>> = {
  hr: "Recursos Humanos",
  it: "Informática",
  assets: "Bens e equipamento",
  finance: "Finanças",
};

/** Fora do prazo de resposta ou de resolução (SLA de um pedido interno). */
export function SlaBadge({ p }: { p: { status: string; sla?: { responseBreached: boolean; resolutionBreached: boolean } | null } }) {
  if (!p.sla) return null;
  if (p.sla.resolutionBreached && p.status !== "Closed") return <Badge tom="erro">Resolução fora do prazo</Badge>;
  if (p.sla.responseBreached) return <Badge tom="aviso">Resposta fora do prazo</Badge>;
  return null;
}
