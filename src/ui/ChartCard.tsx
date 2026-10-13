/**
 * Cartão de gráfico (§4.5, IV §7). Impõe as regras em vez de as deixar a quem
 * escreve: título obrigatório (uma conclusão), cores só por slot, só grelha
 * horizontal, sem eixo vertical, sem dois eixos, sem 3D nem gradientes,
 * tooltip sempre e «Ver como tabela» com os mesmos números, exportável em CSV.
 *
 * Os valores chegam já formatados para a tabela (`texto`) e como número só
 * para desenhar (`valor`): nenhuma conta se faz com eles (§2.6).
 */
import { Download, Table2 } from "lucide-react";
import { useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "./Button";
import { Card, CardTitle } from "./Card";
import { EmptyState } from "./Layout";

/** Slot de cor: a cor de cada entidade é fixa e escolhe-a o mapa da feature, não quem desenha. */
export type Slot = 1 | 2 | 3 | 4 | 5 | "neutro";

const COR: Readonly<Record<Slot, string>> = {
  1: "hsl(var(--chart-1))",
  2: "hsl(var(--chart-2))",
  3: "hsl(var(--chart-3))",
  4: "hsl(var(--chart-4))",
  5: "hsl(var(--chart-5))",
  neutro: "hsl(var(--chart-neutral))",
};

export type Ponto = { readonly valor: number; readonly texto: string };
export type Serie = { readonly id: string; readonly nome: string; readonly slot: Slot; readonly pontos: readonly Ponto[] };

const MAX_SERIES = 5;

export function ChartCard({
  titulo,
  descricao,
  tipo,
  categorias,
  series,
  ficheiroCsv,
  rotuloCategoria = "Período",
}: {
  /** Uma conclusão tirada dos dados, nunca um rótulo («Receita acima da despesa desde Março»). */
  titulo: string;
  descricao?: string;
  tipo: "barras" | "linhas";
  categorias: readonly string[];
  series: readonly Serie[];
  /** Nome do CSV exportado, sem extensão. */
  ficheiroCsv: string;
  rotuloCategoria?: string;
}) {
  const [tabela, setTabela] = useState(false);
  const idTitulo = useId();
  if (series.length > MAX_SERIES) throw new Error(`ChartCard: no máximo ${MAX_SERIES} séries; agrupe o resto em «Outros».`);

  const dados = categorias.map((c, i) => {
    const linha: Record<string, string | number> = { categoria: c };
    for (const s of series) linha[s.id] = s.pontos[i]?.valor ?? 0;
    return linha;
  });
  const textoDe = (id: string, i: number) => series.find((s) => s.id === id)?.pontos[i]?.texto ?? "—";
  const vazio = categorias.length === 0 || series.every((s) => s.pontos.every((p) => p.valor === 0));

  const exportar = async () => {
    const { gerarCsv, descarregarTexto } = await import("@/lib/security/csv");
    const linhas = [[rotuloCategoria, ...series.map((s) => s.nome)], ...categorias.map((c, i) => [c, ...series.map((s) => s.pontos[i]?.texto ?? "")])];
    descarregarTexto(gerarCsv(linhas), `${ficheiroCsv}.csv`, "text/csv;charset=utf-8");
  };

  const Grafico = tipo === "barras" ? BarChart : LineChart;

  return (
    <Card>
      <figure aria-labelledby={idTitulo} className="m-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle id={idTitulo}>{titulo}</CardTitle>
            {descricao ? <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p> : null}
          </div>
          {!vazio ? (
            <div className="flex shrink-0 gap-1">
              <Button variante="ghost" tamanho="sm" onClick={() => setTabela((t) => !t)} aria-pressed={tabela}>
                <Table2 strokeWidth={1.75} aria-hidden />
                {tabela ? "Ver gráfico" : "Ver como tabela"}
              </Button>
              {tabela ? (
                <Button variante="ghost" tamanho="sm" onClick={() => void exportar()}>
                  <Download strokeWidth={1.75} aria-hidden />
                  CSV
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {vazio ? (
          <EmptyState frase="Sem dados neste período." className="py-8" />
        ) : tabela ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th scope="col" className="h-9 px-3 text-left text-[13px] font-medium text-muted-foreground">
                    {rotuloCategoria}
                  </th>
                  {series.map((s) => (
                    <th key={s.id} scope="col" className="h-9 px-3 text-right text-[13px] font-medium text-muted-foreground">
                      {s.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorias.map((c, i) => (
                  <tr key={c} className="border-b border-border last:border-0">
                    <th scope="row" className="h-9 px-3 text-left font-normal text-foreground">
                      {c}
                    </th>
                    {series.map((s) => (
                      <td key={s.id} className="h-9 px-3 text-right tabular-nums text-foreground">
                        {textoDe(s.id, i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="mt-4 h-56 w-full min-w-0 overflow-hidden" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <Grafico data={dados} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} accessibilityLayer={false} tabIndex={-1}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
                  <XAxis dataKey="categoria" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(_v, nome, item) => {
                      const i = categorias.indexOf(String((item.payload as { categoria?: string }).categoria));
                      return [textoDe(String(item.dataKey), i), String(nome)];
                    }}
                  />
                  {series.map((s) =>
                    tipo === "barras" ? (
                      <Bar key={s.id} dataKey={s.id} name={s.nome} fill={COR[s.slot]} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
                    ) : (
                      <Line key={s.id} dataKey={s.id} name={s.nome} stroke={COR[s.slot]} strokeWidth={2} dot={false} isAnimationActive={false} />
                    ),
                  )}
                </Grafico>
              </ResponsiveContainer>
            </div>
            {series.length > 1 ? (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {series.map((s) => (
                  <li key={s.id} className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-sm" style={{ background: COR[s.slot] }} aria-hidden />
                    {s.nome}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="sr-only">Use «Ver como tabela» para ler os valores.</p>
          </>
        )}
      </figure>
    </Card>
  );
}
