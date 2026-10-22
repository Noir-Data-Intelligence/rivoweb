/** As tarefas de um projecto: lista, nova, planear, atribuir, concluir, cancelar e dependências. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAcaoProjecto, useDependencias, type Prioridade, type Projecto, type Tarefa } from "./api";
import { EstadoTarefa, ETAPAS, PRIORIDADES, PrioridadeBadge, useEscolhas } from "./comum";
import { ChecklistDaTarefa, ComentariosDaTarefa } from "./TarefaDetalhe";
import { errosNovaTarefa, errosPlano, planoParaApi, temErros, type CamposPlano } from "./regras";

function NovaTarefa({ p }: { p: Projecto }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ titulo: "", prazo: "", pessoa: "" });
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const { pessoas } = useEscolhas();
  const idForm = useId();
  const erros = errosNovaTarefa(v, p.startDate);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV({ titulo: "", prazo: "", pessoa: "" });
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova tarefa
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Nova tarefa · ${p.name}`} descricao="Começa em «Por planear»." rotuloConfirmar="Criar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "tarefa", corpo: { title: normalizarTexto(v.titulo), dueDate: v.prazo === "" ? null : v.prazo, assignedEmployeeId: v.pessoa === "" ? null : v.pessoa } }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} />}
          </Field>
          <Field rotulo="Prazo (opcional)" erro={tentou ? erros.prazo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={p.startDate} aria-describedby={descricao} invalido={invalido} value={v.prazo} onChange={(e) => setV((x) => ({ ...x, prazo: e.target.value }))} />}
          </Field>
          <Field rotulo="Atribuir a (opcional)">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.pessoa} onChange={(e) => setV((x) => ({ ...x, pessoa: e.target.value }))}>
                <option value="">Ninguém</option>
                {pessoas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

const campos = (t: Tarefa): CamposPlano => ({
  titulo: t.title,
  descricao: t.description ?? "",
  inicio: t.startDate ?? "",
  prazo: t.dueDate ?? "",
  horas: t.estimatedHours === null || t.estimatedHours === undefined ? "" : String(t.estimatedHours).replace(".", ","),
  prioridade: (t.priority as Prioridade | undefined) ?? "Normal",
  progresso: t.progress === undefined ? "" : String(t.progress),
});

function Planear({ p, t }: { p: Projecto; t: Tarefa }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => campos(t));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const idForm = useId();
  const erros = errosPlano(v, p.startDate);
  const campo = (k: keyof CamposPlano) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(campos(t));
    else {
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)} aria-label={`Planear ${t.title}`}>
        Planear
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Planear «${t.title}»`} rotuloConfirmar="Guardar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm} largo>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "planear", tarefa: t.taskId, corpo: planoParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-3">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={campo("titulo")} />}
          </Field>
          <Field rotulo="Início (opcional)" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={p.startDate} aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={campo("inicio")} />}
          </Field>
          <Field rotulo="Prazo (opcional)" erro={tentou ? erros.prazo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || p.startDate} aria-describedby={descricao} invalido={invalido} value={v.prazo} onChange={campo("prazo")} />}
          </Field>
          <Field rotulo="Prioridade">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.prioridade} onChange={(e) => setV((x) => ({ ...x, prioridade: e.target.value as Prioridade }))}>
                {Object.entries(PRIORIDADES).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Horas estimadas (opcional)" erro={tentou ? erros.horas : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.horas} onChange={campo("horas")} />}
          </Field>
          <Field rotulo="Progresso (%)" erro={tentou ? erros.progresso : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" maxLength={3} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.progresso} onChange={campo("progresso")} />}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined} className="sm:col-span-3">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={4} maxLength={4000} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={campo("descricao")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Atribuir({ p, t }: { p: Projecto; t: Tarefa }) {
  const [aberto, setAberto] = useState(false);
  const [pessoa, setPessoa] = useState(t.assignedEmployeeId ?? "");
  const accao = useAcaoProjecto(p.projectId);
  const { pessoas } = useEscolhas();
  const id = useId();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Atribuir ${t.title}`}>
        Atribuir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
          else setPessoa(t.assignedEmployeeId ?? "");
        }}
        titulo={`Atribuir «${t.title}»`}
        rotuloConfirmar="Guardar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: "atribuir", tarefa: t.taskId, corpo: { employeeId: pessoa === "" ? null : pessoa } }, { onSuccess: () => setAberto(false) }))}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Colaborador
          </label>
          <Select id={id} value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
            <option value="">Ninguém (tirar a atribuição)</option>
            {t.assignedEmployeeId && !pessoas.some((c) => c.id === t.assignedEmployeeId) ? <option value={t.assignedEmployeeId}>{t.assignedEmployeeName ?? "Colaborador inactivo"}</option> : null}
            {pessoas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Confirmar>
    </>
  );
}

function Fechar({ p, t, concluir }: { p: Projecto; t: Tarefa; concluir: boolean }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`${concluir ? "Concluir" : "Cancelar"} ${t.title}`}>
        {concluir ? "Concluir" : "Cancelar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo={concluir ? `Concluir «${t.title}»?` : `Cancelar «${t.title}»?`}
        descricao={concluir ? "Passa a «Feita» e conta para o progresso do projecto." : "Deixa de contar para o progresso e não volta atrás."}
        rotuloConfirmar={concluir ? "Concluir" : "Cancelar tarefa"}
        variante={concluir ? "primary" : "destructive"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: concluir ? "concluir" : "cancelar", tarefa: t.taskId }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Dependencias({ p, t }: { p: Projecto; t: Tarefa }) {
  const [aberto, setAberto] = useState(false);
  const [outra, setOutra] = useState("");
  const deps = useDependencias(p.projectId);
  const accao = useAcaoProjecto(p.projectId);
  const { pode } = useUtilizador();
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  const id = useId();
  const minhas = (deps.data ?? []).filter((d) => d.taskId === t.taskId);
  const titulo = (tid: string) => p.tasks.find((x) => x.taskId === tid)?.title ?? "Tarefa";
  const candidatas = p.tasks.filter((x) => x.taskId !== t.taskId && !minhas.some((d) => d.dependsOnTaskId === x.taskId));
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Dependências de ${t.title}`}>
        Depende de{minhas.length > 0 ? ` (${String(minhas.length)})` : ""}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            accao.reset();
            setOutra("");
          }
        }}
        titulo={`«${t.title}» depende de`}
        descricao="Informativo: aparece no Gantt e não impede concluir. Um ciclo é recusado."
        rotuloConfirmar={escreve ? "Juntar dependência" : "Fechar"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          if (!escreve) return setAberto(false);
          if (outra === "" || accao.isPending) return;
          accao.mutate({ acto: "depender", tarefa: t.taskId, corpo: { dependsOnTaskId: outra } }, { onSuccess: () => setOutra("") });
        }}
      >
        <ul className="mb-4 divide-y divide-border text-sm" aria-label="Dependências">
          {minhas.length === 0 ? <li className="py-2 text-muted-foreground">Não depende de nenhuma.</li> : null}
          {minhas.map((d) => (
            <li key={d.dependencyId} className="flex items-center justify-between gap-2 py-2">
              <span>{titulo(d.dependsOnTaskId)}</span>
              {escreve ? (
                <Button variante="ghost" tamanho="sm" onClick={() => accao.mutate({ acto: "tirarDependencia", dependencia: d.dependencyId })} aria-label={`Tirar a dependência de ${titulo(d.dependsOnTaskId)}`}>
                  Tirar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {escreve ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
              Passa a depender de
            </label>
            <Select id={id} value={outra} onChange={(e) => setOutra(e.target.value)}>
              <option value="">Escolha…</option>
              {candidatas.map((x) => (
                <option key={x.taskId} value={x.taskId}>
                  {x.title}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </Confirmar>
    </>
  );
}

export function TarefasDoProjecto({ p }: { p: Projecto }) {
  const { pode } = useUtilizador();
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  const colunas: Coluna<Tarefa>[] = [
    {
      id: "titulo",
      cabecalho: "Tarefa",
      className: "max-w-[18rem]",
      celula: (t) => (
        <span className="flex flex-col">
          <span className="break-words font-medium">{t.title}</span>
          {t.description ? <span className="line-clamp-2 whitespace-pre-line break-words text-xs text-muted-foreground">{t.description}</span> : null}
        </span>
      ),
    },
    { id: "etapa", cabecalho: "Etapa", esconderAte: "md", celula: (t) => (t.status === "Pending" ? (ETAPAS[t.stage as keyof typeof ETAPAS] ?? t.stage ?? "—") : <EstadoTarefa estado={t.status} />) },
    { id: "prio", cabecalho: "Prioridade", esconderAte: "lg", celula: (t) => (t.priority ? <PrioridadeBadge p={t.priority} /> : "—") },
    { id: "quem", cabecalho: "Atribuída a", esconderAte: "md", className: "max-w-[12rem] truncate", celula: (t) => (t.assignedEmployeeId ? (t.assignedEmployeeName ?? "—") : "Ninguém") },
    { id: "prazo", cabecalho: "Prazo", esconderAte: "sm", celula: (t) => (t.dueDate ? formatarData(t.dueDate) : "—") },
    { id: "prog", cabecalho: "Progresso", alinhar: "direita", esconderAte: "lg", celula: (t) => `${String(t.progress ?? 0)}%${t.estimatedHours ? ` · ${formatarNumeroDecimal(String(t.estimatedHours), 1)} h` : ""}` },
    {
      id: "accoes",
      cabecalho: "",
      alinhar: "direita",
      celula: (t) => (
        <span className="inline-flex flex-wrap justify-end gap-1">
          <ComentariosDaTarefa p={p} t={t} escreve={escreve} />
          <ChecklistDaTarefa p={p} t={t} escreve={escreve} />
          <Dependencias p={p} t={t} />
          {escreve && t.status === "Pending" ? (
            <>
              <Planear p={p} t={t} />
              <Atribuir p={p} t={t} />
              <Fechar p={p} t={t} concluir />
              <Fechar p={p} t={t} concluir={false} />
            </>
          ) : null}
        </span>
      ),
    },
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Tarefas</CardTitle>
        {escreve ? <NovaTarefa p={p} /> : null}
      </div>
      <Tabela rotulo="Tarefas" colunas={colunas} linhas={p.tasks} chave={(t) => t.taskId} aCarregar={false} vazio="Ainda não há tarefas." />
    </Card>
  );
}
