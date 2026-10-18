/** Peças comuns dos contratos de clientes. */
import { Link } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { Badge, type TomBadge } from "@/ui/Badge";
import { ESTADOS_CONTRATO, type Contrato, type EstadoContrato } from "./api";

const TOM: Record<string, TomBadge> = { Draft: "neutro", Active: "sucesso", Suspended: "aviso", Terminated: "erro" };
export const EstadoContratoBadge = ({ estado }: { estado: string }) => <Badge tom={TOM[estado] ?? "neutro"}>{ESTADOS_CONTRATO[estado as EstadoContrato] ?? estado}</Badge>;

/** O nome do cliente (da vista, B35); ligação à ficha para quem lê clientes. */
export function ClienteDoContrato({ c }: { c: Pick<Contrato, "customerId" | "customerName"> }) {
  const { pode } = useUtilizador();
  const nome = c.customerName ?? "—";
  return pode("commercial.customers.read") && c.customerName ? (
    <Link to={`/clientes/${c.customerId}`} className="underline-offset-4 hover:underline">
      {nome}
    </Link>
  ) : (
    <>{nome}</>
  );
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
