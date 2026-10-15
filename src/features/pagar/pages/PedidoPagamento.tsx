/**
 * Ficha de um pedido de pagamento (§5.6). Executar não se desfaz: o dinheiro
 * sai da conta escolhida. Quem pediu não executa (BR-3, 403 no servidor); só
 * se executa depois de aprovado (BR-5, 409).
 */
import { ArrowLeft, Banknote, Download, Paperclip, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { EstadoAprovacao, usePedidoAprovacao } from "@/features/aprovacoes";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { MEIOS, moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { useContasAbertas } from "@/features/tesouraria";
import { descarregar } from "@/lib/api/download";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { useAnexar, useAnexos, useCancelarPedidoPagamento, useExecutarPagamento, usePedidoPagamento, type PedidoPagamento as TipoPedido } from "../api";
import { CATEGORIAS_ANEXO, EstadoPedidoPagamento, SemFichaDeColaborador, useEuColaborador } from "../comum";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{rotulo}</dt>
      <dd className="break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Executar({ p, aoExecutar }: { p: TipoPedido; aoExecutar: (saldo: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const contas = useContasAbertas(aberto);
  const executar = useExecutarPagamento(p.paymentRequestId);
  const [conta, setConta] = useState("");
  const [meio, setMeio] = useState("TB");
  const [referencia, setReferencia] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const daMoeda = (contas.data?.items ?? []).filter((c) => c.currency === p.currency);
  const escolhida = daMoeda.find((c) => c.accountId === conta);
  const semSaldo = escolhida ? dinheiro(escolhida.balance).lt(dinheiro(p.amount)) : false;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      executar.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Banknote strokeWidth={1.75} aria-hidden />
        Executar pagamento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Pagar ${moeda(p.amount, p.currency)} a ${p.payeeName}?`}
        descricao="O dinheiro sai da conta escolhida e o movimento fica registado em seu nome. Não se pode desfazer."
        rotuloConfirmar="Executar pagamento"
        variante="destructive"
        aCarregar={executar.isPending}
        erro={executar.error ? <ErrorPanel erro={executar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (!conta || executar.isPending) return;
            executar.mutate(
              { bankAccountId: conta, method: meio, reference: referencia.trim() === "" ? null : referencia.trim() },
              {
                onSuccess: (r) => {
                  setAberto(false);
                  // O botão sai da página com o pedido pago: o aviso fica com a página.
                  aoExecutar(formatarMoeda(dinheiro(r.saldoRestante), p.currency));
                },
              },
            );
          }}
        >
          <Field
            rotulo="Conta de onde sai"
            erro={tentou && !conta ? "Escolha a conta." : semSaldo ? "O saldo desta conta não chega; o servidor vai recusar." : undefined}
            ajuda={contas.data && daMoeda.length === 0 ? `Não há contas abertas em ${p.currency}.` : `Só contas abertas em ${p.currency}.`}
          >
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} aria-busy={contas.isPending || undefined} value={conta} onChange={(e) => setConta(e.target.value)}>
                <option value="">Escolha…</option>
                {daMoeda.map((c) => (
                  <option key={c.accountId} value={c.accountId}>
                    {c.name} · saldo {moeda(c.balance, c.currency)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {contas.error ? <ErrorPanel erro={contas.error} /> : null}
          <Field rotulo="Meio de pagamento">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={meio} onChange={(e) => setMeio(e.target.value)}>
                {Object.entries(MEIOS).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Referência" ajuda="Opcional: número da transferência, do cheque…">
            {({ id, descricao }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} value={referencia} onChange={(e) => setReferencia(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Anexar({ p }: { p: TipoPedido }) {
  const [aberto, setAberto] = useState(false);
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_ANEXO[0]);
  const anexar = useAnexar(p.paymentRequestId);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setDocumento(null);
      anexar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)}>
        <Paperclip strokeWidth={1.75} aria-hidden />
        Anexar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Anexar um documento ao pedido"
        descricao="Quem aprova e quem paga vêem o anexo na lista. Depois de anexado, não se retira."
        rotuloConfirmar="Anexar"
        aCarregar={anexar.isPending}
        erro={anexar.error ? <ErrorPanel erro={anexar.error} /> : undefined}
        aoConfirmar={() => {
          if (!documento || anexar.isPending) return;
          anexar.mutate({ documentId: documento.documentId, category: categoria }, { onSuccess: () => fechar(false) });
        }}
      >
        <div className="flex flex-col gap-4">
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS_ANEXO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <CarregarFicheiro rotulo="Ficheiro" categoria="Anexo de pedido de pagamento" documento={documento} aoMudar={setDocumento} />
        </div>
      </Confirmar>
    </>
  );
}

function Anexos({ p }: { p: TipoPedido }) {
  const { pode } = useUtilizador();
  const anexos = useAnexos(p.paymentRequestId);
  const [erroDescarga, setErroDescarga] = useState<unknown>(null);
  const podeAnexar = p.status === "Eligible" && pode({ allOf: ["finance.payments.request", "documents.write"] });
  return (
    <Card className="self-start">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Anexos</CardTitle>
        {podeAnexar ? <Anexar p={p} /> : null}
      </div>
      {anexos.isPending ? (
        <Skeleton className="mt-3 h-12" />
      ) : anexos.error ? (
        <ErrorPanel erro={anexos.error} tentarDeNovo={() => void anexos.refetch()} className="mt-3" />
      ) : anexos.data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sem anexos.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {anexos.data.map((a) => (
            <li key={a.linkId} className="flex items-center gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{a.fileName ?? "Documento"}</p>
                <p className="text-xs text-muted-foreground">
                  {a.category} · {formatarDataHora(a.attachedAt)}
                </p>
              </div>
              {pode("documents.read") ? (
                <Button
                  variante="ghost"
                  tamanho="sm"
                  aria-label={`Descarregar ${a.fileName ?? "documento"}`}
                  onClick={() => {
                    setErroDescarga(null);
                    descarregar(`/documents/${a.documentId}`, a.fileName ?? "anexo").catch(setErroDescarga);
                  }}
                >
                  <Download strokeWidth={1.75} aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {erroDescarga ? <ErrorPanel erro={erroDescarga} className="mt-2" /> : null}
      {anexos.data && anexos.data.length > 0 && !pode("documents.read") ? (
        <p className="mt-2 text-xs text-muted-foreground">Abrir os anexos exige ler o arquivo de documentos, que este perfil não tem (B20).</p>
      ) : null}
    </Card>
  );
}

function Aprovacao({ p }: { p: TipoPedido }) {
  const { pode } = useUtilizador();
  const podeLer = pode("approval.requests.read");
  const a = usePedidoAprovacao(p.approvalRequestId, podeLer);
  if (!podeLer) return null;
  return (
    <Linha rotulo="Aprovação">
      {a.isPending ? (
        "…"
      ) : a.error ? (
        "Não foi possível ler."
      ) : (
        <span className="inline-flex flex-wrap items-center gap-2">
          <EstadoAprovacao estado={a.data.status} />
          <Link to={`/aprovacoes/${p.approvalRequestId}`} className="underline-offset-4 hover:underline">
            Ver o pedido de aprovação
          </Link>
        </span>
      )}
    </Linha>
  );
}

export default function PedidoPagamento() {
  const { paymentRequestId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = usePedidoPagamento(paymentRequestId);
  const eu = useEuColaborador();
  const cancelar = useCancelarPedidoPagamento(paymentRequestId);
  const [saldoDepois, setSaldoDepois] = useState<string | null>(null);
  const podeLerAprovacao = pode("approval.requests.read");
  const aprovacao = usePedidoAprovacao(q.data?.approvalRequestId ?? "", podeLerAprovacao && q.data !== undefined);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/pedidos-pagamento">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Pedidos de pagamento
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
  const p = q.data;
  const porPagar = p.status === "Eligible";
  const souRequerente = eu.id !== null && eu.id === p.requestedByEmployeeId;
  const aprovado = aprovacao.data?.status === "Approved";
  // Quem aprovou também não paga (BR-3): o servidor recusa com 403.
  const souAprovador = eu.id !== null && (aprovacao.data?.decisions ?? []).some((d) => d.decidedByEmployeeId === eu.id);
  const quemPediu = souRequerente ? "Você" : (aprovacao.data?.requestedByName ?? "Colaborador");
  const podeExecutar = porPagar && pode("finance.payments.execute");
  return (
    <>
      {voltar}
      <PageHeader
        titulo={`Pagamento de ${p.supplierInvoiceNumber}`}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoPedidoPagamento estado={p.status} />
            <span>
              {moeda(p.amount, p.currency)} a {p.payeeName}
            </span>
          </span>
        }
        accao={
          porPagar ? (
            <div className="flex flex-wrap gap-2">
              {podeExecutar && eu.id && !souRequerente && !souAprovador && (aprovado || !podeLerAprovacao) ? <Executar p={p} aoExecutar={setSaldoDepois} /> : null}
              {pode("finance.payments.request") ? (
                <ConfirmarComMotivo
                  rotuloBotao="Cancelar pedido"
                  icone={<XCircle strokeWidth={1.75} aria-hidden />}
                  titulo="Cancelar este pedido de pagamento?"
                  descricao="O pedido deixa de poder ser pago e o pedido de aprovação fecha. Fica no registo, com o motivo."
                  rotuloConfirmar="Cancelar pedido"
                  ajuda="Fica no pedido e na trilha de auditoria."
                  aCarregar={cancelar.isPending}
                  erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
                  aoConfirmar={(motivo, fechar) => cancelar.mutate(motivo, { onSuccess: fechar })}
                />
              ) : null}
            </div>
          ) : undefined
        }
      />
      {saldoDepois ? (
        <Alert tom="sucesso" className="mb-6" titulo="Pagamento executado.">
          Saldo da conta depois do pagamento: {saldoDepois}.
        </Alert>
      ) : null}
      {podeExecutar && eu.carregado && !eu.id ? (
        <div className="mb-6">
          <SemFichaDeColaborador accao="executar pagamentos" />
        </div>
      ) : null}
      {podeExecutar && souRequerente ? (
        <Alert tom="info" className="mb-6" titulo="Foi você que pediu este pagamento.">
          Quem pede não paga (BR-3): outra pessoa com a tesouraria tem de o executar.
        </Alert>
      ) : null}
      {podeExecutar && souAprovador ? (
        <Alert tom="info" className="mb-6" titulo="Foi você que aprovou este pagamento.">
          Quem aprova não paga (BR-3): outra pessoa com a tesouraria tem de o executar.
        </Alert>
      ) : null}
      {podeExecutar && !souRequerente && !souAprovador && podeLerAprovacao && aprovacao.data && !aprovado ? (
        <Alert tom="info" className="mb-6" titulo="Ainda não está aprovado.">
          Só se executa depois de aprovado (BR-5). Acompanhe a decisão no pedido de aprovação.
        </Alert>
      ) : null}
      {p.status === "Cancelled" ? (
        <Alert tom="aviso" className="mb-6" titulo={`Cancelado${p.cancelledAt ? ` a ${formatarDataHora(p.cancelledAt)}` : ""}.`}>
          {p.cancellationReason ?? ""}
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Dados</CardTitle>
          <dl className="mt-3 flex flex-col gap-2">
            <Linha rotulo="Factura">
              {pode("finance.payables.read") ? (
                <Link to={`/facturas-compra/${p.purchaseInvoiceId}`} className="underline-offset-4 hover:underline">
                  {p.supplierInvoiceNumber}
                </Link>
              ) : (
                p.supplierInvoiceNumber
              )}
            </Linha>
            <Linha rotulo="Beneficiário">
              {p.payeeName} · NIF {p.payeeTaxId}
            </Linha>
            <Linha rotulo="Valor">{moeda(p.amount, p.currency)}</Linha>
            <Linha rotulo="Pedido por">
              {quemPediu} · {formatarData(p.requestedOn)}
            </Linha>
            <Aprovacao p={p} />
            {p.notes ? <Linha rotulo="Notas">{p.notes}</Linha> : null}
            {p.status === "Executed" ? (
              <>
                <Linha rotulo="Pago em">{p.executedAt ? formatarDataHora(p.executedAt) : "—"}</Linha>
                <Linha rotulo="Meio">{p.executedMethod ? (MEIOS[p.executedMethod] ?? p.executedMethod) : "—"}</Linha>
                <Linha rotulo="Referência">{p.executionReference ?? "—"}</Linha>
              </>
            ) : null}
          </dl>
        </Card>
        <Anexos p={p} />
      </div>
    </>
  );
}
