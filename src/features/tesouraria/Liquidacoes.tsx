/**
 * Pagar os salários, entregar ao Estado e depositar valores, pelo banco
 * (ADR-098), com a data-valor (ADR-100). O valor dos pagamentos não se pede:
 * é o que a folha lançada ou o apuramento do IVA deixaram a pagar. Cada
 * operação sai ou entra na conta (fica no extracto) e lança no razão.
 */
import { Landmark, PiggyBank, Wallet } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { hojeIso } from "@/lib/format/data";
import { nomeMes } from "@/lib/format/periodo";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { useContasAbertas, useDepositarValores, useEntregarEstado, usePagarSalarios, type Conta, type Liquidacao } from "./api";
import { erroDataValor, mesAnterior } from "./regras";

const IMPOSTOS = [
  { valor: "IRT", texto: "IRT retido nos salários (34.3)" },
  { valor: "INSS", texto: "INSS do trabalhador e da empresa (34.7)" },
  { valor: "IVA", texto: "IVA a pagar, depois de apurado (34.5.6.1)" },
] as const;
type Imposto = (typeof IMPOSTOS)[number]["valor"];

function Resultado({ r, texto }: { r: Liquidacao; texto: string }) {
  const { pode } = useUtilizador();
  return (
    <Alert tom="sucesso" titulo={`${texto}: ${moeda(r.amount)}.`}>
      <p>Saldo que ficou na conta: {moeda(r.bankBalance)}.</p>
      {pode("finance.ledger.read") ? (
        <Link to={`/lancamentos/${r.journalEntryId}`} className="text-primary underline-offset-4 hover:underline">
          Ver o lançamento
        </Link>
      ) : null}
    </Alert>
  );
}

function CampoData({ valor, mudar, erro, ajuda }: { valor: string; mudar: (v: string) => void; erro: string | undefined; ajuda: string }) {
  return (
    <Field rotulo="Data" erro={erro} ajuda={ajuda}>
      {({ id, descricao, invalido }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => mudar(e.target.value)} />}
    </Field>
  );
}

