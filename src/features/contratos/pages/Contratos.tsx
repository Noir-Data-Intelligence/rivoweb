/**
 * Contratos de clientes (§5.12, F11): lista pelo fim (os que acabam primeiro à
 * frente), com estado, tipo e «a acabar» no URL; registar um contrato.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Can } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { ESTADOS_CONTRATO, TIPOS_CONTRATO, useContratosPagina, useGuardarContrato, type Contrato, type EstadoContrato, type TipoContrato } from "../api";
import { ClienteDoContrato, EstadoContratoBadge, Fim, valorContrato } from "../comum";
import { CamposDoContrato, CONTRATO_VAZIO } from "../Formulario";
import { contratoParaApi, errosContrato } from "../regras";

const temErros = (e: Record<string, string | undefined>) => Object.values(e).some(Boolean);

function NovoContrato() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => CONTRATO_VAZIO(hojeIso()));
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarContrato();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosContrato(v, true);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(CONTRATO_VAZIO(hojeIso()));
      setTentou(false);
      guardar.reset();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo contrato
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Novo contrato"
        descricao="Fica em rascunho até o activar."
        rotuloConfirmar="Registar"
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
            guardar.mutate({ id: null, corpo: contratoParaApi(v) }, { onSuccess: (id) => void navegar(`/contratos-clientes/${id}`) });
          }}
        >
          <CamposDoContrato v={v} setV={setV} erros={tentou ? erros : {}} novo />
        </form>
      </Confirmar>
    </>
  );
}

export default function Contratos() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const idEstado = useId();
  const idTipo = useId();
  const idPrazo = useId();
  const e = params.get("estado");
  const estado = e !== null && e in ESTADOS_CONTRATO ? (e as EstadoContrato) : null;
  const t = params.get("tipo");
  const tipo = t !== null && t in TIPOS_CONTRATO ? (t as TipoContrato) : null;
  const p = params.get("acabam");
  const aExpirar = p === "30" || p === "60" || p === "90" ? Number(p) : null;
  const lista = useContratosPagina({ estado, tipo, aExpirar, pagina, tamanho });
  const filtrar = (k: string, x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x) n.set(k, x);
    else n.delete(k);
    n.delete("pagina");
    setParams(n);
  };
  const colunas: Coluna<Contrato>[] = [
    {
      id: "titulo",
      cabecalho: "Contrato",
      className: "max-w-[18rem]",
      celula: (c) => (
        <span className="flex flex-col">
          <Link to={`/contratos-clientes/${c.contractId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {c.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            {c.number} · {TIPOS_CONTRATO[c.kind as TipoContrato] ?? c.kind}
          </span>
        </span>
      ),
    },
    { id: "cliente", cabecalho: "Cliente", esconderAte: "md", className: "max-w-[14rem] truncate", celula: (c) => <ClienteDoContrato c={c} /> },
    { id: "inicio", cabecalho: "Início", esconderAte: "lg", celula: (c) => formatarData(c.startsOn) },
    { id: "fim", cabecalho: "Fim", celula: (c) => <Fim c={c} /> },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", esconderAte: "sm", celula: (c) => valorContrato(c) },
    { id: "estado", cabecalho: "Estado", celula: (c) => <EstadoContratoBadge estado={c.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Contratos de clientes"
        descricao="Contratos comerciais e jurídicos com clientes: vigência, valor, SLA, aditamentos e anexos."
        accao={
          <Can requer="commercial.contracts.write">
            <NovoContrato />
          </Can>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
            Estado
          </label>
          <Select id={idEstado} value={estado ?? ""} onChange={(x) => filtrar("estado", x.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS_CONTRATO).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idTipo} className="text-sm font-medium text-foreground">
            Tipo
          </label>
          <Select id={idTipo} value={tipo ?? ""} onChange={(x) => filtrar("tipo", x.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TIPOS_CONTRATO).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idPrazo} className="text-sm font-medium text-foreground">
            Acabam em
          </label>
          <Select id={idPrazo} value={aExpirar === null ? "" : String(aExpirar)} onChange={(x) => filtrar("acabam", x.target.value)}>
            <option value="">Qualquer data</option>
            <option value="30">30 dias</option>
            <option value="60">60 dias</option>
            <option value="90">90 dias</option>
          </Select>
        </div>
      </div>
      <Tabela
        rotulo="Contratos de clientes"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(c) => c.contractId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado || tipo || aExpirar !== null ? "Nenhum contrato com estes filtros." : "Ainda não há contratos."}
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
