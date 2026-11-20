/** Peças partilhadas pelos ecrãs de contas a pagar. */
import { useMeuPainel } from "@/features/dashboard";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";

/**
 * O estado de um pedido de pagamento para quem o lê (nota 54, ADR-135): um
 * `Eligible` diz-se pela decisão em Aprovações (`approvalStatus`), lida no
 * momento. Sem ela (API antiga), «Por pagar», como antes.
 */
export type EstadoPagamento = "PorAprovar" | "Aprovado" | "Rejeitado" | "SemDecisao" | "PorPagar" | "Pago" | "Cancelado" | "Outro";

export function estadoPagamento(p: { status: string; approvalStatus?: string | null }): EstadoPagamento {
  if (p.status === "Executed") return "Pago";
  if (p.status === "Cancelled") return "Cancelado";
  if (p.status !== "Eligible") return "Outro";
  if (p.approvalStatus === "Pending") return "PorAprovar";
  if (p.approvalStatus === "Approved") return "Aprovado";
  if (p.approvalStatus === "Refused") return "Rejeitado";
  if (p.approvalStatus === "Unknown") return "SemDecisao";
  return "PorPagar";
}

/** Os estados que o filtro da lista oferece, pela ordem do trabalho. */
export const ESTADOS_PAGAMENTO: readonly { valor: EstadoPagamento; rotulo: string }[] = [
  { valor: "PorAprovar", rotulo: "Por aprovar" },
  { valor: "Aprovado", rotulo: "Aprovado, por pagar" },
  { valor: "Rejeitado", rotulo: "Rejeitado" },
  { valor: "SemDecisao", rotulo: "Sem decisão" },
  { valor: "Pago", rotulo: "Pago" },
  { valor: "Cancelado", rotulo: "Cancelado" },
];

export function EstadoPedidoPagamento({ p }: { p: { status: string; approvalStatus?: string | null } }) {
  const e = estadoPagamento(p);
  if (e === "PorAprovar") return <Badge tom="info">Por aprovar</Badge>;
  if (e === "Aprovado") return <Badge tom="aviso">Aprovado, por pagar</Badge>;
  if (e === "Rejeitado") return <Badge tom="erro">Rejeitado</Badge>;
  if (e === "SemDecisao") return <Badge>Sem decisão</Badge>;
  if (e === "PorPagar") return <Badge tom="aviso">Por pagar</Badge>;
  if (e === "Pago") return <Badge tom="sucesso">Pago</Badge>;
  if (e === "Cancelado") return <Badge>Cancelado</Badge>;
  return <Badge>{p.status}</Badge>;
}

/** Categorias de anexo de um pedido de pagamento (texto livre na API). */
/** Conta do imobilizado (classe 1: 11 a 14): a compra lança a dívida na 37.1 e o IVA na 34.5.2.2 (ADR-108). */
export const eContaImobilizado = (codigo: string) => /^1[1-4](\.|$)/.test(codigo.trim());

/** País e mercado do fornecedor, como a factura de compra os leu (ADR-106). */
export const textoPaisMercado = (pais: string | null | undefined, mercado: string | null | undefined) =>
  [pais ? `país ${pais}` : null, mercado === "Foreign" ? "mercado estrangeiro" : mercado === "Domestic" ? "mercado nacional" : null].filter(Boolean).join(", ");

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