/** Pagar os salários líquidos de um mês, ou entregar ao Estado o IRT, o INSS ou o IVA. */
export function PagamentoPeloBanco({ tipo, mesInicial }: { tipo: "salarios" | "estado"; mesInicial?: string | undefined }) {
  const salarios = tipo === "salarios";
  const hoje = hojeIso();
  const [aberto, setAberto] = useState(false);
  const [imposto, setImposto] = useState<Imposto>("IRT");
  const [mes, setMes] = useState(mesInicial ?? mesAnterior(hoje));
  const [conta, setConta] = useState("");
  const [data, setData] = useState(hoje);
  const [tentou, setTentou] = useState(false);
  const pagarSalarios = usePagarSalarios();
  const entregar = useEntregarEstado();
  const m = salarios ? pagarSalarios : entregar;
  // Só contas em kwanzas: o servidor recusa as outras (400).
  const contas = useContasAbertas(aberto);
  const emKwanzas = (contas.data?.items ?? []).filter((c) => c.currency === "AOA");
  const idForm = useId();
  const okMes = /^\d{4}-\d{2}$/.test(mes) && mes <= hoje.slice(0, 7);
  const erros = {
    mes: okMes ? undefined : "Escolha um mês até ao corrente.",
    conta: conta === "" ? "Escolha a conta de onde sai o dinheiro." : undefined,
    data: erroDataValor(data, hoje, okMes ? mes : null),
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      m.reset();
      setTentou(false);
      setData(hojeIso());
    }
  };
  const quando = okMes ? `${nomeMes(Number(mes.slice(5, 7)))} de ${mes.slice(0, 4)}` : "";
  const r = m.data;
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        {salarios ? <Wallet strokeWidth={1.75} aria-hidden /> : <Landmark strokeWidth={1.75} aria-hidden />}
        {salarios ? "Pagar salários" : "Entregar ao Estado"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={salarios ? "Pagar os salários de um mês" : "Entregar ao Estado"}
        descricao={
          salarios
            ? "Paga o líquido que a folha aprovada lançou no razão (36.1.2). O valor não se escreve: vem da folha. Sai da conta e fica no extracto. Quem decidiu a folha em Aprovações não a paga (BR-3)."
            : "Entrega o imposto de um mês que está no razão. O valor não se escreve: vem da folha lançada ou do apuramento do IVA. Sai da conta e fica no extracto."
        }
        rotuloConfirmar={r ? "Fechar" : salarios ? "Pagar" : "Entregar"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        {...(r ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {r ? (
          <Resultado r={r} texto={salarios ? `Salários de ${quando} pagos` : `${imposto} de ${quando} entregue`} />
        ) : (
          <form
            id={idForm}
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erros.mes || erros.conta || erros.data || m.isPending) return;
              const b = { year: Number(mes.slice(0, 4)), month: Number(mes.slice(5, 7)), bankAccountId: conta, on: data };
              if (salarios) pagarSalarios.mutate(b);
              else entregar.mutate({ ...b, tax: imposto });
            }}
          >
            {!salarios ? (
              <Field rotulo="Imposto" className="sm:col-span-2">
                {({ id, descricao }) => (
                  <Select id={id} aria-describedby={descricao} value={imposto} onChange={(e) => setImposto(e.target.value as Imposto)}>
                    {IMPOSTOS.map((x) => (
                      <option key={x.valor} value={x.valor}>
                        {x.texto}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
            <Field rotulo="Mês" erro={tentou ? erros.mes : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} type="month" max={hoje.slice(0, 7)} aria-describedby={descricao} invalido={invalido} value={mes} onChange={(e) => setMes(e.target.value)} />}
            </Field>
            <CampoData valor={data} mudar={setData} erro={tentou ? erros.data : undefined} ajuda="O dia em que o dinheiro saiu do banco." />
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
          </form>
        )}
      </Confirmar>
    </>
  );
}

/** Depositar na conta o numerário e os cheques recebidos (saem de 45.2 «Valores para depositar»). */
export function DepositarValores({ c }: { c: Conta }) {
  const hoje = hojeIso();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [talao, setTalao] = useState("");
  const [data, setData] = useState(hoje);
  const [tentou, setTentou] = useState(false);
  const depositar = useDepositarValores();
  const idForm = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const erros = { valor: !v || v.lte(0) ? "Indique o valor do talão, maior que zero." : undefined, data: erroDataValor(data, hoje) };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      depositar.reset();
      setTentou(false);
      setValor("");
      setTalao("");
      setData(hojeIso());
    }
  };
  const r = depositar.data;
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <PiggyBank strokeWidth={1.75} aria-hidden />
        Depositar valores
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Depositar valores em ${c.name}`}
        descricao="O numerário e os cheques recebidos ficam em «Valores para depositar» (45.2) até se depositarem. Entra no saldo da conta e lança no razão."
        rotuloConfirmar={r ? "Fechar" : "Depositar"}
        aCarregar={depositar.isPending}
        erro={depositar.error ? <ErrorPanel erro={depositar.error} /> : undefined}
        {...(r ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {r ? (
          <Resultado r={r} texto="Depositado" />
        ) : (
          <form
            id={idForm}
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erros.valor || erros.data || !v || depositar.isPending) return;
              const t = normalizarTexto(talao);
              depositar.mutate({ bankAccountId: c.accountId, amount: paraApi(v), reference: t === "" ? null : t, on: data });
            }}
          >
            <Field rotulo="Valor do talão (AOA)" erro={tentou ? erros.valor : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
            </Field>
            <CampoData valor={data} mudar={setData} erro={tentou ? erros.data : undefined} ajuda="O dia do talão." />
            <Field rotulo="Referência do talão (opcional)" className="sm:col-span-2">
              {({ id, descricao }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} value={talao} onChange={(e) => setTalao(e.target.value)} />}
            </Field>
          </form>
        )}
      </Confirmar>
    </>
  );
}
