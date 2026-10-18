/**
 * Um projecto: resumo (progresso, orçamento, fechar), marcos com os
 * comentários (da equipa e do cliente), tarefas, quadro e Gantt. A vista fica
 * no URL.
 */
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataDeInstante, formatarDataHora, hojeIso } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { BarraProgresso } from "@/ui/BarraProgresso";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useAcaoProjecto, useComentariosMarcos, useProjecto, type Marco, type Projecto as TipoP } from "../api";
import { EstadoMarco, EstadoProjecto } from "../comum";
import { GanttDoProjecto } from "../GanttProjecto";
import { QuadroDoProjecto } from "../Quadro";
import { erroFecho, errosComentarioMarco, errosMarco, errosOrcamento, orcamentoParaApi, temErros } from "../regras";
import { TarefasDoProjecto } from "../Tarefas";

const MOEDAS = ["AOA", "USD", "EUR"] as const;

function Orcamento({ p }: { p: TipoP }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ valor: "", moeda: p.budget?.currency ?? "AOA" });
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const idForm = useId();
  const erros = errosOrcamento(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV({ valor: p.budget ? String(p.budget.amount).replace(".", ",") : "", moeda: p.budget?.currency ?? "AOA" });
    else {
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => fechar(true)}>
        {p.budget ? "Rever orçamento" : "Definir orçamento"}
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Orçamento de ${p.name}`} descricao={p.budget ? "Uma revisão não muda a moeda." : undefined} rotuloConfirmar="Guardar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "orcamento", corpo: orcamentoParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Valor aprovado" erro={tentou ? erros.valor : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={(e) => setV((x) => ({ ...x, valor: e.target.value }))} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.moeda} disabled={!!p.budget} onChange={(e) => setV((x) => ({ ...x, moeda: e.target.value }))}>
                {MOEDAS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function FecharProjecto({ p }: { p: TipoP }) {
  const [aberto, setAberto] = useState(false);
  const [fim, setFim] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const erro = erroFecho(fim, p.startDate);
  const abertas = p.tasks.filter((t) => t.status === "Pending").length;
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        Fechar projecto
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            accao.reset();
            setTentou(false);
          }
        }}
        titulo={`Fechar ${p.name}?`}
        descricao={`Um projecto fechado não muda mais.${abertas > 0 ? ` Ainda tem ${String(abertas)} tarefas em curso.` : ""}`}
        rotuloConfirmar="Fechar projecto"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || accao.isPending) return;
          accao.mutate({ acto: "fechar", corpo: { endDate: fim } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Data de fecho" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" min={p.startDate} aria-describedby={descricao} invalido={invalido} value={fim} onChange={(e) => setFim(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function NovoMarco({ p }: { p: TipoP }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ nome: "", data: "" });
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const idForm = useId();
  const erros = errosMarco(v, p.startDate);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV({ nome: "", data: "" });
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" variante="secondary" onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo marco
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Novo marco · ${p.name}`} rotuloConfirmar="Criar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "marco", corpo: { name: normalizarTexto(v.nome), targetDate: v.data } }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
          <Field rotulo="Data alvo" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={p.startDate} aria-describedby={descricao} invalido={invalido} value={v.data} onChange={(e) => setV((x) => ({ ...x, data: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Alcancar({ p, m }: { p: TipoP; m: Marco }) {
  const [aberto, setAberto] = useState(false);
  const [dia, setDia] = useState(hojeIso());
  const accao = useAcaoProjecto(p.projectId);
  const erro = dia === "" ? "Indique a data." : undefined;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Marcar alcançado: ${m.name}`}>
        Alcançado
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo={`«${m.name}» alcançado?`}
        descricao="Fica registado e não volta atrás."
        rotuloConfirmar="Registar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (erro || accao.isPending ? undefined : accao.mutate({ acto: "alcancar", marco: m.milestoneId, corpo: { reachedOn: dia } }, { onSuccess: () => setAberto(false) }))}
      >
        <Field rotulo="Alcançado a" erro={erro}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={dia} onChange={(e) => setDia(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function Comentar({ p, m }: { p: TipoP; m: Marco }) {
  const { utilizador } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ texto: "", autor: "" });
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const erros = errosComentarioMarco(v);
  return (
    <>
      <Button
        variante="ghost"
        tamanho="sm"
        onClick={() => {
          setV({ texto: "", autor: utilizador.displayName ?? "" });
          setAberto(true);
        }}
        aria-label={`Comentar ${m.name}`}
      >
        Comentar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            accao.reset();
            setTentou(false);
          }
        }}
        titulo={`Comentário em «${m.name}»`}
        descricao={p.visibleToCustomer ? "O cliente vê este comentário no portal." : "Se o projecto ficar visível ao cliente, ele passa a ver os comentários."}
        rotuloConfirmar="Comentar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (temErros(erros) || accao.isPending) return;
          const autor = normalizarTexto(v.autor);
          accao.mutate({ acto: "comentarMarco", marco: m.milestoneId, corpo: { body: normalizarTexto(v.texto, true), authorName: autor === "" ? null : autor } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <div className="grid gap-4">
          <Field rotulo="Assinado como" ajuda="Vazio, «Equipa»." erro={tentou ? erros.autor : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.autor} onChange={(e) => setV((x) => ({ ...x, autor: e.target.value }))} />}
          </Field>
          <Field rotulo="Comentário" erro={tentou ? erros.texto : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={4} maxLength={4000} aria-describedby={descricao} invalido={invalido} value={v.texto} onChange={(e) => setV((x) => ({ ...x, texto: e.target.value }))} />}
          </Field>
        </div>
      </Confirmar>
    </>
  );
}

function Marcos({ p, escreve }: { p: TipoP; escreve: boolean }) {
  const comentarios = useComentariosMarcos(p.projectId);
  const marcos = [...p.milestones].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Marcos</CardTitle>
        {escreve ? <NovoMarco p={p} /> : null}
      </div>
      {marcos.length === 0 ? <p className="text-sm text-muted-foreground">Sem marcos.</p> : null}
      <ul className="divide-y divide-border" aria-label="Marcos">
        {marcos.map((m) => {
          const deste = (comentarios.data ?? []).filter((c) => c.milestoneId === m.milestoneId);
          return (
            <li key={m.milestoneId} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{m.name}</span>
                <span className="inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {formatarData(m.targetDate)}
                  {m.reachedOn ? ` · alcançado ${formatarData(m.reachedOn)}` : ""}
                  <EstadoMarco estado={m.status} />
                </span>
              </div>
              {deste.length > 0 ? (
                <ol className="mt-2 flex flex-col gap-2" aria-label={`Comentários em ${m.name}`}>
                  {deste.map((c) => (
                    <li key={c.commentId} className="rounded-md border border-border p-2 text-sm">
                      <p className="mb-1 text-xs text-muted-foreground">
                        {c.authorName} {c.fromCustomer ? <Badge tom="info">Cliente</Badge> : null} · {formatarDataHora(c.postedAt)}
                      </p>
                      <p className="whitespace-pre-line break-words text-foreground">{c.body}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
              {escreve ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.status !== "Reached" ? <Alcancar p={p} m={m} /> : null}
                  <Comentar p={p} m={m} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {comentarios.error ? <ErrorPanel erro={comentarios.error} /> : null}
    </Card>
  );
}

type VistaP = "resumo" | "tarefas" | "quadro" | "gantt";
const VISTAS: readonly Vista<VistaP>[] = [
  { valor: "resumo", texto: "Resumo" },
  { valor: "tarefas", texto: "Tarefas" },
  { valor: "quadro", texto: "Quadro" },
  { valor: "gantt", texto: "Gantt" },
];

export default function Projecto() {
  const { projectId = "" } = useParams();
  const projecto = useProjecto(projectId);
  const { pode } = useUtilizador();
  const vista = useVista(VISTAS);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/projectos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Projectos
      </Link>
    </Button>
  );
  if (projecto.isPending) return <CarregandoPagina />;
  if (projecto.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={projecto.error} tentarDeNovo={() => void projecto.refetch()} />
      </>
    );
  }
  const p = projecto.data;
  const fechado = p.status === "Closed";
  const escreve = pode("projects.projects.write") && !fechado;
  const linha = (r: string, v: ReactNode) => (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{r}</dt>
      <dd className="break-words text-base text-foreground">{v}</dd>
    </div>
  );
  const contam = p.tasks.filter((t) => t.status !== "Cancelled");
  return (
    <>
      {voltar}
      <PageHeader
        titulo={p.name}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoProjecto estado={p.status} />
            <span>
              {formatarData(p.startDate)} → {p.endDate ? formatarData(p.endDate) : "em curso"}
            </span>
          </span>
        }
      />
      {escreve ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Orcamento p={p} />
          <FecharProjecto p={p} />
        </div>
      ) : null}
      {fechado ? <Alert tom="info" className="mb-6" titulo={`Fechado a ${p.endDate ? formatarData(p.endDate) : "—"}: já não muda.`} /> : null}
      <Vistas rotulo="Projecto" vistas={VISTAS} actual={vista} />
      {vista === "tarefas" ? (
        <TarefasDoProjecto p={p} />
      ) : vista === "quadro" ? (
        <QuadroDoProjecto p={p} />
      ) : vista === "gantt" ? (
        <GanttDoProjecto p={p} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Resumo</CardTitle>
            <div className="mt-3">
              <BarraProgresso valor={Number(p.completionPercent ?? 0)} rotulo={`${String(p.completionPercent ?? 0)}% feito`} />
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {linha("Tarefas feitas", `${String(contam.filter((t) => t.status === "Done").length)} de ${String(contam.length)}`)}
              {linha("Marcos alcançados", `${String(p.milestones.filter((m) => m.status === "Reached").length)} de ${String(p.milestones.length)}`)}
              {linha("Orçamento aprovado", p.budget ? `${moeda(p.budget.amount, p.budget.currency)} (${formatarDataDeInstante(p.budget.setAt)})` : "—")}
              {linha("Visível ao cliente", p.visibleToCustomer ? "Sim" : "Não")}
            </dl>
          </Card>
          <Marcos p={p} escreve={escreve} />
        </div>
      )}
    </>
  );
}
