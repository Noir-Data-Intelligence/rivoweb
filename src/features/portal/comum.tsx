/** Peças partilhadas pelos ecrãs do portal do colaborador. */
import { Pin } from "lucide-react";
import { useId } from "react";
import { useSearchParams } from "react-router";
import { formatarDataDeInstante } from "@/lib/format/data";
import { IsoDate } from "@/lib/validation/text";
import { Card } from "@/ui/Card";
import { Input } from "@/ui/Field";
import type { Anuncio } from "./api";

/**
 * Janela de datas no URL (`?de=…&ate=…`), para o «voltar» e uma ligação
 * partilhada abrirem o mesmo período. Sem datas válidas, as da omissão.
 */
export function useJanelaUrl(omissao: { de: string; ate: string }) {
  const [params, setParams] = useSearchParams();
  const ler = (k: string) => {
    const v = params.get(k) ?? "";
    return IsoDate.safeParse(v).success ? v : null;
  };
  const de = ler("de") ?? omissao.de;
  const ate = ler("ate") ?? omissao.ate;
  const mudar = (k: "de" | "ate", v: string) =>
    setParams(
      (a) => {
        const n = new URLSearchParams(a);
        if (v) n.set(k, v);
        else n.delete(k);
        return n;
      },
      { replace: true },
    );
  return { de, ate, mudar };
}

export function FiltroJanela({ de, ate, mudar, erro }: { de: string; ate: string; mudar: (k: "de" | "ate", v: string) => void; erro?: string | undefined }) {
  const idDe = useId();
  const idAte = useId();
  const idErro = useId();
  return (
    <div className="mb-4">
      <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,12rem))]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idDe} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={idDe} type="date" value={de} invalido={Boolean(erro)} aria-describedby={erro ? idErro : undefined} onChange={(e) => mudar("de", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate} invalido={Boolean(erro)} aria-describedby={erro ? idErro : undefined} onChange={(e) => mudar("ate", e.target.value)} />
        </div>
      </div>
      {erro ? (
        <p id={idErro} role="alert" className="mt-1.5 text-xs text-danger">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

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
