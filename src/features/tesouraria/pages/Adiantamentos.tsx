/**
 * Tesouraria › Adiantamentos de salário (ADR-114, ADR-123). O pedido vai a
 * Aprovações (`finance.salary_advance`), com o colaborador como requisitante:
 * o próprio pede no portal, ou as finanças em nome dele. Aprovado, paga-o
 * quem executa pagamentos e não o decidiu (BR-3): sai de uma conta em kwanzas
 * e lança 36.3 contra 43.1. A folha do mês indicado desconta-o, até ao líquido
 * de cada um; o que não cabe passa à folha seguinte.
 */
import { HandCoins, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { usePedidoAprovacao } from "@/features/aprovacoes";
import { useMeuPainel } from "@/features/dashboard";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { EstadoAdiantamento, errosAdiantamento, folhaDe, valorAdiantamento } from "../Adiantamento";
import { useAdiantamentos, useColaboradoresAdiantamento, useContasAbertas, usePagarAdiantamento, usePedidosAdiantamento, usePedirAdiantamento, type Adiantamento, type PedidoAdiantamento } from "../api";
import { erroDataValor } from "../regras";

/** Os colaboradores activos, da lista da tesouraria: quem pede não precisa de ler os RH (PR #167). */
function SelectColaborador({ valor, aoMudar, ...resto }: { valor: string; aoMudar: (id: string) => void; id: string; "aria-describedby"?: string | undefined; invalido?: boolean }) {
  const lista = useColaboradoresAdiantamento();
  return (
    <>
      <Select {...resto} value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">{lista.isPending ? "A carregar…" : "Escolha…"}</option>
        {(lista.data?.employees ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : null}
    </>
  );
}

/** Pedir em nome de um colaborador: o pedido vai a Aprovações como se fosse dele. */
function PedirEmNome() {
  const hoje = hojeIso();
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState("");
  const [v, setV] = useState({ valor: "", folha: hoje.slice(0, 7) });
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const pedir = usePedirAdiantamento();
  const idForm = useId();
  const erros = { ...errosAdiantamento(v, hoje), colaborador: colaborador === "" ? "Escolha o colaborador." : undefined };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      pedir.reset();
      setColaborador("");
      setV({ valor: "", folha: hojeIso().slice(0, 7) });
      setMotivo("");
      setTentou(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Pedir em nome de…
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Pedir um adiantamento em nome de um colaborador"
        descricao="O pedido vai a Aprovações com o colaborador como requisitante. Depois de aprovado, paga-o quem não o decidiu."
        rotuloConfirmar={pedir.data ? "Fechar" : "Pedir"}
        aCarregar={pedir.isPending}
        erro={pedir.error ? <ErrorPanel erro={pedir.error} /> : undefined}
        {...(pedir.data ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {pedir.data ? (
          <Alert tom="sucesso" titulo="Pedido enviado para aprovação." />
        ) : (
          <form
            id={idForm}
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              const valor = valorAdiantamento(v);
              if (erros.colaborador || erros.valor || erros.folha || !valor || pedir.isPending) return;
              const m = normalizarTexto(motivo);
              pedir.mutate({ employeeId: colaborador, amount: paraApi(valor), payrollYear: Number(v.folha.slice(0, 4)), payrollMonth: Number(v.folha.slice(5, 7)), reason: m === "" ? null : m });
            }}
          >
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined} className="sm:col-span-2">
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
            <Field rotulo="Valor (Kz)" erro={tentou ? erros.valor : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} />}
            </Field>
            <Field rotulo="Desconta na folha de" erro={tentou ? erros.folha : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} type="month" min={hoje.slice(0, 7)} aria-describedby={descricao} invalido={invalido} value={v.folha} onChange={(e) => setV({ ...v, folha: e.target.value })} />}
            </Field>
            <Field rotulo="Motivo (opcional)" className="sm:col-span-2">
              {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
            </Field>
          </form>
        )}
      </Confirmar>
    </>
  );
}

