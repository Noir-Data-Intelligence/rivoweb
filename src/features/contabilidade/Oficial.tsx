/**
 * Balanço e demonstração de resultados no modelo do PGC (Decreto n.º 82/01,
 * ADR-094): as linhas do decreto, pela ordem e com a nota, o exercício e o
 * comparativo. Os valores vêm do servidor já na unidade escolhida (o PGC não
 * admite menos do que o milhar; o kwanza serve para conferir).
 */
import { useId } from "react";
import { useSearchParams } from "react-router";
import { formatarData } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { Alert } from "@/ui/Alert";
import { Card } from "@/ui/Card";
import { cn } from "@/ui/cn";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Skeleton } from "@/ui/Layout";
import { useDemonstracaoOficial, type LinhaOficial } from "./api";
import { EscolhaAnoPeriodo, useAnoPeriodo } from "./comum";

export const UNIDADES = [
  { valor: 1000, texto: "Milhares de kwanzas" },
  { valor: 1000000, texto: "Milhões de kwanzas" },
  { valor: 1, texto: "Kwanzas (para conferir)" },
] as const;

/** Recuo da rubrica pelo nível (1 a 4) que o servidor indica. */
const RECUO = ["pl-3", "pl-8", "pl-12", "pl-16"] as const;

const valor = (v: LinhaOficial["current"], unidade: number) => (v === null ? "" : formatarNumeroDecimal(String(v), unidade === 1 ? 2 : 0));

export function DemonstracaoOficial({ tipo }: { tipo: "balanco" | "resultados" }) {
  const { ano, periodo, mudar } = useAnoPeriodo();
  const [params, setParams] = useSearchParams();
  const u = Number(params.get("unidade"));
  const unidade = UNIDADES.some((x) => x.valor === u) ? u : 1000;
  const d = useDemonstracaoOficial(tipo, ano, periodo, unidade);
  const idUnidade = useId();
  const ate = periodo === null ? `ano de ${ano}` : `até ${nomeMes(periodo)} de ${ano}`;
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <EscolhaAnoPeriodo ano={ano} periodo={periodo} mudar={mudar} />
        <div className="mb-4 flex w-56 flex-col gap-1.5">
          <label htmlFor={idUnidade} className="text-sm font-medium text-foreground">
            Unidade
          </label>
          <Select
            id={idUnidade}
            value={unidade}
            onChange={(e) =>
              setParams((x) => {
                const n = new URLSearchParams(x);
                if (e.target.value === "1000") n.delete("unidade");
                else n.set("unidade", e.target.value);
                return n;
              })
            }
          >
            {UNIDADES.map((x) => (
              <option key={x.valor} value={x.valor}>
                {x.texto}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {d.isPending ? (
        <Skeleton className="h-64" />
      ) : d.error ? (
        <ErrorPanel erro={d.error} tentarDeNovo={() => void d.refetch()} />
      ) : (
        <>
          {d.data.notes.length > 0 ? (
            <Alert tom="aviso" className="mb-4" titulo={d.data.notes.length === 1 ? "Aviso do servidor" : "Avisos do servidor"}>
              <ul className="mt-1 list-inside list-disc">
                {d.data.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {d.data.outsideThePlan.length > 0 ? (
            <Alert tom="aviso" className="mb-4" titulo={`${d.data.outsideThePlan.length} ${d.data.outsideThePlan.length === 1 ? "conta movimentada está fora do PGC e não entra" : "contas movimentadas estão fora do PGC e não entram"} nas linhas do modelo.`}>
              <ul className="mt-1 list-inside list-disc">
                {d.data.outsideThePlan.slice(0, 10).map((c) => (
                  <li key={c.accountCode}>
                    <span className="tabular-nums">{c.accountCode}</span> {c.accountName}: {formatarNumeroDecimal(String(c.amount), 2)}
                  </li>
                ))}
              </ul>
              {d.data.outsideThePlan.length > 10 ? <p className="mt-1">E mais {d.data.outsideThePlan.length - 10}.</p> : null}
            </Alert>
          ) : null}
          <Card>
            <header className="mb-4">
              <p className="text-base font-semibold text-foreground">{d.data.entityName ?? "Entidade sem perfil fiscal"}</p>
              {d.data.entityTaxId ? <p className="text-sm text-muted-foreground">NIF {d.data.entityTaxId}</p> : null}
              <p className="mt-2 font-medium text-foreground">
                {tipo === "balanco" ? `Balanço em ${formatarData(d.data.reportingDate)}` : `${d.data.title}, ${ate}`}
              </p>
              <p className="text-sm text-muted-foreground">Valores expressos em {d.data.unitLabel}</p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" aria-label={tipo === "balanco" ? `Balanço do ${ate}` : `Demonstração de resultados do ${ate}`}>
                <thead>
                  <tr className="border-b border-border bg-muted text-[13px] text-muted-foreground">
                    <th scope="col" className="h-9 px-3 text-left font-medium">
                      Rubrica
                    </th>
                    <th scope="col" className="h-9 w-16 px-3 text-left font-medium">
                      Notas
                    </th>
                    <th scope="col" className="h-9 px-3 text-right font-medium">
                      {ano}
                    </th>
                    <th scope="col" className="h-9 px-3 text-right font-medium">
                      {ano - 1}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.data.lines.map((l) => {
                    const titulo = l.kind === "Heading";
                    const total = l.kind === "Total";
                    return (
                      <tr key={l.key} className={cn("border-b border-border last:border-0", total && "bg-muted/50 font-semibold", titulo && "font-semibold")}>
                        <th scope="row" className={cn("py-2 pr-3 text-left font-[inherit] text-foreground", RECUO[Math.min(Math.max(Number(l.level), 1), 4) - 1])}>
                          {l.label}
                        </th>
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{l.note ?? ""}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{titulo ? "" : valor(l.current, unidade)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{titulo ? "" : valor(l.previous, unidade)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {tipo === "balanco" ? "O comparativo é o fim do exercício anterior." : "O comparativo é o mesmo período do exercício anterior. Os custos aparecem negativos."}
            </p>
          </Card>
        </>
      )}
    </>
  );
}
