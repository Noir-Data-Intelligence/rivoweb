/**
 * Portal › Pedido interno: a conversa e a resposta. Responder a um pedido
 * resolvido reabre-o; um pedido fechado já não aceita mensagens (`Workplace.cs`).
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { CATEGORIA_PEDIDO, EstadoPedido, nome, PRIORIDADE_PEDIDO } from "@/features/rh";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { cn } from "@/ui/cn";
import { useMeusPedidos, useResponderPedido, type PedidoInterno } from "../api";
import { MAXIMO_MENSAGEM } from "../regras";

function Responder({ p }: { p: PedidoInterno }) {
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const responder = useResponderPedido();
  const idForm = useId();
  const t = normalizarTexto(texto, true);
  const erro = t === "" ? "Escreva a mensagem." : t.length > MAXIMO_MENSAGEM ? `No máximo ${MAXIMO_MENSAGEM} caracteres.` : undefined;
  if (p.status === "Closed") return <Alert tom="info" titulo="Este pedido está fechado e já não recebe mensagens." />;
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
          { ticketId: p.ticketId, body: t },
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
      <Field rotulo="Responder" erro={tentou ? erro : undefined} ajuda={p.status === "Resolved" ? "Responder reabre o pedido." : undefined}>
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

export default function Pedido() {
  const { ticketId } = useParams();
  const pedidos = useMeusPedidos();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="mb-2 -ml-2">
      <Link to="/eu/pedidos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Pedidos internos
      </Link>
    </Button>
  );
  if (pedidos.isPending)
    return (
      <>
        {voltar}
        <Skeleton className="h-48" />
      </>
    );
  if (pedidos.error)
    return (
      <>
        {voltar}
        <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} />
      </>
    );
  const p = pedidos.data.find((x) => x.ticketId === ticketId);
  if (!p)
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
        titulo={p.subject}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <EstadoPedido estado={p.status} />
            <span>
              {nome(CATEGORIA_PEDIDO, p.category)} · prioridade {nome(PRIORIDADE_PEDIDO, p.priority).toLowerCase()} · aberto a {formatarDataHora(p.openedAt)}
              {p.resolvedAt ? ` · resolvido a ${formatarDataHora(p.resolvedAt)}` : ""}
            </span>
          </span>
        }
      />
      <ol aria-label="Mensagens" className="mb-6 flex flex-col gap-3">
        {p.messages.map((m) => (
          <li key={m.messageId} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
            <Card className={cn("max-w-[36rem]", m.fromMe ? "bg-muted" : undefined)}>
              <p className="mb-1 text-xs text-muted-foreground">
                {m.fromMe ? "Eu" : "Equipa"} · {formatarDataHora(m.sentAt)}
              </p>
              <p className="whitespace-pre-line text-foreground">{m.body}</p>
            </Card>
          </li>
        ))}
      </ol>
      <Responder p={p} />
    </>
  );
}
