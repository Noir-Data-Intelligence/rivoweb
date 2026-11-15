/** Caixa de aprovações (§5.5): por omissão, os pedidos à espera da própria pessoa. */
import { useId } from "react";
import { Link, useSearchParams } from "react-router";
import { formatarDataHora } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { usePedidos, type Pedido } from "../api";
import { EstadoPedido, nomeProcesso, PrazoDoPasso, PROCESSOS, useEuColaborador, useNomeColaborador, useQuemMeDelegou, VistasAprovacoes } from "../comum";

export default function Caixa() {
  const [params, setParams] = useSearchParams();
  const vista = params.get("vista") === "todos" ? "todos" : "para-mim";
  const tipo = Object.keys(PROCESSOS).includes(params.get("tipo") ?? "") ? params.get("tipo") : null;
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const eu = useEuColaborador();
  const nome = useNomeColaborador();
  const quemMeDelegou = useQuemMeDelegou();
  /** Quem me delegou e espera neste pedido, quando eu não estou no passo (ADR-129). */
  const porDelegacao = (p: Pedido) => (eu !== null && !p.pendingApprovers.includes(eu) ? p.pendingApprovers.flatMap((id) => (quemMeDelegou.has(id) ? [quemMeDelegou.get(id) ?? "Colaborador"] : [])) : []);
  const idTipo = useId();
  // «Para mim» precisa do colaborador da conta; sem ficha ligada, não há caixa própria.
  const pedidos = usePedidos({ pagina, tamanho, tipo, para: vista === "para-mim" ? eu : null }, vista === "todos" || eu !== null);
  const colunas: Coluna<Pedido>[] = [
    {
      id: "processo",
      cabecalho: "Pedido",
      celula: (p) => (
        <div className="flex flex-col">
          <Link to={`/aprovacoes/${p.requestId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {nomeProcesso(p.processType)}
          </Link>
          {p.summary ? <span className="line-clamp-2 text-sm text-muted-foreground">{p.summary}</span> : null}
        </div>
      ),
    },
    { id: "de", cabecalho: "De", esconderAte: "sm", celula: (p) => nome(p.requestedByEmployeeId, p.requestedByName) },
    {
      id: "passo",
      cabecalho: "Passo",
      esconderAte: "md",
      celula: (p) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {`${String(p.currentStep)} de ${String(p.totalSteps)}`}
          {p.currentChecklist && p.currentChecklist.length > 0 ? <Badge tom="info">Validação</Badge> : null}
        </span>
      ),
    },
    { id: "data", cabecalho: "Submetido", esconderAte: "lg", celula: (p) => formatarDataHora(p.submittedAt) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (p) => (
        <span className="flex flex-col items-start gap-1">
          <EstadoPedido estado={p.status} />
          {p.status === "InProgress" || p.status === "ClarificationRequested" ? <PrazoDoPasso ate={p.currentStepDueAt} escaladoEm={p.escalatedAt} /> : null}
          {porDelegacao(p).length > 0 ? <span className="text-xs text-muted-foreground">Por delegação de {porDelegacao(p).join(", ")}</span> : null}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader titulo="Aprovações" descricao="Pedidos que passam por decisão: atribuições de cargo, férias, pagamentos, compras, salários." />
      <VistasAprovacoes actual={vista} />
      <div className="mb-4 flex flex-col gap-1.5 sm:w-72">
        <label htmlFor={idTipo} className="text-sm font-medium text-foreground">
          Tipo
        </label>
        <Select
          id={idTipo}
          value={tipo ?? ""}
          onChange={(e) =>
            setParams((a) => {
              const n = new URLSearchParams(a);
              if (e.target.value) n.set("tipo", e.target.value);
              else n.delete("tipo");
              n.delete("pagina");
              return n;
            })
          }
        >
          <option value="">Todos os tipos</option>
          {Object.entries(PROCESSOS).map(([k, n]) => (
            <option key={k} value={k}>
              {n}
            </option>
          ))}
        </Select>
      </div>
      {vista === "para-mim" && eu === null ? (
        <Alert tom="info" titulo="A sua conta não está ligada a uma ficha de colaborador.">
          Só um colaborador decide aprovações (é o cargo que dá a autoridade). Pode ver todos os pedidos em «Todos».
        </Alert>
      ) : (
        <Tabela
          rotulo="Pedidos de aprovação"
          colunas={colunas}
          linhas={pedidos.data?.items}
          chave={(p) => p.requestId}
          aCarregar={pedidos.isPending}
          erro={pedidos.error ? <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} /> : undefined}
          vazio={vista === "para-mim" ? "Não há pedidos à sua espera." : "Ainda não há pedidos de aprovação."}
          rodape={pedidos.data && pedidos.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={pedidos.data.total} aoMudar={mudar} /> : undefined}
        />
      )}
    </>
  );
}
