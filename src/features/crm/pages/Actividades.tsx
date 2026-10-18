/**
 * Actividades do CRM (§5.12, F11): reuniões, chamadas, e-mails, tarefas e
 * notas de todos os leads, oportunidades e clientes. Por omissão as por
 * fazer; o filtro fica no URL. Registam-se a partir do lead, da
 * oportunidade ou do cliente.
 */
import { useId } from "react";
import { Link, useSearchParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useActividades, useOportunidades, type Actividade } from "../api";
import { colunasActividade, NomeCliente, ordenarActividades, useNomes } from "../comum";

export default function Actividades() {
  const [params, setParams] = useSearchParams();
  const { pode } = useUtilizador();
  const nomes = useNomes();
  const oportunidades = useOportunidades({ etapa: null, cliente: null });
  const idFeitas = useId();
  const f = params.get("feitas");
  const feitas = f === "todas" ? null : f === "sim";
  const lista = useActividades({ feitas });
  const filtrar = (x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x === "nao") n.delete("feitas");
    else n.set("feitas", x);
    setParams(n);
  };
  const titulo = (id: string) => oportunidades.data?.find((o) => o.opportunityId === id)?.title ?? "Oportunidade";
  const sobre: Coluna<Actividade> = {
    id: "sobre",
    cabecalho: "Sobre",
    esconderAte: "md",
    className: "max-w-[16rem] truncate",
    celula: (a) =>
      a.opportunityId ? (
        <Link to={`/oportunidades/${a.opportunityId}`} className="underline-offset-4 hover:underline">
          {titulo(a.opportunityId)}
        </Link>
      ) : a.leadId ? (
        <Link to={`/leads/${a.leadId}`} className="underline-offset-4 hover:underline">
          {nomes.lead(a.leadId) ?? "Lead"}
        </Link>
      ) : (
        <NomeCliente id={a.customerId} nome={nomes.cliente(a.customerId)} />
      ),
  };
  return (
    <>
      <PageHeader titulo="Actividades" descricao="Reuniões, chamadas, e-mails, tarefas e notas do CRM. Registam-se no lead ou na oportunidade." />
      <div className="mb-4 flex flex-col gap-1.5 sm:w-64">
        <label htmlFor={idFeitas} className="text-sm font-medium text-foreground">
          Mostrar
        </label>
        <Select id={idFeitas} value={feitas === null ? "todas" : feitas ? "sim" : "nao"} onChange={(x) => filtrar(x.target.value)}>
          <option value="nao">Por fazer</option>
          <option value="sim">Feitas</option>
          <option value="todas">Todas</option>
        </Select>
      </div>
      <Tabela
        rotulo="Actividades"
        colunas={colunasActividade(pode("commercial.crm.write"), [sobre])}
        linhas={lista.data ? ordenarActividades(lista.data) : undefined}
        chave={(a) => a.activityId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={feitas === false ? "Nada por fazer." : "Sem actividades."}
      />
    </>
  );
}