/**
 * Pagar um pedido aprovado. Quem o decidiu em Aprovações não o paga, nem uma
 * conta sem ficha de colaborador (BR-3): o servidor recusa com 403 na mesma.
 */
function PagarAdiantamento({ p }: { p: PedidoAdiantamento }) {
  const { pode } = useUtilizador();
  const meu = useMeuPainel();
  const aprovacao = usePedidoAprovacao(p.approvalRequestId ?? "", p.approvalRequestId !== null && pode("approval.requests.read"));
  const hoje = hojeIso();
  const [aberto, setAberto] = useState(false);
  const [conta, setConta] = useState("");
  const [data, setData] = useState(hoje);
  const [referencia, setReferencia] = useState("");
  const [tentou, setTentou] = useState(false);
  const pagar = usePagarAdiantamento();
  const contas = useContasAbertas(aberto);
  const emKwanzas = (contas.data?.items ?? []).filter((c) => c.currency === "AOA");
  const idForm = useId();
  const eu = meu.data?.employeeId ?? null;
  if (meu.isPending) return null;
  if (!meu.error && eu === null) return <span className="text-xs text-muted-foreground">Só um colaborador paga</span>;
  if (eu !== null && (aprovacao.data?.decisions ?? []).some((d) => d.decidedByEmployeeId === eu)) return <span className="text-xs text-muted-foreground">Decidiu-o: outra pessoa paga</span>;
  const erros = { conta: conta === "" ? "Escolha a conta de onde sai o dinheiro." : undefined, data: erroDataValor(data, hoje) };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      pagar.reset();
      setConta("");
      setData(hojeIso());
      setReferencia("");
      setTentou(false);
    }
  };
  const r = pagar.data;
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Pagar o adiantamento de ${p.employeeName}`}>
        <HandCoins strokeWidth={1.75} aria-hidden />
        Pagar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Pagar o adiantamento de ${p.employeeName}`}
        descricao={`${moeda(p.amount)}, a descontar na folha de ${folhaDe(p.payrollYear, p.payrollMonth)}. Sai da conta e lança 36.3 contra 43.1. Quem decidiu o pedido não o paga (BR-3).`}
        rotuloConfirmar={r ? "Fechar" : "Pagar"}
        aCarregar={pagar.isPending}
        erro={pagar.error ? <ErrorPanel erro={pagar.error} /> : undefined}
        {...(r ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {r ? (
          <Alert tom="sucesso" titulo={`Adiantamento de ${moeda(p.amount)} pago.`}>
            A folha de {folhaDe(p.payrollYear, p.payrollMonth)} desconta-o.
          </Alert>
        ) : (
          <form
            id={idForm}
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erros.conta || erros.data || pagar.isPending) return;
              const ref = normalizarTexto(referencia);
              pagar.mutate({ applicationId: p.applicationId, bankAccountId: conta, on: data, reference: ref === "" ? null : ref });
            }}
          >
            <Field rotulo="Conta" erro={tentou ? erros.conta : undefined} className="sm:col-span-2" ajuda={contas.data && emKwanzas.length === 0 ? "Não há contas abertas em kwanzas." : undefined}>
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} aria-busy={contas.isPending || undefined} value={conta} onChange={(e) => setConta(e.target.value)}>
                  <option value="">Escolha…</option>
                  {emKwanzas.map((c) => (
                    <option key={c.accountId} value={c.accountId}>
                      {c.name} · {moeda(c.balance, c.currency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field rotulo="Data" erro={tentou ? erros.data : undefined} ajuda="O dia em que o dinheiro saiu do banco.">
              {({ id, descricao, invalido }) => <Input id={id} type="date" max={hoje} aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
            </Field>
            <Field rotulo="Referência (opcional)">
              {({ id, descricao }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} value={referencia} onChange={(e) => setReferencia(e.target.value)} />}
            </Field>
          </form>
        )}
      </Confirmar>
    </>
  );
}

export default function Adiantamentos() {
  const { pode } = useUtilizador();
  const pedidos = usePedidosAdiantamento();
  const [porDescontar, setPorDescontar] = useState(false);
  const pagos = useAdiantamentos(porDescontar);
  const paga = pode("finance.payments.execute");
  const colunasPedidos: Coluna<PedidoAdiantamento>[] = [
    { id: "colaborador", cabecalho: "Colaborador", celula: (p) => <span className="font-medium">{p.employeeName}</span> },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (p) => moeda(p.amount) },
    { id: "folha", cabecalho: "Desconta na folha de", esconderAte: "sm", celula: (p) => folhaDe(p.payrollYear, p.payrollMonth) },
    { id: "motivo", cabecalho: "Motivo", esconderAte: "lg", celula: (p) => p.reason ?? "—" },
    { id: "pedido", cabecalho: "Pedido em", esconderAte: "md", celula: (p) => formatarDataHora(p.submittedAt) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (p) => (
        <span className="flex flex-col items-start gap-1">
          <EstadoAdiantamento estado={p.status} />
          {p.approvalRequestId && pode("approval.requests.read") ? (
            <Link to={`/aprovacoes/${p.approvalRequestId}`} className="text-xs text-primary underline-offset-4 hover:underline">
              Ver a aprovação
            </Link>
          ) : null}
        </span>
      ),
    },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (p) => (p.status === "Approved" && paga ? <PagarAdiantamento p={p} /> : null) },
  ];
  const colunasPagos: Coluna<Adiantamento>[] = [
    { id: "colaborador", cabecalho: "Colaborador", celula: (a) => <span className="font-medium">{a.employeeName}</span> },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (a) => moeda(a.amount) },
    { id: "pago", cabecalho: "Pago em", esconderAte: "sm", celula: (a) => formatarData(a.paidOn) },
    { id: "folha", cabecalho: "Folha", esconderAte: "md", celula: (a) => folhaDe(a.payrollYear, a.payrollMonth) },
    { id: "descontado", cabecalho: "Descontado", alinhar: "direita", esconderAte: "md", celula: (a) => moeda(a.settledAmount) },
    { id: "falta", cabecalho: "Por descontar", alinhar: "direita", celula: (a) => moeda(a.outstanding) },
    { id: "referencia", cabecalho: "Referência", esconderAte: "lg", celula: (a) => a.reference ?? "—" },
  ];
  return (
    <>
      <PageHeader
        titulo="Adiantamentos de salário"
        descricao="Uma parte do salário paga antes do fim do mês. Pede-se e aprova-se em Aprovações; aprovado, paga-se de uma conta em kwanzas, e a folha do mês desconta-o."
        accao={pode("finance.treasury.write") ? <PedirEmNome /> : undefined}
      />
      <Tabela
        rotulo="Pedidos de adiantamento"
        colunas={colunasPedidos}
        linhas={pedidos.data}
        chave={(p) => p.applicationId}
        aCarregar={pedidos.isPending}
        erro={pedidos.error ? <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} /> : undefined}
        vazio="Ainda não há pedidos de adiantamento."
      />
      <section aria-labelledby="titulo-pagos" className="mt-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="titulo-pagos" className="text-md font-semibold text-foreground">
            Adiantamentos pagos
          </h2>
          <Checkbox rotulo="Só os por descontar" checked={porDescontar} onChange={(e) => setPorDescontar(e.target.checked)} />
        </div>
        <Tabela
          rotulo="Adiantamentos pagos"
          colunas={colunasPagos}
          linhas={pagos.data}
          chave={(a) => a.advanceId}
          aCarregar={pagos.isPending}
          erro={pagos.error ? <ErrorPanel erro={pagos.error} tentarDeNovo={() => void pagos.refetch()} /> : undefined}
          vazio={porDescontar ? "Nenhum adiantamento por descontar." : "Ainda não há adiantamentos pagos."}
        />
      </section>
    </>
  );
}
