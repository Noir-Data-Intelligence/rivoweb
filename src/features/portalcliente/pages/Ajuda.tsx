/**
 * Portal do cliente › Ajuda: os artigos publicados para clientes, com pesquisa
 * e categoria no URL. As categorias saem da lista completa.
 */
import { Search } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { formatarDataDeInstante } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useArtigos } from "../api";

export default function Ajuda() {
  const [params, setParams] = useSearchParams();
  const pesquisa = normalizarTexto(params.get("q") ?? "").slice(0, 100);
  const categoria = params.get("categoria") ?? "";
  const [texto, setTexto] = useState(pesquisa);
  const todos = useArtigos("", "");
  const artigos = useArtigos(pesquisa, categoria);
  const categorias = [...new Set((todos.data ?? []).map((a) => a.category).filter((c): c is string => c !== null))].sort((a, b) => a.localeCompare(b, "pt"));
  const idPesquisa = useId();
  const idCategoria = useId();
  const mudar = (k: string, v: string) => {
    const n = new URLSearchParams(window.location.search);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  return (
    <>
      <PageHeader titulo="Ajuda" descricao="Respostas às perguntas mais frequentes. Se não encontrar, abra um pedido de suporte." />
      <form
        role="search"
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          mudar("q", normalizarTexto(texto).slice(0, 100));
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={idPesquisa} className="text-sm font-medium text-foreground">
            Pesquisar
          </label>
          <Input id={idPesquisa} type="search" maxLength={100} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        {categorias.length > 0 ? (
          <div className="flex flex-col gap-1.5 sm:w-56">
            <label htmlFor={idCategoria} className="text-sm font-medium text-foreground">
              Categoria
            </label>
            <Select id={idCategoria} value={categoria} onChange={(e) => mudar("categoria", e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <Button type="submit" variante="secondary">
          <Search strokeWidth={1.75} aria-hidden />
          Pesquisar
        </Button>
      </form>
      {artigos.isPending ? (
        <Skeleton className="h-40" />
      ) : artigos.error ? (
        <ErrorPanel erro={artigos.error} tentarDeNovo={() => void artigos.refetch()} />
      ) : artigos.data.length === 0 ? (
        <p className="text-muted-foreground">{pesquisa || categoria ? "Nenhum artigo corresponde à pesquisa." : "Ainda não há artigos publicados."}</p>
      ) : (
        <ul aria-label="Artigos" className="grid gap-3 md:grid-cols-2">
          {artigos.data.map((a) => (
            <li key={a.articleId}>
              <Card className="h-full">
                <Link to={`/cliente/ajuda/${encodeURIComponent(a.slug)}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {a.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">{[a.category, a.publishedAt ? `publicado a ${formatarDataDeInstante(a.publishedAt)}` : null].filter(Boolean).join(" · ")}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
