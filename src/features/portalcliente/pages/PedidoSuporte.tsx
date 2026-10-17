/**
 * Portal do cliente › Pedido de suporte: as mensagens e a resposta. Fechado,
 * já não recebe mensagens e pode ser avaliado uma vez (1 a 5, e se
 * recomendaria, de 0 a 10).
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { cn } from "@/ui/cn";
import { useAvaliarTicket, useResponderTicket, useTickets, type Conversa } from "../api";
import { EstadoConversa, Fio } from "../comum";
import { avaliacaoParaApi, erroMensagem, errosAvaliacao, MAXIMO_MENSAGEM, temErros } from "../regras";

function Responder({ c }: { c: Conversa }) {
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const responder = useResponderTicket();
  const idForm = useId();
  const erro = erroMensagem(texto);
  return (
    <form
      id={idForm}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (erro || responder.isPending) return;
        responder.mutate(
          { conversationId: c.conversationId, body: normalizarTexto(texto, true) },
          {
            onSuccess: () => {
              setTexto("");
              setTentou(false);
            },
          },
        );
      }}
    >
      {responder.error ? <ErrorPanel erro={responder.error} /> : null}
      <Field rotulo="Responder" erro={tentou ? erro : undefined}>
        {({ id, descricao, invalido }) => <Textarea id={id} rows={4} maxLength={MAXIMO_MENSAGEM} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" aCarregar={responder.isPending}>
          Enviar mensagem
        </Button>
      </div>
    </form>
  );
}

const NOTAS = [1, 2, 3, 4, 5] as const;
const ROTULO_NOTA: Record<number, string> = { 1: "Muito mau", 2: "Mau", 3: "Razoável", 4: "Bom", 5: "Muito bom" };

function Avaliar({ c }: { c: Conversa }) {
  const [nota, setNota] = useState<number | null>(null);
  const [recomendacao, setRecomendacao] = useState("");
  const [comentario, setComentario] = useState("");
  const [tentou, setTentou] = useState(false);
  const avaliar = useAvaliarTicket();
  const idGrupo = useId();
  const campos = { nota, recomendacao, comentario };
  const erros = errosAvaliacao(campos);
  return (
    <Card>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTentou(true);
          if (temErros(erros) || avaliar.isPending) return;
          avaliar.mutate({ conversationId: c.conversationId, ...avaliacaoParaApi(campos) });
        }}
      >
        <h2 className="text-base font-semibold text-foreground">Como foi o atendimento?</h2>
        {avaliar.error ? <ErrorPanel erro={avaliar.error} /> : null}
        <fieldset aria-describedby={tentou && erros.nota ? `${idGrupo}-erro` : undefined}>
          <legend className="mb-2 text-sm font-medium text-foreground">Avaliação</legend>
          <div className="flex flex-wrap gap-2">
            {NOTAS.map((n) => (
              <label
                key={n}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
                  nota === n ? "border-primary bg-muted text-foreground" : "border-border text-muted-foreground",
                )}
              >
                <input type="radio" name={idGrupo} value={n} checked={nota === n} onChange={() => setNota(n)} className="accent-primary" />
                {n} · {ROTULO_NOTA[n]}
              </label>
            ))}
          </div>
          {tentou && erros.nota ? (
            <p id={`${idGrupo}-erro`} role="alert" className="mt-1.5 text-xs text-danger">
              {erros.nota}
            </p>
          ) : null}
        </fieldset>
        <Field rotulo="Recomendaria? (opcional)" ajuda="De 0 (nada provável) a 10 (muito provável)." erro={tentou ? erros.recomendacao : undefined}>
          {({ id, descricao, invalido }) => (
            <Select id={id} aria-describedby={descricao} invalido={invalido} value={recomendacao} onChange={(e) => setRecomendacao(e.target.value)} className="sm:max-w-[12rem]">
              <option value="">—</option>
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={String(i)}>
                  {i}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field rotulo="Comentário (opcional)" erro={tentou ? erros.comentario : undefined}>
          {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_MENSAGEM} aria-describedby={descricao} invalido={invalido} value={comentario} onChange={(e) => setComentario(e.target.value)} />}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" aCarregar={avaliar.isPending}>
            Enviar avaliação
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Avaliacao({ c }: { c: Conversa }) {
  const r = c.rating;
  if (!r) return null;
  return (
    <Alert tom="info" titulo={`Avaliou este atendimento com ${String(r.rating)} em 5 a ${formatarDataHora(r.ratedAt)}.`}>
      {r.netPromoterScore !== null ? <p>Recomendaria: {String(r.netPromoterScore)} em 10.</p> : null}
      {r.comment ? <p className="whitespace-pre-line break-words">{r.comment}</p> : null}
    </Alert>
  );
}

export default function PedidoSuporte() {
  const { conversationId } = useParams();
  const tickets = useTickets();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="mb-2 -ml-2">
      <Link to="/cliente/suporte">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Suporte
      </Link>
    </Button>
  );
  if (tickets.isPending)
    return (
      <>
        {voltar}
        <Skeleton className="h-48" />
      </>
    );
  if (tickets.error)
    return (
      <>
        {voltar}
        <ErrorPanel erro={tickets.error} tentarDeNovo={() => void tickets.refetch()} />
      </>
    );
  const c = tickets.data.find((x) => x.conversationId === conversationId);
  if (!c)
    return (
      <>
        {voltar}
        <Alert tom="info" titulo="Pedido não encontrado." />
      </>
    );
  return (
    <>
      {voltar}
      <PageHeader
        titulo={c.subject ?? "Pedido de suporte"}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <EstadoConversa estado={c.status} />
            <span>
              Aberto a {formatarDataHora(c.openedAt)}
              {c.closedAt ? ` · fechado a ${formatarDataHora(c.closedAt)}` : ""}
            </span>
          </span>
        }
      />
      <div className="mb-6">
        <Fio mensagens={c.messages} eu="Customer" nomeOutro="Equipa" />
      </div>
      {c.status === "Open" ? (
        <Responder c={c} />
      ) : (
        <div className="flex flex-col gap-4">
          <Alert tom="info" titulo="Este pedido está fechado e já não recebe mensagens. Para continuar, abra um pedido novo." />
          {c.rating ? <Avaliacao c={c} /> : <Avaliar c={c} />}
        </div>
      )}
    </>
  );
}
