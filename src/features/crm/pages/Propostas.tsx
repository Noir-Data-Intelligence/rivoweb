/**
 * Propostas comerciais (§5.12, F11): lista (mais recentes primeiro, estado no
 * URL) e criar um rascunho, com ou sem modelo.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can } from "@/features/identity";
import { formatarData, formatarDataDeInstante, hojeIso } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { EstadoPropostaBadge, NomeCliente } from "../comum";
import { CamposDaProposta, PROPOSTA_VAZIA } from "../FormularioProposta";
import { errosProposta, ESTADOS_PROPOSTA, propostaParaApi, useGuardarProposta, usePropostasPagina, type EstadoProposta, type Proposta } from "../propostas";
import { temErros } from "../regras";

function NovaProposta() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(PROPOSTA_VAZIA);
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarProposta();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosProposta(v, true, hojeIso());
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(PROPOSTA_VAZIA);
      setTentou(false);
      guardar.reset();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova proposta
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Nova proposta"
        descricao="Fica em rascunho: as linhas acrescentam-se a seguir."
        rotuloConfirmar="Criar rascunho"
        aCarregar={guardar.isPending}
        erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
        formulario={idForm}
        largo
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: null, corpo: propostaParaApi(v) }, { onSuccess: (id) => void navegar(`/propostas/${id}`) });
          }}
        >
          <CamposDaProposta v={v} setV={setV} erros={tentou ? erros : {}} nova />
        </form>
      </Confirmar>
    </>
  );
}

export default function Propostas() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const idEstado = useId();
  const e = params.get("estado");
  const estado = e !== null && e in ESTADOS_PROPOSTA ? (e as EstadoProposta) : null;
  const lista = usePropostasPagina({ estado, pagina, tamanho });
  const filtrar = (x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x) n.set("estado", x);
    else n.delete("estado");
    n.delete("pagina");
    setParams(n);
  };
  const colunas: Coluna<Proposta>[] = [
    {
      id: "numero",
      cabecalho: "Proposta",
      className: "max-w-[18rem]",
      celula: (p) => (
        <span className="flex flex-col">
          <Link to={`/propostas/${p.proposalId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {p.title}
          </Link>
          <span className="text-xs text-muted-foreground">{p.number}</span>
        </span>
      ),
    },
    { id: "para", cabecalho: "Para", esconderAte: "md", className: "max-w-[14rem] truncate", celula: (p) => (p.customerId ? <NomeCliente id={p.customerId} nome={p.customerName ?? null} /> : (p.leadName ?? "—")) },
    { id: "criada", cabecalho: "Criada a", esconderAte: "lg", celula: (p) => formatarDataDeInstante(p.createdAt) },
    { id: "validade", cabecalho: "Válida até", esconderAte: "sm", celula: (p) => (p.validUntil ? formatarData(p.validUntil) : "—") },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (p) => moeda(p.total, p.currency) },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoPropostaBadge estado={p.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Propostas"
        descricao="Propostas comerciais a clientes e leads: rascunho, envio e decisão do cliente."
        accao={
          <Can requer="commercial.crm.write">
            <NovaProposta />
          </Can>
        }
      />
      <div className="mb-4 flex flex-col gap-1.5 sm:w-64">
        <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
          Estado
        </label>
        <Select id={idEstado} value={estado ?? ""} onChange={(x) => filtrar(x.target.value)}>
          <option value="">Todos</option>
          {Object.entries(ESTADOS_PROPOSTA).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <Tabela
        rotulo="Propostas"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(p) => p.proposalId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado ? "Nenhuma proposta neste estado." : "Ainda não há propostas."}
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
