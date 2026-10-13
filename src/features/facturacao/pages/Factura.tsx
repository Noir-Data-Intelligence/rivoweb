import Big from "big.js";
import { ArrowLeft, FileMinus, HandCoins } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { dinheiro, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { useAnularFactura, useEmitirNota, useEmitirRecibo, useFactura, useNotas, useSaldo, type Factura, type SaldoFactura } from "../api";
import { calcularTotais } from "../calculos";
import { Anular, AVISO_DEFINITIVO, DescarregarPdf, EnviarPorEmail, EstadoDocumento, LinhasDocumento, MEIOS, moeda, NOME_TIPO, Totais } from "../comum";

/** O valor, ou zero se for negativo. */
const naoNegativo = (v: Big) => (v.lt(0) ? new Big(0) : v);

/** Nota de crédito a partir das linhas da factura (quantidades a creditar). */
function NovaNotaCredito({ f }: { f: Factura }) {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const emitir = useEmitirNota();
  const [razao, setRazao] = useState("");
  const [qtds, setQtds] = useState<string[]>(() => f.lines.map((l) => String(l.quantity).replace(".", ",")));
  const [tentou, setTentou] = useState(false);
  const idRazao = useId();
  const linhas = f.lines.map((l, i) => {
    const q = lerDecimalDigitado(qtds[i] ?? "", 4);
    const max = new Big(String(l.quantity));
    return { l, q, valida: q !== null && q.gte(0) && q.lte(max) };
  });
  const aCreditar = linhas.filter((x) => x.valida && x.q?.gt(0));
  const totais = calcularTotais(
    aCreditar.map((x) => ({ quantidade: x.q as Big, preco: new Big(String(x.l.unitPrice)), taxa: new Big(String(x.l.taxPercentage)) })),
    null,
  );
  const razaoOk = normalizarTexto(razao).length > 0;
  const ok = razaoOk && aCreditar.length > 0 && linhas.every((x) => x.valida);
  const confirmar = () => {
    setTentou(true);
    if (!ok || emitir.isPending) return;
    emitir.mutate(
      {
        salesInvoiceId: f.invoiceId,
        series: null,
        issuedOn: null,
        reason: normalizarTexto(razao),
        lines: aCreditar.map((x) => ({ description: x.l.description, quantity: (x.q as Big).toString(), unitPrice: String(x.l.unitPrice), taxCode: x.l.taxCode })),
      },
      { onSuccess: (r) => void navegar(`/notas-credito/${r.creditNoteId}`) },
    );
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <FileMinus strokeWidth={1.75} aria-hidden />
        Nota de crédito
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) emitir.reset();
        }}
        titulo={`Nota de crédito sobre ${f.number}`}
        descricao={AVISO_DEFINITIVO}
        rotuloConfirmar="Emitir nota de crédito"
        variante="destructive"
        aCarregar={emitir.isPending}
        erro={emitir.error ? <ErrorPanel erro={emitir.error} /> : undefined}
        aoConfirmar={confirmar}
      >
        <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto px-0.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idRazao} className="text-sm font-medium text-foreground">
              Motivo
            </label>
            <Textarea id={idRazao} maxLength={200} value={razao} onChange={(e) => setRazao(e.target.value)} aria-invalid={tentou && !razaoOk ? true : undefined} />
            {tentou && !razaoOk ? <p className="text-xs text-danger" role="alert">Indique o motivo.</p> : null}
          </div>
          <p className="text-sm font-medium text-foreground">Quantidades a creditar</p>
          {linhas.map(({ l, valida }, i) => (
            <div key={String(l.lineNumber)} className="flex items-center gap-3">
              <label htmlFor={`${idRazao}-q${i}`} className="min-w-0 flex-1 text-sm text-foreground">
                {l.description} <span className="text-muted-foreground">(máx. {String(l.quantity).replace(".", ",")})</span>
              </label>
              <Input id={`${idRazao}-q${i}`} inputMode="decimal" className="w-24" value={qtds[i] ?? ""} aria-invalid={!valida || undefined} onChange={(e) => setQtds((q) => q.map((x, j) => (j === i ? e.target.value : x)))} />
            </div>
          ))}
          {tentou && aCreditar.length === 0 ? <p className="text-xs text-danger" role="alert">Credite pelo menos uma quantidade.</p> : null}
          <p className="text-right text-sm text-foreground">
            Total a creditar: <span className="font-semibold tabular-nums">{moeda((totais.total ?? totais.liquido).toFixed(2), f.currency)}</span>
          </p>
        </div>
      </Confirmar>
    </>
  );
}

