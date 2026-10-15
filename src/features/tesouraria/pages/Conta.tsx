/**
 * Ficha de uma conta bancária (§5.6): saldo, depósitos e levantamentos,
 * fechar e reabrir, extracto por período e reconciliação com o extracto do
 * banco (importar CSV, conciliar automático e à mão, ignorar).
 */
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, FileUp, Lock, Unlock, Wand2 } from "lucide-react";
import { useId, useState } from "react";
import { Link, NavLink, useParams, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { dinheiro, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { cn } from "@/ui/cn";
import {
  useAccaoLinha,
  useConciliarAutomatico,
  useContas,
  useDepositar,
  useExtracto,
  useFecharConta,
  useImportarExtracto,
  useLevantar,
  useLinhasExtracto,
  useReabrirConta,
  useReconciliacao,
  type Conta as TipoConta,
  type LinhaExtracto,
  type Movimento,
  type ResumoReconciliacao,
} from "../api";
import { EstadoConta } from "./Contas";

const sinal = (direccao: string) => (direccao === "Debit" ? "−" : "+");

function Movimentar({ c, tipo }: { c: TipoConta; tipo: "deposito" | "levantamento" }) {
  const deposito = tipo === "deposito";
  const [aberto, setAberto] = useState(false);
  const depositar = useDepositar(c.accountId);
  const levantar = useLevantar(c.accountId);
  const m = deposito ? depositar : levantar;
  const [valor, setValor] = useState("");
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const erroValor = !v || v.lte(0) ? "Indique um valor maior que zero." : !deposito && v.gt(dinheiro(c.balance)) ? "Passa do saldo da conta; o servidor vai recusar." : undefined;
  const erroTexto = !deposito && normalizarTexto(texto) === "" ? "Descreva o levantamento." : undefined;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      m.reset();
      setTentou(false);
      setValor("");
      setTexto("");
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        {deposito ? <ArrowDownLeft strokeWidth={1.75} aria-hidden /> : <ArrowUpRight strokeWidth={1.75} aria-hidden />}
        {deposito ? "Depositar" : "Levantar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={deposito ? `Depositar em ${c.name}` : `Levantar de ${c.name}`}
        descricao={deposito ? "Entra no saldo e fica no extracto." : "Sai do saldo e fica no extracto. Para pagar a fornecedores, use os pedidos de pagamento."}
        rotuloConfirmar={deposito ? "Depositar" : "Levantar"}
        variante={deposito ? "primary" : "destructive"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroValor || erroTexto || !v || m.isPending) return;
            const t = normalizarTexto(texto);
            if (deposito) depositar.mutate({ amount: paraApi(v), reference: t === "" ? null : t }, { onSuccess: () => fechar(false) });
            else levantar.mutate({ amount: paraApi(v), description: t }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo={`Valor (${c.currency})`} erro={tentou ? erroValor : undefined} ajuda={`Saldo actual: ${moeda(c.balance, c.currency)}.`}>
            {({ id, descricao, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />
            )}
          </Field>
          <Field rotulo={deposito ? "Referência (opcional)" : "Descrição"} erro={tentou ? erroTexto : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Reabrir({ c }: { c: TipoConta }) {
  const [aberto, setAberto] = useState(false);
  const reabrir = useReabrirConta(c.accountId);
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Unlock strokeWidth={1.75} aria-hidden />
        Reabrir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) reabrir.reset();
        }}
        titulo={`Reabrir ${c.name}?`}
        descricao="Volta a aceitar movimentos e a aparecer nas listas de pagamento."
        rotuloConfirmar="Reabrir"
        aCarregar={reabrir.isPending}
        erro={reabrir.error ? <ErrorPanel erro={reabrir.error} /> : undefined}
        aoConfirmar={() => (reabrir.isPending ? undefined : reabrir.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function MovimentosTabela({ movimentos, moedaConta }: { movimentos: readonly Movimento[]; moedaConta: string }) {
  const colunas: Coluna<Movimento>[] = [
    { id: "data", cabecalho: "Data", celula: (m) => formatarDataHora(m.occurredAt) },
    { id: "descricao", cabecalho: "Descrição", celula: (m) => m.description, className: "max-w-[20rem] truncate" },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (m) => <span className={m.direction === "Debit" ? "text-danger" : undefined}>{`${sinal(m.direction)} ${moeda(m.amount, moedaConta)}`}</span> },
    { id: "saldo", cabecalho: "Saldo", alinhar: "direita", esconderAte: "sm", celula: (m) => moeda(m.balanceAfter, moedaConta) },
  ];
  return <Tabela rotulo="Movimentos" colunas={colunas} linhas={movimentos} chave={(m) => m.movementId} vazio="Sem movimentos no período." />;
}

function Extracto({ c }: { c: TipoConta }) {
  const [params, setParams] = useSearchParams();
  const idDe = useId();
  const idAte = useId();
  const data = (k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);
  const de = data("de");
  const ate = data("ate");
  const e = useExtracto(c.accountId, de, ate);
  const filtrar = (k: string, v: string) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idDe} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={idDe} type="date" value={de ?? ""} onChange={(ev) => filtrar("de", ev.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate ?? ""} onChange={(ev) => filtrar("ate", ev.target.value)} />
        </div>
      </div>
      {e.isPending ? (
        <Skeleton className="h-40" />
      ) : e.error ? (
        <ErrorPanel erro={e.error} tentarDeNovo={() => void e.refetch()} />
      ) : (
        <>
          <GrelhaKpis>
            <Kpi rotulo="Saldo inicial" valor={moeda(e.data.openingBalance, c.currency)} />
            <Kpi rotulo="Entradas" valor={moeda(e.data.totalCredits, c.currency)} />
            <Kpi rotulo="Saídas" valor={moeda(e.data.totalDebits, c.currency)} />
            <Kpi rotulo="Saldo final" valor={moeda(e.data.closingBalance, c.currency)} />
          </GrelhaKpis>
          {e.data.reconciles === false ? (
            <Alert tom="aviso" titulo="Os movimentos não batem com o saldo da conta.">
              O saldo final do período difere do saldo registado ({moeda(e.data.accountBalance, c.currency)}). Avise quem gere a contabilidade.
            </Alert>
          ) : null}
          <MovimentosTabela movimentos={e.data.movements} moedaConta={c.currency} />
        </>
      )}
    </div>
  );
}

function EstadoLinha({ estado }: { estado: string }) {
  if (estado === "Matched") return <Badge tom="sucesso">Conciliada</Badge>;
  if (estado === "Ignored") return <Badge>Ignorada</Badge>;
  return <Badge tom="aviso">Por conciliar</Badge>;
}

function Importar({ c }: { c: TipoConta }) {
  const [aberto, setAberto] = useState(false);
  const importar = useImportarExtracto(c.accountId);
  const [csv, setCsv] = useState("");
  const [erroCsv, setErroCsv] = useState<string | null>(null);
  const idFicheiro = useId();
  const r = importar.data;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      importar.reset();
      setCsv("");
      setErroCsv(null);
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <FileUp strokeWidth={1.75} aria-hidden />
        Importar extracto
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Importar o extracto do banco"
        descricao="CSV com data;descrição;valor[;referência], separado por ; ou ,. Datas aaaa-mm-dd ou dd/mm/aaaa; valor positivo entra, negativo sai. Uma linha de cabeçalho é ignorada. Depois de importar, concilia-se o que coincidir."
        rotuloConfirmar={r ? "Concluído" : "Importar"}
        aCarregar={importar.isPending}
        erro={importar.error ? <ErrorPanel erro={importar.error} /> : undefined}
        aoConfirmar={() => {
          if (r) return fechar(false);
          if (csv.trim() === "") return setErroCsv("Escolha um ficheiro ou cole as linhas.");
          if (!importar.isPending) importar.mutate(csv);
        }}
      >
        {r ? (
          <div className="flex flex-col gap-3">
            <Alert tom={r.errors.length > 0 ? "aviso" : "sucesso"} titulo={`${String(r.imported)} linhas importadas, ${String(r.autoMatched)} conciliadas automaticamente.`} />
            {r.errors.length > 0 ? (
              <ul className="max-h-48 divide-y divide-border overflow-y-auto text-sm">
                {r.errors.map((x) => (
                  <li key={x} className="py-1.5">
                    {x}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idFicheiro} className="text-sm font-medium text-foreground">
                Ficheiro .csv
              </label>
              <input
                id={idFicheiro}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-foreground"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setErroCsv(null);
                  if (!f) return;
                  if (f.size > 2 * 1024 * 1024) return setErroCsv("O ficheiro passa de 2 MB.");
                  void f.text().then(setCsv);
                }}
              />
            </div>
            <Field rotulo="Ou cole as linhas" erro={erroCsv ?? undefined}>
              {({ id, descricao, invalido }) => (
                <Textarea id={id} rows={6} className="font-mono text-sm" aria-describedby={descricao} invalido={invalido} value={csv} onChange={(e) => setCsv(e.target.value)} />
              )}
            </Field>
          </div>
        )}
      </Confirmar>
    </>
  );
}

function Conciliar({ contaId, linha, resumo }: { contaId: string; linha: LinhaExtracto; resumo: ResumoReconciliacao }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAccaoLinha(contaId);
  const [movimento, setMovimento] = useState("");
  // Sugere os movimentos do mesmo valor e sentido primeiro.
  const valor = dinheiro(linha.amount);
  const candidatos = [...resumo.unreconciledMovements].sort((a, b) => {
    const igual = (m: typeof a) => dinheiro(m.amount).eq(valor.abs()) && (m.direction === "Debit") === valor.lt(0);
    return Number(igual(b)) - Number(igual(a));
  });
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        Conciliar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            accao.reset();
            setMovimento("");
          }
        }}
        titulo="Conciliar com um movimento"
        descricao={`${formatarData(linha.on)} · ${linha.description} · ${moeda(linha.amount, resumo.currency)}`}
        rotuloConfirmar="Conciliar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          if (!movimento || accao.isPending) return;
          accao.mutate({ lineId: linha.lineId, accao: "match", movementId: movimento }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Movimento da conta" ajuda={candidatos.length === 0 ? "Não há movimentos por conciliar." : "Os do mesmo valor aparecem primeiro."}>
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={movimento} onChange={(e) => setMovimento(e.target.value)}>
              <option value="">Escolha…</option>
              {candidatos.map((m) => (
                <option key={m.movementId} value={m.movementId}>
                  {formatarData(m.occurredAt.slice(0, 10))} · {m.description} · {sinal(m.direction)} {moeda(m.amount, resumo.currency)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Confirmar>
    </>
  );
}

function AccoesLinha({ contaId, linha, resumo }: { contaId: string; linha: LinhaExtracto; resumo: ResumoReconciliacao }) {
  const accao = useAccaoLinha(contaId);
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {linha.status === "Unmatched" ? (
        <>
          <Conciliar contaId={contaId} linha={linha} resumo={resumo} />
          <Button variante="ghost" tamanho="sm" aCarregar={accao.isPending} onClick={() => accao.mutate({ lineId: linha.lineId, accao: "ignore" })}>
            Ignorar
          </Button>
        </>
      ) : linha.status === "Matched" ? (
        <Button variante="ghost" tamanho="sm" aCarregar={accao.isPending} onClick={() => accao.mutate({ lineId: linha.lineId, accao: "unmatch" })}>
          Desfazer
        </Button>
      ) : null}
      {accao.error ? <ErrorPanel erro={accao.error} className="w-full" /> : null}
    </div>
  );
}

function Reconciliacao({ c }: { c: TipoConta }) {
  const { pode } = useUtilizador();
  const escreve = pode("finance.treasury.write");
  const [estado, setEstado] = useState<"Unmatched" | "Matched" | "Ignored" | null>("Unmatched");
  const resumo = useReconciliacao(c.accountId);
  const linhas = useLinhasExtracto(c.accountId, estado);
  const auto = useConciliarAutomatico(c.accountId);
  const idEstado = useId();
  if (resumo.isPending) return <Skeleton className="h-40" />;
  if (resumo.error) return <ErrorPanel erro={resumo.error} tentarDeNovo={() => void resumo.refetch()} />;
  const r = resumo.data;
  const colunas: Coluna<LinhaExtracto>[] = [
    { id: "data", cabecalho: "Data", celula: (l) => formatarData(l.on) },
    { id: "descricao", cabecalho: "Descrição", celula: (l) => l.description + (l.reference ? ` · ${l.reference}` : ""), className: "max-w-[18rem] truncate" },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (l) => moeda(l.amount, r.currency) },
    { id: "estado", cabecalho: "Estado", esconderAte: "sm", celula: (l) => <EstadoLinha estado={l.status} /> },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (l: LinhaExtracto) => <AccoesLinha contaId={c.accountId} linha={l} resumo={r} /> }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <GrelhaKpis>
        <Kpi rotulo="Saldo contabilístico" valor={moeda(r.bookBalance, r.currency)} />
        <Kpi rotulo="Linhas do extracto" valor={String(r.statementLines)} detalhe={`${String(r.matched)} conciliadas · ${String(r.ignored)} ignoradas`} />
        <Kpi rotulo="Por conciliar" valor={String(r.unmatched)} detalhe={`Total: ${moeda(r.unmatchedStatementTotal, r.currency)}`} />
        <Kpi rotulo="Movimentos sem par" valor={String(r.unreconciledMovements.length)} />
      </GrelhaKpis>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 sm:w-60">
          <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
            Linhas
          </label>
          <Select id={idEstado} value={estado ?? ""} onChange={(e) => setEstado((e.target.value || null) as typeof estado)}>
            <option value="Unmatched">Por conciliar</option>
            <option value="Matched">Conciliadas</option>
            <option value="Ignored">Ignoradas</option>
            <option value="">Todas</option>
          </Select>
        </div>
        {escreve ? (
          <div className="flex flex-wrap gap-2">
            <Importar c={c} />
            <Button variante="secondary" aCarregar={auto.isPending} onClick={() => auto.mutate()}>
              <Wand2 strokeWidth={1.75} aria-hidden />
              Conciliar automaticamente
            </Button>
          </div>
        ) : null}
      </div>
      {auto.isSuccess ? <Alert tom="sucesso" titulo={`${String(auto.data.matched)} linhas conciliadas.`} /> : null}
      {auto.error ? <ErrorPanel erro={auto.error} /> : null}
      <Tabela
        rotulo="Linhas do extracto"
        colunas={colunas}
        linhas={linhas.data}
        chave={(l) => l.lineId}
        aCarregar={linhas.isPending}
        erro={linhas.error ? <ErrorPanel erro={linhas.error} tentarDeNovo={() => void linhas.refetch()} /> : undefined}
        vazio={r.statementLines === 0 ? "Ainda não há extracto importado." : "Nenhuma linha neste estado."}
      />
    </div>
  );
}

export default function Conta() {
  const { accountId = "" } = useParams();
  const [params] = useSearchParams();
  const { pode } = useUtilizador();
  // Não há leitura de uma conta só: procura-se na lista (até 200, com as fechadas).
  const contas = useContas({ pagina: 1, tamanho: 200, fechadas: true });
  const fechar = useFecharConta(accountId);
  const vista = params.get("vista") === "reconciliacao" && pode("finance.treasury.read") ? "reconciliacao" : "extracto";
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/contas">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Contas bancárias
      </Link>
    </Button>
  );
  if (contas.isPending) return <CarregandoPagina />;
  if (contas.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={contas.error} tentarDeNovo={() => void contas.refetch()} />
      </>
    );
  }
  const c = contas.data.items.find((x) => x.accountId === accountId);
  if (!c) {
    return (
      <>
        {voltar}
        <Alert tom="aviso" titulo="Conta não encontrada.">
          Pode ter sido apagada, ou estar fora das primeiras 200.
        </Alert>
      </>
    );
  }
  const sep = (a: boolean) =>
    cn("inline-flex h-9 items-center border-b-2 px-3 text-base pointer-coarse:h-11", a ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground");
  return (
    <>
      {voltar}
      <PageHeader
        titulo={c.name}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoConta activa={c.isActive} />
            <span>
              {c.bank} · {c.currency}
              {c.iban ? ` · ${c.iban}` : ""}
            </span>
          </span>
        }
        accao={
          pode("finance.payables.write") ? (
            <div className="flex flex-wrap gap-2">
              {c.isActive ? (
                <>
                  <Movimentar c={c} tipo="deposito" />
                  <Movimentar c={c} tipo="levantamento" />
                  <ConfirmarComMotivo
                    rotuloBotao="Fechar"
                    icone={<Lock strokeWidth={1.75} aria-hidden />}
                    titulo={`Fechar ${c.name}?`}
                    descricao={`Só se fecha com saldo zero${dinheiro(c.balance).eq(0) ? "" : ` (tem ${moeda(c.balance, c.currency)}: levante ou transfira antes)`}. Deixa de aceitar movimentos e sai das listas de pagamento; o extracto fica e pode reabri-la depois.`}
                    rotuloConfirmar="Fechar conta"
                    ajuda="Fica na trilha de auditoria."
                    falta="Indique o motivo."
                    aCarregar={fechar.isPending}
                    erro={fechar.error ? <ErrorPanel erro={fechar.error} /> : undefined}
                    aoConfirmar={(motivo, f) => fechar.mutate(motivo, { onSuccess: f })}
                  />
                </>
              ) : (
                <Reabrir c={c} />
              )}
            </div>
          ) : undefined
        }
      />
      <Card className="mb-6">
        <CardTitle>Saldo</CardTitle>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{moeda(c.balance, c.currency)}</p>
      </Card>
      {pode("finance.treasury.read") ? (
        <nav aria-label="Vistas da conta" className="mb-4 flex gap-1 border-b border-border">
          <NavLink to={`/contas/${c.accountId}`} end className={() => sep(vista === "extracto")} aria-current={vista === "extracto" ? "page" : undefined}>
            Extracto
          </NavLink>
          <NavLink to={`/contas/${c.accountId}?vista=reconciliacao`} className={() => sep(vista === "reconciliacao")} aria-current={vista === "reconciliacao" ? "page" : undefined}>
            Reconciliação
          </NavLink>
        </nav>
      ) : null}
      {vista === "reconciliacao" ? <Reconciliacao c={c} /> : <Extracto c={c} />}
    </>
  );
}
