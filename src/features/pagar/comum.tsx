/** Peças partilhadas pelos ecrãs de contas a pagar. */
import { useMeuPainel } from "@/features/dashboard";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";

export function EstadoPedidoPagamento({ estado }: { estado: string }) {
  if (estado === "Eligible") return <Badge tom="aviso">Por pagar</Badge>;
  if (estado === "Executed") return <Badge tom="sucesso">Pago</Badge>;
  if (estado === "Cancelled") return <Badge>Cancelado</Badge>;
  return <Badge>{estado}</Badge>;
}

/** Categorias de anexo de um pedido de pagamento (texto livre na API). */
export const CATEGORIAS_ANEXO = ["Factura", "Proposta", "Contrato", "Outro"] as const;

/** O colaborador da conta: pedir e executar pagamentos exige ficha ligada (ADR-057). */
export function useEuColaborador(): { carregado: boolean; id: string | null } {
  const meu = useMeuPainel();
  return { carregado: !meu.isPending, id: meu.data?.employeeId ?? null };
}

export function SemFichaDeColaborador({ accao }: { accao: string }) {
  return (
    <Alert tom="info" titulo="A sua conta não está ligada a uma ficha de colaborador.">
      Só um colaborador pode {accao}: o registo fica em nome de quem o faz. Peça ao Admin que ligue a conta à sua ficha.
    </Alert>
  );
}
