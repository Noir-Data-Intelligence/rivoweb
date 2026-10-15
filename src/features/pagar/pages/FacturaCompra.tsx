/** Ficha de uma factura de compra (§5.6): dados, confronto com a encomenda, pedidos de pagamento, anular. */
import Big from "big.js";
import { ArrowLeft, Send, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
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
import { useAnularFacturaCompra, useConfronto, useFacturaCompra, usePedidosPagamento, usePedirPagamento, type FacturaCompra as TipoFactura, type PedidoPagamento } from "../api";
import { EstadoPedidoPagamento, SemFichaDeColaborador, useEuColaborador } from "../comum";
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
              </Linha>
              <Linha rotulo="Emitida em">{formatarData(f.issuedOn)}</Linha>
              <Linha rotulo="Vence em">{formatarData(f.dueOn)}</Linha>
              <Linha rotulo="Descrição">{f.description ?? "—"}</Linha>
            </dl>
            <dl className="ml-auto mt-4 grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Sem IVA</dt>
              <dd className="text-right tabular-nums">{moeda(f.netTotal, f.currency)}</dd>
              <dt className="text-muted-foreground">IVA</dt>
              <dd className="text-right tabular-nums">{moeda(f.taxTotal, f.currency)}</dd>
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="text-right font-semibold tabular-nums">{moeda(f.grossTotal, f.currency)}</dd>
            </dl>
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
