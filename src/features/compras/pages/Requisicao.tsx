/**
 * Uma requisição: linhas e total; em rascunho, submeter ou cancelar; por
 * aprovar, ver a decisão ou cancelar; aprovada, emitir ordens de compra (sem
 * passar o aprovado, descontado o já encomendado) e ver as que já há.
 */
import Big from "big.js";
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { useTodosDepartamentos } from "@/features/rh";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import {
  useCancelarRequisicao,
  useEmitirOrdem,
  useFornecedoresActivos,
  useOrdens,
  useRequisicao,
  useSubmeterRequisicao,
  useVerDecisaoRequisicao,
  type OrdemCompra,
  type Requisicao as TipoRequisicao,
} from "../api";
import { EditorLinhas, EstadoOrdem, EstadoRequisicao, useNomePessoa, valor } from "../comum";
import { errosOrdem, linhasParaApi, temErros, type LinhaRascunho } from "../regras";

type Linha = TipoRequisicao["lines"][number];

/** Já encomendado: as ordens não canceladas desta requisição. */
const encomendado = (ordens: readonly OrdemCompra[]) => ordens.filter((o) => o.status !== "Cancelled").reduce((t, o) => t.plus(new Big(o.total)), new Big(0));

function EmitirOrdem({ r, disponivel }: { r: TipoRequisicao; disponivel: Big }) {
  const [aberto, setAberto] = useState(false);
  const inicial = (): LinhaRascunho[] => r.lines.map((l) => ({ descricao: l.description, quantidade: String(l.quantity).replace(".", ","), preco: new Big(l.estimatedUnitPrice).toFixed(2).replace(".", ",") }));
  const [fornecedor, setFornecedor] = useState("");
  const [emissao, setEmissao] = useState(hojeIso());
  const [esperada, setEsperada] = useState("");
  const [linhas, setLinhas] = useState<LinhaRascunho[]>(inicial);
  const [tentou, setTentou] = useState(false);
  const emitir = useEmitirOrdem(r.requisitionId);
  const fornecedores = useFornecedoresActivos(aberto);
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosOrdem({ fornecedor, emissao, esperada, linhas, disponivel });
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      emitir.reset();
      setTentou(false);
      setFornecedor("");
      setEsperada("");
      setLinhas(inicial());
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)} disabled={disponivel.lte(0)} title={disponivel.lte(0) ? "Já se encomendou todo o valor aprovado." : undefined}>
        <Plus strokeWidth={1.75} aria-hidden />
        Emitir ordem de compra
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Emitir uma ordem de compra"
        descricao={`Em ${r.currency}, até ${valor(disponivel.toFixed(2), r.currency)} (o aprovado menos o já encomendado). As linhas vêm da requisição, com os preços estimados: ajuste ao acordado com o fornecedor.`}
        rotuloConfirmar="Emitir ordem"
        aCarregar={emitir.isPending}
        erro={emitir.error ? <ErrorPanel erro={emitir.error} /> : fornecedores.error ? <ErrorPanel erro={fornecedores.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || emitir.isPending) return;
            emitir.mutate(
              {
                supplierId: fornecedor,
                issuedOn: emissao === "" ? null : emissao,
                expectedOn: esperada === "" ? null : esperada,
                lines: linhasParaApi(linhas).map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.preco })),
              },
              { onSuccess: (o) => void navegar(`/encomendas/${o.purchaseOrderId}`) },
            );
          }}
        >
          <Field rotulo="Fornecedor" erro={tentou ? erros.fornecedor : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)}>
                <option value="">{fornecedores.isPending ? "A carregar…" : "Escolha…"}</option>
                {(fornecedores.data?.items ?? []).map((f) => (
                  <option key={f.supplierId} value={f.supplierId}>
                    {f.name} · {f.taxId}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Emitida a">
            {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={emissao} onChange={(e) => setEmissao(e.target.value)} />}
          </Field>
          <Field rotulo="Entrega esperada (opcional)" erro={tentou ? erros.esperada : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={emissao || undefined} aria-describedby={descricao} invalido={invalido} value={esperada} onChange={(e) => setEsperada(e.target.value)} />}
          </Field>
          <EditorLinhas linhas={linhas} mudar={setLinhas} erros={tentou ? erros.porLinha : {}} rotuloPreco="Preço acordado" moeda={r.currency} />
          {tentou && (erros.linhas ?? erros.total) ? (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {erros.linhas ?? erros.total}
            </p>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function Submeter({ r }: { r: TipoRequisicao }) {
  const [aberto, setAberto] = useState(false);
  const submeter = useSubmeterRequisicao(r.requisitionId);
  return (
    <>
      <Button onClick={() => setAberto(true)}>Submeter para aprovação</Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) submeter.reset();
        }}
        titulo="Submeter esta requisição?"
        descricao={`${valor(r.estimatedTotal, r.currency)} estimados, em ${r.lines.length} ${r.lines.length === 1 ? "linha" : "linhas"}. Vai a aprovação e deixa de se poder alterar.`}
        rotuloConfirmar="Submeter"
        aCarregar={submeter.isPending}
        erro={submeter.error ? <ErrorPanel erro={submeter.error} /> : undefined}
        aoConfirmar={() => (submeter.isPending ? undefined : submeter.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function VerDecisao({ r }: { r: TipoRequisicao }) {
  const ver = useVerDecisaoRequisicao(r.requisitionId);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variante="secondary" aCarregar={ver.isPending} onClick={() => (ver.isPending ? undefined : ver.mutate())}>
        Ver decisão
      </Button>
      {ver.data?.estado === "PendingApproval" ? <p className="text-sm text-muted-foreground">Ainda à espera de decisão em Aprovações.</p> : null}
      {ver.error ? <ErrorPanel erro={ver.error} /> : null}
    </div>
  );
}

function Cancelar({ r }: { r: TipoRequisicao }) {
  const cancelar = useCancelarRequisicao(r.requisitionId);
  return (
    <ConfirmarComMotivo
      rotuloBotao="Cancelar requisição"
      varianteBotao="secondary"
      titulo="Cancelar esta requisição?"
      descricao="Fica registada como cancelada, com o motivo. Não se apaga nem se reabre."
      rotuloConfirmar="Cancelar requisição"
      maximo={500}
      aCarregar={cancelar.isPending}
      erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
      aoConfirmar={(motivo, fechar) => cancelar.mutate(motivo, { onSuccess: fechar })}
    />
  );
}

function OrdensDaRequisicao({ ordens, carregando, erro }: { ordens: readonly OrdemCompra[] | undefined; carregando: boolean; erro: unknown }) {
  const colunas: Coluna<OrdemCompra>[] = [
    {
      id: "fornecedor",
      cabecalho: "Ordem",
      celula: (o) => (
        <Link to={`/encomendas/${o.purchaseOrderId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {o.supplierName}
        </Link>
      ),
    },
    { id: "emitida", cabecalho: "Emitida a", esconderAte: "sm", celula: (o) => formatarData(o.issuedOn) },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (o) => valor(o.total, o.currency) },
    { id: "estado", cabecalho: "Estado", celula: (o) => <EstadoOrdem estado={o.status} recebida={o.fullyReceived} /> },
  ];
  return (
    <Tabela
      rotulo="Ordens de compra desta requisição"
      colunas={colunas}
      linhas={ordens}
      chave={(o) => o.purchaseOrderId}
      aCarregar={carregando}
      erro={erro ? <ErrorPanel erro={erro} /> : undefined}
      vazio="Ainda não há ordens de compra desta requisição."
    />
  );
}

export default function Requisicao() {
  const { requisitionId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useRequisicao(requisitionId);
  const nomeDe = useNomePessoa();
  const departamentos = useTodosDepartamentos(pode("hr.departments.read"));
  const leOrdens = pode("procurement.orders.read");
  const ordens = useOrdens({ requisicao: requisitionId, fornecedor: null, pagina: 1, tamanho: 200 }, leOrdens && q.data?.status === "Approved");
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/requisicoes">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Requisições
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
  const r = q.data;
  const escreve = pode("procurement.requisitions.write");
  const dep = r.departmentId ? (departamentos.data?.items.find((d) => d.departmentId === r.departmentId)?.name ?? "Departamento") : "—";
  const disponivel = new Big(r.estimatedTotal).minus(encomendado(ordens.data?.items ?? []));
  const colunas: Coluna<Linha>[] = [
    { id: "descricao", cabecalho: "Descrição", celula: (l) => l.description },
    { id: "quantidade", cabecalho: "Quantidade", alinhar: "direita", celula: (l) => String(l.quantity).replace(".", ",") },
    { id: "preco", cabecalho: "Preço estimado", alinhar: "direita", esconderAte: "sm", celula: (l) => valor(l.estimatedUnitPrice, r.currency) },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (l) => valor(l.estimatedTotal, r.currency) },
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={r.justification.length > 80 ? `${r.justification.slice(0, 80)}…` : r.justification}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoRequisicao estado={r.status} />
            <span>
              {valor(r.estimatedTotal, r.currency)} · {nomeDe(r.requestedByEmployeeId)} · {formatarData(r.requestedOn)}
            </span>
          </span>
        }
        accao={
          escreve && (r.status === "Draft" || r.status === "PendingApproval") ? (
            <div className="flex flex-wrap items-start gap-2">
              <Cancelar r={r} />
              {r.status === "Draft" ? <Submeter r={r} /> : <VerDecisao r={r} />}
            </div>
          ) : undefined
        }
      />
      {r.status === "PendingApproval" && r.approvalRequestId ? (
        <Alert tom="info" className="mb-4" titulo="À espera de decisão em Aprovações.">
          <Can requer="approval.requests.read">
            <Link to={`/aprovacoes/${r.approvalRequestId}`} className="underline underline-offset-4">
              Abrir o pedido de aprovação
            </Link>
          </Can>
        </Alert>
      ) : null}
      {r.status === "Refused" || r.status === "Cancelled" ? (
        <Alert tom={r.status === "Refused" ? "erro" : "info"} className="mb-4" titulo={r.status === "Refused" ? "Requisição recusada." : "Requisição cancelada."}>
          {r.closingReason ? `Motivo: ${r.closingReason}` : null}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardTitle>A requisição</CardTitle>
        <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Justificação</dt>
          <dd className="whitespace-pre-line break-words">{r.justification}</dd>
          <dt className="text-muted-foreground">Departamento</dt>
          <dd>{dep}</dd>
          <dt className="text-muted-foreground">Moeda</dt>
          <dd>{r.currency}</dd>
          {r.submittedAt ? (
            <>
              <dt className="text-muted-foreground">Submetida a</dt>
              <dd>{formatarDataHora(r.submittedAt)}</dd>
            </>
          ) : null}
          {r.closedAt ? (
            <>
              <dt className="text-muted-foreground">Fechada a</dt>
              <dd>{formatarDataHora(r.closedAt)}</dd>
            </>
          ) : null}
        </dl>
      </Card>
      <h2 className="mb-3 text-md font-semibold text-foreground">Linhas</h2>
      <Tabela rotulo="Linhas da requisição" colunas={colunas} linhas={r.lines} chave={(l) => l.lineId} aCarregar={false} vazio="Sem linhas." />
      {r.status === "Approved" && leOrdens ? (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-md font-semibold text-foreground">Ordens de compra</h2>
            <Can requer={{ allOf: ["procurement.orders.write", "procurement.suppliers.read"] }}>
              {ordens.data ? <EmitirOrdem key={disponivel.toFixed(2)} r={r} disponivel={disponivel} /> : null}
            </Can>
          </div>
          <OrdensDaRequisicao ordens={ordens.data?.items} carregando={ordens.isPending} erro={ordens.error} />
        </section>
      ) : null}
    </>
  );
}
