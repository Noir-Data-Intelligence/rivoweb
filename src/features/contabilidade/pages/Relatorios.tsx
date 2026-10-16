/**
 * Relatórios financeiros (§5.7): balancete, balanço, demonstração de
 * resultados e antiguidade de saldos. Os números vêm do servidor; o front não
 * soma nada. Balanço e resultados mostram as contas sem classe de reporte e a
 * diferença, até o plano estar mapeado.
 */
import { useId, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro } from "@/lib/money/money";
import { IsoDate } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Card, CardTitle } from "@/ui/Card";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas } from "@/ui/Vistas";
import { useAntiguidade, useBalancete, useBalanco, useResultados, type Antiguidade, type ContaDemonstracao, type SeccaoDemonstracao } from "../api";
import { EscolhaAnoPeriodo, useAnoPeriodo } from "../comum";

const kz = (v: number | string) => formatarMoeda(dinheiro(v));
const quando = (ano: number, periodo: number | null) => (periodo === null ? `ano de ${ano}` : `${nomeMes(periodo)} de ${ano}`);

function Balancete() {
  const { ano, periodo, mudar } = useAnoPeriodo();
  const b = useBalancete(ano, periodo);
  type Linha = NonNullable<typeof b.data>["lines"][number];
  const colunas: Coluna<Linha>[] = [
    { id: "conta", cabecalho: "Conta", celula: (l) => <span className="tabular-nums">{l.accountCode}</span>, ordenar: (l) => l.accountCode },
    { id: "nome", cabecalho: "Descrição", celula: (l) => l.accountName, ordenar: (l) => l.accountName },
    { id: "abD", cabecalho: "Abertura · débito", alinhar: "direita", esconderAte: "lg", celula: (l) => kz(l.openingDebit) },
    { id: "abC", cabecalho: "Abertura · crédito", alinhar: "direita", esconderAte: "lg", celula: (l) => kz(l.openingCredit) },
    { id: "peD", cabecalho: "Período · débito", alinhar: "direita", esconderAte: "md", celula: (l) => kz(l.periodDebit) },
    { id: "peC", cabecalho: "Período · crédito", alinhar: "direita", esconderAte: "md", celula: (l) => kz(l.periodCredit) },
    { id: "feD", cabecalho: "Saldo devedor", alinhar: "direita", celula: (l) => kz(l.closingDebit) },
    { id: "feC", cabecalho: "Saldo credor", alinhar: "direita", celula: (l) => kz(l.closingCredit) },
  ];
  return (
    <>
      <EscolhaAnoPeriodo ano={ano} periodo={periodo} mudar={mudar} />
      {b.data ? (
        <>
          <GrelhaKpis>
            <Kpi rotulo="Total a débito" valor={kz(b.data.totalDebit)} />
            <Kpi rotulo="Total a crédito" valor={kz(b.data.totalCredit)} />
            <Kpi rotulo="Equilíbrio" valor={b.data.isBalanced ? "Equilibrado" : "Desequilibrado"} detalhe={b.data.isBalanced ? "Débitos iguais aos créditos." : "Débitos e créditos não batem."} />
          </GrelhaKpis>
          {!b.data.isBalanced ? <Alert tom="erro" className="mt-4" titulo="O balancete não está equilibrado. Reveja os lançamentos do período." /> : null}
        </>
      ) : null}
      <div className="mt-4">
        <Tabela
          rotulo={`Balancete do ${quando(ano, periodo)}`}
          colunas={colunas}
          linhas={b.data?.lines}
          chave={(l) => l.accountCode}
          aCarregar={b.isPending}
          erro={b.error ? <ErrorPanel erro={b.error} tentarDeNovo={() => void b.refetch()} /> : undefined}
          vazio={`Sem movimentos no ${quando(ano, periodo)}.`}
          ordenavel
        />
      </div>
    </>
  );
}

