/** Peças comuns ao portal do cliente e à equipa que lhe responde. */
import { formatarDataHora } from "@/lib/format/data";
import { Badge, type TomBadge } from "@/ui/Badge";
import { Card } from "@/ui/Card";
import { cn } from "@/ui/cn";
import type { Mensagem } from "./api";

function estado(mapa: Record<string, { texto: string; tom: TomBadge }>) {
  return function Estado({ estado: e }: { estado: string }) {
    const x = mapa[e];
    return <Badge tom={x?.tom ?? "neutro"}>{x?.texto ?? e}</Badge>;
  };
}

export const ESTADOS_COMPROVATIVO: Record<string, string> = { Pending: "Por confirmar", Confirmed: "Confirmado", Rejected: "Rejeitado" };
export const EstadoComprovativo = estado({
  Pending: { texto: "Por confirmar", tom: "aviso" },
  Confirmed: { texto: "Confirmado", tom: "sucesso" },
  Rejected: { texto: "Rejeitado", tom: "erro" },
});

export const ESTADOS_CONVERSA: Record<string, string> = { Open: "Aberta", Closed: "Fechada" };
export const EstadoConversa = estado({ Open: { texto: "Aberta", tom: "info" }, Closed: { texto: "Fechada", tom: "neutro" } });

export const TIPOS_CONVERSA: Record<string, string> = { Message: "Mensagem", Ticket: "Pedido de suporte" };

/**
 * As mensagens de uma conversa, as de `eu` à direita. `eu` é o lado de quem lê:
 * o cliente (`Customer`) ou a equipa (`Employee`).
 */
export function Fio({ mensagens, eu, nomeOutro }: { mensagens: readonly Mensagem[]; eu: "Customer" | "Employee"; nomeOutro: string }) {
  return (
    <ol aria-label="Mensagens" className="flex flex-col gap-3">
      {mensagens.map((m) => {
        const meu = m.sender === eu;
        return (
          <li key={m.messageId} className={cn("flex", meu ? "justify-end" : "justify-start")}>
            <Card className={cn("max-w-[36rem]", meu ? "bg-muted" : undefined)}>
              <p className="mb-1 text-xs text-muted-foreground">
                {meu ? (eu === "Customer" ? "Eu" : "Equipa") : nomeOutro} · {formatarDataHora(m.sentAt)}
              </p>
              <p className="whitespace-pre-line break-words text-foreground">{m.body}</p>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

/** A última mensagem, para as listas. */
export const ultima = (ms: readonly Mensagem[]) => ms.reduce<Mensagem | null>((a, m) => (a === null || m.sentAt > a.sentAt ? m : a), null);
