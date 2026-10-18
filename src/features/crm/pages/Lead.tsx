/**
 * Um lead: dados, avançar (contactado, qualificado), desqualificar com o
 * motivo, converter em cliente (novo ou existente) e, se quiser, numa
 * oportunidade; as actividades.
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { eApiError } from "@/lib/api/problem";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useAvancarLead, useConverterLead, useDesqualificarLead, useGuardarLead, useLead, type Lead as TipoLead } from "../api";
import { ActividadesDe, EstadoLead, useEscolhas } from "../comum";
import { CamposDoLead, camposDoLead } from "../FormularioLead";
import { conversaoParaApi, errosConversao, errosLead, leadParaApi, MOEDAS, temErros, type CamposConversao } from "../regras";

function Corrigir({ l }: { l: TipoLead }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => camposDoLead(l));
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarLead();
  const idForm = useId();
  const erros = errosLead(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(camposDoLead(l));
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
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Corrigir ${l.name}`} rotuloConfirmar="Guardar" aCarregar={guardar.isPending} erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined} formulario={idForm} largo>
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: l.leadId, corpo: leadParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <CamposDoLead v={v} setV={setV} erros={tentou ? erros : {}} />
        </form>
      </Confirmar>
    </>
  );
}

function Avancar({ l }: { l: TipoLead }) {
  const avancar = useAvancarLead(l.leadId);
  return (
    <>
      {l.status === "New" ? (
        <Button variante="secondary" aCarregar={avancar.isPending && avancar.variables === "Contacted"} onClick={() => avancar.mutate("Contacted")}>
          Marcar contactado
        </Button>
      ) : null}
      <Button variante="secondary" aCarregar={avancar.isPending && avancar.variables === "Qualified"} onClick={() => avancar.mutate("Qualified")}>
        Qualificar
      </Button>
      {avancar.error ? <ErrorPanel erro={avancar.error} className="basis-full" /> : null}
    </>
  );
}

function Converter({ l }: { l: TipoLead }) {
  const { pode } = useUtilizador();
  const escolhas = useEscolhas();
  const escolheCliente = escolhas.clientes.length > 0 || pode("commercial.customers.read");
  const vazio = (): CamposConversao => ({ destino: "novo", cliente: "", nif: "", morada: "", cidade: "", pais: "AO", abrirOportunidade: true, titulo: l.company ? `${l.company}` : l.name, valor: "", moeda: "AOA" });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const converter = useConverterLead(l.leadId);
  const idForm = useId();
  const erros = errosConversao(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(vazio());
      setTentou(false);
      converter.reset();
    }
  };
  const campo = (k: keyof CamposConversao) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  // NIF repetido: o servidor diz que cliente já o tem; oferece converter para esse.
  const repetido = converter.error && eApiError(converter.error) && converter.error.status === 409 && escolheCliente;
  return (
    <>
      <Button onClick={() => setAberto(true)}>Converter em cliente</Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Converter ${l.name}`}
        descricao="O lead fica convertido e deixa de mudar. As actividades continuam ligadas a ele."
        rotuloConfirmar="Converter"
        aCarregar={converter.isPending}
        erro={converter.error ? <ErrorPanel erro={converter.error} /> : undefined}
        formulario={idForm}
        largo
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || converter.isPending) return;
            converter.mutate(conversaoParaApi(v), { onSuccess: () => fechar(false) });
          }}
        >
          {escolheCliente ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">Cliente</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name={`${idForm}-destino`} className="accent-primary" checked={v.destino === "novo"} onChange={() => setV((x) => ({ ...x, destino: "novo" }))} />
                  Novo cliente
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name={`${idForm}-destino`} className="accent-primary" checked={v.destino === "existente"} onChange={() => setV((x) => ({ ...x, destino: "existente" }))} />
                  Cliente já registado
                </label>
              </div>
            </fieldset>
          ) : null}
          {repetido ? <Alert tom="info" titulo="Já existe um cliente com este NIF: escolha «Cliente já registado» e converta para ele." /> : null}
          {v.destino === "existente" ? (
            <Field rotulo="Cliente registado" erro={tentou ? erros.cliente : undefined}>
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.cliente} onChange={campo("cliente")}>
                  <option value="">Escolha…</option>
                  {escolhas.clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <p className="text-sm text-muted-foreground sm:col-span-2">
                O cliente fica com o nome «{l.company ?? l.name}», o e-mail e o telefone do lead, e {l.name} como pessoa de contacto.
              </p>
              <Field rotulo="NIF" erro={tentou ? erros.nif : undefined}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" inputMode="numeric" aria-describedby={descricao} invalido={invalido} value={v.nif} onChange={campo("nif")} />}
              </Field>
              <Field rotulo="País" ajuda="Código de duas letras." erro={tentou ? erros.pais : undefined}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={2} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.pais} onChange={campo("pais")} />}
              </Field>
              <Field rotulo="Morada de facturação" erro={tentou ? erros.morada : undefined}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.morada} onChange={campo("morada")} />}
              </Field>
              <Field rotulo="Cidade" erro={tentou ? erros.cidade : undefined}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.cidade} onChange={campo("cidade")} />}
              </Field>
            </div>
          )}
          <Checkbox rotulo="Abrir também uma oportunidade" checked={v.abrirOportunidade} onChange={(e) => setV((x) => ({ ...x, abrirOportunidade: e.target.checked }))} />
          {v.abrirOportunidade ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field rotulo="Título da oportunidade" erro={tentou ? erros.titulo : undefined} className="sm:col-span-3">
                {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={campo("titulo")} />}
              </Field>
              <Field rotulo="Valor estimado (opcional)" erro={tentou ? erros.valor : undefined} className="sm:col-span-2">
                {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={campo("valor")} />}
              </Field>
              <Field rotulo="Moeda">
                {({ id, descricao }) => (
                  <Select id={id} aria-describedby={descricao} value={v.moeda} onChange={campo("moeda")}>
                    {MOEDAS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

export default function Lead() {
  const { leadId = "" } = useParams();
  const lead = useLead(leadId);
  const { pode } = useUtilizador();
  const desqualificar = useDesqualificarLead(leadId);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/leads">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Leads
      </Link>
    </Button>
  );
  if (lead.isPending) return <CarregandoPagina />;
  if (lead.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={lead.error} tentarDeNovo={() => void lead.refetch()} />
      </>
    );
  }
  const l = lead.data;
  const aberto = l.status !== "Converted" && l.status !== "Disqualified";
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
        titulo={l.name}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoLead estado={l.status} />
            <span>
              {l.company ?? "Sem empresa"} · registado {formatarDataHora(l.createdAt)}
            </span>
          </span>
        }
      />
      {escreve && aberto ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Converter l={l} />
          <Corrigir l={l} />
          {l.status !== "Qualified" ? <Avancar l={l} /> : null}
          <ConfirmarComMotivo
            rotuloBotao="Desqualificar"
            titulo={`Desqualificar ${l.name}?`}
            descricao="O lead fica fechado e deixa de mudar."
            rotuloConfirmar="Desqualificar"
            maximo={500}
            aCarregar={desqualificar.isPending}
            erro={desqualificar.error ? <ErrorPanel erro={desqualificar.error} /> : undefined}
            aoConfirmar={(motivo, fechar) => desqualificar.mutate(motivo, { onSuccess: fechar })}
          />
        </div>
      ) : null}
      {l.status === "Disqualified" ? <Alert tom="erro" className="mb-6" titulo="Desqualificado.">{l.disqualificationReason}</Alert> : null}
      {l.status === "Converted" ? (
        <Alert tom="sucesso" className="mb-6" titulo="Convertido.">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {l.convertedCustomerId ? (
              pode("commercial.customers.read") ? (
                <Link to={`/clientes/${l.convertedCustomerId}`} className="underline underline-offset-4">
                  Ver o cliente
                </Link>
              ) : null
            ) : null}
            {l.convertedOpportunityId ? (
              <Link to={`/oportunidades/${l.convertedOpportunityId}`} className="underline underline-offset-4">
                Ver a oportunidade
              </Link>
            ) : null}
          </span>
        </Alert>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Dados</CardTitle>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {linha("E-mail", l.email)}
            {linha("Telefone", l.phone)}
            {linha("Origem", l.source)}
            {linha("Responsável", l.ownerName ?? "—")}
          </dl>
          {l.notes ? <p className="mt-4 whitespace-pre-line break-words text-sm text-foreground">{l.notes}</p> : null}
        </Card>
        <ActividadesDe sobre={{ lead: l.leadId }} rotulo={l.name} />
      </div>
    </>
  );
}
