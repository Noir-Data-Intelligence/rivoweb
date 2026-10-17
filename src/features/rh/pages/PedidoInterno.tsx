/**
 * Um pedido interno na gestão: a conversa, responder (a resposta da equipa
 * conta para o prazo), atribuir a um responsável e mudar o estado. Um pedido
 * fechado não aceita nada e não se reabre.
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { cn } from "@/ui/cn";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { SelectColaborador, useNomeColaborador } from "../escolhas";
import { CATEGORIA_PEDIDO, EstadoPedido, nome, PRIORIDADE_PEDIDO, SlaBadge } from "../estados";
import { erroMensagem, MAXIMO_MENSAGEM_PEDIDO } from "../regras";
import { useAtribuirPedido, useMudarEstadoPedido, usePedidoInterno, useResponderPedidoGestao, type EstadoPedidoInterno, type PedidoInternoGestao } from "../servicos";

const ESTADO_ACCAO: Record<EstadoPedidoInterno, string> = { Open: "Aberto", InProgress: "Em curso", Resolved: "Resolvido", Closed: "Fechado" };

function Responder({ p }: { p: PedidoInternoGestao }) {
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const responder = useResponderPedidoGestao(p.ticketId);
  const erro = erroMensagem(texto);
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (erro || responder.isPending) return;
        responder.mutate(normalizarTexto(texto, true), {
          onSuccess: () => {
            setTexto("");
            setTentou(false);
          },
        });
      }}
    >
      {responder.error ? <ErrorPanel erro={responder.error} /> : null}
      <Field rotulo="Responder ao colaborador" erro={tentou ? erro : undefined} ajuda={p.sla && !p.sla.firstResponseAt ? "A primeira resposta da equipa cumpre o prazo de resposta." : undefined}>
        {({ id, descricao, invalido }) => <Textarea id={id} rows={4} maxLength={MAXIMO_MENSAGEM_PEDIDO} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" aCarregar={responder.isPending}>
          Enviar resposta
        </Button>
      </div>
    </form>
  );
}

function Atribuir({ p }: { p: PedidoInternoGestao }) {
  const [valor, setValor] = useState(p.assigneeEmployeeId ?? "");
  const atribuir = useAtribuirPedido(p.ticketId);
  const id = useId();
  const mudou = valor !== (p.assigneeEmployeeId ?? "");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Responsável
      </label>
      <div className="flex flex-wrap gap-2">
        <SelectColaborador id={id} className="min-w-0 flex-1" valor={valor} aoMudar={setValor} vazio="Ninguém" />
        <Button variante="secondary" disabled={!mudou} aCarregar={atribuir.isPending} onClick={() => (atribuir.isPending ? undefined : atribuir.mutate(valor === "" ? null : valor))}>
          Atribuir
        </Button>
      </div>
      {p.status === "Open" ? <p className="text-xs text-muted-foreground">Atribuir põe o pedido em curso.</p> : null}
      {atribuir.error ? <ErrorPanel erro={atribuir.error} /> : null}
    </div>
  );
}

function MudarEstado({ p }: { p: PedidoInternoGestao }) {
  const [valor, setValor] = useState<EstadoPedidoInterno>(p.status as EstadoPedidoInterno);
  const [confirmar, setConfirmar] = useState(false);
  const mudar = useMudarEstadoPedido(p.ticketId);
  const id = useId();
  const enviar = () => (mudar.isPending ? undefined : mudar.mutate(valor, { onSuccess: () => setConfirmar(false) }));
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Estado
      </label>
      <div className="flex flex-wrap gap-2">
        <Select id={id} className="min-w-0 flex-1" value={valor} onChange={(e) => setValor(e.target.value as EstadoPedidoInterno)}>
          {Object.entries(ESTADO_ACCAO).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Select>
        <Button variante="secondary" disabled={valor === p.status} aCarregar={mudar.isPending && !confirmar} onClick={() => (valor === "Closed" ? setConfirmar(true) : enviar())}>
          Mudar
        </Button>
      </div>
      {mudar.error && !confirmar ? <ErrorPanel erro={mudar.error} /> : null}
      <Confirmar
        aberto={confirmar}
        aoMudar={(a) => {
          setConfirmar(a);
          if (!a) mudar.reset();
        }}
        titulo="Fechar este pedido?"
        descricao="Um pedido fechado não recebe mensagens nem muda de estado, e não se reabre. Para o colaborador poder responder, marque-o resolvido."
        rotuloConfirmar="Fechar pedido"
        variante="destructive"
        aCarregar={mudar.isPending}
        erro={mudar.error ? <ErrorPanel erro={mudar.error} /> : undefined}
        aoConfirmar={enviar}
      />
    </div>
  );
}

export default function PedidoInterno() {
  const { ticketId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = usePedidoInterno(ticketId);
  const nomeDe = useNomeColaborador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/pedidos-internos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Pedidos internos
      </Link>
    </Button>
  );
  if (q.isPending) return <CarregandoPagina />;
  if (q.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} />
      </>
    );
  }
  const p = q.data;
  const requerente = nomeDe(p.requesterEmployeeId);
  const fechado = p.status === "Closed";
  const escreve = pode("hr.tickets.write");
  const mensagens = [...(p.messages ?? [])].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  return (
    <>
      {voltar}
      <PageHeader
        titulo={p.subject}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <EstadoPedido estado={p.status} />
            <SlaBadge p={p} />
            <span>
              <Link to={`/colaboradores/${p.requesterEmployeeId}`} className="underline-offset-4 hover:underline">
                {requerente}
              </Link>{" "}
              · {nome(CATEGORIA_PEDIDO, p.category)} · prioridade {nome(PRIORIDADE_PEDIDO, p.priority).toLowerCase()} · aberto a {formatarDataHora(p.openedAt)}
              {p.resolvedAt ? ` · resolvido a ${formatarDataHora(p.resolvedAt)}` : ""}
            </span>
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <ol aria-label="Mensagens" className="mb-6 flex flex-col gap-3">
            {mensagens.map((m) => (
              <li key={m.messageId} className={cn("flex", m.fromRequester ? "justify-start" : "justify-end")}>
                <Card className={cn("max-w-[36rem]", m.fromRequester ? undefined : "bg-muted")}>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {m.fromRequester ? requerente : "Equipa"} · {formatarDataHora(m.sentAt)}
                  </p>
                  <p className="whitespace-pre-line break-words text-foreground">{m.body}</p>
                </Card>
              </li>
            ))}
          </ol>
          {fechado ? <Alert tom="info" titulo="Este pedido está fechado e já não recebe mensagens." /> : escreve ? <Responder p={p} /> : null}
        </div>
        <div className="flex flex-col gap-4">
          {p.sla ? (
            <Card>
              <CardTitle>Prazos</CardTitle>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Responder até</dt>
                <dd className={cn("tabular-nums", p.sla.responseBreached ? "text-destructive" : undefined)}>{formatarDataHora(p.sla.responseDueAt)}</dd>
                <dt className="text-muted-foreground">Primeira resposta</dt>
                <dd className="tabular-nums">{p.sla.firstResponseAt ? formatarDataHora(p.sla.firstResponseAt) : "Ainda não"}</dd>
                <dt className="text-muted-foreground">Resolver até</dt>
                <dd className={cn("tabular-nums", p.sla.resolutionBreached ? "text-destructive" : undefined)}>{formatarDataHora(p.sla.resolutionDueAt)}</dd>
              </dl>
            </Card>
          ) : null}
          {escreve && !fechado ? (
            <Card className="flex flex-col gap-4">
              <Atribuir key={`a-${p.assigneeEmployeeId ?? ""}`} p={p} />
              <MudarEstado key={`e-${p.status}`} p={p} />
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-muted-foreground">Responsável: {p.assigneeEmployeeId ? nomeDe(p.assigneeEmployeeId) : "ninguém"}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
