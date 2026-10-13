/**
 * Tabela (§4.6): cabeçalho `muted` de 13 px, linhas de 44 px, sem zebra,
 * colunas secundárias escondidas em ecrãs estreitos, estados reais de
 * carregamento, erro e vazio. A ordenação só existe quando a lista está
 * inteira no cliente (§2.3): numa lista paginada pelo servidor, ordenar a
 * página visível enganaria.
 */
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { EmptyState, Skeleton } from "./Layout";

export type Coluna<T> = {
  readonly id: string;
  readonly cabecalho: string;
  readonly celula: (linha: T) => ReactNode;
  /** Valor para ordenar. Sem ele, a coluna não ordena. */
  readonly ordenar?: (linha: T) => string | number;
  /** Esconde a coluna abaixo deste ponto de quebra. */
  readonly esconderAte?: "sm" | "md" | "lg";
  readonly alinhar?: "direita";
  readonly className?: string;
};

const ESCONDER = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" } as const;

const comparador = new Intl.Collator("pt", { sensitivity: "base", numeric: true });

export function Tabela<T>({
  rotulo,
  colunas,
  linhas,
  chave,
  aCarregar = false,
  erro,
  vazio,
  ordenavel = false,
  rodape,
}: {
  /** Nome acessível da tabela. */
  rotulo: string;
  colunas: readonly Coluna<T>[];
  linhas: readonly T[] | undefined;
  chave: (linha: T) => string;
  aCarregar?: boolean;
  /** Painel de erro já montado (com «Tentar de novo»). */
  erro?: ReactNode;
  vazio: ReactNode;
  /** Só para listas carregadas por inteiro. */
  ordenavel?: boolean;
  rodape?: ReactNode;
}) {
  const [ordem, setOrdem] = useState<{ id: string; asc: boolean } | null>(null);

  const ordenadas = useMemo(() => {
    const lista = linhas ?? [];
    if (!ordenavel || ordem === null) return lista;
    const col = colunas.find((c) => c.id === ordem.id);
    if (!col?.ordenar) return lista;
    const f = col.ordenar;
    return [...lista].sort((a, b) => {
      const va = f(a);
      const vb = f(b);
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : comparador.compare(String(va), String(vb));
      return ordem.asc ? r : -r;
    });
  }, [linhas, ordem, ordenavel, colunas]);

  if (erro) return <>{erro}</>;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base" aria-label={rotulo} aria-busy={aCarregar || undefined}>
          <thead>
            <tr className="border-b border-border bg-muted">
              {colunas.map((c) => {
                const activa = ordem?.id === c.id;
                const podeOrdenar = ordenavel && c.ordenar !== undefined;
                const Icone = activa ? (ordem.asc ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={activa ? (ordem.asc ? "ascending" : "descending") : undefined}
                    className={cn(
                      "h-10 whitespace-nowrap px-3 text-left text-[13px] font-medium text-muted-foreground",
                      c.alinhar === "direita" && "text-right",
                      c.esconderAte && ESCONDER[c.esconderAte],
                    )}
                  >
                    {podeOrdenar ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setOrdem((o) => (o?.id === c.id ? { id: c.id, asc: !o.asc } : { id: c.id, asc: true }))}
                      >
                        {c.cabecalho}
                        <Icone className="size-3.5" strokeWidth={1.75} aria-hidden />
                      </button>
                    ) : (
                      c.cabecalho
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {aCarregar
              ? [0, 1, 2].map((i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {colunas.map((c) => (
                      <td key={c.id} className={cn("h-11 px-3", c.esconderAte && ESCONDER[c.esconderAte])}>
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : ordenadas.map((l) => (
                  <tr key={chave(l)} className="border-b border-border last:border-0 hover:bg-secondary/60">
                    {colunas.map((c) => (
                      <td
                        key={c.id}
                        className={cn(
                          "h-11 px-3 py-2 align-middle text-foreground",
                          c.alinhar === "direita" && "text-right tabular-nums",
                          c.esconderAte && ESCONDER[c.esconderAte],
                          c.className,
                        )}
                      >
                        {c.celula(l)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!aCarregar && ordenadas.length === 0 ? (typeof vazio === "string" ? <EmptyState frase={vazio} /> : vazio) : null}
      {rodape ? <div className="border-t border-border px-3 py-2">{rodape}</div> : null}
    </div>
  );
}
