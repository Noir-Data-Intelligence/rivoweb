/** Comentários e checklist de uma tarefa, em diálogos a partir da lista. */
import { useId, useState } from "react";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Checkbox, Textarea } from "@/ui/Controlos";
import { Dialog, DialogContent } from "@/ui/Dialog";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Skeleton } from "@/ui/Layout";
import { useAcaoProjecto, useChecklist, useComentariosTarefa, type Projecto, type Tarefa } from "./api";
import { erroComentario, erroPasso } from "./regras";

export function ComentariosDaTarefa({ p, t, escreve }: { p: Projecto; t: Tarefa; escreve: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const lista = useComentariosTarefa(p.projectId, t.taskId, aberto);
  const accao = useAcaoProjecto(p.projectId);
  const erro = erroComentario(texto);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Comentários de ${t.title}`}>
        Comentários
      </Button>
      <Dialog
        open={aberto}
        onOpenChange={(a) => {
          setAberto(a);
          if (!a) {
            setTexto("");
            setTentou(false);
            accao.reset();
          }
        }}
      >
        <DialogContent titulo={`Comentários · ${t.title}`} className="max-w-xl">
        {lista.isPending ? (
          <Skeleton className="h-16" />
        ) : lista.error ? (
          <ErrorPanel erro={lista.error} />
        ) : lista.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há comentários.</p>
        ) : (
          <ol className="flex flex-col gap-2" aria-label="Comentários da tarefa">
            {[...lista.data]
              .sort((a, b) => a.postedAt.localeCompare(b.postedAt))
              .map((c) => (
                <li key={c.commentId} className="rounded-md border border-border p-2 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {c.authorName ? `${c.authorName} · ` : ""}
                    {formatarDataHora(c.postedAt)}
                  </p>
                  <p className="whitespace-pre-line break-words text-foreground">{c.body}</p>
                </li>
              ))}
          </ol>
        )}
        {escreve ? (
          <form
            noValidate
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erro || accao.isPending) return;
              accao.mutate(
                { acto: "comentar", tarefa: t.taskId, corpo: { body: normalizarTexto(texto, true) } },
                {
                  onSuccess: () => {
                    setTexto("");
                    setTentou(false);
                    void lista.refetch();
                  },
                },
              );
            }}
          >
            {accao.error ? <ErrorPanel erro={accao.error} /> : null}
            <Field rotulo="Novo comentário" erro={tentou ? erro : undefined}>
              {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={4000} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
            </Field>
            <div className="flex justify-end">
              <Button type="submit" aCarregar={accao.isPending}>
                Comentar
              </Button>
            </div>
          </form>
        ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ChecklistDaTarefa({ p, t, escreve }: { p: Projecto; t: Tarefa; escreve: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tentou, setTentou] = useState(false);
  const lista = useChecklist(p.projectId, t.taskId, aberto);
  const accao = useAcaoProjecto(p.projectId);
  const id = useId();
  const erro = erroPasso(titulo);
  const passos = lista.data ? [...lista.data].sort((a, b) => Number(a.order) - Number(b.order)) : [];
  const feitos = passos.filter((x) => x.done).length;
  const depois = { onSuccess: () => void lista.refetch() };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Checklist de ${t.title}`}>
        Checklist
      </Button>
      <Dialog
        open={aberto}
        onOpenChange={(a) => {
          setAberto(a);
          if (!a) {
            setTitulo("");
            setTentou(false);
            accao.reset();
          }
        }}
      >
        <DialogContent titulo={`Checklist · ${t.title}`} descricao={lista.data ? `${String(feitos)} de ${String(passos.length)} feitos.` : undefined} className="max-w-xl">
        {accao.error ? <ErrorPanel erro={accao.error} className="mb-3" /> : null}
        {lista.isPending ? (
          <Skeleton className="h-16" />
        ) : lista.error ? (
          <ErrorPanel erro={lista.error} />
        ) : passos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem passos.</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Passos">
            {passos.map((x) => (
              <li key={x.itemId} className="flex items-center justify-between gap-2">
                {escreve ? (
                  <Checkbox rotulo={x.title} checked={x.done} disabled={accao.isPending} onChange={(e) => accao.mutate({ acto: "marcarPasso", passo: x.itemId, corpo: { done: e.target.checked } }, depois)} />
                ) : (
                  <span className={x.done ? "text-muted-foreground line-through" : "text-foreground"}>{x.title}</span>
                )}
                {escreve ? (
                  <Button variante="ghost" tamanho="sm" disabled={accao.isPending} onClick={() => accao.mutate({ acto: "tirarPasso", passo: x.itemId }, depois)} aria-label={`Tirar o passo ${x.title}`}>
                    Tirar
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {escreve ? (
          <form
            noValidate
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erro || accao.isPending) return;
              accao.mutate(
                { acto: "passo", tarefa: t.taskId, corpo: { title: normalizarTexto(titulo) } },
                {
                  onSuccess: () => {
                    setTitulo("");
                    setTentou(false);
                    void lista.refetch();
                  },
                },
              );
            }}
          >
            <Field rotulo="Novo passo" erro={tentou ? erro : undefined} className="flex-1">
              {({ id: idCampo, descricao, invalido }) => <Input id={idCampo} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={titulo} onChange={(e) => setTitulo(e.target.value)} />}
            </Field>
            <Button type="submit" aCarregar={accao.isPending} aria-describedby={id}>
              Juntar
            </Button>
          </form>
        ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
