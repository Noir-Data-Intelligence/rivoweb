/** Janela de datas («de» e «até») guardada no URL, e o filtro que a mostra. */
import { useId } from "react";
import { useSearchParams } from "react-router";
import { IsoDate } from "@/lib/validation/text";
import { Input } from "./Field";

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
  // Do URL actual, não do último render (as navegações vão em transição).
  const mudar = (k: "de" | "ate", v: string) => {
    const n = new URLSearchParams(window.location.search);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
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