function Seccoes({ titulo, seccoes, total }: { titulo: string; seccoes: readonly SeccaoDemonstracao[]; total: number | string }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <CardTitle>{titulo}</CardTitle>
        <span className="font-semibold tabular-nums">{kz(total)}</span>
      </div>
      {seccoes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nada nesta classe.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {[...seccoes]
            .sort((a, b) => Number(a.order) - Number(b.order))
            .map((s) => (
              <section key={`${s.class}-${s.section}`} aria-label={s.section}>
                <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1 text-sm font-medium">
                  <span>{s.section}</span>
                  <span className="tabular-nums">{kz(s.total)}</span>
                </div>
                <ul className="mt-1 flex flex-col">
                  {s.accounts.map((c) => (
                    <li key={c.accountCode} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                      <span className="min-w-0">
                        <span className="tabular-nums text-muted-foreground">{c.accountCode}</span> {c.accountName}
                      </span>
                      <span className="shrink-0 tabular-nums">{kz(c.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </Card>
  );
}

function SemClasse({ contas }: { contas: readonly ContaDemonstracao[] }) {
  const { pode } = useUtilizador();
  if (contas.length === 0) return null;
  return (
    <Alert tom="aviso" className="mb-4" titulo={`${contas.length} ${contas.length === 1 ? "conta movimentada não tem" : "contas movimentadas não têm"} classe de reporte e ficam fora dos totais.`}>
      <ul className="mt-1 list-inside list-disc">
        {contas.slice(0, 10).map((c) => (
          <li key={c.accountCode}>
            <span className="tabular-nums">{c.accountCode}</span> {c.accountName}: {kz(c.amount)}
          </li>
        ))}
      </ul>
      {contas.length > 10 ? <p className="mt-1">E mais {contas.length - 10}.</p> : null}
      {pode("finance.ledger.read") ? (
        <p className="mt-1">
          <Link to="/plano-contas?vista=reporte" className="text-primary underline-offset-4 hover:underline">
            Configurar as classes de reporte
          </Link>
        </p>
      ) : null}
    </Alert>
  );
}

function Balanco() {
  const { ano, periodo, mudar } = useAnoPeriodo();
  const b = useBalanco(ano, periodo);
  return (
    <>
      <EscolhaAnoPeriodo ano={ano} periodo={periodo} mudar={mudar} />
      {b.isPending ? (
        <Skeleton className="h-40" />
      ) : b.error ? (
        <ErrorPanel erro={b.error} tentarDeNovo={() => void b.refetch()} />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Posição no fecho do {quando(ano, periodo)}.</p>
          <SemClasse contas={b.data.unmapped} />
          {!dinheiro(b.data.difference).eq(0) ? (
            <Alert tom="erro" className="mb-4" titulo={`O activo não iguala o passivo mais o capital próprio: diferença de ${kz(b.data.difference)}.`}>
              Normalmente são contas sem classe de reporte ou lançamentos por apurar.
            </Alert>
          ) : null}
          <GrelhaKpis>
            <Kpi rotulo="Activo" valor={kz(b.data.totalAssets)} />
            <Kpi rotulo="Passivo" valor={kz(b.data.totalLiabilities)} />
            <Kpi rotulo="Capital próprio" valor={kz(b.data.totalEquity)} detalhe={`Inclui o resultado do exercício: ${kz(b.data.resultForTheYear)}.`} />
          </GrelhaKpis>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Seccoes titulo="Activo" seccoes={b.data.assets} total={b.data.totalAssets} />
            <div className="flex flex-col gap-6">
              <Seccoes titulo="Capital próprio" seccoes={b.data.equity} total={b.data.totalEquity} />
              <Seccoes titulo="Passivo" seccoes={b.data.liabilities} total={b.data.totalLiabilities} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Resultados() {
  const { ano, periodo, mudar } = useAnoPeriodo();
  const [params, setParams] = useSearchParams();
  const acumulado = params.get("acumulado") !== "nao";
  const r = useResultados(ano, periodo, acumulado);
  return (
    <>
      <EscolhaAnoPeriodo ano={ano} periodo={periodo} mudar={mudar} />
      {periodo !== null ? (
        <div className="-mt-2 mb-4">
          <Checkbox
            rotulo={`Acumulado de Janeiro a ${nomeMes(periodo)}`}
            checked={acumulado}
            onChange={(e) =>
              setParams((a) => {
                const n = new URLSearchParams(a);
                if (e.target.checked) n.delete("acumulado");
                else n.set("acumulado", "nao");
                return n;
              })
            }
          />
        </div>
      ) : null}
      {r.isPending ? (
        <Skeleton className="h-40" />
      ) : r.error ? (
        <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} />
      ) : (
        <>
          <SemClasse contas={r.data.unmapped} />
          <GrelhaKpis>
            <Kpi rotulo="Proveitos" valor={kz(r.data.totalRevenue)} />
            <Kpi rotulo="Custos" valor={kz(r.data.totalExpenses)} />
            <Kpi rotulo="Resultado líquido" valor={kz(r.data.netResult)} detalhe={dinheiro(r.data.netResult).lt(0) ? "Prejuízo." : dinheiro(r.data.netResult).eq(0) ? undefined : "Lucro."} />
          </GrelhaKpis>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Seccoes titulo="Proveitos" seccoes={r.data.revenue} total={r.data.totalRevenue} />
            <Seccoes titulo="Custos" seccoes={r.data.expenses} total={r.data.totalExpenses} />
          </div>
        </>
      )}
    </>
  );
}

const ESCALOES = [
  { chave: "current", texto: "Por vencer" },
  { chave: "days1To30", texto: "1–30 dias" },
  { chave: "days31To60", texto: "31–60 dias" },
  { chave: "days61To90", texto: "61–90 dias" },
  { chave: "over90", texto: "Mais de 90 dias" },
] as const;

function AntiguidadeSaldos() {
  const [params, setParams] = useSearchParams();
  const lado = params.get("lado") === "fornecedores" ? "fornecedores" : "clientes";
  const [data, setData] = useState(params.get("data") ?? "");
  const dataValida = IsoDate.safeParse(data).success ? data : null;
  const a = useAntiguidade(lado, dataValida, null);
  const idLado = useId();
  type Parte = Antiguidade["parties"][number];
  const colunas: Coluna<Parte>[] = [
    { id: "nome", cabecalho: lado === "clientes" ? "Cliente" : "Fornecedor", celula: (p) => p.partyName, ordenar: (p) => p.partyName },
    ...ESCALOES.map(
      (e) =>
        ({
          id: e.chave,
          cabecalho: e.texto,
          alinhar: "direita",
          esconderAte: e.chave === "current" || e.chave === "over90" ? undefined : "lg",
          celula: (p: Parte) => kz(p.buckets[e.chave]),
          ordenar: (p: Parte) => Number(p.buckets[e.chave]),
        }) as Coluna<Parte>,
    ),
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (p) => <span className="font-medium">{kz(p.buckets.total)}</span>, ordenar: (p) => Number(p.buckets.total) },
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor={idLado} className="text-sm font-medium text-foreground">
            Saldos de
          </label>
          <Select
            id={idLado}
            value={lado}
            onChange={(e) =>
              setParams((x) => {
                const n = new URLSearchParams(x);
                if (e.target.value === "fornecedores") n.set("lado", "fornecedores");
                else n.delete("lado");
                return n;
              })
            }
          >
            <option value="clientes">Clientes (a receber)</option>
            <option value="fornecedores">Fornecedores (a pagar)</option>
          </Select>
        </div>
        <Field rotulo="Na data" className="w-48">
          {({ id, descricao }) => (
            <Input
              id={id}
              type="date"
              max={hojeIso()}
              aria-describedby={descricao}
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                setParams((x) => {
                  const n = new URLSearchParams(x);
                  if (IsoDate.safeParse(e.target.value).success) n.set("data", e.target.value);
                  else n.delete("data");
                  return n;
                });
              }}
            />
          )}
        </Field>
      </div>
      {a.data ? (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Em {formatarData(a.data.asOf)}, em {a.data.currency}.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ESCALOES.map((e) => (
              <Kpi key={e.chave} rotulo={e.texto} valor={kz(a.data.totals[e.chave])} />
            ))}
            <Kpi rotulo="Total" valor={kz(a.data.totals.total)} />
          </div>
        </>
      ) : null}
      <div className="mt-4">
        <Tabela
          rotulo={lado === "clientes" ? "Antiguidade dos saldos de clientes" : "Antiguidade dos saldos de fornecedores"}
          colunas={colunas}
          linhas={a.data?.parties}
          chave={(p) => p.partyId ?? p.partyName}
          aCarregar={a.isPending}
          erro={a.error ? <ErrorPanel erro={a.error} tentarDeNovo={() => void a.refetch()} /> : undefined}
          vazio={lado === "clientes" ? "Nenhum cliente com saldo em dívida." : "Nenhum fornecedor com saldo por pagar."}
          ordenavel
        />
      </div>
    </>
  );
}

export default function Relatorios() {
  const { pode } = useUtilizador();
  const razao = pode("finance.ledger.read");
  const relatorios = pode("finance.reports.read");
  const vistas = [
    { valor: "balancete", texto: "Balancete", visivel: razao },
    { valor: "balanco", texto: "Balanço", visivel: relatorios },
    { valor: "resultados", texto: "Resultados", visivel: relatorios },
    { valor: "antiguidade", texto: "Antiguidade de saldos", visivel: relatorios },
  ] as const;
  const vista = useVista(vistas);
  const conteudo: Record<(typeof vistas)[number]["valor"], ReactNode> = {
    balancete: <Balancete />,
    balanco: <Balanco />,
    resultados: <Resultados />,
    antiguidade: <AntiguidadeSaldos />,
  };
  return (
    <>
      <PageHeader titulo="Relatórios financeiros" descricao="Balancete, balanço, demonstração de resultados e antiguidade dos saldos." />
      <Vistas rotulo="Relatórios" vistas={vistas} actual={vista} />
      {vista ? conteudo[vista] : <Alert tom="info" titulo="Este perfil não lê relatórios financeiros." />}
    </>
  );
}