/**
 * Recibo da factura: liquida o saldo em aberto, no todo ou em parte. Numa
 * factura com retenção, cada recibo diz o dinheiro e o retido na fonte pelo
 * cliente (ADR-083); a factura fica liquidada pelos dois. Um recibo só com
 * retenção (dinheiro 0) regista o certificado que chega depois.
 */
function NovoRecibo({ f, saldo }: { f: Factura; saldo: SaldoFactura }) {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const emitir = useEmitirRecibo();
  const emAberto = dinheiro(saldo.outstanding);
  const porComprovar = naoNegativo(dinheiro(saldo.withholdingAmount).minus(dinheiro(saldo.withheld)));
  const comRetencao = porComprovar.gt(0);
  const [valor, setValor] = useState(naoNegativo(emAberto.minus(porComprovar)).toFixed(2).replace(".", ","));
  const [retido, setRetido] = useState(porComprovar.toFixed(2).replace(".", ","));
  const [meio, setMeio] = useState("");
  const [data, setData] = useState(hojeIso());
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const id = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const r = comRetencao ? lerDinheiroDigitado(retido === "" ? "0" : retido, 2) : new Big(0);
  const retidoOk = r !== null && r.gte(0) && r.lte(porComprovar);
  const somaOk = v !== null && r !== null && v.gte(0) && v.plus(r).gt(0) && v.plus(r).lte(emAberto);
  const ok = retidoOk && somaOk && meio !== "" && /^\d{4}-\d{2}-\d{2}$/.test(data);
  const confirmar = () => {
    setTentou(true);
    if (!ok || emitir.isPending || v === null || r === null) return;
    emitir.mutate(
      {
        series: null,
        receivedOn: data,
        method: meio,
        notes: normalizarTexto(notas, true) || null,
        settlements: [{ salesInvoiceId: f.invoiceId, amount: paraApi(v), withheld: comRetencao && r.gt(0) ? paraApi(r as never) : null }],
      },
      { onSuccess: (x) => void navegar(`/recibos/${x.receiptId}`) },
    );
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <HandCoins strokeWidth={1.75} aria-hidden />
        Registar recebimento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) emitir.reset();
        }}
        titulo={`Recibo de ${f.number}`}
        descricao={`Em aberto: ${moeda(emAberto.toFixed(2), f.currency)}${comRetencao ? `, dos quais ${moeda(porComprovar.toFixed(2), f.currency)} de retenção por comprovar` : ""}. ${AVISO_DEFINITIVO}`}
        rotuloConfirmar="Emitir recibo"
        aCarregar={emitir.isPending}
        erro={emitir.error ? <ErrorPanel erro={emitir.error} /> : undefined}
        aoConfirmar={confirmar}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-v`} className="text-sm font-medium text-foreground">
              Valor recebido
            </label>
            <Input id={`${id}-v`} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-invalid={tentou && !somaOk ? true : undefined} />
          </div>
          {comRetencao ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-r`} className="text-sm font-medium text-foreground">
                Retido na fonte
              </label>
              <Input id={`${id}-r`} inputMode="decimal" value={retido} onChange={(e) => setRetido(e.target.value)} aria-invalid={tentou && !retidoOk ? true : undefined} aria-describedby={`${id}-r-a`} />
              <p id={`${id}-r-a`} className="text-xs text-muted-foreground">
                Até {moeda(porComprovar.toFixed(2), f.currency)}. Com o certificado de retenção, pode registar só este valor.
              </p>
            </div>
          ) : null}
          {tentou && !somaOk ? (
            <p className="text-xs text-danger sm:col-span-2" role="alert">
              {comRetencao ? "O valor recebido mais o retido tem de ser maior que zero e não passar do valor em aberto." : "Entre 0 e o valor em aberto, até 2 casas."}
            </p>
          ) : null}
          {tentou && !retidoOk ? (
            <p className="text-xs text-danger sm:col-span-2" role="alert">
              O retido não pode passar da retenção por comprovar.
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-m`} className="text-sm font-medium text-foreground">
              Meio
            </label>
            <Select id={`${id}-m`} value={meio} onChange={(e) => setMeio(e.target.value)} aria-invalid={tentou && meio === "" ? true : undefined}>
              <option value="">Escolha…</option>
              {Object.entries(MEIOS).map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
            </Select>
            {tentou && meio === "" ? <p className="text-xs text-danger" role="alert">Escolha o meio.</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-d`} className="text-sm font-medium text-foreground">
              Data do recebimento
            </label>
            <Input id={`${id}-d`} type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor={`${id}-n`} className="text-sm font-medium text-foreground">
              Notas
            </label>
            <Textarea id={`${id}-n`} maxLength={500} value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
      </Confirmar>
    </>
  );
}

