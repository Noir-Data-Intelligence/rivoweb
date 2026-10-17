/**
 * Portal do cliente › Mensagens: uma conversa com a equipa comercial de cada
 * vez (ADR-045). Escrever cai na conversa aberta; se a equipa a fechou, a
 * mensagem seguinte abre outra. As fechadas ficam para consulta.
 */
import { useId, useState } from "react";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useEscreverMensagem, useMensagens, type Conversa } from "../api";
import { Fio } from "../comum";
import { erroMensagem, MAXIMO_MENSAGEM } from "../regras";

function Escrever({ haAberta }: { haAberta: boolean }) {
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const escrever = useEscreverMensagem();
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
        if (erro || escrever.isPending) return;
        escrever.mutate(normalizarTexto(texto, true), {
          onSuccess: () => {
            setTexto("");
            setTentou(false);
          },
        });
      }}
    >
      {escrever.error ? <ErrorPanel erro={escrever.error} /> : null}
      <Field rotulo="Nova mensagem" erro={tentou ? erro : undefined} ajuda={haAberta ? undefined : "Abre uma conversa nova com a equipa."}>
        {({ id, descricao, invalido }) => <Textarea id={id} rows={4} maxLength={MAXIMO_MENSAGEM} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" aCarregar={escrever.isPending}>
          Enviar mensagem
        </Button>
      </div>
    </form>
  );
}

function Anterior({ c }: { c: Conversa }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-foreground underline-offset-4 hover:underline">
        Conversa de {formatarDataHora(c.openedAt)}
        {c.closedAt ? `, fechada a ${formatarDataHora(c.closedAt)}` : ""} · {String(c.messages.length)} {c.messages.length === 1 ? "mensagem" : "mensagens"}
      </summary>
      <div className="mt-3">
        <Fio mensagens={c.messages} eu="Customer" nomeOutro="Equipa" />
      </div>
    </details>
  );
}

export default function Mensagens() {
  const conversas = useMensagens();
  const lista = [...(conversas.data ?? [])].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
  const aberta = lista.find((c) => c.status === "Open") ?? null;
  const fechadas = lista.filter((c) => c !== aberta);
  return (
    <>
      <PageHeader titulo="Mensagens" descricao="Escreva à equipa comercial. A resposta aparece aqui; para um assunto a acompanhar à parte, abra um pedido de suporte." />
      {conversas.isPending ? (
        <Skeleton className="h-48" />
      ) : conversas.error ? (
        <ErrorPanel erro={conversas.error} tentarDeNovo={() => void conversas.refetch()} />
      ) : (
        <>
          {aberta ? (
            <section aria-label="Conversa aberta" className="mb-6">
              <Fio mensagens={aberta.messages} eu="Customer" nomeOutro="Equipa" />
            </section>
          ) : (
            <p className="mb-6 text-muted-foreground">Não há nenhuma conversa aberta.</p>
          )}
          <Escrever haAberta={aberta !== null} />
          {fechadas.length > 0 ? (
            <Card className="mt-8 flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">Conversas anteriores</h2>
              {fechadas.map((c) => (
                <Anterior key={c.conversationId} c={c} />
              ))}
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
