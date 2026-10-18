/**
 * Base de conhecimento (§5.13, F10): todos os artigos, em qualquer estado,
 * com a pesquisa, o estado e a categoria no URL. Os clientes vêem no portal,
 * em «Ajuda», os publicados para eles.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { AUDIENCIAS, ESTADOS_ARTIGO, useArtigosEquipa, type Artigo, type EstadoArtigo } from "../api";
import { EstadoArtigoBadge } from "../comum";

export default function BaseConhecimento() {
  const [params, setParams] = useSearchParams();
  const idPesquisa = useId();
  const idEstado = useId();
  const idCategoria = useId();
  const e = params.get("estado");
  const estado: EstadoArtigo | null = e === "Draft" || e === "Published" || e === "Archived" ? e : null;
  const pesquisa = normalizarTexto(params.get("q") ?? "").slice(0, 100);
  const categoria = normalizarTexto(params.get("categoria") ?? "").slice(0, 100);
  const [texto, setTexto] = useState(pesquisa);
  const artigos = useArtigosEquipa({ estado, pesquisa, categoria });
  // As categorias vêm da lista completa, para não desaparecerem ao filtrar.
  const todos = useArtigosEquipa({ estado: null, pesquisa: "", categoria: "" });
  const categorias = [...new Set((todos.data ?? []).map((a) => a.category).filter((c): c is string => c !== null))].sort((a, b) => a.localeCompare(b, "pt"));
  const filtrar = (k: string, v: string) => {
    const n = new URLSearchParams(window.location.search);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n);
  };
  const colunas: Coluna<Artigo>[] = [
    {
      id: "titulo",
      cabecalho: "Artigo",
      className: "max-w-[20rem]",
      celula: (a) => (
        <Link to={`/base-conhecimento/${a.articleId}`} className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
          {a.title}
        </Link>
      ),
    },
    {
      id: "categoria",
      cabecalho: "Categoria",
      esconderAte: "md",
      celula: (a) => a.category ?? "—",
    },
    {
      id: "audiencia",
      cabecalho: "Quem vê",
      esconderAte: "lg",
      celula: (a) => AUDIENCIAS[a.audience as keyof typeof AUDIENCIAS] ?? a.audience,
    },
    {
      id: "vistas",
      cabecalho: "Visualizações",
      alinhar: "direita",
      esconderAte: "sm",
      celula: (a) => String(a.views),
    },
    {
      id: "util",
      cabecalho: "Útil / não",
      alinhar: "direita",
      esconderAte: "lg",
      celula: (a) => `${String(a.helpfulVotes)} / ${String(a.notHelpfulVotes)}`,
    },
    {
      id: "publicado",
      cabecalho: "Publicado a",
      esconderAte: "md",
      celula: (a) => (a.publishedAt ? formatarData(a.publishedAt) : "—"),
    },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (a) => <EstadoArtigoBadge estado={a.status} />,
    },
  ];
  return (
    <>
      <PageHeader
        titulo="Base de conhecimento"
        descricao="Artigos de ajuda. Os publicados para clientes aparecem no portal, em «Ajuda»."
        accao={
          <Can requer="messaging.knowledge_base.write">
            <Button asChild>
              <Link to="/base-conhecimento/novo">
                <Plus strokeWidth={1.75} aria-hidden />
                Novo artigo
              </Link>
            </Button>
          </Can>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
        <form
          role="search"
          className="flex flex-col gap-1.5"
          onSubmit={(x) => {
            x.preventDefault();
            filtrar("q", normalizarTexto(texto).slice(0, 100));
          }}
        >
          <label htmlFor={idPesquisa} className="text-sm font-medium text-foreground">
            Pesquisar
          </label>
          <Input id={idPesquisa} type="search" maxLength={100} value={texto} onChange={(x) => setTexto(x.target.value)} onBlur={() => filtrar("q", normalizarTexto(texto).slice(0, 100))} />
        </form>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
            Estado
          </label>
          <Select id={idEstado} value={estado ?? ""} onChange={(x) => filtrar("estado", x.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS_ARTIGO).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idCategoria} className="text-sm font-medium text-foreground">
            Categoria
          </label>
          <Select id={idCategoria} value={categoria} onChange={(x) => filtrar("categoria", x.target.value)}>
            <option value="">Todas</option>
            {categoria !== "" && !categorias.includes(categoria) ? <option value={categoria}>{categoria}</option> : null}
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Tabela
        rotulo="Artigos"
        colunas={colunas}
        linhas={artigos.data}
        chave={(a) => a.articleId}
        aCarregar={artigos.isPending}
        erro={artigos.error ? <ErrorPanel erro={artigos.error} tentarDeNovo={() => void artigos.refetch()} /> : undefined}
        vazio={pesquisa || estado || categoria ? "Nenhum artigo com estes filtros." : "Ainda não há artigos."}
      />
    </>
  );
}
