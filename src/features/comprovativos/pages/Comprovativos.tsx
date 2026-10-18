/**
 * Comprovativos de pagamento enviados no portal do cliente (§5.13, F10). Por
 * omissão, os que esperam confirmação; o estado fica no URL (`?estado=`).
 */
import { useId } from "react";
import { useSearchParams } from "react-router";
import { ESTADOS_COMPROVATIVO } from "@/features/portalcliente";
import { Select } from "@/ui/Controlos";
import { PageHeader } from "@/ui/Layout";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useFilaComprovativos, type EstadoPedido } from "../api";
import { FilaComprovativos } from "../Fila";

export default function Comprovativos() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const idEstado = useId();
  const bruto = params.get("estado");
  // Sem `estado` no URL, a fila; `todos` mostra tudo.
  const estado: EstadoPedido | null = bruto === "todos" ? null : bruto === "Confirmed" || bruto === "Rejected" ? bruto : "Pending";
  const fila = useFilaComprovativos({ estado, cliente: null, pagina, tamanho });
  const filtrar = (v: string) => {
    const n = new URLSearchParams(window.location.search);
    if (v === "Pending") n.delete("estado");
    else n.set("estado", v);
    n.delete("pagina");
    setParams(n);
  };
  return (
    <>
      <PageHeader titulo="Comprovativos" descricao="Transferências que os clientes dizem ter feito, com o comprovativo. Confirmar regista o recibo." />
      <div className="mb-4 flex flex-col gap-1.5 sm:w-64">
        <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
          Estado
        </label>
        <Select id={idEstado} value={estado ?? "todos"} onChange={(e) => filtrar(e.target.value)}>
          {Object.entries(ESTADOS_COMPROVATIVO).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
          <option value="todos">Todos</option>
        </Select>
      </div>
      <FilaComprovativos
        rotulo="Comprovativos"
        linhas={fila.data?.items}
        aCarregar={fila.isPending}
        erro={fila.error}
        vazio={estado === "Pending" ? "Nenhum comprovativo por confirmar." : "Nenhum comprovativo."}
        paginacao={fila.data ? { pagina, tamanho, total: fila.data.total, aoMudar: mudar } : undefined}
      />
    </>
  );
}
