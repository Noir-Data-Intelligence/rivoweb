/**
 * Orçamentos (§5.7): o tecto mensal de cada centro de custo num ano. Um
 * rascunho não controla nada; aprovado, passa a travar despesa acima do tecto
 * (BR-8) e já não se altera. Quem cria não precisa de ser quem aprova.
 */
import { Check, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarDataHora, hojeIso } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro, lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAprovarOrcamento, useCriarOrcamento, useOrcamentos, useReverOrcamento, useTodosCentrosCusto, type CentroCusto, type Orcamento } from "../api";
import { MOEDAS } from "../comum";

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);
const anoCorrente = () => Number(hojeIso().slice(0, 4));

function EstadoOrcamento({ estado }: { estado: string }) {
  if (estado === "Approved") return <Badge tom="sucesso">Aprovado</Badge>;
  if (estado === "Draft") return <Badge tom="aviso">Rascunho</Badge>;
  if (estado === "Closed") return <Badge>Fechado</Badge>;
  return <Badge>{estado}</Badge>;
}

/** Os 12 tectos digitados: vazio = mês sem tecto. Devolve o mapa para a API, ou o erro. */
function lerMeses(meses: Record<number, string>): { mapa: Record<string, string>; total: Dinheiro; erro: string | null } {
  const mapa: Record<string, string> = {};
  let total = dinheiro(0);
  for (const m of MESES) {
    const t = (meses[m] ?? "").trim();
    if (t === "") continue;
    const v = lerDinheiroDigitado(t, 2);
    if (!v || v.lt(0)) return { mapa, total, erro: `O tecto de ${nomeMes(m)} não é um valor válido.` };
    mapa[String(m)] = paraApi(v);
    total = dinheiro(total.plus(v).toFixed(2));
  }
  return { mapa, total, erro: Object.keys(mapa).length === 0 ? "Indique o tecto de pelo menos um mês." : null };
}

function CamposMeses({ meses, setMeses, moeda }: { meses: Record<number, string>; setMeses: (f: (m: Record<number, string>) => Record<number, string>) => void; moeda: string }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-2 text-sm font-medium text-foreground">Tecto por mês ({moeda})</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MESES.map((m) => (
          <Field key={m} rotulo={nomeMes(m)}>
            {({ id, descricao }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} value={meses[m] ?? ""} onChange={(e) => setMeses((x) => ({ ...x, [m]: e.target.value }))} />
            )}
          </Field>
        ))}
      </div>
    </fieldset>
  );
}

