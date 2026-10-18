/**
 * Um artigo da base de conhecimento: ler, escrever (novo ou corrigir),
 * publicar e arquivar. O texto é simples (sem HTML): no portal aparece tal
 * como se escreve, com as quebras de linha.
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import {
  artigoParaApi,
  AUDIENCIAS,
  errosArtigo,
  MAXIMO_CATEGORIA,
  MAXIMO_SLUG,
  MAXIMO_TEXTO,
  MAXIMO_TITULO,
  useArtigoEquipa,
  useGuardarArtigo,
  useMudarEstadoArtigo,
  type Artigo,
  type Audiencia,
  type CamposArtigo,
} from "../api";
import { EstadoArtigoBadge } from "../comum";

const campos = (a?: Artigo): CamposArtigo => ({
  titulo: a?.title ?? "",
  slug: a?.slug ?? "",
  categoria: a?.category ?? "",
  audiencia: (a?.audience as Audiencia | undefined) ?? "Customers",
  texto: a?.body ?? "",
});

function Formulario({ artigo, aoGuardar, aoCancelar }: { artigo?: Artigo; aoGuardar: (id: string) => void; aoCancelar: () => void }) {
  const [v, setV] = useState(() => campos(artigo));
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarArtigo();
  const erros = errosArtigo(v);
  const mudar = (k: keyof CamposArtigo) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (Object.values(erros).some(Boolean) || guardar.isPending) return;
        guardar.mutate({ id: artigo?.articleId ?? null, corpo: artigoParaApi(v) }, { onSuccess: aoGuardar });
      }}
    >
      {guardar.error ? <ErrorPanel erro={guardar.error} /> : null}
      <Field rotulo="Título" erro={tentou ? erros.titulo : undefined}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={MAXIMO_TITULO} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={mudar("titulo")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field rotulo="Categoria (opcional)" erro={tentou ? erros.categoria : undefined}>
          {({ id, descricao, invalido }) => (
            <Input id={id} maxLength={MAXIMO_CATEGORIA} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.categoria} onChange={mudar("categoria")} />
          )}
        </Field>
        <Field rotulo="Quem vê">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={v.audiencia} onChange={mudar("audiencia")}>
              {Object.entries(AUDIENCIAS).map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field rotulo="Endereço (opcional)" ajuda="Vazio, gera-se do título." erro={tentou ? erros.slug : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} maxLength={MAXIMO_SLUG} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.slug} onChange={mudar("slug")} />}
        </Field>
      </div>
      <Field rotulo="Texto" ajuda={`Texto simples, até ${MAXIMO_TEXTO.toLocaleString("pt-PT")} caracteres; as quebras de linha mantêm-se.`} erro={tentou ? erros.texto : undefined}>
        {({ id, descricao, invalido }) => <Textarea id={id} rows={14} maxLength={MAXIMO_TEXTO} aria-describedby={descricao} invalido={invalido} value={v.texto} onChange={mudar("texto")} />}
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variante="ghost" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" aCarregar={guardar.isPending}>
          {artigo ? "Guardar alterações" : "Guardar rascunho"}
        </Button>
      </div>
    </form>
  );
}

function MudarEstado({ a, accao, aoMudar }: { a: Artigo; accao: "publicar" | "arquivar"; aoMudar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const mudar = useMudarEstadoArtigo(a.articleId);
  const publicar = accao === "publicar";
  return (
    <>
      <Button variante={publicar ? "primary" : "secondary"} onClick={() => setAberto(true)}>
        {publicar ? "Publicar" : "Arquivar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) mudar.reset();
        }}
        titulo={publicar ? `Publicar «${a.title}»?` : `Arquivar «${a.title}»?`}
        descricao={
          publicar
            ? a.audience === "Internal"
              ? "Fica visível para a equipa. Os clientes não o vêem."
              : "Os clientes passam a vê-lo no portal, em «Ajuda»."
            : "Sai da ajuda do portal. Um artigo arquivado não se corrige nem se volta a publicar."
        }
        rotuloConfirmar={publicar ? "Publicar" : "Arquivar"}
        variante={publicar ? "primary" : "destructive"}
        aCarregar={mudar.isPending}
        erro={mudar.error ? <ErrorPanel erro={mudar.error} /> : undefined}
        aoConfirmar={() =>
          mudar.isPending
            ? undefined
            : mudar.mutate(accao, {
                onSuccess: () => {
                  setAberto(false);
                  aoMudar();
                },
              })
        }
      />
    </>
  );
}

const voltar = (
  <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
    <Link to="/base-conhecimento">
      <ArrowLeft strokeWidth={1.75} aria-hidden />
      Base de conhecimento
    </Link>
  </Button>
);

export function NovoArtigo() {
  const navegar = useNavigate();
  return (
    <>
      {voltar}
      <PageHeader titulo="Novo artigo" descricao="Fica em rascunho até o publicar." />
      <Card>
        <Formulario aoGuardar={(id) => void navegar(`/base-conhecimento/${id}`, { replace: true })} aoCancelar={() => void navegar("/base-conhecimento")} />
      </Card>
    </>
  );
}

export default function ArtigoBase() {
  const { articleId = "" } = useParams();
  const artigo = useArtigoEquipa(articleId);
  const { pode } = useUtilizador();
  const [aEditar, setAEditar] = useState(false);
  const idTexto = useId();
  if (artigo.isPending) return <CarregandoPagina />;
  if (artigo.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={artigo.error} tentarDeNovo={() => void artigo.refetch()} />
      </>
    );
  }
  const a = artigo.data;
  const escreve = pode("messaging.knowledge_base.write");
  const arquivado = a.status === "Archived";
  const recarregar = () => void artigo.refetch();
  return (
    <>
      {voltar}
      <PageHeader
        titulo={a.title}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoArtigoBadge estado={a.status} />
            <span>
              {a.category ?? "Sem categoria"} · {AUDIENCIAS[a.audience as Audiencia] ?? a.audience} · criado {formatarDataHora(a.createdAt)}
              {a.publishedAt ? ` · publicado ${formatarData(a.publishedAt)}` : ""}
            </span>
          </span>
        }
      />
      {escreve && !arquivado && !aEditar ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button variante="secondary" onClick={() => setAEditar(true)}>
            Corrigir
          </Button>
          {a.status === "Draft" ? <MudarEstado a={a} accao="publicar" aoMudar={recarregar} /> : null}
          <MudarEstado a={a} accao="arquivar" aoMudar={recarregar} />
        </div>
      ) : null}
      {a.status === "Published" && aEditar ? <Alert tom="aviso" className="mb-4" titulo="Está publicado: o que guardar aparece logo no portal." /> : null}
      {aEditar ? (
        <Card>
          <Formulario
            artigo={a}
            aoGuardar={() => {
              setAEditar(false);
              recarregar();
            }}
            aoCancelar={() => setAEditar(false)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <h2 id={idTexto} className="sr-only">
              Texto
            </h2>
            <p aria-labelledby={idTexto} className="whitespace-pre-line break-words text-foreground">
              {a.body}
            </p>
          </Card>
          <Card>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Endereço no portal</dt>
                <dd className="break-all text-foreground">/cliente/ajuda/{a.slug}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Visualizações</dt>
                <dd className="text-foreground">{String(a.views)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Foi útil</dt>
                <dd className="text-foreground">
                  {String(a.helpfulVotes)} sim · {String(a.notHelpfulVotes)} não
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}
