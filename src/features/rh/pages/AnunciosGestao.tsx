/**
 * Anúncios na gestão: todos (agendados, em vigor, expirados e arquivados),
 * publicar, corrigir e arquivar. Os colaboradores vêem os em vigor no portal
 * (gerais e os do seu departamento). Datas ao dia, em Luanda.
 */
import { Pin, Plus } from "lucide-react";
import { useId, useState } from "react";
import { formatarDataDeInstante, dataIsoDeInstante, inicioDoDiaEmLuanda } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Badge, type TomBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { useTodosDepartamentos } from "../api";
import { errosAnuncio, faseAnuncio, type FaseAnuncio } from "../regras";
import { useAnunciosGestao, useArquivarAnuncio, useCorrigirAnuncio, usePublicarAnuncio, type AnuncioGestao } from "../servicos";

const FASE: Record<FaseAnuncio, { texto: string; tom: TomBadge }> = {
  "em-vigor": { texto: "Em vigor", tom: "sucesso" },
  agendado: { texto: "Agendado", tom: "info" },
  expirado: { texto: "Expirado", tom: "neutro" },
  arquivado: { texto: "Arquivado", tom: "neutro" },
};

function Editar({ a }: { a?: AnuncioGestao }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({
    titulo: a?.title ?? "",
    texto: a?.body ?? "",
    departamento: a?.departmentId ?? "",
    fixado: a?.pinned ?? false,
    publica: a ? dataIsoDeInstante(a.publishedAt) : "",
    expira: a?.expiresAt ? dataIsoDeInstante(a.expiresAt) : "",
  });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const publicar = usePublicarAnuncio();
  const corrigir = useCorrigirAnuncio();
  const m = a ? corrigir : publicar;
  const departamentos = useTodosDepartamentos(aberto);
  const idForm = useId();
  const erros = errosAnuncio(v);
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      publicar.reset();
      corrigir.reset();
      setTentou(false);
      setV(inicial());
    }
  };
  const campo = <K extends keyof ReturnType<typeof inicial>>(k: K, valor: ReturnType<typeof inicial>[K]) => setV((x) => ({ ...x, [k]: valor }));
  return (
    <>
      {a ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir o anúncio ${a.title}`}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Publicar anúncio
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo={a ? "Corrigir o anúncio" : "Publicar um anúncio"}
        descricao="Sem departamento, aparece a todos os colaboradores no portal. Com data de publicação futura, fica agendado."
        rotuloConfirmar={a ? "Guardar" : "Publicar"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : departamentos.error ? <ErrorPanel erro={departamentos.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || m.isPending) return;
            // Na correcção, a data de publicação que não mudou mantém a hora original.
            const publishedAt = a && v.publica === dataIsoDeInstante(a.publishedAt) ? a.publishedAt : v.publica === "" ? null : inicioDoDiaEmLuanda(v.publica);
            const corpo = {
              title: normalizarTexto(v.titulo),
              body: normalizarTexto(v.texto, true),
              departmentId: v.departamento === "" ? null : v.departamento,
              pinned: v.fixado,
              publishedAt,
              expiresAt: v.expira === "" ? null : inicioDoDiaEmLuanda(v.expira),
            };
            if (a) corrigir.mutate({ announcementId: a.announcementId, ...corpo }, { onSuccess: () => mudar(false) });
            else publicar.mutate(corpo, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => campo("titulo", e.target.value)} />}
          </Field>
          <Field rotulo="Texto" erro={tentou ? erros.texto : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={6} maxLength={8000} aria-describedby={descricao} invalido={invalido} value={v.texto} onChange={(e) => campo("texto", e.target.value)} />}
          </Field>
          <Field rotulo="Departamento (opcional)">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.departamento} onChange={(e) => campo("departamento", e.target.value)}>
                <option value="">Todos os colaboradores</option>
                {(departamentos.data?.items ?? []).map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="flex items-end">
            <Checkbox rotulo="Fixar no topo" checked={v.fixado} onChange={(e) => campo("fixado", e.target.checked)} />
          </div>
          <Field rotulo="Publicar a (opcional)" ajuda={a ? undefined : "Vazio publica já."}>
            {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={v.publica} onChange={(e) => campo("publica", e.target.value)} />}
          </Field>
          <Field rotulo="Deixa de aparecer a (opcional)" erro={tentou ? erros.expira : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.expira} onChange={(e) => campo("expira", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Arquivar({ a }: { a: AnuncioGestao }) {
  const [aberto, setAberto] = useState(false);
  const arquivar = useArquivarAnuncio();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Arquivar o anúncio ${a.title}`}>
        Arquivar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) arquivar.reset();
        }}
        titulo="Arquivar este anúncio?"
        descricao={`«${a.title}» deixa de aparecer no portal. Não se desfaz.`}
        rotuloConfirmar="Arquivar"
        variante="destructive"
        aCarregar={arquivar.isPending}
        erro={arquivar.error ? <ErrorPanel erro={arquivar.error} /> : undefined}
        aoConfirmar={() => (arquivar.isPending ? undefined : arquivar.mutate(a.announcementId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Cartao({ a, nomeDep }: { a: AnuncioGestao; nomeDep: (id: string | null) => string }) {
  const fase = faseAnuncio(a);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-md font-semibold text-foreground">
            {a.pinned ? <Pin className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-label="Fixado" /> : null}
            <span className="break-words">{a.title}</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {nomeDep(a.departmentId)} · {fase === "agendado" ? "publica" : "publicado"} a {formatarDataDeInstante(a.publishedAt)}
            {a.expiresAt ? ` · deixa de aparecer a ${formatarDataDeInstante(a.expiresAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tom={FASE[fase].tom}>{FASE[fase].texto}</Badge>
          {fase === "arquivado" ? null : (
            <>
              <Editar a={a} />
              <Arquivar a={a} />
            </>
          )}
        </div>
      </div>
      <p className="mt-3 line-clamp-4 whitespace-pre-line break-words text-sm text-foreground">{a.body}</p>
    </Card>
  );
}

export default function AnunciosGestao() {
  const lista = useAnunciosGestao();
  const departamentos = useTodosDepartamentos();
  const [arquivados, setArquivados] = useState(false);
  const nomeDep = (id: string | null) => (id ? (departamentos.data?.items.find((d) => d.departmentId === id)?.name ?? "Departamento") : "Todos os colaboradores");
  const itens = (lista.data ?? [])
    .filter((a) => arquivados || !a.archived)
    .sort((x, y) => Number(y.pinned) - Number(x.pinned) || y.publishedAt.localeCompare(x.publishedAt));
  return (
    <>
      <PageHeader titulo="Anúncios" descricao="O que os colaboradores vêem no portal." accao={<Editar />} />
      <div className="mb-4">
        <Checkbox rotulo="Mostrar os arquivados" checked={arquivados} onChange={(e) => setArquivados(e.target.checked)} />
      </div>
      {lista.isPending ? (
        <Skeleton className="h-48" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
      ) : itens.length === 0 ? (
        <EmptyState frase={arquivados ? "Ainda não há anúncios." : "Sem anúncios por arquivar."} />
      ) : (
        <div className="flex flex-col gap-4">
          {itens.map((a) => (
            <Cartao key={a.announcementId} a={a} nomeDep={nomeDep} />
          ))}
        </div>
      )}
    </>
  );
}
