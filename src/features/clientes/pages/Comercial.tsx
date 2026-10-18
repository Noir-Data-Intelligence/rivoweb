/**
 * O comercial de um cliente, na ficha (F11): oportunidades, propostas,
 * contratos e acções de cobrança, cada bloco só para quem o lê.
 */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { TIPOS_ACCAO, useAccoesCobranca, type TipoAccao } from "@/features/cobrancas";
import { EstadoContratoBadge, Fim, useContratosClientes, valorContrato } from "@/features/contratos";
import { EstadoPropostaBadge, EtapaBadge, useOportunidades, usePropostas } from "@/features/crm";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Skeleton } from "@/ui/Layout";

function Bloco<T>({ titulo, q, vazio, item }: { titulo: string; q: { isPending: boolean; error: unknown; data: readonly T[] | undefined; refetch: () => unknown }; vazio: string; item: (x: T) => ReactNode }) {
  return (
    <Card>
      <CardTitle>{titulo}</CardTitle>
      {q.isPending ? (
        <Skeleton className="mt-3 h-10" />
      ) : q.error ? (
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} className="mt-3" />
      ) : !q.data || q.data.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border text-sm" aria-label={titulo}>
          {q.data.map(item)}
        </ul>
      )}
    </Card>
  );
}

function Oportunidades({ id }: { id: string }) {
  const q = useOportunidades({ etapa: null, cliente: id });
  const ordenadas = q.data ? [...q.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : undefined;
  return (
    <Bloco
      titulo="Oportunidades"
      q={{ ...q, data: ordenadas }}
      vazio="Sem oportunidades."
      item={(o) => (
        <li key={o.opportunityId} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <Link to={`/oportunidades/${o.opportunityId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {o.title}
          </Link>
          <span className="inline-flex items-center gap-2 tabular-nums">
            {moeda(o.estimatedValue, o.currency)} <EtapaBadge etapa={o.stage} />
          </span>
        </li>
      )}
    />
  );
}

function Propostas({ id }: { id: string }) {
  const q = usePropostas({ estado: null, cliente: id });
  return (
    <Bloco
      titulo="Propostas"
      q={q}
      vazio="Sem propostas."
      item={(p) => (
        <li key={p.proposalId} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <Link to={`/propostas/${p.proposalId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {p.number} · {p.title}
          </Link>
          <span className="inline-flex items-center gap-2 tabular-nums">
            {moeda(p.total, p.currency)} <EstadoPropostaBadge estado={p.status} />
          </span>
        </li>
      )}
    />
  );
}

function Contratos({ id }: { id: string }) {
  const q = useContratosClientes({ estado: null, tipo: null, aExpirar: null, cliente: id });
  return (
    <Bloco
      titulo="Contratos"
      q={q}
      vazio="Sem contratos."
      item={(c) => (
        <li key={c.contractId} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="flex flex-col">
            <Link to={`/contratos-clientes/${c.contractId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
              {c.number} · {c.title}
            </Link>
            <span className="text-xs text-muted-foreground">
              Fim: <Fim c={c} />
            </span>
          </span>
          <span className="inline-flex items-center gap-2 tabular-nums">
            {valorContrato(c)} <EstadoContratoBadge estado={c.status} />
          </span>
        </li>
      )}
    />
  );
}

function Cobrancas({ id }: { id: string }) {
  const q = useAccoesCobranca({ cliente: id });
  return (
    <Bloco
      titulo="Acções de cobrança"
      q={q}
      vazio="Sem acções de cobrança."
      item={(a) => (
        <li key={a.actionId} className="py-2">
          <p className="text-foreground">
            {TIPOS_ACCAO[a.kind as TipoAccao] ?? a.kind} · {formatarDataHora(a.occurredAt)}
          </p>
          <p className="whitespace-pre-line break-words text-muted-foreground">{a.notes}</p>
        </li>
      )}
    />
  );
}

export function ComercialDoCliente({ customerId }: { customerId: string }) {
  const { pode } = useUtilizador();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {pode("commercial.crm.read") ? <Oportunidades id={customerId} /> : null}
      {pode("commercial.crm.read") ? <Propostas id={customerId} /> : null}
      {pode("commercial.contracts.read") ? <Contratos id={customerId} /> : null}
      {pode("commercial.collections.read") ? <Cobrancas id={customerId} /> : null}
    </div>
  );
}
