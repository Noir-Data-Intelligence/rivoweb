/**
 * Fluxo de caixa (§5.6): previsto (a receber, a pagar, letras e previsões
 * manuais), realizado por mês e as previsões manuais. Previsto e realizado
 * exigem `finance.reports.read`; as previsões, `finance.treasury.*`.
 */
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { NavLink, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { lerAnoMes, mesCurto } from "@/lib/format/periodo";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { cn } from "@/ui/cn";
import { useApagarItemPrevisao, useContasAbertas, useFluxoPrevisto, useFluxoRealizado, useGuardarItemPrevisao, useItensPrevisao, type FluxoPrevisto as TipoPrevisto, type ItemPrevisao } from "../api";
import { MOEDAS } from "./Contas";

const ORIGENS: Readonly<Record<string, string>> = { receivable: "A receber", payable: "A pagar", bill: "Letra", manual: "Previsão manual" };
const nomeMes = (m: string) => {
  const p = lerAnoMes(m);
  return p ? mesCurto(p.ano, p.mes) : m;
};
const somarMeses = (iso: string, n: number) => {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const data = new Date(Date.UTC(a, m - 1 + n, Math.min(d, 28)));
  return data.toISOString().slice(0, 10);
};
const dataUrl = (params: URLSearchParams, k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);

function Previsto() {
  const [params, setParams] = useSearchParams();
  const [pagina, setPagina] = useState({ pagina: 1, tamanho: 25 });
  const idAte = useId();
  const idMoeda = useId();
  const ate = dataUrl(params, "ate") ?? somarMeses(hojeIso(), 3);
  const moedaFluxo = (MOEDAS as readonly string[]).includes(params.get("moeda") ?? "") ? params.get("moeda") : null;
  const p = useFluxoPrevisto(ate, moedaFluxo);
  const mudar = (k: string, v: string) =>
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
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" min={hojeIso()} value={ate} onChange={(e) => mudar("ate", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idMoeda} className="text-sm font-medium text-foreground">
            Moeda
          </label>
          <Select id={idMoeda} value={moedaFluxo ?? ""} onChange={(e) => mudar("moeda", e.target.value)}>
            <option value="">Moeda base</option>
            {MOEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {p.isPending ? <Skeleton className="h-40" /> : p.error ? <ErrorPanel erro={p.error} tentarDeNovo={() => void p.refetch()} /> : <ConteudoPrevisto p={p.data} pagina={pagina} mudarPagina={setPagina} />}
    </div>
  );
}

function ConteudoPrevisto({ p, pagina, mudarPagina }: { p: TipoPrevisto; pagina: { pagina: number; tamanho: number }; mudarPagina: (x: { pagina: number; tamanho: number }) => void }) {
  const ultimo = p.months.at(-1);
  const entradas = p.entries.slice((pagina.pagina - 1) * pagina.tamanho, pagina.pagina * pagina.tamanho);
  return (
    <>
      <GrelhaKpis>
        <Kpi rotulo="Saldo hoje" valor={moeda(p.openingBalance, p.currency)} detalhe={`Contas em ${p.currency}`} />
        <Kpi rotulo={`Saldo previsto a ${formatarData(p.to)}`} valor={ultimo ? moeda(ultimo.closingBalance, p.currency) : "—"} />
      </GrelhaKpis>
      <Tabela
        rotulo="Previsão por mês"
        colunas={[
          { id: "mes", cabecalho: "Mês", celula: (m) => nomeMes(m.month) },
          { id: "entradas", cabecalho: "Entradas", alinhar: "direita", celula: (m) => moeda(m.inflows, p.currency) },
          { id: "saidas", cabecalho: "Saídas", alinhar: "direita", celula: (m) => moeda(m.outflows, p.currency) },
          { id: "saldo", cabecalho: "Saldo no fim", alinhar: "direita", celula: (m) => moeda(m.closingBalance, p.currency) },
        ]}
        linhas={p.months}
        chave={(m) => m.month}
        vazio="Sem previsão no período."
      />
      <h2 className="mt-2 text-md font-semibold text-foreground">De onde vem a previsão</h2>
      <Tabela
        rotulo="Movimentos previstos"
        colunas={[
          { id: "data", cabecalho: "Data", celula: (e) => formatarData(e.on) },
          { id: "origem", cabecalho: "Origem", esconderAte: "sm", celula: (e) => ORIGENS[e.source] ?? e.source },
          { id: "descricao", cabecalho: "Descrição", celula: (e) => e.description, className: "max-w-[18rem] truncate" },
          { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (e) => <span className={e.direction === "Outflow" ? "text-danger" : undefined}>{`${e.direction === "Outflow" ? "−" : "+"} ${moeda(e.amount, p.currency)}`}</span> },
        ]}
        linhas={entradas}
        chave={(e) => `${e.on}-${e.source}-${e.referenceId ?? e.description}-${String(e.amount)}`}
        vazio="Sem movimentos previstos."
        rodape={p.entries.length > 0 ? <Paginacao pagina={pagina.pagina} tamanho={pagina.tamanho} total={p.entries.length} aoMudar={mudarPagina} /> : undefined}
      />
    </>
  );
}

function Realizado() {
  const { pode } = useUtilizador();
  const [params, setParams] = useSearchParams();
  const idDe = useId();
  const idAte = useId();
  const idConta = useId();
  const ate = dataUrl(params, "ate") ?? hojeIso();
  const de = dataUrl(params, "de") ?? somarMeses(ate, -6);
  const conta = /^[0-9a-f-]{36}$/i.test(params.get("conta") ?? "") ? params.get("conta") : null;
  const contas = useContasAbertas(pode("finance.payables.read"));
  const r = useFluxoRealizado(de, ate, conta);
  const moedaConta = contas.data?.items.find((c) => c.accountId === conta)?.currency ?? "AOA";
  const mudar = (k: string, v: string) =>
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
          <Input id={idDe} type="date" value={de} onChange={(e) => mudar("de", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate} onChange={(e) => mudar("ate", e.target.value)} />
        </div>
        {pode("finance.payables.read") ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idConta} className="text-sm font-medium text-foreground">
              Conta
            </label>
            <Select id={idConta} value={conta ?? ""} onChange={(e) => mudar("conta", e.target.value)}>
              <option value="">Todas</option>
              {(contas.data?.items ?? []).map((c) => (
                <option key={c.accountId} value={c.accountId}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
      {r.isPending ? (
        <Skeleton className="h-40" />
      ) : r.error ? (
        <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} />
      ) : (
        <>
          <GrelhaKpis>
            <Kpi rotulo="Entradas" valor={moeda(r.data.totalInflows, moedaConta)} />
            <Kpi rotulo="Saídas" valor={moeda(r.data.totalOutflows, moedaConta)} />
          </GrelhaKpis>
          {conta === null ? <p className="text-xs text-muted-foreground">Com todas as contas, os valores somam moedas diferentes tal como estão; escolha uma conta para ver uma só moeda.</p> : null}
          <Tabela
            rotulo="Realizado por mês"
            colunas={[
              { id: "mes", cabecalho: "Mês", celula: (m) => nomeMes(m.month) },
              { id: "entradas", cabecalho: "Entradas", alinhar: "direita", celula: (m) => moeda(m.inflows, moedaConta) },
              { id: "saidas", cabecalho: "Saídas", alinhar: "direita", celula: (m) => moeda(m.outflows, moedaConta) },
              { id: "liquido", cabecalho: "Líquido", alinhar: "direita", celula: (m) => moeda(m.net, moedaConta) },
            ]}
            linhas={r.data.months}
            chave={(m) => m.month}
            vazio="Sem movimentos no período."
          />
        </>
      )}
    </div>
  );
}

function GuardarItem({ item }: { item?: ItemPrevisao }) {
  const [aberto, setAberto] = useState(false);
  const guardar = useGuardarItemPrevisao();
  const [sentido, setSentido] = useState<"Inflow" | "Outflow">((item?.direction as "Inflow" | "Outflow" | undefined) ?? "Outflow");
  const [data, setData] = useState(item?.on ?? hojeIso());
  const [valor, setValor] = useState(item ? String(item.amount).replace(".", ",") : "");
  const [moedaItem, setMoedaItem] = useState(item?.currency ?? "AOA");
  const [descricao, setDescricao] = useState(item?.description ?? "");
  const [categoria, setCategoria] = useState(item?.category ?? "");
  const [repetir, setRepetir] = useState(item?.repeatMonthlyUntil ?? "");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const erros = {
    data: !IsoDate.safeParse(data).success ? "Indique a data." : undefined,
    valor: !v || v.lte(0) ? "Indique um valor maior que zero." : undefined,
    descricao: normalizarTexto(descricao) === "" ? "Descreva a previsão." : undefined,
    repetir: repetir !== "" && (!IsoDate.safeParse(repetir).success || repetir < data) ? "A repetição acaba depois da primeira data." : undefined,
  };
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      guardar.reset();
      setTentou(false);
    }
  };
  return (
    <>
      {item ? (
        <Button variante="ghost" tamanho="sm" aria-label={`Rever ${item.description}`} onClick={() => setAberto(true)}>
          <Pencil strokeWidth={1.75} aria-hidden />
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Nova previsão
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={item ? "Rever a previsão" : "Nova previsão"}
        descricao="Um recebimento ou pagamento esperado que não está noutro lado (rendas, salários, financiamentos)."
        rotuloConfirmar="Guardar"
        aCarregar={guardar.isPending}
        erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.values(erros).some(Boolean) || !v || guardar.isPending) return;
            const cat = normalizarTexto(categoria);
            guardar.mutate(
              {
                itemId: item?.itemId ?? null,
                corpo: { direction: sentido, on: data, amount: paraApi(v), currency: moedaItem, description: normalizarTexto(descricao), category: cat === "" ? null : cat, repeatMonthlyUntil: repetir === "" ? null : repetir },
              },
              { onSuccess: () => fechar(false) },
            );
          }}
        >
          <Field rotulo="Sentido">
            {({ id, descricao: d }) => (
              <Select id={id} aria-describedby={d} value={sentido} onChange={(e) => setSentido(e.target.value as "Inflow" | "Outflow")}>
                <option value="Inflow">Entrada</option>
                <option value="Outflow">Saída</option>
              </Select>
            )}
          </Field>
          <Field rotulo="Data" erro={tentou ? erros.data : undefined}>
            {({ id, descricao: d, invalido }) => <Input id={id} type="date" aria-describedby={d} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
          <Field rotulo="Valor" erro={tentou ? erros.valor : undefined}>
            {({ id, descricao: d, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={d} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao: d }) => (
              <Select id={id} aria-describedby={d} value={moedaItem} onChange={(e) => setMoedaItem(e.target.value)}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao: d, invalido }) => <Input id={id} maxLength={300} autoComplete="off" aria-describedby={d} invalido={invalido} value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
          </Field>
          <Field rotulo="Categoria (opcional)">
            {({ id, descricao: d }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={d} value={categoria} onChange={(e) => setCategoria(e.target.value)} />}
          </Field>
          <Field rotulo="Repetir todos os meses até (opcional)" erro={tentou ? erros.repetir : undefined}>
            {({ id, descricao: d, invalido }) => <Input id={id} type="date" aria-describedby={d} invalido={invalido} value={repetir} onChange={(e) => setRepetir(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Apagar({ item }: { item: ItemPrevisao }) {
  const [aberto, setAberto] = useState(false);
  const apagar = useApagarItemPrevisao();
  return (
    <>
      <Button variante="ghost" tamanho="sm" aria-label={`Apagar ${item.description}`} onClick={() => setAberto(true)}>
        <Trash2 strokeWidth={1.75} aria-hidden />
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) apagar.reset();
        }}
        titulo="Apagar esta previsão?"
        descricao={`${item.description} deixa de contar no fluxo previsto.`}
        rotuloConfirmar="Apagar"
        variante="destructive"
        aCarregar={apagar.isPending}
        erro={apagar.error ? <ErrorPanel erro={apagar.error} /> : undefined}
        aoConfirmar={() => (apagar.isPending ? undefined : apagar.mutate(item.itemId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Itens() {
  const { pode } = useUtilizador();
  const escreve = pode("finance.treasury.write");
  const itens = useItensPrevisao();
  const colunas: Coluna<ItemPrevisao>[] = [
    { id: "data", cabecalho: "Data", celula: (i) => formatarData(i.on) + (i.repeatMonthlyUntil ? ` · mensal até ${formatarData(i.repeatMonthlyUntil)}` : "") },
    { id: "descricao", cabecalho: "Descrição", celula: (i) => [i.description, i.category].filter(Boolean).join(" · "), className: "max-w-[18rem] truncate" },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (i) => <span className={i.direction === "Outflow" ? "text-danger" : undefined}>{`${i.direction === "Outflow" ? "−" : "+"} ${moeda(i.amount, i.currency)}`}</span> },
    ...(escreve
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (i: ItemPrevisao) => (
              <div className="flex justify-end gap-1">
                <GuardarItem item={i} />
                <Apagar item={i} />
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {escreve ? (
        <div className="flex justify-end">
          <GuardarItem />
        </div>
      ) : null}
      <Tabela
        rotulo="Previsões manuais"
        colunas={colunas}
        linhas={itens.data}
        chave={(i) => i.itemId}
        aCarregar={itens.isPending}
        erro={itens.error ? <ErrorPanel erro={itens.error} tentarDeNovo={() => void itens.refetch()} /> : undefined}
        vazio="Ainda não há previsões manuais."
      />
    </div>
  );
}

export default function FluxoCaixa() {
  const { pode } = useUtilizador();
  const [params] = useSearchParams();
  const relatorios = pode("finance.reports.read");
  const tesouraria = pode("finance.treasury.read");
  const pedida = params.get("vista");
  const vista = pedida === "itens" && tesouraria ? "itens" : pedida === "realizado" && relatorios ? "realizado" : relatorios ? "previsto" : "itens";
  const sep = (a: boolean) =>
    cn("inline-flex h-9 items-center border-b-2 px-3 text-base pointer-coarse:h-11", a ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground");
  return (
    <>
      <PageHeader titulo="Fluxo de caixa" descricao="O que vai entrar e sair, e o que entrou e saiu." />
      <nav aria-label="Vistas do fluxo de caixa" className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {relatorios ? (
          <>
            <NavLink to="/fluxo-caixa" end className={() => sep(vista === "previsto")} aria-current={vista === "previsto" ? "page" : undefined}>
              Previsto
            </NavLink>
            <NavLink to="/fluxo-caixa?vista=realizado" className={() => sep(vista === "realizado")} aria-current={vista === "realizado" ? "page" : undefined}>
              Realizado
            </NavLink>
          </>
        ) : null}
        {tesouraria ? (
          <NavLink to="/fluxo-caixa?vista=itens" className={() => sep(vista === "itens")} aria-current={vista === "itens" ? "page" : undefined}>
            Previsões manuais
          </NavLink>
        ) : null}
      </nav>
      {!relatorios && !tesouraria ? <Alert tom="info" titulo="Este perfil não lê o fluxo de caixa." /> : vista === "previsto" ? <Previsto /> : vista === "realizado" ? <Realizado /> : <Itens />}
    </>
  );
}
