/**
 * Portal do cliente › Artigo de ajuda. O texto é simples e mostra-se como
 * texto (sem HTML, §7.4). Abrir conta uma visualização; «foi útil?» guarda um
 * voto por conta, que se pode mudar.
 */
import { ArrowLeft, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { eApiError } from "@/lib/api/problem";
import { formatarDataDeInstante } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useArtigo, useAvaliarArtigo, type Artigo } from "../api";

function FoiUtil({ a }: { a: Artigo }) {
  const avaliar = useAvaliarArtigo();
  const [voto, setVoto] = useState<boolean | null>(null);
  const votar = (helpful: boolean) => avaliar.mutate({ articleId: a.articleId, helpful }, { onSuccess: () => setVoto(helpful) });
  return (
    <Card className="mt-8 flex flex-col gap-3">
      <p className="font-medium text-foreground">Este artigo foi útil?</p>
      {avaliar.error ? <ErrorPanel erro={avaliar.error} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variante={voto === true ? "primary" : "secondary"} aria-pressed={voto === true} aCarregar={avaliar.isPending && avaliar.variables.helpful} onClick={() => votar(true)}>
          <ThumbsUp strokeWidth={1.75} aria-hidden />
          Sim
        </Button>
        <Button variante={voto === false ? "primary" : "secondary"} aria-pressed={voto === false} aCarregar={avaliar.isPending && !avaliar.variables.helpful} onClick={() => votar(false)}>
          <ThumbsDown strokeWidth={1.75} aria-hidden />
          Não
        </Button>
      </div>
      {voto !== null ? (
        <p role="status" className="text-sm text-muted-foreground">
          Obrigado. {voto ? "Ainda bem que ajudou." : "Se precisar, abra um pedido de suporte."}
        </p>
      ) : null}
    </Card>
  );
}

export default function ArtigoAjuda() {
  const { slug = "" } = useParams();
  const artigo = useArtigo(slug);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="mb-2 -ml-2">
      <Link to="/cliente/ajuda">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Ajuda
      </Link>
    </Button>
  );
  if (artigo.isPending)
    return (
      <>
        {voltar}
        <Skeleton className="h-48" />
      </>
    );
  if (artigo.error)
    return (
      <>
        {voltar}
        {eApiError(artigo.error) && artigo.error.status === 404 ? (
          <Alert tom="info" titulo="Artigo não encontrado." />
        ) : (
          <ErrorPanel erro={artigo.error} tentarDeNovo={() => void artigo.refetch()} />
        )}
      </>
    );
  const a = artigo.data;
  return (
    <>
      {voltar}
      <PageHeader titulo={a.title} descricao={[a.category, a.publishedAt ? `Publicado a ${formatarDataDeInstante(a.publishedAt)}` : null].filter(Boolean).join(" · ")} />
      <article className="max-w-prose whitespace-pre-line break-words text-base leading-relaxed text-foreground">{a.body}</article>
      <FoiUtil a={a} />
    </>
  );
}
