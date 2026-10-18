/** Peças comuns do CRM: rótulos, estados, nomes e o bloco de actividades. */
import { useId, useState } from "react";
import { Link } from "react-router";
import { useTodosClientes } from "@/features/clientes";
import { useUtilizador } from "@/features/identity";
import { useTodosColaboradores } from "@/features/rh";
import { dataHoraLocalDeInstante, formatarDataHora } from "@/lib/format/data";
import { Badge, type TomBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useActividades, useConcluirActividade, useLeads, useRegistarActividade, type Actividade, type EtapaAberta, type TipoActividade } from "./api";
import { actividadeParaApi, errosActividade, temErros, type CamposActividade } from "./regras";

export const ESTADOS_LEAD: Readonly<Record<string, string>> = { New: "Novo", Contacted: "Contactado", Qualified: "Qualificado", Disqualified: "Desqualificado", Converted: "Convertido" };
export const ETAPAS: Readonly<Record<string, string>> = { Prospecting: "Prospecção", Qualification: "Qualificação", Proposal: "Proposta", Negotiation: "Negociação", Won: "Ganha", Lost: "Perdida" };
export const ETAPAS_ABERTAS: readonly EtapaAberta[] = ["Prospecting", "Qualification", "Proposal", "Negotiation"];
export const TIPOS_ACTIVIDADE: Readonly<Record<TipoActividade, string>> = { Meeting: "Reunião", Call: "Chamada", Email: "E-mail", Task: "Tarefa", Note: "Nota" };

const TOM_LEAD: Record<string, TomBadge> = { New: "info", Contacted: "neutro", Qualified: "aviso", Disqualified: "erro", Converted: "sucesso" };
const TOM_ETAPA: Record<string, TomBadge> = { Won: "sucesso", Lost: "erro" };

export const EstadoLead = ({ estado }: { estado: string }) => <Badge tom={TOM_LEAD[estado] ?? "neutro"}>{ESTADOS_LEAD[estado] ?? estado}</Badge>;
export const EtapaBadge = ({ etapa }: { etapa: string }) => <Badge tom={TOM_ETAPA[etapa] ?? "info"}>{ETAPAS[etapa] ?? etapa}</Badge>;

/**
 * Nomes para os ids que o comercial devolve (B35): clientes para quem lê
 * clientes, colaboradores para quem lê os RH, leads para quem lê o CRM. Sem
 * permissão, «—»; nunca o id.
 */
export function useNomes() {
  const { pode } = useUtilizador();
  const clientes = useTodosClientes(pode("commercial.customers.read"));
  const pessoas = useTodosColaboradores(pode("hr.employees.read"));
  const leads = useLeads({ estado: null, pagina: 1, tamanho: 200 }, pode("commercial.crm.read"));
  return {
    cliente: (id: string | null) => (id === null ? null : (clientes.data?.items.find((c) => c.customerId === id)?.name ?? null)),
    pessoa: (id: string | null) => (id === null ? null : (pessoas.data?.items.find((c) => c.employeeId === id)?.fullName ?? null)),
    lead: (id: string | null) => {
      if (id === null) return null;
      const l = leads.data?.items.find((x) => x.leadId === id);
      return l ? (l.company ? `${l.name} (${l.company})` : l.name) : null;
    },
    clientes: clientes.data?.items ?? [],
    leads: leads.data?.items ?? [],
    lePessoas: pode("hr.employees.read"),
  };
}

/** Ligação à ficha do cliente quando se lê clientes; senão, o nome ou «—». */
export function NomeCliente({ id, nome }: { id: string | null; nome: string | null }) {
  const { pode } = useUtilizador();
  if (id === null) return <>—</>;
  if (nome && pode("commercial.customers.read")) {
    return (
      <Link to={`/clientes/${id}`} className="underline-offset-4 hover:underline">
        {nome}
      </Link>
    );
  }
  return <>{nome ?? "—"}</>;
}

/** Actividades mais recentes primeiro; as por fazer à frente. */
export const ordenarActividades = (xs: readonly Actividade[]) => [...xs].sort((a, b) => Number(a.done) - Number(b.done) || b.scheduledAt.localeCompare(a.scheduledAt));

