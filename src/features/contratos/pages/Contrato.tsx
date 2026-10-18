/**
 * Um contrato de cliente: dados e vigência; activar, suspender, renovar,
 * terminar com o motivo, corrigir; aditamentos (valor e/ou fim) e anexos.
 */
import { ArrowLeft, Download } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { TIPOS_CONTRATO, useAditamentos, useAditar, useAnexar, useAnexos, useCicloContrato, useContratoCliente, useDescarregarAnexo, useGuardarContrato, type Aditamento, type Anexo, type Contrato as TipoC, type TipoContrato } from "../api";
import { ClienteDoContrato, EstadoContratoBadge, Fim, valorContrato } from "../comum";
import { CamposDoContrato } from "../Formulario";
import { aditamentoParaApi, camposDoContrato, contratoParaApi, erroRenovacao, errosAditamento, errosContrato, type CamposAditamento } from "../regras";

const temErros = (e: Record<string, string | undefined>) => Object.values(e).some(Boolean);

function Corrigir({ c }: { c: TipoC }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => camposDoContrato(c));
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarContrato();
  const idForm = useId();
  const erros = errosContrato(v, false);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(camposDoContrato(c));
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
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Corrigir ${c.number}`}
        descricao="Para mudar o valor ou o fim de um contrato em vigor com registo, use antes um aditamento."
        rotuloConfirmar="Guardar"
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
            guardar.mutate({ id: c.contractId, corpo: contratoParaApi(v, c) }, { onSuccess: () => fechar(false) });
          }}
        >
          <CamposDoContrato v={v} setV={setV} erros={tentou ? erros : {}} novo={false} />
        </form>
      </Confirmar>
    </>
  );
}

function Simples({ c, accao }: { c: TipoC; accao: "activar" | "suspender" }) {
  const [aberto, setAberto] = useState(false);
  const ciclo = useCicloContrato(c.contractId);
  const activar = accao === "activar";
  return (
    <>
      <Button variante={activar ? "primary" : "secondary"} onClick={() => setAberto(true)}>
        {activar ? "Activar" : "Suspender"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) ciclo.reset();
        }}
        titulo={activar ? `Activar ${c.number}?` : `Suspender ${c.number}?`}
        descricao={activar ? "Passa a estar em vigor." : "Fica suspenso até o voltar a activar."}
        rotuloConfirmar={activar ? "Activar" : "Suspender"}
        aCarregar={ciclo.isPending}
        erro={ciclo.error ? <ErrorPanel erro={ciclo.error} /> : undefined}
        aoConfirmar={() => (ciclo.isPending ? undefined : ciclo.mutate({ accao }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Renovar({ c }: { c: TipoC }) {
  const [aberto, setAberto] = useState(false);
  const [fim, setFim] = useState("");
  const [tentou, setTentou] = useState(false);
  const ciclo = useCicloContrato(c.contractId);
  const erro = erroRenovacao(fim, c.endsOn);
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        Renovar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            ciclo.reset();
            setFim("");
            setTentou(false);
          }
        }}
        titulo={`Renovar ${c.number}`}
        descricao={c.endsOn ? `Acaba a ${formatarData(c.endsOn)}. O novo fim tem de ser depois.` : "Não tem fim: a renovação passa a dar-lhe um."}
        rotuloConfirmar="Renovar"
        aCarregar={ciclo.isPending}
        erro={ciclo.error ? <ErrorPanel erro={ciclo.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || ciclo.isPending) return;
          ciclo.mutate({ accao: "renovar", fim }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Novo fim" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" min={c.endsOn ?? undefined} aria-describedby={descricao} invalido={invalido} value={fim} onChange={(e) => setFim(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function Terminar({ c }: { c: TipoC }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ em: hojeIso(), motivo: "" });
  const [tentou, setTentou] = useState(false);
  const ciclo = useCicloContrato(c.contractId);
  const motivo = normalizarTexto(v.motivo, true);
  const erros = { motivo: motivo === "" ? "Indique o motivo." : motivo.length > 500 ? "No máximo 500 caracteres." : undefined, em: v.em === "" ? "Indique a data." : undefined };
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        Terminar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            ciclo.reset();
            setV({ em: hojeIso(), motivo: "" });
            setTentou(false);
          }
        }}
        titulo={`Terminar ${c.number}?`}
        descricao="Um contrato terminado não volta atrás nem se altera."
        rotuloConfirmar="Terminar"
        variante="destructive"
        aCarregar={ciclo.isPending}
        erro={ciclo.error ? <ErrorPanel erro={ciclo.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (temErros(erros) || ciclo.isPending) return;
          ciclo.mutate({ accao: "terminar", em: v.em, motivo }, { onSuccess: () => setAberto(false) });
        }}
      >
        <div className="grid gap-4">
          <Field rotulo="Termina a" erro={tentou ? erros.em : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.em} onChange={(e) => setV((x) => ({ ...x, em: e.target.value }))} />}
          </Field>
          <Field rotulo="Motivo" erro={tentou ? erros.motivo : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={500} aria-describedby={descricao} invalido={invalido} value={v.motivo} onChange={(e) => setV((x) => ({ ...x, motivo: e.target.value }))} />}
          </Field>
        </div>
      </Confirmar>
    </>
  );
}

const ADITAMENTO_VAZIO: CamposAditamento = { descricao: "", efeito: "", variacao: "", novoFim: "" };

function Aditar({ c }: { c: TipoC }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(ADITAMENTO_VAZIO);
  const [tentou, setTentou] = useState(false);
  const aditar = useAditar(c.contractId);
  const idForm = useId();
  const erros = errosAditamento(v, { valor: c.value, inicio: c.startsOn });
  const campo = (k: keyof CamposAditamento) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(ADITAMENTO_VAZIO);
      setTentou(false);
      aditar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)}>
        Novo aditamento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Aditamento a ${c.number}`}
        descricao={`Valor actual: ${valorContrato(c)}; fim: ${c.endsOn ? formatarData(c.endsOn) : "sem fim"}. O contrato fica com os valores novos.`}
        rotuloConfirmar="Registar aditamento"
        aCarregar={aditar.isPending}
        erro={aditar.error ? <ErrorPanel erro={aditar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || aditar.isPending) return;
            aditar.mutate(aditamentoParaApi(v), { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={campo("descricao")} />}
          </Field>
          <Field rotulo={`Variação do valor em ${c.currency ?? "AOA"} (opcional)`} ajuda="Negativa para reduzir." erro={tentou ? erros.variacao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.variacao} onChange={campo("variacao")} />}
          </Field>
          <Field rotulo="Novo fim (opcional)" erro={tentou ? erros.novoFim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.novoFim} onChange={campo("novoFim")} />}
          </Field>
          <Field rotulo="Com efeito a (opcional)" ajuda="Vazio, hoje." erro={tentou ? erros.efeito : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.efeito} onChange={campo("efeito")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Aditamentos({ c, escreve }: { c: TipoC; escreve: boolean }) {
  const lista = useAditamentos(c.contractId);
  const colunas: Coluna<Aditamento>[] = [
    { id: "n", cabecalho: "N.º", celula: (a) => String(a.number) },
    { id: "desc", cabecalho: "Descrição", className: "max-w-[20rem] whitespace-pre-line break-words", celula: (a) => a.description },
    { id: "efeito", cabecalho: "Efeito", esconderAte: "sm", celula: (a) => formatarData(a.effectiveOn) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (a) => (a.valueChange === null ? "—" : `${Number(a.valueChange) > 0 ? "+" : ""}${moeda(a.valueChange, c.currency ?? "AOA")}`) },
    { id: "fim", cabecalho: "Fim", esconderAte: "md", celula: (a) => (a.newEndsOn ? `${a.previousEndsOn ? formatarData(a.previousEndsOn) : "sem fim"} → ${formatarData(a.newEndsOn)}` : "—") },
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Aditamentos</CardTitle>
        {escreve && c.status !== "Terminated" ? <Aditar c={c} /> : null}
      </div>
      <Tabela
        rotulo="Aditamentos"
        colunas={colunas}
        linhas={lista.data ? [...lista.data].sort((a, b) => Number(a.number) - Number(b.number)) : undefined}
        chave={(a) => a.amendmentId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem aditamentos."
      />
    </Card>
  );
}

function Anexar({ c }: { c: TipoC }) {
  const [aberto, setAberto] = useState(false);
  const [doc, setDoc] = useState<Documento | null>(null);
  const [categoria, setCategoria] = useState("Contrato assinado");
  const [tentou, setTentou] = useState(false);
  const anexar = useAnexar(c.contractId);
  const cat = normalizarTexto(categoria);
  const erros = { doc: doc === null ? "Carregue o ficheiro." : undefined, categoria: cat === "" ? "Indique a categoria." : cat.length > 60 ? "No máximo 60 caracteres." : undefined };
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setDoc(null);
      setCategoria("Contrato assinado");
      setTentou(false);
      anexar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)}>
        Anexar ficheiro
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Anexar a ${c.number}`}
        rotuloConfirmar="Anexar"
        aCarregar={anexar.isPending}
        erro={anexar.error ? <ErrorPanel erro={anexar.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (temErros(erros) || !doc || anexar.isPending) return;
          anexar.mutate({ documentId: doc.documentId, category: cat }, { onSuccess: () => fechar(false) });
        }}
      >
        <div className="grid gap-4">
          <CarregarFicheiro rotulo="Ficheiro" categoria="Contrato de cliente" documento={doc} aoMudar={setDoc} />
          {tentou && erros.doc ? (
            <p role="alert" className="text-xs text-danger">
              {erros.doc}
            </p>
          ) : null}
          <Field rotulo="Categoria" erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={categoria} onChange={(e) => setCategoria(e.target.value)} />}
          </Field>
        </div>
      </Confirmar>
    </>
  );
}

/** Pelo contrato, em anexo (B37). */
function DescarregarAnexo({ contractId, a }: { contractId: string; a: Anexo }) {
  const d = useDescarregarAnexo(contractId);
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={d.isPending} onClick={() => d.mutate(a)} aria-label={`Descarregar ${a.fileName ?? a.category}`}>
        <Download strokeWidth={1.75} aria-hidden />
        Descarregar
      </Button>
      {d.error ? <ErrorPanel erro={d.error} /> : null}
    </span>
  );
}

function Anexos({ c, escreve }: { c: TipoC; escreve: boolean }) {
  const { pode } = useUtilizador();
  const lista = useAnexos(c.contractId);
  const colunas: Coluna<Anexo>[] = [
    {
      id: "cat",
      cabecalho: "Anexo",
      className: "max-w-[16rem]",
      celula: (a) => (
        <span className="flex flex-col">
          <span className="truncate font-medium">{a.fileName ?? a.category}</span>
          {a.fileName ? <span className="truncate text-xs text-muted-foreground">{a.category}</span> : null}
        </span>
      ),
    },
    { id: "quando", cabecalho: "Anexado a", esconderAte: "sm", celula: (a) => formatarDataHora(a.attachedAt) },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (a) => <DescarregarAnexo contractId={c.contractId} a={a} /> },
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Anexos</CardTitle>
        {escreve && pode("documents.write") ? <Anexar c={c} /> : null}
      </div>
      <Tabela
        rotulo="Anexos"
        colunas={colunas}
        linhas={lista.data}
        chave={(a) => a.linkId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem anexos."
      />
    </Card>
  );
}

export default function Contrato() {
  const { contractId = "" } = useParams();
  const contrato = useContratoCliente(contractId);
  const { pode } = useUtilizador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/contratos-clientes">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Contratos de clientes
      </Link>
    </Button>
  );
  if (contrato.isPending) return <CarregandoPagina />;
  if (contrato.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={contrato.error} tentarDeNovo={() => void contrato.refetch()} />
      </>
    );
  }
  const c = contrato.data;
  const escreve = pode("commercial.contracts.write");
  const terminado = c.status === "Terminated";
  const linha = (r: string, v: ReactNode) => (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{r}</dt>
      <dd className="break-words text-base text-foreground">{v ?? "—"}</dd>
    </div>
  );
  const horas = (h: number | string | null) => (h === null ? "—" : `${String(h)} h`);
  return (
    <>
      {voltar}
      <PageHeader
        titulo={c.title}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoContratoBadge estado={c.status} />
            <span>
              {c.number} · {TIPOS_CONTRATO[c.kind as TipoContrato] ?? c.kind}
            </span>
          </span>
        }
      />
      {escreve && !terminado ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {c.status === "Draft" || c.status === "Suspended" ? <Simples c={c} accao="activar" /> : null}
          {c.status === "Active" ? <Simples c={c} accao="suspender" /> : null}
          <Renovar c={c} />
          <Corrigir c={c} />
          <Terminar c={c} />
        </div>
      ) : null}
      {terminado ? (
        <Alert tom="erro" className="mb-6" titulo={`Terminado a ${c.terminatedOn ? formatarData(c.terminatedOn) : "—"}.`}>
          {c.terminationReason}
        </Alert>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Dados</CardTitle>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {linha("Cliente", <ClienteDoContrato c={c} />)}
            {linha("Valor", valorContrato(c))}
            {linha("Início", formatarData(c.startsOn))}
            {linha("Fim", <Fim c={c} />)}
            {linha("Aviso de renovação", c.renewalNoticeDays === null ? "—" : `${String(c.renewalNoticeDays)} dias`)}
            {linha("Renova automaticamente", c.autoRenew ? "Sim" : "Não")}
            {linha("SLA de resposta", horas(c.slaResponseHours))}
            {linha("SLA de resolução", horas(c.slaResolutionHours))}
          </dl>
          {c.notes ? <p className="mt-4 whitespace-pre-line break-words text-sm text-foreground">{c.notes}</p> : null}
        </Card>
        <Anexos c={c} escreve={escreve} />
        <div className="lg:col-span-2">
          <Aditamentos c={c} escreve={escreve} />
        </div>
      </div>
    </>
  );
}
