/**
 * Manutenção prevista (§5.13, F12): os planos activos de todas as viaturas a
 * vencer nos próximos dias (no URL), os em atraso primeiro, com ligação à
 * viatura.
 */
import { Link, useSearchParams } from "react-router";
import { formatarData } from "@/lib/format/data";
import { Badge } from "@/ui/Badge";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { usePlanosPrevistos, type PlanoPrevisto } from "../api";

const JANELAS = [7, 30, 60, 90] as const;

export default function Manutencao() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const pedido = Number(params.get("dias"));
  const dias = (JANELAS as readonly number[]).includes(pedido) ? pedido : 30;
  const lista = usePlanosPrevistos({ dias, pagina, tamanho });
  const colunas: Coluna<PlanoPrevisto>[] = [
    {
      id: "viatura",
      cabecalho: "Viatura",
      celula: (p) => (
        <Link to={`/frota/${p.vehicleId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {p.plateNumber}
        </Link>
      ),
    },
    { id: "plano", cabecalho: "Plano", className: "max-w-[20rem]", celula: (p) => <span className="break-words">{p.description}</span> },
    {
      id: "data",
      cabecalho: "Prevista para",
      celula: (p) => (
        <span className="inline-flex flex-wrap items-center gap-1">
          {formatarData(p.nextDueOn)}
          {p.isOverdue ? <Badge tom="erro">Em atraso</Badge> : null}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader titulo="Manutenção prevista" descricao="Planos preventivos a vencer em toda a frota; os em atraso também aparecem." />
      <div className="mb-4 flex max-w-xs flex-col gap-1.5">
        <label htmlFor="janela-manutencao" className="text-sm font-medium text-foreground">
          A vencer em
        </label>
        <Select
          id="janela-manutencao"
          value={String(dias)}
          onChange={(e) => {
            const n = new URLSearchParams(window.location.search);
            if (e.target.value === "30") n.delete("dias");
            else n.set("dias", e.target.value);
            n.delete("pagina");
            setParams(n);
          }}
        >
          {JANELAS.map((d) => (
            <option key={d} value={String(d)}>
              {d} dias
            </option>
          ))}
        </Select>
      </div>
      <Tabela
        rotulo="Manutenção prevista"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(p) => p.planId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={`Nada previsto nos próximos ${String(dias)} dias.`}
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
