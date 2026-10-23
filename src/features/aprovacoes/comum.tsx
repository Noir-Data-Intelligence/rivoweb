/** Peças partilhadas pelos ecrãs de aprovações. */
import { useMeuPainel } from "@/features/dashboard";
import { Badge } from "@/ui/Badge";

/** Tipos de processo (Facto: `ApprovalContracts.cs`). */
export const PROCESSOS: Readonly<Record<string, string>> = {
  "hr.position_assignment": "Atribuição de cargo",
  "hr.leave_request": "Férias",
  "finance.payment_request": "Pedido de pagamento",
  "procurement.purchase_requisition": "Requisição de compra",
  "payroll.payroll_run": "Folha de salários",
  "inventory.stock_count": "Contagem de inventário",
};
export const nomeProcesso = (t: string) => PROCESSOS[t] ?? t;

const MODULOS: Readonly<Record<string, string>> = {
  hr: "Recursos Humanos",
  finance: "Finanças",
  procurement: "Compras",
  payroll: "Salários",
  inventory: "Inventário",
};
export const nomeModulo = (m: string) => MODULOS[m] ?? m;

export function EstadoPedido({ estado }: { estado: string }) {
  if (estado === "InProgress") return <Badge tom="aviso">Em curso</Badge>;
  if (estado === "ClarificationRequested") return <Badge tom="info">Esclarecimento pedido</Badge>;
  if (estado === "Approved") return <Badge tom="sucesso">Aprovado</Badge>;
  if (estado === "Rejected") return <Badge tom="erro">Rejeitado</Badge>;
  if (estado === "Cancelled") return <Badge>Cancelado</Badge>;
  return <Badge>{estado}</Badge>;
}

export const NOME_ACCAO: Readonly<Record<string, string>> = {
  Approved: "Aprovou",
  Rejected: "Rejeitou",
  ClarificationRequested: "Pediu esclarecimento",
};

/** Limites do checklist de um passo de validação (K4, `ApprovalModuleEndpoints.cs`). */
export const MAXIMO_ITENS_CHECKLIST = 30;
export const MAXIMO_TEXTO_ITEM = 500;

export const RESPOSTAS_CHECKLIST = [
  { valor: "Compliant", texto: "Conforme", simbolo: "✓" },
  { valor: "NonCompliant", texto: "Não conforme", simbolo: "✗" },
  { valor: "NotApplicable", texto: "N/A", simbolo: "—" },
] as const;
export type RespostaChecklist = (typeof RESPOSTAS_CHECKLIST)[number]["valor"];

/**
 * Validar (`Approved`) só com todos os itens respondidos e nenhum «não
 * conforme»; rejeitar e pedir esclarecimento aceitam respostas parciais. O
 * servidor confirma na mesma.
 */
export function estadoChecklist(itens: readonly { itemId: string }[], respostas: Readonly<Record<string, RespostaChecklist>>) {
  const naoConforme = itens.some((i) => respostas[i.itemId] === "NonCompliant");
  const completo = itens.every((i) => respostas[i.itemId] !== undefined);
  return { naoConforme, completo, podeValidar: completo && !naoConforme };
}

export const NOME_MODO: Readonly<Record<string, string>> = {
  AnyApprover: "Basta um ocupante do cargo",
  AllApprovers: "Todos os ocupantes do cargo",
};

/** O colaborador da própria conta (de `/dashboard/me`), para «para mim» e «você». */
export function useEuColaborador(): string | null {
  const meu = useMeuPainel();
  return meu.data?.employeeId ?? null;
}

/**
 * Nome de um colaborador: o pedido traz o nome ao lado do id (B19). Se o
 * servidor não o souber, «Colaborador». Nunca mostra o id.
 */
export function useNomeColaborador() {
  const eu = useEuColaborador();
  return (id: string, nome: string | null | undefined) => {
    if (id === eu) return nome ? `${nome} (você)` : "Você";
    return nome ?? "Colaborador";
  };
}