function RegistarActividade({ sobre, rotulo }: { sobre: { lead?: string; oportunidade?: string; cliente?: string }; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  const vazio = (): CamposActividade => ({ tipo: "Call", assunto: "", quando: dataHoraLocalDeInstante(new Date()), feita: false, notas: "" });
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarActividade();
  const idForm = useId();
  const erros = errosActividade(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(vazio());
      setTentou(false);
      registar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)}>
        Registar actividade
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Actividade · ${rotulo}`} rotuloConfirmar="Registar" aCarregar={registar.isPending} erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || registar.isPending) return;
            registar.mutate(actividadeParaApi(v, sobre), { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value as TipoActividade }))}>
                {Object.entries(TIPOS_ACTIVIDADE).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Quando" erro={tentou ? erros.quando : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="datetime-local" aria-describedby={descricao} invalido={invalido} value={v.quando} onChange={(e) => setV((x) => ({ ...x, quando: e.target.value }))} />}
          </Field>
          <Field rotulo="Assunto" erro={tentou ? erros.assunto : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.assunto} onChange={(e) => setV((x) => ({ ...x, assunto: e.target.value }))} />}
          </Field>
          <Field rotulo="Notas (opcional)" erro={tentou ? erros.notas : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={4000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={(e) => setV((x) => ({ ...x, notas: e.target.value }))} />}
          </Field>
          <div className="sm:col-span-2">
            <Checkbox rotulo="Já está feita" checked={v.feita} onChange={(e) => setV((x) => ({ ...x, feita: e.target.checked }))} />
          </div>
        </form>
      </Confirmar>
    </>
  );
}

function Concluir({ a }: { a: Actividade }) {
  const concluir = useConcluirActividade();
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={concluir.isPending} onClick={() => concluir.mutate(a.activityId)} aria-label={`Marcar feita: ${a.subject}`}>
        Marcar feita
      </Button>
      {concluir.error ? <ErrorPanel erro={concluir.error} /> : null}
    </span>
  );
}

export function colunasActividade(escreve: boolean, extra: Coluna<Actividade>[] = []): Coluna<Actividade>[] {
  return [
    {
      id: "assunto",
      cabecalho: "Actividade",
      className: "max-w-[20rem]",
      celula: (a) => (
        <span className="flex flex-col">
          <span className="truncate font-medium">{a.subject}</span>
          <span className="text-xs text-muted-foreground">{TIPOS_ACTIVIDADE[a.kind as TipoActividade] ?? a.kind}</span>
          {a.notes ? <span className="whitespace-pre-line text-xs text-muted-foreground">{a.notes}</span> : null}
        </span>
      ),
    },
    ...extra,
    { id: "quando", cabecalho: "Quando", esconderAte: "sm", celula: (a) => formatarDataHora(a.scheduledAt) },
    { id: "estado", cabecalho: "Estado", celula: (a) => (a.done ? <Badge tom="sucesso">Feita</Badge> : new Date(a.scheduledAt) < new Date() ? <Badge tom="aviso">Atrasada</Badge> : <Badge tom="info">Por fazer</Badge>) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (a: Actividade) => (a.done ? null : <Concluir a={a} />) }] : []),
  ];
}

/** As actividades de um lead, de uma oportunidade ou de um cliente, e registar outra. */
export function ActividadesDe({ sobre, rotulo }: { sobre: { lead?: string; oportunidade?: string; cliente?: string }; rotulo: string }) {
  const { pode } = useUtilizador();
  const escreve = pode("commercial.crm.write");
  const lista = useActividades({ ...sobre, feitas: null });
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Actividades</CardTitle>
        {escreve ? <RegistarActividade sobre={sobre} rotulo={rotulo} /> : null}
      </div>
      <Tabela
        rotulo="Actividades"
        colunas={colunasActividade(escreve)}
        linhas={lista.data ? ordenarActividades(lista.data) : undefined}
        chave={(a) => a.activityId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem actividades."
      />
    </Card>
  );
}
