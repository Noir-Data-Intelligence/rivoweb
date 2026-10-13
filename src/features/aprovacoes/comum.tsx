/** Peças partilhadas pelos ecrãs de aprovações. */
import { useMeuPainel } from "@/features/dashboard";
import { useTodosColaboradores } from "@/features/rh";
import { useUtilizador } from "@/features/identity";
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
 * Nome de um colaborador a partir do id. Só quem lê colaboradores vê nomes;
 * os outros vêem «Colaborador» (os pedidos trazem só ids, B19). Nunca mostra o id.
 */
export function useNomeColaborador() {
  const { pode } = useUtilizador();
  const eu = useEuColaborador();
  const lista = useTodosColaboradores(pode("hr.employees.read"));
  return (id: string) => {
    const nome = lista.data?.items.find((c) => c.employeeId === id)?.fullName;
    if (id === eu) return nome ? `${nome} (você)` : "Você";
    return nome ?? "Colaborador";
  };
}
