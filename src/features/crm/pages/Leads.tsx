/**
 * Leads (§5.12, F11): contactos por qualificar, com o estado no URL e
 * paginados pelo servidor. Registar um lead novo.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Can } from "@/features/identity";
import { formatarDataDeInstante } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useGuardarLead, useLeads, type EstadoLead, type Lead } from "../api";
import { ESTADOS_LEAD, EstadoLead as EstadoLeadBadge } from "../comum";
import { CamposDoLead, LEAD_VAZIO } from "../FormularioLead";
import { errosLead, leadParaApi, temErros } from "../regras";

function NovoLead() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(LEAD_VAZIO);
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarLead();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosLead(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(LEAD_VAZIO);
      setTentou(false);
      guardar.reset();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo lead
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo="Novo lead" rotuloConfirmar="Registar" aCarregar={guardar.isPending} erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined} formulario={idForm} largo>
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: null, corpo: leadParaApi(v, null) }, { onSuccess: (id) => void navegar(`/leads/${id}`) });
          }}
        >
          <CamposDoLead v={v} setV={setV} erros={tentou ? erros : {}} />
        </form>
      </Confirmar>
    </>
  );
}

export default function Leads() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const idEstado = useId();
  const e = params.get("estado");
  const estado = e !== null && e in ESTADOS_LEAD ? (e as EstadoLead) : null;
  const leads = useLeads({ estado, pagina, tamanho });
  const filtrar = (x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x) n.set("estado", x);
    else n.delete("estado");
    n.delete("pagina");
    setParams(n);
  };
  const colunas: Coluna<Lead>[] = [
    {
      id: "nome",
      cabecalho: "Lead",
      className: "max-w-[18rem]",
      celula: (l) => (
        <span className="flex flex-col">
          <Link to={`/leads/${l.leadId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {l.name}
          </Link>
          {l.company ? <span className="truncate text-xs text-muted-foreground">{l.company}</span> : null}
        </span>
      ),
    },
    { id: "contacto", cabecalho: "Contacto", esconderAte: "md", className: "max-w-[14rem] truncate", celula: (l) => l.email ?? l.phone ?? "—" },
    { id: "origem", cabecalho: "Origem", esconderAte: "lg", celula: (l) => l.source ?? "—" },
    { id: "criado", cabecalho: "Registado a", esconderAte: "sm", celula: (l) => formatarDataDeInstante(l.createdAt) },
    { id: "estado", cabecalho: "Estado", celula: (l) => <EstadoLeadBadge estado={l.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Leads"
        descricao="Contactos interessados, por qualificar. Um lead qualificado converte-se em cliente e oportunidade."
        accao={
          <Can requer="commercial.crm.write">
            <NovoLead />
          </Can>
        }
      />
      <div className="mb-4 flex flex-col gap-1.5 sm:w-64">
        <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
          Estado
        </label>
        <Select id={idEstado} value={estado ?? ""} onChange={(x) => filtrar(x.target.value)}>
          <option value="">Todos</option>
          {Object.entries(ESTADOS_LEAD).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <Tabela
        rotulo="Leads"
        colunas={colunas}
        linhas={leads.data?.items}
        chave={(l) => l.leadId}
        aCarregar={leads.isPending}
        erro={leads.error ? <ErrorPanel erro={leads.error} tentarDeNovo={() => void leads.refetch()} /> : undefined}
        vazio={estado ? "Nenhum lead neste estado." : "Ainda não há leads."}
        rodape={leads.data && leads.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={leads.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
