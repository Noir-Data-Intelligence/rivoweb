/**
 * Uma oportunidade: dados, mudar de etapa, corrigir, ganhar (exige cliente),
 * perder com o motivo; o histórico das etapas e as actividades.
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { useGanharOportunidade, useGuardarOportunidade, useHistoricoOportunidade, useMoverOportunidade, useOportunidade, usePerderOportunidade, type EtapaAberta, type Oportunidade as TipoOportunidade } from "../api";
import { ActividadesDe, ETAPAS, ETAPAS_ABERTAS, EtapaBadge, NomeCliente, useNomes } from "../comum";
import { CamposDaOportunidade, camposDaOportunidade } from "../FormularioOportunidade";
import { errosOportunidade, oportunidadeParaApi, temErros } from "../regras";

function Corrigir({ o }: { o: TipoOportunidade }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => camposDaOportunidade(o));
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarOportunidade();
  const idForm = useId();
  const erros = errosOportunidade(v, false);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(camposDaOportunidade(o));
    else {
      setTentou(false);
      guardar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => fechar(true)}>
        Corrigir
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Corrigir ${o.title}`} rotuloConfirmar="Guardar" aCarregar={guardar.isPending} erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined} formulario={idForm} largo>
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: o.opportunityId, corpo: oportunidadeParaApi(v, o.ownerEmployeeId, { customerId: o.customerId, leadId: o.leadId }) }, { onSuccess: () => fechar(false) });
          }}
        >
          <CamposDaOportunidade v={v} setV={setV} erros={tentou ? erros : {}} nova={false} />
        </form>
      </Confirmar>
    </>
  );
}

function MudarEtapa({ o }: { o: TipoOportunidade }) {
  const mover = useMoverOportunidade();
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Etapa
      </label>
      <Select id={id} value={o.stage} disabled={mover.isPending} onChange={(e) => mover.mutate({ id: o.opportunityId, etapa: e.target.value as EtapaAberta, posicao: null })} className="sm:w-56">
        {ETAPAS_ABERTAS.map((x) => (
          <option key={x} value={x}>
            {ETAPAS[x]}
          </option>
        ))}
      </Select>
      {mover.error ? <ErrorPanel erro={mover.error} /> : null}
    </div>
  );
}

function Ganhar({ o }: { o: TipoOportunidade }) {
  const [aberto, setAberto] = useState(false);
  const ganhar = useGanharOportunidade(o.opportunityId);
  return (
    <>
      <Button onClick={() => setAberto(true)}>Marcar como ganha</Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) ganhar.reset();
        }}
        titulo={`Ganhar «${o.title}»?`}
        descricao="Fica com probabilidade 100% e deixa de mudar."
        rotuloConfirmar="Ganha"
        aCarregar={ganhar.isPending}
        erro={ganhar.error ? <ErrorPanel erro={ganhar.error} /> : undefined}
        aoConfirmar={() => (ganhar.isPending ? undefined : ganhar.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Historico({ id }: { id: string }) {
  const h = useHistoricoOportunidade(id);
  return (
    <Card>
      <CardTitle>Etapas</CardTitle>
      {h.isPending ? (
        <Skeleton className="mt-3 h-16" />
      ) : h.error ? (
        <ErrorPanel erro={h.error} tentarDeNovo={() => void h.refetch()} className="mt-3" />
      ) : (
        <ol className="mt-2 divide-y divide-border text-sm" aria-label="Histórico das etapas">
          {[...h.data]
            .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
            .map((p) => (
              <li key={`${p.toStage}-${p.changedAt}`} className="py-2">
                <p className="text-foreground">
                  {p.fromStage ? `${ETAPAS[p.fromStage] ?? p.fromStage} → ` : ""}
                  {ETAPAS[p.toStage] ?? p.toStage}
                </p>
                <p className="text-muted-foreground">
                  {formatarDataHora(p.changedAt)}
                  {p.daysInPreviousStage !== null ? ` · ${formatarNumeroDecimal(String(p.daysInPreviousStage), 1)} dias na anterior` : ""}
                </p>
              </li>
            ))}
        </ol>
      )}
    </Card>
  );
}

export default function Oportunidade() {
  const { opportunityId = "" } = useParams();
  const oportunidade = useOportunidade(opportunityId);
  const perder = usePerderOportunidade(opportunityId);
  const { pode } = useUtilizador();
  const nomes = useNomes();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/oportunidades">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Oportunidades
      </Link>
    </Button>
  );
  if (oportunidade.isPending) return <CarregandoPagina />;
  if (oportunidade.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={oportunidade.error} tentarDeNovo={() => void oportunidade.refetch()} />
      </>
    );
  }
  const o = oportunidade.data;
  const aberta = o.stage !== "Won" && o.stage !== "Lost";
  const escreve = pode("commercial.crm.write");
  const linha = (r: string, v: ReactNode) => (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{r}</dt>
      <dd className="break-words text-base text-foreground">{v ?? "—"}</dd>
    </div>
  );
  return (
    <>
      {voltar}
      <PageHeader
        titulo={o.title}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EtapaBadge etapa={o.stage} />
            <span>aberta {formatarDataHora(o.createdAt)}{o.closedAt ? ` · fechada ${formatarDataHora(o.closedAt)}` : ""}</span>
          </span>
        }
      />
      {escreve && aberta ? (
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <MudarEtapa o={o} />
          <Corrigir o={o} />
          {o.customerId ? <Ganhar o={o} /> : null}
          <ConfirmarComMotivo
            rotuloBotao="Marcar como perdida"
            titulo={`Perder «${o.title}»?`}
            descricao="Fica com probabilidade 0% e deixa de mudar."
            rotuloConfirmar="Perdida"
            maximo={500}
            aCarregar={perder.isPending}
            erro={perder.error ? <ErrorPanel erro={perder.error} /> : undefined}
            aoConfirmar={(motivo, fechar) => perder.mutate(motivo, { onSuccess: fechar })}
          />
        </div>
      ) : null}
      {escreve && aberta && !o.customerId ? (
        <Alert tom="info" className="mb-6" titulo="Ainda é de um lead: para a ganhar, converta primeiro o lead em cliente.">
          {o.leadId ? (
            <Link to={`/leads/${o.leadId}`} className="underline underline-offset-4">
              Abrir o lead
            </Link>
          ) : null}
        </Alert>
      ) : null}
      {o.stage === "Lost" && o.lostReason ? <Alert tom="erro" className="mb-6" titulo="Perdida.">{o.lostReason}</Alert> : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Dados</CardTitle>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {linha("Cliente", o.customerId ? <NomeCliente id={o.customerId} nome={nomes.cliente(o.customerId)} /> : "—")}
            {linha(
              "Lead",
              o.leadId ? (
                <Link to={`/leads/${o.leadId}`} className="underline-offset-4 hover:underline">
                  {nomes.lead(o.leadId) ?? "Abrir o lead"}
                </Link>
              ) : (
                "—"
              ),
            )}
            {linha("Valor estimado", moeda(o.estimatedValue, o.currency))}
            {linha("Probabilidade", `${String(o.probability)}% · ponderado ${moeda(o.weightedValue, o.currency)}`)}
            {linha("Fecho previsto", o.expectedCloseDate ? formatarData(o.expectedCloseDate) : "—")}
            {nomes.lePessoas ? linha("Responsável", nomes.pessoa(o.ownerEmployeeId)) : null}
          </dl>
          {o.notes ? <p className="mt-4 whitespace-pre-line break-words text-sm text-foreground">{o.notes}</p> : null}
        </Card>
        <Historico id={o.opportunityId} />
        <div className="lg:col-span-2">
          <ActividadesDe sobre={{ oportunidade: o.opportunityId }} rotulo={o.title} />
        </div>
      </div>
    </>
  );
}
