/** Peças partilhadas pelos ecrãs de contas a pagar. */
import { useMeuPainel } from "@/features/dashboard";
import type { components } from "@/lib/api/schema";
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

const DESFECHO = ["Importado", "Duplicado", "Recusado"] as const;

export function ResultadoImportacao({ r }: { r: components["schemas"]["CsvImportSummary"] }) {
  const problemas = r.rows.filter((x) => Number(x.outcome) !== 0);
  return (
    <div className="flex flex-col gap-3">
      <Alert
        tom={Number(r.rejected) > 0 ? "aviso" : "sucesso"}
        titulo={`${String(r.imported)} importados, ${String(r.duplicates)} duplicados, ${String(r.rejected)} recusados (de ${String(r.totalRows)}).`}
      />
      {problemas.length > 0 ? (
        <ul className="max-h-48 divide-y divide-border overflow-y-auto text-sm">
          {problemas.map((x) => (
            <li key={String(x.line)} className="py-1.5">
              Linha {String(x.line)}: {DESFECHO[Number(x.outcome)] ?? "—"}
              {x.detail ? ` · ${x.detail}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
