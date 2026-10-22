/**
 * Portal do cliente › Um projecto: progresso e marcos, com os comentários da
 * equipa e do cliente; o cliente comenta um marco.
 */
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { BarraProgresso } from "@/ui/BarraProgresso";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useComentarMarco, useProjectoCliente, type ProjectoCliente } from "../api";

type Marco = ProjectoCliente["milestones"][number];

function Comentar({ projectId, m }: { projectId: string; m: Marco }) {
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const comentar = useComentarMarco(projectId);
  const t = normalizarTexto(texto, true);
  const erro = t === "" ? "Escreva o comentário." : t.length > 4000 ? "No máximo 4000 caracteres." : undefined;
  return (
    <form
      noValidate
      className="mt-3 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (erro || comentar.isPending) return;
        comentar.mutate(
          { marco: m.milestoneId, texto: t },
          {
            onSuccess: () => {
              setTexto("");
              setTentou(false);
            },
          },
        );
      }}
    >
      {comentar.error ? <ErrorPanel erro={comentar.error} /> : null}
      <Field rotulo={`Comentar «${m.name}»`} erro={tentou ? erro : undefined}>
        {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={4000} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" tamanho="sm" aCarregar={comentar.isPending}>
          Comentar
        </Button>
      </div>
    </form>
  );
}

export default function ProjectoClientePagina() {
  const { projectId = "" } = useParams();
  const projecto = useProjectoCliente(projectId);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/cliente/projectos">
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
  const aberto = p.status !== "Closed";
  return (
    <>
      {voltar}
      <PageHeader
        titulo={p.name}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            {aberto ? <Badge tom="sucesso">Em curso</Badge> : <Badge tom="neutro">Concluído</Badge>}
            <span>
              {formatarData(p.startDate)} → {p.endDate ? formatarData(p.endDate) : "em curso"}
            </span>
          </span>
        }
      />
      <Card className="mb-6">
        <BarraProgresso valor={Number(p.completionPercent)} rotulo={`${String(p.completionPercent)}% feito`} />
      </Card>
      <h2 className="mb-3 text-md font-semibold text-foreground">Marcos</h2>
      {p.milestones.length === 0 ? <p className="text-muted-foreground">Sem marcos.</p> : null}
      <ol className="flex flex-col gap-4" aria-label="Marcos">
        {[...p.milestones]
          .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
          .map((m) => (
            <li key={m.milestoneId}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{m.name}</span>
                  <span className="inline-flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {formatarData(m.targetDate)}
                    {m.reachedOn ? ` · alcançado ${formatarData(m.reachedOn)}` : ""}
                    {m.status === "Reached" ? <Badge tom="sucesso">Alcançado</Badge> : <Badge tom="info">Por alcançar</Badge>}
                  </span>
                </div>
                {m.comments.length > 0 ? (
                  <ol className="mt-3 flex flex-col gap-2" aria-label={`Comentários em ${m.name}`}>
                    {[...m.comments]
                      .sort((a, b) => a.postedAt.localeCompare(b.postedAt))
                      .map((c) => (
                        <li key={c.commentId} className="rounded-md border border-border p-2 text-sm">
                          <p className="mb-1 text-xs text-muted-foreground">
                            {c.fromCustomer ? "Eu" : c.authorName} · {formatarDataHora(c.postedAt)}
                          </p>
                          <p className="whitespace-pre-line break-words text-foreground">{c.body}</p>
                        </li>
                      ))}
                  </ol>
                ) : null}
                {aberto ? <Comentar projectId={p.projectId} m={m} /> : null}
              </Card>
            </li>
          ))}
      </ol>
    </>
  );
}
