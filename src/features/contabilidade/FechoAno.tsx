/**
 * O que o contabilista indica no fecho do ano, antes de apurar os resultados
 * (Períodos, só com `finance.ledger.close`). O Rivo lança e não calcula nada:
 * - pró-rata do IVA (ADR-124): a regularização do IVA deduzido, a favor do
 *   Estado (75.3.1.2 contra 34.5.4.3, ou parte no imobilizado) ou da empresa
 *   (63.5); o apuramento do IVA de Dezembro leva-a;
 * - regularização de existências (ADR-117, ADR-122): as compras (21) e as
 *   existências iniciais passam para o custo (71), e o stock a 31/12 volta às
 *   existências (22 e 26); a contagem física pode mudar o final, e a diferença
 *   fica no custo ou vai para quebras (78.4.1) e sobras (68.4.1);
 * - estimativa do imposto industrial (ADR-118): D 87.1 / C 34.1.
 * Indicar faz-se uma vez por ano; corrigir é um ajuste com o motivo, e nada se
 * edita nem apaga.
 */
import Big from "big.js";
import { useId, useState } from "react";
import { Link } from "react-router";
import { useUtilizadores } from "@/features/administracao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarMoeda, formatarNumeroDecimal } from "@/lib/format/numero";
import { dinheiro, lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import {
  useContasRazao,
  useEstimativaImposto,
  useIndicarEstimativa,
  useIndicarProRata,
  useProRata,
  useRegularizacaoExistencias,
  type ParteImobilizado,
  type Regularizacao,
  type RegistoEstimativa,
  type RegistoProRata,
} from "./api";

const kz = (v: number | string) => formatarMoeda(dinheiro(v));

/** Avisos do servidor (o que refazer depois): sempre à vista, nunca escondidos. */
export function AvisosServidor({ notas }: { notas: readonly string[] }) {
  if (notas.length === 0) return null;
  return (
    <Alert tom="aviso" titulo={notas.length === 1 ? "Aviso do servidor" : "Avisos do servidor"}>
      <ul className="list-inside list-disc">
        {notas.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </Alert>
  );
}

type Registo = RegistoEstimativa | RegistoProRata;

/** Os registos de uma indicação: a inicial e os ajustes, com quem, quando e o lançamento. */
function TabelaRegistos({ rotulo, registos }: { rotulo: string; registos: readonly Registo[] }) {
  const { pode } = useUtilizador();
  const contas = useUtilizadores(pode("identity.users.read"));
  const quem = (id: string | null) => (id ? (contas.data?.find((u) => u.userId === id)?.email ?? "—") : "—");
  const colunas: Coluna<Registo>[] = [
    { id: "quando", cabecalho: "Quando", celula: (r) => formatarDataHora(r.recordedAt) },
    { id: "quem", cabecalho: "Quem", esconderAte: "md", celula: (r) => quem(r.recordedBy) },
    { id: "tipo", cabecalho: "Tipo", celula: (r) => (r.kind === "Initial" ? "Indicação" : "Correcção") },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (r) => kz(r.amount) },
    { id: "diferenca", cabecalho: "Diferença", alinhar: "direita", esconderAte: "sm", celula: (r) => kz(r.difference) },
    {
      id: "lancamento",
      cabecalho: "Lançamento",
      celula: (r) =>
        r.entryId ? (
          <span className="flex flex-col">
            <Link to={`/lancamentos/${r.entryId}`} className="font-medium text-primary underline-offset-4 hover:underline">
              {r.archivalNumber ?? "Ver"}
            </Link>
            {r.entryVoided ? <span className="text-xs text-muted-foreground">estornado</span> : null}
          </span>
        ) : (
          <span className="text-muted-foreground">Sem lançamento</span>
        ),
    },
    { id: "nota", cabecalho: "Nota ou motivo", esconderAte: "md", celula: (r) => r.notes ?? "—" },
  ];
  return <Tabela rotulo={rotulo} colunas={colunas} linhas={[...registos]} chave={(r) => r.recordId} vazio="Nenhum registo." />;
}

const ERRO_VALOR = "Indique um valor de zero para cima, até 2 casas.";

/** O valor escrito, zero ou maior; null se inválido. */
function lerValor(texto: string): Dinheiro | null {
  const v = lerDinheiroDigitado(texto, 2);
  return v && v.gte(0) ? v : null;
}

// ---------------------------------------------------------------- imposto industrial

/** Estimativa do imposto industrial do ano (D 87.1 / C 34.1 a 31/12). */
export function ImpostoIndustrial({ ano }: { ano: number }) {
  const q = useEstimativaImposto(ano);
  const e = q.data;
  return (
    <Card className="mt-6" id="imposto-industrial">
      <CardTitle>Imposto industrial de {ano}</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        O contabilista indica a estimativa do imposto do ano, e o Rivo lança-a a 31/12 (87.1 contra 34.1), antes de apurar os resultados. O Rivo não tem taxas nem calcula o imposto. «Sem imposto» indica-se com zero. Corrigir lança só a diferença, com o motivo.
      </p>
      {q.isPending ? <Skeleton className="mt-3 h-16" /> : null}
      {q.error ? <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} className="mt-3" /> : null}
      {e ? (
        <div className="mt-3 flex flex-col gap-3">
          {e.indicated && e.amount !== null ? (
            <>
              <GrelhaKpis>
                <Kpi rotulo="Estimativa em vigor" valor={kz(e.amount)} detalhe={dinheiro(e.amount).eq(0) ? "Sem imposto." : "Na 87.1, a pagar na 34.1."} />
              </GrelhaKpis>
              <TabelaRegistos rotulo={`Registos da estimativa de ${ano}`} registos={e.records} />
            </>
          ) : (
            <Alert tom="aviso" titulo={`Falta a estimativa do imposto industrial de ${ano}.`}>
              Sem ela, o apuramento dos resultados faz-se na mesma, mas avisa.
            </Alert>
          )}
          {/* Num lugar fixo: indicar muda o cartão, e o diálogo com o resultado não pode desaparecer. */}
          <div>
            <IndicarEstimativa ano={ano} actual={e.indicated ? e.amount : null} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function IndicarEstimativa({ ano, actual: emVigor }: { ano: number; actual: number | string | null }) {
  // O valor em vigor quando se abriu: depois de indicar, a leitura muda, e o diálogo não muda de modo.
  const [actual, setActual] = useState(emVigor);
  const corrigir = actual !== null;
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [semImposto, setSemImposto] = useState(false);
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const m = useIndicarEstimativa();
  const idForm = useId();
  const v = semImposto ? dinheiro(0) : lerValor(valor);
  const motivo = normalizarTexto(texto);
  const erros = {
    valor: !v ? ERRO_VALOR : corrigir && v.eq(dinheiro(actual)) ? "O novo valor tem de ser diferente do que está em vigor." : undefined,
    motivo: corrigir && motivo === "" ? "Diga porque corrige." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      m.reset();
      setValor("");
      setSemImposto(false);
      setTexto("");
      setTentou(false);
    }
  };
  const r = m.data;
  return (
    <>
      <Button
        variante={emVigor !== null ? "secondary" : "primary"}
        onClick={() => {
          setActual(emVigor);
          setAberto(true);
        }}
      >
        {emVigor !== null ? "Corrigir" : "Indicar estimativa"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={corrigir ? `Corrigir a estimativa do imposto de ${ano}` : `Indicar a estimativa do imposto de ${ano}`}
        descricao={
          corrigir
            ? `Em vigor: ${kz(actual)}. Indique o novo total: lança só a diferença (estorno se for menos), com o motivo. Nada se apaga.`
            : `Lança a 31/12/${ano} a 87.1 contra a 34.1. Zero regista «sem imposto» e não lança. Só se indica uma vez; depois corrige-se.`
        }
        rotuloConfirmar={r ? "Fechar" : corrigir ? "Corrigir" : "Indicar"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        {...(r ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {r ? (
          <div className="flex flex-col gap-3">
            <Alert tom="sucesso" titulo={`Estimativa de ${ano}: ${kz(r.estimate.amount ?? 0)}.`} />
            <AvisosServidor notas={r.notes} />
          </div>
        ) : (
          <form
            id={idForm}
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erros.valor || erros.motivo || !v || m.isPending) return;
              m.mutate({ ano, amount: paraApi(v), notes: corrigir || motivo === "" ? null : motivo, reason: corrigir ? motivo : null });
            }}
          >
            <Checkbox rotulo="Sem imposto (zero)" checked={semImposto} onChange={(e) => setSemImposto(e.target.checked)} />
            <Field rotulo={corrigir ? "Novo total (Kz)" : "Imposto estimado (Kz)"} erro={tentou ? erros.valor : undefined}>
              {({ id, descricao, invalido }) => (
                <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" disabled={semImposto} aria-describedby={descricao} invalido={invalido} value={semImposto ? "0" : valor} onChange={(e) => setValor(e.target.value)} />
              )}
            </Field>
            <Field rotulo={corrigir ? "Motivo" : "Nota (opcional)"} erro={tentou ? erros.motivo : undefined}>
              {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
            </Field>
          </form>
        )}
      </Confirmar>
    </>
  );
}

// ---------------------------------------------------------------- pró-rata do IVA

const eContaParteImobilizado = (c: string) => /^1[124](\.|$)/.test(c.trim());
type LinhaParte = { conta: string; valor: string };

/** A favor de quem: positivo é a favor do Estado (IVA deduzido a mais passa a custo). */
const aFavor = (v: number | string) => {
  const d = dinheiro(v);
  return d.eq(0) ? "Sem regularização." : d.gt(0) ? "A favor do Estado: o IVA deduzido a mais passa a custo (75.3.1.2), ou ao imobilizado." : "A favor da empresa: o IVA deduzido a menos passa a proveito (63.5).";
};

/** Regularização anual do IVA pelo pró-rata definitivo (34.5.4.3, «PRT-AAAA»). */
export function ProRataIva({ ano }: { ano: number }) {
  const q = useProRata(ano);
  const p = q.data;
  return (
    <Card className="mt-6">
      <CardTitle>Pró-rata do IVA de {ano}</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        No fim do ano, o contabilista calcula o pró-rata definitivo e indica a regularização do IVA deduzido; o Rivo lança-a a 31/12 contra a 34.5.4.3 e não calcula nada. Indique-a antes de apurar o IVA de Dezembro, que a leva.
      </p>
      {q.isPending ? <Skeleton className="mt-3 h-16" /> : null}
      {q.error ? <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} className="mt-3" /> : null}
      {p ? (
        <div className="mt-3 flex flex-col gap-3">
          {p.indicated && p.amount !== null ? (
            <>
              <GrelhaKpis>
                <Kpi rotulo="Regularização em vigor" valor={kz(dinheiro(p.amount).abs().toString())} detalhe={aFavor(p.amount)} />
              </GrelhaKpis>
              <TabelaRegistos rotulo={`Registos do pró-rata de ${ano}`} registos={p.records} />
            </>
          ) : (
            <p className="text-sm">Ainda não foi indicada a regularização de {ano}. Se não houver, indique zero.</p>
          )}
          <div>
            <IndicarProRata ano={ano} actual={p.indicated ? p.amount : null} />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function IndicarProRata({ ano, actual: emVigor }: { ano: number; actual: number | string | null }) {
  const [actual, setActual] = useState(emVigor);
  const corrigir = actual !== null;
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [favor, setFavor] = useState<"Estado" | "Empresa">("Estado");
  const [partes, setPartes] = useState<LinhaParte[]>([]);
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const m = useIndicarProRata();
  const contas = useContasRazao(false, aberto && pode("finance.ledger.read"));
  const sugestoes = (contas.data ?? []).filter((c) => c.isActive && c.acceptsPostings && !c.isAnalytic && eContaParteImobilizado(c.code));
  const idContas = useId();
  const idForm = useId();
  const v = lerValor(valor);
  const motivo = normalizarTexto(texto);
  const comPartes = favor === "Estado" && partes.length > 0;
  const lidas = partes.map((x) => ({ conta: x.conta.trim(), valor: lerDinheiroDigitado(x.valor, 2) }));
  const errosPartes = lidas.map((x) => ({
    conta: eContaParteImobilizado(x.conta) ? undefined : "Conta do imobilizado: 11, 12 ou 14.",
    valor: x.valor && x.valor.gt(0) ? undefined : "Maior que zero, até 2 casas.",
  }));
  const somaPartes = lidas.reduce((s, x) => (x.valor ? s.plus(x.valor) : s), new Big(0));
  const assinado = v ? (favor === "Empresa" ? dinheiro(v.times(-1).toString()) : v) : null;
  const erros = {
    valor: !v ? ERRO_VALOR : corrigir && assinado && assinado.eq(dinheiro(actual)) ? "O novo valor tem de ser diferente do que está em vigor." : undefined,
    partes: comPartes && v && somaPartes.gt(v) ? "As partes do imobilizado não podem passar do valor da regularização." : undefined,
    motivo: corrigir && motivo === "" ? "Diga porque corrige." : undefined,
  };
  const partesInvalidas = comPartes && errosPartes.some((x) => x.conta || x.valor);
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      m.reset();
      setValor("");
      setFavor("Estado");
      setPartes([]);
      setTexto("");
      setTentou(false);
    }
  };
  const r = m.data;
  return (
    <>
      <Button
        variante={emVigor !== null ? "secondary" : "primary"}
        onClick={() => {
          setActual(emVigor);
          setAberto(true);
        }}
      >
        {emVigor !== null ? "Corrigir" : "Indicar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo={corrigir ? `Corrigir o pró-rata do IVA de ${ano}` : `Indicar o pró-rata do IVA de ${ano}`}
        descricao={
          corrigir
            ? `Em vigor: ${kz(dinheiro(actual).abs().toString())}. ${aFavor(actual)} Indique o novo total: lança só a diferença, com o motivo.`
            : `Lança a 31/12/${ano}, no diário DIV («PRT-${ano}»), contra a 34.5.4.3. Zero regista «sem regularização». Só se indica uma vez; depois corrige-se.`
        }
        rotuloConfirmar={r ? "Fechar" : corrigir ? "Corrigir" : "Indicar"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        {...(r ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {r ? (
          <div className="flex flex-col gap-3">
            <Alert tom="sucesso" titulo={`Pró-rata de ${ano}: ${kz(dinheiro(r.proRata.amount ?? 0).abs().toString())}.`}>
              {aFavor(r.proRata.amount ?? 0)}
            </Alert>
            <AvisosServidor notas={r.notes} />
          </div>
        ) : (
          <form
            id={idForm}
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erros.valor || erros.partes || erros.motivo || partesInvalidas || !assinado || m.isPending) return;
              const fixedAssets: ParteImobilizado[] | null = comPartes ? lidas.map((x) => ({ accountCode: x.conta, amount: paraApi(x.valor ?? dinheiro(0)) })) : null;
              m.mutate({ ano, amount: paraApi(assinado), fixedAssets, notes: corrigir || motivo === "" ? null : motivo, reason: corrigir ? motivo : null });
            }}
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-foreground">A favor de quem</legend>
              {(
                [
                  ["Estado", "A favor do Estado: o IVA deduzido a mais passa a custo (75.3.1.2) ou ao imobilizado"],
                  ["Empresa", "A favor da empresa: o IVA deduzido a menos passa a proveito (63.5)"],
                ] as const
              ).map(([x, t]) => (
                <label key={x} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={`${idForm}-favor`} value={x} checked={favor === x} onChange={() => setFavor(x)} className="size-4 accent-primary" />
                  {t}
                </label>
              ))}
            </fieldset>
            <Field rotulo={corrigir ? "Novo total (Kz)" : "Valor da regularização (Kz)"} erro={tentou ? erros.valor : undefined} ajuda="Sem sinal: a escolha acima diz o lado. Zero é «sem regularização».">
              {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
            </Field>
            {favor === "Estado" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">Partes no imobilizado (opcional)</p>
                <p className="text-xs text-muted-foreground">A parte do IVA que pertence a bens do imobilizado vai para a conta do bem (11, 12 ou 14); o resto vai para a 75.3.1.2.</p>
                {partes.map((x, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <Field rotulo={`Conta da parte ${i + 1}`} erro={tentou ? errosPartes[i]?.conta : undefined}>
                      {({ id, descricao, invalido }) => (
                        <Input id={id} maxLength={30} autoComplete="off" inputMode="decimal" list={sugestoes.length > 0 ? idContas : undefined} aria-describedby={descricao} invalido={invalido} value={x.conta} onChange={(e) => setPartes(partes.map((y, j) => (j === i ? { ...y, conta: e.target.value } : y)))} />
                      )}
                    </Field>
                    <Field rotulo={`Valor da parte ${i + 1} (Kz)`} erro={tentou ? errosPartes[i]?.valor : undefined}>
                      {({ id, descricao, invalido }) => (
                        <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={x.valor} onChange={(e) => setPartes(partes.map((y, j) => (j === i ? { ...y, valor: e.target.value } : y)))} />
                      )}
                    </Field>
                    <Button variante="ghost" onClick={() => setPartes(partes.filter((_, j) => j !== i))}>
                      Tirar a parte {i + 1}
                    </Button>
                  </div>
                ))}
                {sugestoes.length > 0 ? (
                  <datalist id={idContas}>
                    {sugestoes.map((c) => (
                      <option key={c.accountId} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </datalist>
                ) : null}
                {tentou && erros.partes ? <p className="text-sm text-destructive">{erros.partes}</p> : null}
                <div>
                  <Button variante="secondary" tamanho="sm" onClick={() => setPartes([...partes, { conta: "", valor: "" }])}>
                    Juntar uma parte no imobilizado
                  </Button>
                </div>
              </div>
            ) : null}
            <Field rotulo={corrigir ? "Motivo" : "Nota (opcional)"} erro={tentou ? erros.motivo : undefined}>
              {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
            </Field>
          </form>
        )}
      </Confirmar>
    </>
  );
}

// ---------------------------------------------------------------- regularização de existências

type LinhaStock = Regularizacao["stock"][number];
type Pedido = { closingStock: { accountCode: string; amount: string }[]; countDifferencesToOtherResults: boolean };

/** As contas cujo final o utilizador mudou (a contagem física), e a escolha das quebras e sobras. */
function pedidoDe(r: Regularizacao | undefined, finais: Readonly<Record<string, string>>, foraDoCusto: boolean): Pedido | null {
  const closingStock: Pedido["closingStock"] = [];
  for (const l of r?.stock ?? []) {
    const t = finais[l.stockAccountCode];
    if (t === undefined) continue;
    const v = lerValor(t);
    if (!v) return null;
    if (!v.eq(dinheiro(l.proposed))) closingStock.push({ accountCode: l.stockAccountCode, amount: paraApi(v) });
  }
  return { closingStock, countDifferencesToOtherResults: closingStock.length > 0 && foraDoCusto };
}

/** Regularização de existências a 31/12 (inventário intermitente, «REX-AAAA»). */
export function RegularizacaoExistencias({ ano }: { ano: number }) {
  const [finais, setFinais] = useState<Record<string, string>>({});
  const [foraDoCusto, setForaDoCusto] = useState(false);
  const [simulado, setSimulado] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [preview, setPreview] = useState<Regularizacao | undefined>(undefined);
  const m = useRegularizacaoExistencias();
  const r = m.data ?? preview;
  const pedido = pedidoDe(preview, finais, foraDoCusto);
  const chave = pedido ? JSON.stringify(pedido) : null;
  const comContagem = (pedido?.closingStock.length ?? 0) > 0;
  const simular = () =>
    m.mutate(
      { ano, dryRun: true, closingStock: pedido && pedido.closingStock.length > 0 ? pedido.closingStock : null, countDifferencesToOtherResults: pedido?.countDifferencesToOtherResults ?? false },
      {
        onSuccess: (x) => {
          setPreview(x);
          setSimulado(chave ?? JSON.stringify({ closingStock: [], countDifferencesToOtherResults: false }));
        },
      },
    );
  const lancar = () =>
    m.mutate(
      { ano, dryRun: false, closingStock: pedido && pedido.closingStock.length > 0 ? pedido.closingStock : null, countDifferencesToOtherResults: pedido?.countDifferencesToOtherResults ?? false },
      { onSuccess: () => setConfirmar(false) },
    );
  const podeLancar = preview !== undefined && chave !== null && simulado === chave;
  const comDiferencas = (r?.stock ?? []).some((l) => !dinheiro(l.countDifference).eq(0));
  const colunas: Coluna<LinhaStock>[] = [
    {
      id: "conta",
      cabecalho: "Conta",
      celula: (l) => (
        <span className="flex flex-col">
          <span className="font-medium">{l.stockAccountCode}</span>
          <span className="text-xs text-muted-foreground">custo na {l.costAccountCode}</span>
        </span>
      ),
    },
    { id: "inicial", cabecalho: "Inicial", alinhar: "direita", esconderAte: "sm", celula: (l) => kz(l.opening) },
    { id: "proposto", cabecalho: "Pelo inventário", alinhar: "direita", celula: (l) => kz(l.proposed) },
    {
      id: "final",
      cabecalho: "Final",
      alinhar: "direita",
      celula: (l) =>
        m.data && m.data.outcome !== "Preview" ? (
          kz(l.closing)
        ) : (
          <Input
            aria-label={`Final da ${l.stockAccountCode} (contagem física)`}
            inputMode="decimal"
            autoComplete="off"
            className="w-36 text-right tabular-nums"
            invalido={finais[l.stockAccountCode] !== undefined && !lerValor(finais[l.stockAccountCode] ?? "")}
            value={finais[l.stockAccountCode] ?? formatarNumeroDecimal(String(l.closing), 2)}
            onChange={(e) => setFinais({ ...finais, [l.stockAccountCode]: e.target.value })}
          />
        ),
    },
    ...(comDiferencas
      ? [
          {
            id: "diferenca",
            cabecalho: "Diferença da contagem",
            alinhar: "direita" as const,
            celula: (l: LinhaStock) => {
              const d = dinheiro(l.countDifference);
              if (d.eq(0)) return "—";
              return (
                <span className="flex flex-col items-end">
                  <span className={d.lt(0) ? "font-medium text-destructive" : "font-medium"}>
                    {kz(l.countDifference)} {d.lt(0) ? "(quebra)" : "(sobra)"}
                  </span>
                  <span className="text-xs text-muted-foreground">{l.differenceAccountCode ? `vai para a ${l.differenceAccountCode}` : "fica na 71"}</span>
                </span>
              );
            },
          },
        ]
      : []),
  ];
  const listaContas = (rotulo: string, linhas: Regularizacao["purchases"]) => (
    <div>
      <p className="text-sm font-medium text-foreground">{rotulo}</p>
      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma.</p>
      ) : (
        <ul className="text-sm">
          {linhas.map((x) => (
            <li key={x.accountCode} className="flex justify-between gap-4 tabular-nums">
              <span>{x.accountCode}</span>
              <span>{kz(x.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <Card className="mt-6">
      <CardTitle>Regularização de existências de {ano}</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        No fim do ano, antes de apurar os resultados: as compras (21) e as existências iniciais passam para o custo (71), e o stock a 31/12 volta às existências (22 e 26). O final vem do inventário; se a contagem física der outro valor, escreva-o e simule de novo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variante="secondary" aCarregar={m.isPending && m.variables.dryRun === true} disabled={preview !== undefined && pedido === null} onClick={simular}>
          {preview ? "Simular de novo" : `Simular ${ano}`}
        </Button>
        <Button disabled={!podeLancar || m.isPending || (m.data !== undefined && m.data.outcome !== "Preview")} onClick={() => setConfirmar(true)}>
          Lançar {ano}
        </Button>
      </div>
      {preview && !podeLancar && pedido !== null && (m.data === undefined || m.data.outcome === "Preview") ? <p className="mt-2 text-sm text-muted-foreground">Mudou o final ou a escolha das diferenças: simule de novo antes de lançar.</p> : null}
      {preview && pedido === null ? <p className="mt-2 text-sm text-destructive">{ERRO_VALOR}</p> : null}
      {m.error && !confirmar ? <ErrorPanel erro={m.error} className="mt-3" /> : null}
      {r ? (
        <section aria-label="Resultado da regularização de existências" className="mt-4 flex flex-col gap-3">
          <Alert tom={r.outcome === "Regularised" ? "sucesso" : "info"} titulo={r.outcome === "Preview" ? `Simulação a ${formatarData(r.on)}: nada foi gravado.` : r.outcome === "Regularised" ? `Regularização de ${ano} lançada.` : "Nada a fazer: as existências já estão regularizadas."}>
            {r.entryId ? (
              <Link to={`/lancamentos/${r.entryId}`} className="text-primary underline-offset-4 hover:underline">
                Ver o lançamento {r.transactionId ?? ""}
              </Link>
            ) : null}
          </Alert>
          <AvisosServidor notas={r.notes} />
          <Tabela rotulo="Existências a 31/12" colunas={colunas} linhas={r.stock} chave={(l) => l.stockAccountCode} vazio="Nenhuma conta de existências com saldo ou stock." />
          {comContagem && (m.data === undefined || m.data.outcome === "Preview") ? (
            <Checkbox rotulo="A diferença da contagem não afecta o custo (quebras na 78.4.1, sobras na 68.4.1)" ajuda="Por omissão fica no custo (71). O PGC manda para a 78.4 as perdas do inventário físico que não devam afectar o custo: é um juízo do contabilista." checked={foraDoCusto} onChange={(e) => setForaDoCusto(e.target.checked)} />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {listaContas("Compras que passam para o custo (21)", r.purchases)}
            {listaContas("Custo do ano (71)", r.costOfSales)}
          </div>
        </section>
      ) : null}
      <Confirmar
        aberto={confirmar}
        aoMudar={setConfirmar}
        titulo={`Lançar a regularização de existências de ${ano}`}
        descricao={`Lança a 31/12/${ano}, no período 12 e no diário DIV («REX-${ano}»), o que a simulação mostrou. Repetir não duplica; não se apaga, só se estorna.`}
        rotuloConfirmar="Lançar"
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        aoConfirmar={lancar}
      />
    </Card>
  );
}