function Saldo({ f }: { f: Factura }) {
  const saldo = useSaldo(f.invoiceId);
  const { pode } = useUtilizador();
  if (saldo.isPending) return <Skeleton className="h-24" />;
  if (saldo.error) return <ErrorPanel erro={saldo.error} tentarDeNovo={() => void saldo.refetch()} />;
  const s = saldo.data;
  const emAberto = dinheiro(s.outstanding);
  const retencao = dinheiro(s.withholdingAmount);
  const porComprovar = naoNegativo(retencao.minus(dinheiro(s.withheld)));
  const recebido: [string, string][] = retencao.gt(0)
    ? [
        ["Recebido (dinheiro)", moeda(dinheiro(s.received).minus(dinheiro(s.withheld)).toFixed(2), s.currency)],
        ["Retido na fonte", moeda(s.withheld, s.currency)],
      ]
    : [["Recebido", moeda(s.received, s.currency)]];
  return (
    <Card>
      <CardTitle>Saldo</CardTitle>
      <Totais linhas={[["Facturado", moeda(s.invoiced, s.currency)], ["Creditado", moeda(s.credited, s.currency)], ...recebido, ["Em aberto", moeda(s.outstanding, s.currency)]]} />
      {s.settled ? <Alert tom="sucesso" className="mt-3" titulo="Liquidada." /> : null}
      {!s.settled && porComprovar.gt(0) ? (
        <Alert tom="info" className="mt-3" titulo={`Retenção por comprovar: ${moeda(porComprovar.toFixed(2), s.currency)}.`}>
          Regista-se num recibo, com o valor retido pelo cliente (por exemplo quando chega o certificado).
        </Alert>
      ) : null}
      {!s.settled && f.status === "Normal" && f.documentType !== "FR" && emAberto.gt(0) && pode("finance.receipts.write") ? (
        <div className="mt-3">
          <NovoRecibo f={f} saldo={s} />
        </div>
      ) : null}
    </Card>
  );
}

