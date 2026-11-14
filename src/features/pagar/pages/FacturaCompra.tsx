/** Ficha de uma factura de compra (§5.6): dados, confronto com a encomenda, pedidos de pagamento, anular. */
import Big from "big.js";
import { ArrowLeft, Pencil, Send, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { eApiError } from "@/lib/api/problem";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro, lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import {
  useAnularFacturaCompra,
  useConfronto,
  useCorrigirIvaNaoDedutivel,
  useFacturaCompra,
  usePedidosPagamento,
  usePedirPagamento,
  type CorreccaoIvaNaoDedutivel,
  type FacturaCompra as TipoFactura,
  type PedidoPagamento,
} from "../api";
import { eContaImobilizado, EstadoPedidoPagamento, SemFichaDeColaborador, textoPaisMercado, useEuColaborador } from "../comum";
import { EstadoFacturaCompra } from "./FacturasCompra";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{rotulo}</dt>
      <dd className="break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** O que ainda se pode pedir: o total menos os pedidos não cancelados. */
export function porPedir(f: Pick<TipoFactura, "grossTotal">, pedidos: readonly Pick<PedidoPagamento, "status" | "amount">[]): Dinheiro {
  const pedido = pedidos.filter((p) => p.status !== "Cancelled").reduce((s, p) => s.plus(dinheiro(p.amount)), new Big(0));
  const resto = dinheiro(f.grossTotal).minus(pedido);
  return (resto.lt(0) ? new Big(0) : resto) as Dinheiro;
}

function PedirPagamento({ f, maximo }: { f: TipoFactura; maximo: Dinheiro }) {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const pedir = usePedirPagamento();
  const [valor, setValor] = useState("");
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const erroValor = !v || v.lte(0) ? "Indique um valor maior que zero." : v.gt(maximo) ? `Não pode passar de ${formatarMoeda(maximo, f.currency)}, o que falta pedir.` : undefined;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      pedir.reset();
      setTentou(false);
      setNotas("");
    }
  };
  return (
    <>
      <Button
        onClick={() => {
          setValor(maximo.toFixed(2).replace(".", ","));
          setAberto(true);
        }}
      >
        <Send strokeWidth={1.75} aria-hidden />
        Pedir pagamento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Pedir o pagamento de ${f.supplierInvoiceNumber}`}
        descricao="O pedido vai para aprovação. Só depois de aprovado é que outra pessoa o pode executar: quem pede não paga."
        rotuloConfirmar="Submeter pedido"
        aCarregar={pedir.isPending}
        erro={pedir.error ? <ErrorPanel erro={pedir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroValor || !v || pedir.isPending) return;
            pedir.mutate(
              { purchaseInvoiceId: f.purchaseInvoiceId, amount: paraApi(v), requestedByEmployeeId: null, requestedOn: null, costCentreId: null, notes: notas.trim() === "" ? null : notas.trim() },
              { onSuccess: (r) => void navegar(`/pedidos-pagamento/${r.paymentRequestId}`) },
            );
          }}
        >
          <Field rotulo={`Valor (${f.currency})`} erro={tentou ? erroValor : undefined} ajuda={`Falta pedir ${formatarMoeda(maximo, f.currency)}.`}>
            {({ id, descricao, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />
            )}
          </Field>
          <Field rotulo="Notas" ajuda="Opcional. Quem aprova lê-as.">
            {({ id, descricao }) => <Textarea id={id} maxLength={500} aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/** A mensagem do 400 para um campo (`errors.nonDeductibleTax`, `errors.reason`), se o servidor a deu. */
function erroDoCampo(e: unknown, campo: string): string | undefined {
  if (!eApiError(e) || e.status !== 400) return undefined;
  const m = e.errors[campo] ?? e.errors[campo.charAt(0).toUpperCase() + campo.slice(1)];
  return m ? m.join(" ") : undefined;
}

const mesDaFactura = (f: Pick<TipoFactura, "issuedOn">) => `${f.issuedOn.slice(5, 7)}/${f.issuedOn.slice(0, 4)}`;

/** Corrigir o IVA não dedutível depois do registo (ADR-125), sem anular a factura. */
function CorrigirIvaNaoDedutivel({ f, aoCorrigir }: { f: TipoFactura; aoCorrigir: (r: CorreccaoIvaNaoDedutivel) => void }) {
  const [aberto, setAberto] = useState(false);
  const corrigir = useCorrigirIvaNaoDedutivel(f.purchaseInvoiceId);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const actual = dinheiro(f.nonDeductibleTax);
  const maximo = dinheiro(f.taxTotal);
  const v = lerDinheiroDigitado(valor, 2);
  const erroValor =
    !v || v.lt(0)
      ? "Indique um valor, de zero ao IVA da factura."
      : v.gt(maximo)
        ? `Não pode passar de ${formatarMoeda(maximo, f.currency)}, o IVA da factura.`
        : v.eq(actual)
          ? "É o valor actual: indique outro."
          : undefined;
  const erroMotivo = motivo.trim() === "" ? "Indique o motivo da correcção." : undefined;
  const doServidorValor = erroDoCampo(corrigir.error, "nonDeductibleTax");
  const doServidorMotivo = erroDoCampo(corrigir.error, "reason");
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      corrigir.reset();
      setTentou(false);
      setMotivo("");
    }
  };
  return (
    <>
      <Button
        variante="ghost"
        onClick={() => {
          setValor(actual.toFixed(2).replace(".", ","));
          setAberto(true);
        }}
      >
        <Pencil strokeWidth={1.75} aria-hidden />
        Corrigir IVA não dedutível
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Corrigir o IVA não dedutível de ${f.supplierInvoiceNumber}`}
        descricao={`A dívida ao fornecedor não muda: o Rivo lança a diferença entre a conta da compra e o IVA. Se o IVA de ${mesDaFactura(f)} ainda não foi apurado, a correcção fica na data da factura; se já foi, é uma regularização com a data de hoje, que entra no apuramento deste mês.`}
        rotuloConfirmar="Corrigir"
        aCarregar={corrigir.isPending}
        erro={corrigir.error && !doServidorValor && !doServidorMotivo ? <ErrorPanel erro={corrigir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroValor || erroMotivo || !v || corrigir.isPending) return;
            corrigir.mutate(
              { nonDeductibleTax: paraApi(v), reason: motivo.trim() },
              {
                onSuccess: (r) => {
                  aoCorrigir(r);
                  fechar(false);
                },
              },
            );
          }}
        >
          <Field
            rotulo={`IVA não dedutível (${f.currency})`}
            erro={(tentou ? erroValor : undefined) ?? doServidorValor}
            ajuda={`Agora: ${formatarMoeda(actual, f.currency)}. De zero a ${formatarMoeda(maximo, f.currency)}, o IVA da factura.`}
          >
            {({ id, descricao, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />
            )}
          </Field>
          <Field rotulo="Motivo" erro={(tentou ? erroMotivo : undefined) ?? doServidorMotivo} ajuda="Fica no lançamento e na trilha de auditoria.">
            {({ id, descricao, invalido }) => <Textarea id={id} maxLength={500} aria-describedby={descricao} aria-invalid={invalido || undefined} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/** O que a correcção fez: o lançamento, onde ficou, e os avisos do servidor. */
function CorreccaoFeita({ f, r }: { f: TipoFactura; r: CorreccaoIvaNaoDedutivel }) {
  const lancamento = r.archivalNumber ? `o lançamento ${r.archivalNumber}` : "o lançamento";
  const onde =
    r.postedAs === "Regularisation"
      ? `O IVA de ${mesDaFactura(f)} já estava apurado: ${lancamento} é uma regularização com a data de hoje e entra no apuramento deste mês.`
      : r.postedAs === "Deduction"
        ? `O IVA de ${mesDaFactura(f)} ainda não estava apurado: ${lancamento} ficou na data da factura.`
        : `Ficou ${lancamento}.`;
  return (
    <Alert tom="sucesso" className="mb-6" titulo="IVA não dedutível corrigido.">
      <p>{onde}</p>
      {r.notes.length > 0 ? (
        <ul className="mt-2 list-disc pl-5">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
    </Alert>
  );
}

function Confronto({ f }: { f: TipoFactura }) {
  const c = useConfronto(f.purchaseInvoiceId, f.purchaseOrderId !== null);
  if (f.purchaseOrderId === null) return null;
  return (
    <Card>
      <CardTitle>Confronto com a encomenda</CardTitle>
      {c.isPending ? (
        <Skeleton className="mt-3 h-16" />
      ) : c.error ? (
        <ErrorPanel erro={c.error} tentarDeNovo={() => void c.refetch()} className="mt-3" />
      ) : (
        <dl className="mt-3 flex flex-col gap-2">
          <Linha rotulo="Encomendado">{c.data.orderedTotal === null ? "—" : moeda(c.data.orderedTotal, f.currency)}</Linha>
          <Linha rotulo="Recebido">{c.data.receivedTotal === null ? "—" : moeda(c.data.receivedTotal, f.currency)}</Linha>
          <Linha rotulo="Facturado (sem IVA)">{moeda(c.data.invoicedNetTotal, f.currency)}</Linha>
        </dl>
      )}
    </Card>
  );
}

export default function FacturaCompra() {
  const { purchaseInvoiceId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useFacturaCompra(purchaseInvoiceId);
  const pedidos = usePedidosPagamento({ pagina: 1, tamanho: 200, factura: purchaseInvoiceId });
  const anular = useAnularFacturaCompra(purchaseInvoiceId);
  const eu = useEuColaborador();
  const [correccao, setCorreccao] = useState<CorreccaoIvaNaoDedutivel | null>(null);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/facturas-compra">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Facturas de compra
      </Link>
    </Button>
  );
  if (q.isPending) return <CarregandoPagina />;
  if (q.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} />
      </>
    );
  }
  const f = q.data;
  const anulada = f.status === "Cancelled";
  // A parte do IVA que não se deduz (ADR-112): lançou com o líquido, e o dedutível é o resto.
  const naoDedutivel = !dinheiro(f.nonDeductibleTax).eq(0);
  const correccoes = Number(f.nonDeductibleTaxCorrections);
  const resto = pedidos.data ? porPedir(f, pedidos.data.items) : null;
  const colunas: Coluna<PedidoPagamento>[] = [
    {
      id: "data",
      cabecalho: "Pedido em",
      celula: (p) => (
        <Link to={`/pedidos-pagamento/${p.paymentRequestId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {formatarData(p.requestedOn)}
        </Link>
      ),
    },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (p) => moeda(p.amount, p.currency) },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoPedidoPagamento estado={p.status} /> },
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={f.supplierInvoiceNumber}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoFacturaCompra f={f} />
            <span>{f.supplierName}</span>
          </span>
        }
        accao={
          !anulada ? (
            <div className="flex flex-wrap gap-2">
              {pode("finance.payments.request") && eu.id && resto?.gt(0) ? <PedirPagamento f={f} maximo={resto} /> : null}
              {pode("finance.payables.write") && dinheiro(f.taxTotal).gt(0) ? <CorrigirIvaNaoDedutivel f={f} aoCorrigir={setCorreccao} /> : null}
              {pode("finance.invoices.cancel") ? (
                <ConfirmarComMotivo
                  rotuloBotao="Anular"
                  icone={<XCircle strokeWidth={1.75} aria-hidden />}
                  titulo={`Anular ${f.supplierInvoiceNumber}?`}
                  descricao="A factura fica anulada, com o motivo, e continua no registo. Não se pode desfazer. Com pagamentos executados, o servidor recusa."
                  rotuloConfirmar="Anular factura"
                  ajuda="Fica na factura e na trilha de auditoria."
                  falta="Indique o motivo da anulação."
                  aCarregar={anular.isPending}
                  erro={anular.error ? <ErrorPanel erro={anular.error} /> : undefined}
                  aoConfirmar={(motivo, fechar) => anular.mutate(motivo, { onSuccess: fechar })}
                />
              ) : null}
            </div>
          ) : undefined
        }
      />
      {anulada ? (
        <Alert tom="aviso" className="mb-6" titulo={`Anulada${f.cancelledAt ? ` a ${formatarDataHora(f.cancelledAt)}` : ""}.`}>
          {f.cancellationReason ?? ""}
        </Alert>
      ) : null}
      {correccao && !anulada ? <CorreccaoFeita f={f} r={correccao} /> : null}
      {!anulada && pode("finance.payments.request") && eu.carregado && !eu.id ? (
        <div className="mb-6">
          <SemFichaDeColaborador accao="pedir pagamentos" />
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardTitle>Dados</CardTitle>
            <dl className="mt-3 flex flex-col gap-2">
              <Linha rotulo="Fornecedor">
                {f.supplierId && pode("procurement.suppliers.read") ? (
                  <Link to={`/fornecedores/${f.supplierId}`} className="underline-offset-4 hover:underline">
                    {f.supplierName}
                  </Link>
                ) : (
                  f.supplierName
                )}{" "}
                · NIF {f.supplierTaxId}
                {textoPaisMercado(f.supplierCountry, f.market) ? <span className="text-muted-foreground"> · {textoPaisMercado(f.supplierCountry, f.market)}</span> : null}
              </Linha>
              <Linha rotulo="Emitida em">{formatarData(f.issuedOn)}</Linha>
              <Linha rotulo="Vence em">{formatarData(f.dueOn)}</Linha>
              <Linha rotulo="Descrição">{f.description ?? "—"}</Linha>
              <Linha rotulo="Conta da despesa">
                {f.expenseAccountCode ?? "—"}
                {f.expenseAccountCode && eContaImobilizado(f.expenseAccountCode) ? <span className="block text-xs text-muted-foreground">Compra de imobilizado: a dívida fica na 37.1 e o IVA na 34.5.2.2.</span> : null}
              </Linha>
            </dl>
            <dl className="ml-auto mt-4 grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Sem IVA</dt>
              <dd className="text-right tabular-nums">{moeda(f.netTotal, f.currency)}</dd>
              <dt className="text-muted-foreground">IVA</dt>
              <dd className="text-right tabular-nums">{moeda(f.taxTotal, f.currency)}</dd>
              {naoDedutivel || correccoes > 0 ? (
                <>
                  <dt className="pl-3 text-muted-foreground">não dedutível</dt>
                  <dd className="text-right tabular-nums">{moeda(f.nonDeductibleTax, f.currency)}</dd>
                  <dt className="pl-3 text-muted-foreground">dedutível</dt>
                  <dd className="text-right tabular-nums">{moeda(dinheiro(f.taxTotal).minus(dinheiro(f.nonDeductibleTax)).toString(), f.currency)}</dd>
                </>
              ) : null}
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="text-right font-semibold tabular-nums">{moeda(f.grossTotal, f.currency)}</dd>
            </dl>
            {correccoes > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                IVA não dedutível corrigido {correccoes === 1 ? "uma vez" : `${correccoes} vezes`} depois do registo.
              </p>
            ) : null}
            {naoDedutivel ? (
              <p className="mt-2 text-xs text-muted-foreground">
                O IVA não dedutível entrou na {f.expenseAccountCode && eContaImobilizado(f.expenseAccountCode) ? "conta do bem, com o líquido" : "conta da compra, com o líquido"}:{" "}
                {moeda(dinheiro(f.netTotal).plus(dinheiro(f.nonDeductibleTax)).toString(), f.currency)}
                {f.expenseAccountCode && eContaImobilizado(f.expenseAccountCode) ? ". É esse o custo de aquisição do bem, ao registá-lo nos activos." : "."}
              </p>
            ) : null}
          </Card>
          <Confronto f={f} />
        </div>
        <Card className="self-start">
          <CardTitle>Pedidos de pagamento</CardTitle>
          {resto && !anulada ? <p className="mt-1 text-sm text-muted-foreground">Falta pedir {formatarMoeda(resto, f.currency)}.</p> : null}
          <div className="mt-3">
            <Tabela
              rotulo="Pedidos de pagamento desta factura"
              colunas={colunas}
              linhas={pedidos.data?.items}
              chave={(p) => p.paymentRequestId}
              aCarregar={pedidos.isPending}
              erro={pedidos.error ? <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} /> : undefined}
              vazio="Ainda não há pedidos."
            />
          </div>
        </Card>
      </div>
    </>
  );
}
