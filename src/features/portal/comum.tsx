/** Peças partilhadas pelos ecrãs do portal do colaborador. */
import { Pin } from "lucide-react";
import { formatarDataDeInstante } from "@/lib/format/data";
import { Card } from "@/ui/Card";
import type { Anuncio } from "./api";

export { FiltroJanela, useJanelaUrl } from "@/ui/JanelaDatas";
export { BarraProgresso } from "@/ui/BarraProgresso";

export function CartaoAnuncio({ a }: { a: Anuncio }) {
  return (
    <Card>
      <div className="mb-1 flex items-start gap-2">
        {a.pinned ? <Pin className="mt-1 size-4 shrink-0 text-primary" strokeWidth={1.75} aria-label="Fixado" /> : null}
        <h2 className="text-md font-semibold text-foreground">{a.title}</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Publicado a {formatarDataDeInstante(a.publishedAt)}
        {a.expiresAt ? ` · até ${formatarDataDeInstante(a.expiresAt)}` : ""}
      </p>
      <p className="whitespace-pre-line text-foreground">{a.body}</p>
    </Card>
  );
}
