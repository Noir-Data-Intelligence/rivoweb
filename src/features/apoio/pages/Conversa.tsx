/**
 * Uma conversa do portal, do lado da equipa: as mensagens, responder enquanto
 * está aberta e fechá-la. O cliente vê as respostas como «Equipa».
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { EstadoConversa, Fio, TIPOS_CONVERSA, erroMensagem, MAXIMO_MENSAGEM } from "@/features/portalcliente";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useConversa, useFecharConversa, useResponder } from "../api";

function Responder({ id, aoEnviar }: { id: string; aoEnviar: () => void }) {
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const responder = useResponder(id);
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
            aoEnviar();
          },
        });
      }}
    >
      {responder.error ? <ErrorPanel erro={responder.error} /> : null}
      <Field rotulo="Responder ao cliente" erro={tentou ? erro : undefined}>
        {({ id: idCampo, descricao, invalido }) => (
          <Textarea id={idCampo} rows={4} maxLength={MAXIMO_MENSAGEM} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />
        )}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" aCarregar={responder.isPending}>
          Enviar resposta
        </Button>
      </div>
    </form>
  );
}

function Fechar({ id, ticket, aoFechar }: { id: string; ticket: boolean; aoFechar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useFecharConversa(id);
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        {ticket ? "Fechar o pedido" : "Fechar a conversa"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) fechar.reset();
        }}
        titulo={ticket ? "Fechar o pedido de suporte?" : "Fechar a conversa?"}
        descricao={
          ticket ? "O cliente deixa de poder responder e passa a poder avaliar o atendimento. Se precisar de mais, abre outro pedido." : "Se o cliente escrever outra vez, abre-se uma conversa nova."
        }
        rotuloConfirmar={ticket ? "Fechar o pedido" : "Fechar a conversa"}
        aCarregar={fechar.isPending}
        erro={fechar.error ? <ErrorPanel erro={fechar.error} /> : undefined}
        aoConfirmar={() =>
          fechar.isPending
            ? undefined
            : fechar.mutate(undefined, {
                onSuccess: () => {
                  setAberto(false);
                  aoFechar();
                },
              })
        }
      />
    </>
  );
}

export default function Conversa() {
  const { conversationId = "" } = useParams();
  const estado: unknown = useLocation().state;
  // O nome vem da lista (a conversa não o traz); entrando pelo endereço, fica «Cliente».
  const cliente = typeof estado === "object" && estado !== null && "cliente" in estado && typeof estado.cliente === "string" ? estado.cliente : "Cliente";
  const conversa = useConversa(conversationId);
  const { pode } = useUtilizador();
  const idFio = useId();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/conversas">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Conversas
      </Link>
    </Button>
  );
  if (conversa.isPending) return <CarregandoPagina />;
  if (conversa.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={conversa.error} tentarDeNovo={() => void conversa.refetch()} />
      </>
    );
  }
  const c = conversa.data;
  const ticket = c.kind === "Ticket";
  const aberta = c.status === "Open";
  const escreve = pode("messaging.conversations.write");
  const recarregar = () => void conversa.refetch();
  return (
    <>
      {voltar}
      <PageHeader
        titulo={c.subject ?? `Mensagens de ${cliente}`}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoConversa estado={c.status} />
            <span>
              {TIPOS_CONVERSA[c.kind] ?? c.kind} · {cliente} · aberta {formatarDataHora(c.openedAt)}
              {c.closedAt ? ` · fechada ${formatarDataHora(c.closedAt)}` : ""}
            </span>
          </span>
        }
        accao={escreve && aberta ? <Fechar id={c.conversationId} ticket={ticket} aoFechar={recarregar} /> : undefined}
      />
      <section aria-labelledby={idFio} className="flex flex-col gap-6">
        <h2 id={idFio} className="sr-only">
          Mensagens
        </h2>
        <Fio mensagens={c.messages} eu="Employee" nomeOutro={cliente} />
        {aberta ? escreve ? <Responder id={c.conversationId} aoEnviar={recarregar} /> : null : <Alert tom="info" titulo="Fechada: já não recebe respostas." />}
      </section>
    </>
  );
}
