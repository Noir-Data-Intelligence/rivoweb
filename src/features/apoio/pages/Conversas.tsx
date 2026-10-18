/**
 * Conversas e pedidos de suporte do portal do cliente (§5.13, F10). Por
 * omissão, as abertas; o estado e o tipo ficam no URL.
 */
import { useId } from "react";
import { Link, useSearchParams } from "react-router";
import { EstadoConversa, TIPOS_CONVERSA } from "@/features/portalcliente";
import { formatarDataHora } from "@/lib/format/data";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useConversas, type EstadoConversaFiltro, type ResumoConversa, type TipoConversaFiltro } from "../api";

export default function Conversas() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const idEstado = useId();
  const idTipo = useId();
  const e = params.get("estado");
  const t = params.get("tipo");
  // Sem `estado`, as abertas; `todas` mostra também as fechadas.
  const estado: EstadoConversaFiltro | null = e === "todas" ? null : e === "Closed" ? "Closed" : "Open";
  const tipo: TipoConversaFiltro | null = t === "Message" || t === "Ticket" ? t : null;
  const conversas = useConversas({ estado, tipo, pagina, tamanho });
  const filtrar = (k: string, v: string | null) => {
    const n = new URLSearchParams(window.location.search);
    if (v) n.set(k, v);
    else n.delete(k);
    n.delete("pagina");
    setParams(n);
  };
  const colunas: Coluna<ResumoConversa>[] = [
    {
      id: "cliente",
      cabecalho: "Cliente",
      className: "max-w-[14rem]",
      celula: (c) => (
        <Link to={`/conversas/${c.conversationId}`} state={{ cliente: c.customerName }} className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
          {c.customerName}
        </Link>
      ),
    },
    {
      id: "assunto",
      cabecalho: "Assunto",
      className: "max-w-[18rem]",
      celula: (c) => (
        <span className="flex flex-col">
          <span className="truncate">{c.subject ?? "Mensagens"}</span>
          <span className="text-xs text-muted-foreground">{TIPOS_CONVERSA[c.kind] ?? c.kind}</span>
        </span>
      ),
    },
    {
      id: "aberta",
      cabecalho: "Aberta a",
      esconderAte: "md",
      celula: (c) => formatarDataHora(c.openedAt),
    },
    {
      id: "mensagens",
      cabecalho: "Mensagens",
      alinhar: "direita",
      esconderAte: "sm",
      celula: (c) => String(c.messageCount),
    },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (c) => <EstadoConversa estado={c.status} />,
    },
  ];
  return (
    <>
      <PageHeader titulo="Conversas" descricao="Mensagens e pedidos de suporte que os clientes abrem no portal." />
      <div className="mb-4 grid gap-3 sm:max-w-md sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
            Estado
          </label>
          <Select id={idEstado} value={estado ?? "todas"} onChange={(x) => filtrar("estado", x.target.value === "Open" ? null : x.target.value)}>
            <option value="Open">Abertas</option>
            <option value="Closed">Fechadas</option>
            <option value="todas">Todas</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idTipo} className="text-sm font-medium text-foreground">
            Tipo
          </label>
          <Select id={idTipo} value={tipo ?? ""} onChange={(x) => filtrar("tipo", x.target.value || null)}>
            <option value="">Todos</option>
            <option value="Message">{TIPOS_CONVERSA.Message}</option>
            <option value="Ticket">{TIPOS_CONVERSA.Ticket}</option>
          </Select>
        </div>
      </div>
      <Tabela
        rotulo="Conversas"
        colunas={colunas}
        linhas={conversas.data?.items}
        chave={(c) => c.conversationId}
        aCarregar={conversas.isPending}
        erro={conversas.error ? <ErrorPanel erro={conversas.error} tentarDeNovo={() => void conversas.refetch()} /> : undefined}
        vazio={estado === "Open" ? "Nenhuma conversa aberta." : "Nenhuma conversa."}
        rodape={conversas.data && conversas.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={conversas.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
