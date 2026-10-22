/**
 * Seguros de frota (§5.13, F12): as apólices de todas as viaturas, ou só as
 * em vigor a caducar nos próximos dias (no URL); corrigir, anular e gerir os
 * sinistros. Contratar faz-se na ficha da viatura.
 */
import { useSearchParams } from "react-router";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { useApolices } from "../api";
import { TabelaApolices } from "../Seguros";

const JANELAS = [30, 60, 90] as const;

export default function Seguros() {
  const [params, setParams] = useSearchParams();
  const pedido = Number(params.get("caducam"));
  const dias = (JANELAS as readonly number[]).includes(pedido) ? pedido : null;
  const lista = useApolices({ viatura: null, dias });
  return (
    <>
      <PageHeader titulo="Seguros de frota" descricao="Apólices das viaturas e os seus sinistros. Para contratar, abra a viatura." />
      <div className="mb-4 flex max-w-xs flex-col gap-1.5">
        <label htmlFor="janela-seguros" className="text-sm font-medium text-foreground">
          Mostrar
        </label>
        <Select
          id="janela-seguros"
          value={dias === null ? "" : String(dias)}
          onChange={(e) => {
            const n = new URLSearchParams(window.location.search);
            if (e.target.value === "") n.delete("caducam");
            else n.set("caducam", e.target.value);
            setParams(n);
          }}
        >
          <option value="">Todas as apólices</option>
          {JANELAS.map((d) => (
            <option key={d} value={String(d)}>
              Em vigor, a caducar em {d} dias
            </option>
          ))}
        </Select>
      </div>
      <TabelaApolices
        comViatura
        linhas={lista.data ? [...lista.data].sort((a, b) => a.endsOn.localeCompare(b.endsOn)) : undefined}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={dias === null ? "Sem apólices." : `Nenhuma apólice a caducar nos próximos ${String(dias)} dias.`}
      />
    </>
  );
}
