/** Peças comuns dos contratos de clientes. */
import { Link } from "react-router";
import { useTodosClientes } from "@/features/clientes";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { Badge, type TomBadge } from "@/ui/Badge";
import { ESTADOS_CONTRATO, type Contrato, type EstadoContrato } from "./api";

const TOM: Record<string, TomBadge> = { Draft: "neutro", Active: "sucesso", Suspended: "aviso", Terminated: "erro" };
export const EstadoContratoBadge = ({ estado }: { estado: string }) => <Badge tom={TOM[estado] ?? "neutro"}>{ESTADOS_CONTRATO[estado as EstadoContrato] ?? estado}</Badge>;

/** Nome do cliente para quem lê clientes; senão «—» (B35). */
export function useNomeCliente() {
  const { pode } = useUtilizador();
  const le = pode("commercial.customers.read");
  const clientes = useTodosClientes(le);
  return (id: string) => {
    const nome = clientes.data?.items.find((c) => c.customerId === id)?.name ?? null;
    if (!nome) return "—";
    return le ? (
      <Link to={`/clientes/${id}`} className="underline-offset-4 hover:underline">
        {nome}
      </Link>
    ) : (
      nome
    );
  };
}

export const valorContrato = (c: Contrato) => (c.value === null ? "—" : moeda(c.value, c.currency ?? "AOA"));

/** «até 31/12/2026 · faltam 74 dias», «sem fim». */
export function Fim({ c }: { c: Contrato }) {
  if (c.endsOn === null) return <>sem fim</>;
  const d = c.daysToExpiry === null ? null : Number(c.daysToExpiry);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {formatarData(c.endsOn)}
      {d !== null && d < 0 ? <Badge tom="erro">acabou há {String(-d)} dias</Badge> : null}
      {d !== null && d >= 0 && d <= 30 ? <Badge tom="aviso">{d === 0 ? "acaba hoje" : `faltam ${String(d)} dias`}</Badge> : null}
    </span>
  );
}
