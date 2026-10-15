/** Um fundo de caixa (§5.6): saldo, movimentos por período, despesa, reposição e ajuste. */
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useCaixas, useMovimentarCaixa, useMovimentosCaixa, type FundoCaixa as TipoFundo, type MovimentoCaixa } from "../api";
import { GuardarFundo } from "./CaixaPequena";

const TIPOS = { Expense: "Despesa", Replenishment: "Reposição", Adjustment: "Ajuste de contagem" } as const;
type Tipo = keyof typeof TIPOS;

function Movimentar({ f }: { f: TipoFundo }) {
  const [aberto, setAberto] = useState(false);
  const movimentar = useMovimentarCaixa(f.fundId);
  const [tipo, setTipo] = useState<Tipo>("Expense");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeIso());
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [referencia, setReferencia] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const v = valor.trim() === "" ? null : lerDinheiroDigitado(valor, 2);
  // Na reposição o valor é opcional: vazio repõe o que falta. No ajuste pode ser negativo.
  const erroValor =
    tipo === "Replenishment" && valor.trim() === ""
      ? undefined
      : !v
        ? "Indique o valor."
        : tipo !== "Adjustment" && v.lte(0)
          ? "O valor é positivo."
          : tipo === "Expense" && v.gt(dinheiro(f.balance))
            ? "Passa do saldo da caixa; o servidor vai recusar."
            : undefined;
  const erroDescricao = tipo !== "Replenishment" && normalizarTexto(descricao) === "" ? "Descreva o movimento." : undefined;
  const erroData = !IsoDate.safeParse(data).success ? "Indique a data." : undefined;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      movimentar.reset();
      setTentou(false);
      setValor("");
      setDescricao("");
      setCategoria("");
      setReferencia("");
    }
  };
  const texto = (s: string) => (normalizarTexto(s) === "" ? null : normalizarTexto(s));
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar movimento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Movimento em ${f.name}`}
        rotuloConfirmar="Registar"
        aCarregar={movimentar.isPending}
        erro={movimentar.error ? <ErrorPanel erro={movimentar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroValor || erroDescricao || erroData || movimentar.isPending) return;
            movimentar.mutate(
              { kind: tipo, amount: v ? paraApi(v) : null, on: data, description: texto(descricao), category: texto(categoria), reference: texto(referencia) },
              { onSuccess: () => fechar(false) },
            );
          }}
        >
          <Field rotulo="Tipo">
            {({ id, descricao: d }) => (
              <Select id={id} aria-describedby={d} value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
                {Object.entries(TIPOS).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Data" erro={tentou ? erroData : undefined}>
            {({ id, descricao: d, invalido }) => <Input id={id} type="date" aria-describedby={d} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
          <Field
            rotulo={`Valor (${f.currency})`}
            erro={tentou ? erroValor : undefined}
            ajuda={tipo === "Replenishment" ? `Vazio repõe o que falta: ${formatarMoeda(dinheiro(f.replenishmentNeeded), f.currency)}.` : tipo === "Adjustment" ? "Negativo se faltar dinheiro na contagem." : `Saldo: ${moeda(f.balance, f.currency)}.`}
            className="sm:col-span-2"
          >
            {({ id, descricao: d, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={d} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />
            )}
          </Field>
          <Field rotulo={tipo === "Replenishment" ? "Descrição (opcional)" : "Descrição"} erro={tentou ? erroDescricao : undefined} className="sm:col-span-2">
            {({ id, descricao: d, invalido }) => <Input id={id} maxLength={300} autoComplete="off" aria-describedby={d} invalido={invalido} value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
          </Field>
          <Field rotulo="Categoria (opcional)">
            {({ id, descricao: d }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={d} value={categoria} onChange={(e) => setCategoria(e.target.value)} />}
          </Field>
          <Field rotulo="Referência (opcional)">
            {({ id, descricao: d }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={d} value={referencia} onChange={(e) => setReferencia(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function FundoCaixa() {
  const { fundId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { pode } = useUtilizador();
  const caixas = useCaixas();
  const idDe = useId();
  const idAte = useId();
  const data = (k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);
  const de = data("de");
  const ate = data("ate");
  const movimentos = useMovimentosCaixa(fundId, de, ate);
  const filtrar = (k: string, v: string) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    });
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/caixa-pequena">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Caixa pequena
      </Link>
    </Button>
  );
  if (caixas.isPending) return <CarregandoPagina />;
  if (caixas.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={caixas.error} tentarDeNovo={() => void caixas.refetch()} />
      </>
    );
  }
  const f = caixas.data.find((x) => x.fundId === fundId);
  if (!f) {
    return (
      <>
        {voltar}
        <Alert tom="aviso" titulo="Fundo não encontrado." />
      </>
    );
  }
  const colunas: Coluna<MovimentoCaixa>[] = [
    { id: "data", cabecalho: "Data", celula: (m) => formatarData(m.on) },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "sm", celula: (m) => TIPOS[m.kind as Tipo] ?? m.kind },
    { id: "descricao", cabecalho: "Descrição", celula: (m) => [m.description, m.category, m.reference].filter(Boolean).join(" · "), className: "max-w-[18rem] truncate" },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (m) => (
        // O ajuste já traz o sinal; a despesa sai e a reposição entra.
        <span className={m.kind === "Expense" ? "text-danger" : undefined}>{m.kind === "Adjustment" ? moeda(m.amount, f.currency) : `${m.kind === "Expense" ? "−" : "+"} ${moeda(m.amount, f.currency)}`}</span>
      ) },
    { id: "saldo", cabecalho: "Saldo", alinhar: "direita", esconderAte: "md", celula: (m) => moeda(m.balanceAfter, f.currency) },
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={f.name}
        descricao={f.isActive ? undefined : "Desactivado: não aceita movimentos."}
        accao={
          pode("finance.treasury.write") ? (
            <div className="flex flex-wrap gap-2">
              {f.isActive ? <Movimentar f={f} /> : null}
              <GuardarFundo fundo={f} />
            </div>
          ) : undefined
        }
      />
      <div className="mb-6">
        <GrelhaKpis>
          <Kpi rotulo="Saldo" valor={moeda(f.balance, f.currency)} />
          <Kpi rotulo="Fundo fixo" valor={moeda(f.floatAmount, f.currency)} />
          <Kpi rotulo="Por repor" valor={moeda(f.replenishmentNeeded, f.currency)} />
        </GrelhaKpis>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idDe} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={idDe} type="date" value={de ?? ""} onChange={(e) => filtrar("de", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate ?? ""} onChange={(e) => filtrar("ate", e.target.value)} />
        </div>
      </div>
      <Tabela
        rotulo="Movimentos da caixa"
        colunas={colunas}
        linhas={movimentos.data}
        chave={(m) => m.movementId}
        aCarregar={movimentos.isPending}
        erro={movimentos.error ? <ErrorPanel erro={movimentos.error} tentarDeNovo={() => void movimentos.refetch()} /> : undefined}
        vazio="Sem movimentos no período."
      />
    </>
  );
}
