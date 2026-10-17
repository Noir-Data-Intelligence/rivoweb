/**
 * Entradas e saídas: processos conduzidos por uma lista de tarefas. As tarefas
 * entram ao iniciar (não há forma de as juntar depois), por isso exige-se pelo
 * menos uma; conclui-se o processo só com todas feitas. `?iniciar=<id>` abre o
 * diálogo com o colaborador escolhido (vem de «Contratar» no recrutamento).
 */
import { Check, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useConcluirProcesso, useConcluirTarefa, useIniciarProcesso, useProcessos, type Processo, type TarefaProcesso } from "../ciclo";
import { FiltroColaborador, SelectColaborador, useFiltroColaborador, useNomeColaborador } from "../escolhas";
import { CATEGORIA_TAREFA, EstadoProcesso, nome, TIPO_PROCESSO } from "../estados";
import { errosProcesso, temErrosProcesso, type TarefaRascunho } from "../regras";

const tarefaVazia = (): TarefaRascunho => ({ titulo: "", categoria: "hr", prazo: "" });

function Iniciar({ inicial, aoFechar }: { inicial: string | null; aoFechar: () => void }) {
  const [aberto, setAberto] = useState(inicial !== null);
  const [colaborador, setColaborador] = useState(inicial ?? "");
  const [tipo, setTipo] = useState("Onboarding");
  const [ultimoDia, setUltimoDia] = useState("");
  const [motivo, setMotivo] = useState("");
  const [tarefas, setTarefas] = useState<TarefaRascunho[]>([tarefaVazia()]);
  const [tentou, setTentou] = useState(false);
  const iniciar = useIniciarProcesso();
  const idForm = useId();
  const erros = errosProcesso({ colaborador, tipo, ultimoDia, motivo, tarefas });
  const mudarTarefa = (i: number, campo: keyof TarefaRascunho, v: string) => setTarefas((ts) => ts.map((t, j) => (j === i ? { ...t, [campo]: v } : t)));
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      iniciar.reset();
      setTentou(false);
      setColaborador("");
      setTipo("Onboarding");
      setUltimoDia("");
      setMotivo("");
      setTarefas([tarefaVazia()]);
      aoFechar();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Iniciar processo
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Iniciar uma entrada ou saída"
        descricao="As tarefas definem-se agora: depois de iniciado, o processo não recebe tarefas novas."
        rotuloConfirmar="Iniciar"
        aCarregar={iniciar.isPending}
        erro={iniciar.error ? <ErrorPanel erro={iniciar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErrosProcesso(erros) || iniciar.isPending) return;
            const m = normalizarTexto(motivo, true);
            const saida = tipo === "Offboarding";
            iniciar.mutate(
              {
                employeeId: colaborador,
                kind: tipo,
                lastWorkingDay: saida ? ultimoDia : null,
                reason: saida && m !== "" ? m : null,
                tasks: tarefas
                  .filter((t) => normalizarTexto(t.titulo) !== "")
                  .map((t) => ({ title: normalizarTexto(t.titulo), category: t.categoria, dueOn: t.prazo === "" ? null : t.prazo, description: null })),
              },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined}>
            {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
          </Field>
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {Object.entries(TIPO_PROCESSO).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {tipo === "Offboarding" ? (
            <>
              <Field rotulo="Último dia de trabalho" erro={tentou ? erros.ultimoDia : undefined}>
                {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={ultimoDia} onChange={(e) => setUltimoDia(e.target.value)} />}
              </Field>
              <Field rotulo="Motivo (opcional)" erro={tentou ? erros.motivo : undefined}>
                {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
              </Field>
            </>
          ) : null}
          <fieldset className="flex flex-col gap-3 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Tarefas</legend>
            {tarefas.map((t, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_12rem_10rem_auto] sm:items-end">
                <Field rotulo={`Tarefa ${i + 1}`} erro={tentou ? erros.linhas[i] : undefined}>
                  {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={t.titulo} onChange={(e) => mudarTarefa(i, "titulo", e.target.value)} />}
                </Field>
                <Field rotulo={`Área da tarefa ${i + 1}`}>
                  {({ id, descricao }) => (
                    <Select id={id} aria-describedby={descricao} value={t.categoria} onChange={(e) => mudarTarefa(i, "categoria", e.target.value)}>
                      {Object.entries(CATEGORIA_TAREFA).map(([v, n]) => (
                        <option key={v} value={v}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field rotulo={`Prazo da tarefa ${i + 1} (opcional)`}>
                  {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={t.prazo} onChange={(e) => mudarTarefa(i, "prazo", e.target.value)} />}
                </Field>
                <Button type="button" variante="ghost" tamanho="sm" disabled={tarefas.length === 1} aria-label={`Tirar a tarefa ${i + 1}`} onClick={() => setTarefas((ts) => ts.filter((_, j) => j !== i))}>
                  <Trash2 strokeWidth={1.75} aria-hidden />
                </Button>
              </div>
            ))}
            {tentou && erros.tarefas ? (
              <p role="alert" className="text-sm text-destructive">
                {erros.tarefas}
              </p>
            ) : null}
            <div>
              <Button type="button" variante="secondary" tamanho="sm" disabled={tarefas.length >= 50} onClick={() => setTarefas((ts) => [...ts, tarefaVazia()])}>
                <Plus strokeWidth={1.75} aria-hidden />
                Juntar tarefa
              </Button>
            </div>
          </fieldset>
        </form>
      </Confirmar>
    </>
  );
}

function ConcluirTarefa({ p, t }: { p: Processo; t: TarefaProcesso }) {
  const concluir = useConcluirTarefa();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variante="ghost" tamanho="sm" aCarregar={concluir.isPending} aria-label={`Marcar feita: ${t.title}`} onClick={() => (concluir.isPending ? undefined : concluir.mutate({ processId: p.processId, taskId: t.taskId }))}>
        <Check strokeWidth={1.75} aria-hidden />
        Feita
      </Button>
      {concluir.error ? <ErrorPanel erro={concluir.error} /> : null}
    </div>
  );
}

function ConcluirProcesso({ p, quem }: { p: Processo; quem: string }) {
  const [aberto, setAberto] = useState(false);
  const concluir = useConcluirProcesso();
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Concluir {nome(TIPO_PROCESSO, p.kind).toLowerCase()}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) concluir.reset();
        }}
        titulo={`Concluir a ${nome(TIPO_PROCESSO, p.kind).toLowerCase()} de ${quem}?`}
        descricao="Todas as tarefas estão feitas. Um processo concluído não se reabre aqui."
        rotuloConfirmar="Concluir"
        aCarregar={concluir.isPending}
        erro={concluir.error ? <ErrorPanel erro={concluir.error} /> : undefined}
        aoConfirmar={() => (concluir.isPending ? undefined : concluir.mutate(p.processId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function CartaoProcesso({ p }: { p: Processo }) {
  const { pode } = useUtilizador();
  const nomeDe = useNomeColaborador();
  const quem = nomeDe(p.employeeId);
  const total = p.tasks.length;
  const feitas = total - Number(p.pendingTasks);
  const concluido = p.status === "Completed";
  const escreve = pode("hr.lifecycle.write");
  const tarefas = [...p.tasks].sort((a, b) => Number(a.order) - Number(b.order));
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-md font-semibold text-foreground">
            <Link to={`/colaboradores/${p.employeeId}`} className="underline-offset-4 hover:underline">
              {quem}
            </Link>
            <span className="font-normal text-muted-foreground"> · {nome(TIPO_PROCESSO, p.kind)}</span>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.lastWorkingDay ? `Último dia: ${formatarData(p.lastWorkingDay)}. ` : ""}
            {concluido && p.completedAt ? `Concluído a ${formatarDataHora(p.completedAt)}.` : p.startedAt ? `Em curso desde ${formatarDataHora(p.startedAt)}.` : "Nenhuma tarefa feita ainda."}
          </p>
          {p.reason ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">Motivo: {p.reason}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <EstadoProcesso estado={p.status} />
          {!concluido && escreve && total > 0 && feitas === total ? <ConcluirProcesso p={p} quem={quem} /> : null}
        </div>
      </div>
      <p className="mt-3 text-sm tabular-nums text-muted-foreground">
        {feitas} de {total} {total === 1 ? "tarefa feita" : "tarefas feitas"}
      </p>
      {total === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Sem tarefas: este processo não se pode concluir.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border" aria-label={`Tarefas de ${quem}`}>
          {tarefas.map((t) => (
            <li key={t.taskId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className={t.isCompleted ? "text-muted-foreground line-through" : "text-foreground"}>{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {nome(CATEGORIA_TAREFA, t.category)}
                  {t.dueOn ? ` · prazo ${formatarData(t.dueOn)}` : ""}
                  {t.isCompleted && t.completedAt ? ` · feita a ${formatarDataHora(t.completedAt)}` : ""}
                </p>
              </div>
              {!t.isCompleted && !concluido && escreve ? <ConcluirTarefa p={p} t={t} /> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function EntradasSaidas() {
  const [params, setParams] = useSearchParams();
  const { colaborador, mudar: mudarColaborador } = useFiltroColaborador();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const t = params.get("tipo");
  const tipo = t === "Onboarding" || t === "Offboarding" ? t : null;
  const iniciar = params.get("iniciar");
  const lista = useProcessos({ tipo, colaborador, pagina, tamanho });
  const idTipo = useId();
  const tirarIniciar = () =>
    setParams(
      (a) => {
        const n = new URLSearchParams(a);
        n.delete("iniciar");
        return n;
      },
      { replace: true },
    );
  return (
    <>
      <PageHeader
        titulo="Entradas e saídas"
        descricao="Acolhimento de quem entra e saída de quem sai, tarefa a tarefa."
        accao={
          <Can requer="hr.lifecycle.write">
            <Iniciar key={iniciar ?? ""} inicial={iniciar} aoFechar={tirarIniciar} />
          </Can>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex w-40 flex-col gap-1.5">
          <label htmlFor={idTipo} className="text-sm font-medium text-foreground">
            Tipo
          </label>
          <Select
            id={idTipo}
            value={tipo ?? ""}
            onChange={(e) => {
              const n = new URLSearchParams(window.location.search);
              if (e.target.value === "") n.delete("tipo");
              else n.set("tipo", e.target.value);
              n.delete("pagina");
              setParams(n);
            }}
          >
            <option value="">Todos</option>
            <option value="Onboarding">Entradas</option>
            <option value="Offboarding">Saídas</option>
          </Select>
        </div>
        <FiltroColaborador colaborador={colaborador} mudar={mudarColaborador} />
      </div>
      {lista.isPending ? (
        <Skeleton className="h-48" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
      ) : lista.data.items.length === 0 ? (
        <EmptyState frase={tipo || colaborador ? "Sem processos com estes filtros." : "Ainda não há entradas nem saídas."} />
      ) : (
        <div className="flex flex-col gap-4">
          {lista.data.items.map((p) => (
            <CartaoProcesso key={p.processId} p={p} />
          ))}
          <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} />
        </div>
      )}
    </>
  );
}
