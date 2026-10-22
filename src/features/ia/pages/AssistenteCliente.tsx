/**
 * Assistente do portal do cliente (§5.14, F13): perguntas sobre a própria
 * conta (facturas, saldo), respondidas com os dados do cliente. Por botão;
 * as perguntas e respostas desta visita ficam só no ecrã. A pergunta pode
 * desviar o texto da resposta (por exemplo, «prometer» um desconto): cada
 * resposta diz que é automática e sem valor contratual.
 */
import { useState } from "react";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useAssistenteCliente } from "../api";
import { IaDesligada, useIaLigada } from "../comum";

export default function AssistenteCliente() {
  const ia = useIaLigada();
  const pedido = useAssistenteCliente();
  const [pergunta, setPergunta] = useState("");
  const [tentou, setTentou] = useState(false);
  const [conversa, setConversa] = useState<{ pergunta: string; resposta: string }[]>([]);
  const p = normalizarTexto(pergunta, true);
  const erro = p === "" ? "Escreva a pergunta." : p.length > 2000 ? "No máximo 2000 caracteres." : undefined;
  return (
    <>
      <PageHeader titulo="Assistente" descricao="Pergunte sobre as suas facturas e o seu saldo. As respostas usam só os dados da sua conta." />
      {ia.aCarregar ? (
        <Skeleton className="h-24" />
      ) : !ia.ligada ? (
        <IaDesligada />
      ) : (
        <div className="flex flex-col gap-4">
          {conversa.length > 0 ? (
            <ol className="flex flex-col gap-3" aria-label="Conversa com o assistente">
              {conversa.map((c, k) => (
                <li key={k} className="flex flex-col gap-2">
                  <p className="self-end whitespace-pre-line break-words rounded-md bg-muted px-3 py-2 text-sm text-foreground">{c.pergunta}</p>
                  <Card className="flex flex-col gap-2 text-sm text-foreground">
                    <p className="whitespace-pre-line break-words">{c.resposta}</p>
                    <p className="text-xs text-muted-foreground">Resposta automática, sem valor contratual.</p>
                  </Card>
                </li>
              ))}
            </ol>
          ) : null}
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erro || pedido.isPending) return;
              pedido.mutate(
                { question: p },
                {
                  onSuccess: (r) => {
                    setConversa((c) => [...c, { pergunta: p, resposta: r.answer }]);
                    setPergunta("");
                    setTentou(false);
                  },
                },
              );
            }}
          >
            <Field rotulo="A sua pergunta" erro={tentou ? erro : undefined}>
              {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={pergunta} onChange={(e) => setPergunta(e.target.value)} />}
            </Field>
            {pedido.error ? <ErrorPanel erro={pedido.error} /> : null}
            <div>
              <Button type="submit" aCarregar={pedido.isPending}>
                Perguntar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">As respostas são automáticas, sem valor contratual, e podem ter erros: descontos, prazos ou condições só valem se a empresa os confirmar por escrito. Para pagamentos e documentos, confirme no extracto.</p>
          </form>
        </div>
      )}
    </>
  );
}