function NovoOrcamento({ centros }: { centros: readonly CentroCusto[] }) {
  const [aberto, setAberto] = useState(false);
  const criar = useCriarOrcamento();
  const [centro, setCentro] = useState("");
  const [ano, setAno] = useState(String(anoCorrente()));
  const [moeda, setMoeda] = useState("AOA");
  const [meses, setMeses] = useState<Record<number, string>>({});
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const lidos = lerMeses(meses);
  const a = Number(ano);
  const erros = {
    centro: centro === "" ? "Escolha o centro de custo." : undefined,
    ano: !Number.isInteger(a) || a < 2000 || a > 2100 ? "Indique o ano." : undefined,
    meses: lidos.erro ?? undefined,
  };
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      criar.reset();
      setTentou(false);
      setMeses({});
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo orçamento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Novo orçamento"
        descricao="Fica em rascunho até ser aprovado. Um centro tem um orçamento por ano."
        rotuloConfirmar="Guardar rascunho"
        aCarregar={criar.isPending}
        erro={criar.error ? <ErrorPanel erro={criar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.centro || erros.ano || erros.meses || criar.isPending) return;
            criar.mutate({ costCentreId: centro, fiscalYear: a, currency: moeda, monthlyCeilings: lidos.mapa }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Centro de custo" erro={tentou ? erros.centro : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={centro} onChange={(e) => setCentro(e.target.value)}>
                <option value="">Escolha…</option>
                {centros
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.costCentreId} value={c.costCentreId}>
                      {c.code} · {c.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Ano" erro={tentou ? erros.ano : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={ano} onChange={(e) => setAno(e.target.value)} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moeda} onChange={(e) => setMoeda(e.target.value)}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <CamposMeses meses={meses} setMeses={setMeses} moeda={moeda} />
          <p className="text-sm text-muted-foreground sm:col-span-2" aria-live="polite">
            Total anual: <span className="font-medium tabular-nums">{formatarMoeda(lidos.total, moeda)}</span>
          </p>
          {tentou && erros.meses ? (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {erros.meses}
            </p>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function ReverOrcamento({ orcamento, nome }: { orcamento: Orcamento; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const rever = useReverOrcamento();
  const inicial = () => Object.fromEntries(orcamento.lines.map((l) => [Number(l.month), dinheiro(l.amount).toFixed(2).replace(".", ",")]));
  const [meses, setMeses] = useState<Record<number, string>>(inicial);
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const lidos = lerMeses(meses);
  const mudar = (x: boolean) => {
    setAberto(x);
    if (x) setMeses(inicial());
    else {
      rever.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => mudar(true)} aria-label={`Rever o orçamento de ${nome}`}>
        Rever
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo={`Rever o orçamento de ${nome} · ${orcamento.fiscalYear}`}
        descricao="Só um rascunho se altera."
        rotuloConfirmar="Guardar"
        aCarregar={rever.isPending}
        erro={rever.error ? <ErrorPanel erro={rever.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (lidos.erro || rever.isPending) return;
            rever.mutate({ budgetId: orcamento.budgetId, monthlyCeilings: lidos.mapa }, { onSuccess: () => mudar(false) });
          }}
        >
          <CamposMeses meses={meses} setMeses={setMeses} moeda={orcamento.currency} />
          <p className="text-sm text-muted-foreground sm:col-span-2" aria-live="polite">
            Total anual: <span className="font-medium tabular-nums">{formatarMoeda(lidos.total, orcamento.currency)}</span>
          </p>
          {tentou && lidos.erro ? (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {lidos.erro}
            </p>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function AprovarOrcamento({ orcamento, nome }: { orcamento: Orcamento; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const aprovar = useAprovarOrcamento();
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Aprovar o orçamento de ${nome}`}>
        <Check strokeWidth={1.75} aria-hidden />
        Aprovar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (setAberto(a), a ? undefined : aprovar.reset())}
        titulo={`Aprovar o orçamento de ${nome} · ${orcamento.fiscalYear}`}
        descricao={`Total anual de ${formatarMoeda(dinheiro(orcamento.annualTotal), orcamento.currency)}. Aprovado, passa a travar a despesa do centro acima do tecto de cada mês e deixa de se poder alterar.`}
        rotuloConfirmar="Aprovar"
        aCarregar={aprovar.isPending}
        erro={aprovar.error ? <ErrorPanel erro={aprovar.error} /> : undefined}
        aoConfirmar={() => aprovar.mutate(orcamento.budgetId, { onSuccess: () => setAberto(false) })}
      />
    </>
  );
}

function MesesDoOrcamento({ orcamento }: { orcamento: Orcamento }) {
  const porMes = new Map(orcamento.lines.map((l) => [Number(l.month), l.amount]));
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-primary">Ver os meses</summary>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {MESES.map((m) => (
          <li key={m} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{nomeMes(m)}</span>
            <span className="tabular-nums">{porMes.has(m) ? formatarMoeda(dinheiro(porMes.get(m) ?? 0), orcamento.currency) : "—"}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function Orcamentos() {
  const { pode } = useUtilizador();
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const centros = useTodosCentrosCusto();
  const centro = params.get("centro");
  const a = Number(params.get("ano"));
  const ano = params.get("ano") !== null && Number.isInteger(a) && a >= 2000 ? a : null;
  const lista = useOrcamentos({ centro, ano, pagina, tamanho });
  const ids = { centro: useId(), ano: useId() };
  const nomeCentro = (id: string) => {
    const c = centros.data?.items.find((x) => x.costCentreId === id);
    return c ? `${c.code} · ${c.name}` : "Centro de custo";
  };
  const filtrar = (chave: string, valor: string) =>
    setParams((x) => {
      const n = new URLSearchParams(x);
      if (valor === "") n.delete(chave);
      else n.set(chave, valor);
      n.delete("pagina");
      return n;
    });
  const colunas: Coluna<Orcamento>[] = [
    {
      id: "centro",
      cabecalho: "Centro de custo",
      celula: (o) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{nomeCentro(o.costCentreId)}</span>
          <MesesDoOrcamento orcamento={o} />
        </div>
      ),
    },
    { id: "ano", cabecalho: "Ano", celula: (o) => String(o.fiscalYear) },
    { id: "total", cabecalho: "Total anual", alinhar: "direita", celula: (o) => formatarMoeda(dinheiro(o.annualTotal), o.currency) },
    { id: "estado", cabecalho: "Estado", celula: (o) => <EstadoOrcamento estado={o.status} /> },
    { id: "aprovado", cabecalho: "Aprovado em", esconderAte: "md", celula: (o) => (o.approvedAt ? `${formatarDataHora(o.approvedAt)}${o.approvedByName ? ` por ${o.approvedByName}` : ""}` : "—") },
    {
      id: "accoes",
      cabecalho: "Acções",
      celula: (o) =>
        o.status === "Draft" ? (
          <div className="flex flex-wrap gap-1">
            {pode("finance.planning.write") ? <ReverOrcamento orcamento={o} nome={nomeCentro(o.costCentreId)} /> : null}
            {pode("finance.budgets.approve") ? <AprovarOrcamento orcamento={o} nome={nomeCentro(o.costCentreId)} /> : null}
          </div>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader
        titulo="Orçamentos"
        descricao="O tecto de despesa de cada centro de custo, mês a mês."
        accao={
          <Can requer="finance.planning.write">
            <NovoOrcamento centros={centros.data?.items ?? []} />
          </Can>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex w-64 flex-col gap-1.5">
          <label htmlFor={ids.centro} className="text-sm font-medium text-foreground">
            Centro de custo
          </label>
          <Select id={ids.centro} value={centro ?? ""} onChange={(e) => filtrar("centro", e.target.value)} aria-busy={centros.isPending || undefined}>
            <option value="">Todos</option>
            {(centros.data?.items ?? []).map((c) => (
              <option key={c.costCentreId} value={c.costCentreId}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex w-32 flex-col gap-1.5">
          <label htmlFor={ids.ano} className="text-sm font-medium text-foreground">
            Ano
          </label>
          <Select id={ids.ano} value={ano ?? ""} onChange={(e) => filtrar("ano", e.target.value)}>
            <option value="">Todos</option>
            {Array.from({ length: 6 }, (_, i) => anoCorrente() + 1 - i).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Tabela
        rotulo="Orçamentos"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(o) => o.budgetId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há orçamentos com estes filtros."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
