import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import { Button } from "./Button";

const TAMANHOS = [25, 50, 100] as const;

/** Paginação do servidor (§2.3): 25 por omissão; 25, 50 e 100 à escolha. */
export function Paginacao({
  pagina,
  tamanho,
  total,
  aoMudar,
}: {
  pagina: number;
  tamanho: number;
  total: number;
  aoMudar: (p: { pagina: number; tamanho: number }) => void;
}) {
  const id = useId();
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  const de = total === 0 ? 0 : (pagina - 1) * tamanho + 1;
  const ate = Math.min(total, pagina * tamanho);
  return (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">
        {de}–{ate} de {total}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="whitespace-nowrap">
          Por página
        </label>
        <select
          id={id}
          value={tamanho}
          onChange={(e) => aoMudar({ pagina: 1, tamanho: Number(e.target.value) })}
          className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11"
        >
          {TAMANHOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button variante="secondary" tamanho="icone" aria-label="Página anterior" disabled={pagina <= 1} onClick={() => aoMudar({ pagina: pagina - 1, tamanho })}>
          <ChevronLeft strokeWidth={1.75} aria-hidden />
        </Button>
        <span className="whitespace-nowrap tabular-nums">
          {pagina} / {paginas}
        </span>
        <Button variante="secondary" tamanho="icone" aria-label="Página seguinte" disabled={pagina >= paginas} onClick={() => aoMudar({ pagina: pagina + 1, tamanho })}>
          <ChevronRight strokeWidth={1.75} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
