/** Barra de progresso (0 a 100) com o valor em texto ao lado: a barra só reforça. */
import { formatarPercentagem } from "@/lib/format/numero";

export function percentagemBarra(progresso: number | string): number {
  const n = Number(progresso);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function BarraProgresso({ valor, rotulo }: { valor: number | string; rotulo: string }) {
  const p = percentagemBarra(valor);
  return (
    <div className="flex items-center gap-3">
      <div role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${p}%` }} />
      </div>
      <span className="w-14 text-right text-sm tabular-nums text-muted-foreground">{formatarPercentagem(Math.round(p))}</span>
    </div>
  );
}