function NotasDaFactura({ id }: { id: string }) {
  const notas = useNotas({ pagina: 1, tamanho: 50, salesInvoiceId: id });
  if (notas.isPending || notas.error || notas.data.items.length === 0) return null;
  return (
    <Card>
      <CardTitle>Notas de crédito</CardTitle>
      <ul className="mt-2 divide-y divide-border text-sm">
        {notas.data.items.map((n) => (
          <li key={n.creditNoteId} className="flex items-center justify-between gap-3 py-2">
            <Link to={`/notas-credito/${n.creditNoteId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
              {n.number}
            </Link>
            <span className="tabular-nums">{moeda(n.grossTotal, n.currency)}</span>
            <EstadoDocumento estado={n.status} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function FacturaPagina() {
  const { invoiceId = "" } = useParams();
  const factura = useFactura(invoiceId);
  const anular = useAnularFactura();
  const { pode } = useUtilizador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/facturas">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Facturas
      </Link>
    </Button>
  );
  if (factura.isPending) return <CarregandoPagina />;
  if (factura.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={factura.error} tentarDeNovo={() => void factura.refetch()} />
      </>
    );
  }
  const f = factura.data;
  const emVigor = f.status === "Normal";
  return (
    <>
      {voltar}
      <PageHeader
        titulo={f.number}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoDocumento estado={f.status} />
            <span>
              {NOME_TIPO[f.documentType] ?? f.documentType} · {formatarData(f.issuedOn)}
            </span>
          </span>
        }
      />
      {f.cancelledAt ? (
        <Alert tom="erro" className="mb-6" titulo={`Anulada a ${formatarDataHora(f.cancelledAt)}.`}>
          {f.cancellationReason}
        </Alert>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-2">
        <DescarregarPdf tipo="factura" id={f.invoiceId} numero={f.number} />
        {emVigor ? <EnviarPorEmail tipo="factura" id={f.invoiceId} numero={f.number} /> : null}
        {emVigor && pode("finance.invoices.cancel") && f.documentType !== "ND" ? <NovaNotaCredito f={f} /> : null}
        {emVigor && pode("finance.invoices.cancel") ? (
          <Anular
            numero={f.number}
            aCarregar={anular.isPending}
            erro={anular.error}
            aoAnular={(razao, fechar) => anular.mutate({ invoiceId: f.invoiceId, reason: razao }, { onSuccess: () => { fechar(); void factura.refetch(); } })}
          />
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardTitle>Cliente</CardTitle>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="text-foreground">
                  {f.customerId && pode("commercial.customers.read") ? (
                    <Link to={`/clientes/${f.customerId}`} className="underline-offset-4 hover:underline">
                      {f.customerName}
                    </Link>
                  ) : (
                    f.customerName
                  )}
                  {f.isFinalConsumer ? " (consumidor final)" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">NIF</dt>
                <dd className="text-foreground">{f.customerTaxId}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Morada</dt>
                <dd className="text-foreground">
                  {f.customerAddressDetail}, {f.customerCity}, {f.customerCountry}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vencimento</dt>
                <dd className="text-foreground">{formatarData(f.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{f.paymentMethod ? "Meio de pagamento" : "Condições"}</dt>
                <dd className="text-foreground">{f.paymentMethod ? (MEIOS[f.paymentMethod] ?? f.paymentMethod) : (f.paymentTerms ?? "—")}</dd>
              </div>
              {f.referencedInvoiceId ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Acrescenta à factura</dt>
                  <dd>
                    <Link to={`/facturas/${f.referencedInvoiceId}`} className="underline-offset-4 hover:underline">
                      {f.referencedInvoiceNumber}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>
          <Card>
            <CardTitle>Linhas</CardTitle>
            <div className="mt-3">
              <LinhasDocumento linhas={f.lines} moedaDoc={f.currency} />
            </div>
            <Totais
              linhas={[
                ["Líquido", moeda(f.netTotal, f.currency)],
                ["IVA", moeda(f.taxTotal, f.currency)],
                ["Total", moeda(f.grossTotal, f.currency)],
                ...(Number(f.withholdingAmount) > 0 ? ([[`Retenção (${String(f.withholdingRate).replace(".", ",")} %)`, `−${moeda(f.withholdingAmount, f.currency)}`]] as [string, string][]) : []),
                ["A pagar", moeda(f.amountPayable, f.currency)],
              ]}
            />
            {f.fiscalNotice ? <p className="mt-3 text-xs text-muted-foreground">{f.fiscalNotice}</p> : null}
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Saldo f={f} />
          <NotasDaFactura id={f.invoiceId} />
        </div>
      </div>
    </>
  );
}
