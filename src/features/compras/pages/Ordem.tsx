/**
 * Uma ordem de compra: linhas com o encomendado, o recebido e o que falta;
 * registar uma recepção (uma contagem por linha, sem passar o que falta),
 * anular uma recepção com motivo e cancelar a ordem (só sem mercadoria
 * recebida).
 */
import Big from "big.js";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAnularRecepcao, useCancelarOrdem, useOrdem, useRecepcoes, useRegistarRecepcao, type OrdemCompra, type Recepcao } from "../api";
import { EstadoOrdem, EstadoRecepcao, useNomePessoa, valor } from "../comum";
import { errosRecepcao } from "../regras";

type LinhaOrdem = OrdemCompra["lines"][number];
const qtd = (v: number | string | Big) => String(v).replace(".", ",");
const falta = (l: LinhaOrdem) => new Big(l.quantity).minus(new Big(l.quantityReceived));

function RegistarRecepcao({ o }: { o: OrdemCompra }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => o.lines.map((l) => (falta(l).gt(0) ? qtd(falta(l)) : ""));
  const [quantidades, setQuantidades] = useState<string[]>(inicial);
  const [data, setData] = useState(hojeIso());
  const [guia, setGuia] = useState("");
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarRecepcao(o.purchaseOrderId);
  const idForm = useId();
  const erros = errosRecepcao(o.lines.map((l, i) => ({ quantidade: quantidades[i] ?? "", falta: falta(l) })));
  const g = normalizarTexto(guia);
  const erroGuia = g.length > 60 ? "No máximo 60 caracteres." : undefined;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      registar.reset();
      setTentou(false);
      setQuantidades(inicial());
      setGuia("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <PackageCheck strokeWidth={1.75} aria-hidden />
        Registar recepção
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Registar o que chegou"
        descricao="Por linha, a quantidade que chegou agora (vazio ou zero: não chegou). Fica registada em seu nome; a conta tem de estar ligada a uma ficha."
        rotuloConfirmar="Registar recepção"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.linhas || Object.keys(erros.porLinha).length > 0 || erroGuia || registar.isPending) return;
            const linhas = o.lines.flatMap((l, i) => {
              const q = lerDecimalDigitado((quantidades[i] ?? "").trim(), 4);
              return q && q.gt(0) ? [{ purchaseOrderLineId: l.lineId, quantityReceived: decimalParaApi(q) }] : [];
            });
            registar.mutate({ receivedOn: data === "" ? null : data, deliveryNote: g === "" ? null : g, lines: linhas }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Recebida a">
            {({ id, descricao }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
          <Field rotulo="Guia de remessa (opcional)" erro={tentou ? erroGuia : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={guia} onChange={(e) => setGuia(e.target.value)} />}
          </Field>
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Quantidades</legend>
            {o.lines.map((l, i) => (
              <Field key={l.lineId} rotulo={`${l.description} (faltam ${qtd(falta(l))})`} erro={tentou ? erros.porLinha[i] : undefined}>
                {({ id, descricao, invalido }) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    autoComplete="off"
                    className="text-right tabular-nums"
                    disabled={falta(l).lte(0)}
                    aria-describedby={descricao}
                    invalido={invalido}
                    value={quantidades[i] ?? ""}
                    onChange={(e) => setQuantidades((x) => x.map((v, j) => (j === i ? e.target.value : v)))}
                  />
                )}
              </Field>
            ))}
            {tentou && erros.linhas ? (
              <p role="alert" className="text-sm text-danger">
                {erros.linhas}
              </p>
            ) : null}
          </fieldset>
        </form>
      </Confirmar>
    </>
  );
}

function AnularRecepcao({ r }: { r: Recepcao }) {
  const anular = useAnularRecepcao();
  return (
    <ConfirmarComMotivo
      rotuloBotao="Anular"
      titulo={`Anular a recepção de ${formatarData(r.receivedOn)}?`}
      descricao="As quantidades voltam a faltar na ordem. Fica registada como anulada, com o motivo."
      rotuloConfirmar="Anular recepção"
      maximo={500}
      aCarregar={anular.isPending}
      erro={anular.error ? <ErrorPanel erro={anular.error} /> : undefined}
      aoConfirmar={(motivo, fechar) => anular.mutate({ id: r.goodsReceiptId, reason: motivo }, { onSuccess: fechar })}
    />
  );
}

function CancelarOrdem({ o }: { o: OrdemCompra }) {
  const cancelar = useCancelarOrdem(o.purchaseOrderId);
  return (
    <ConfirmarComMotivo
      rotuloBotao="Cancelar ordem"
      varianteBotao="secondary"
      titulo={`Cancelar a ordem a ${o.supplierName}?`}
      descricao="Só sem mercadoria recebida (anule antes as recepções). O valor volta a ficar disponível na requisição."
      rotuloConfirmar="Cancelar ordem"
      maximo={500}
      aCarregar={cancelar.isPending}
      erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
      aoConfirmar={(motivo, fechar) => cancelar.mutate(motivo, { onSuccess: fechar })}
    />
  );
}

export default function Ordem() {
  const { purchaseOrderId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useOrdem(purchaseOrderId);
  const recepcoes = useRecepcoes({ ordem: purchaseOrderId, pagina: 1, tamanho: 200 }, pode("procurement.receipts.read"));
  const nomeDe = useNomePessoa();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/encomendas">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Ordens de compra
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
  const o = q.data;
  const emitida = o.status === "Issued";
  const colunas: Coluna<LinhaOrdem>[] = [
    { id: "descricao", cabecalho: "Descrição", celula: (l) => l.description },
    { id: "quantidade", cabecalho: "Encomendado", alinhar: "direita", celula: (l) => qtd(l.quantity) },
    { id: "recebido", cabecalho: "Recebido", alinhar: "direita", celula: (l) => qtd(l.quantityReceived) },
    { id: "falta", cabecalho: "Falta", alinhar: "direita", esconderAte: "sm", celula: (l) => qtd(falta(l)) },
    { id: "preco", cabecalho: "Preço", alinhar: "direita", esconderAte: "md", celula: (l) => valor(l.unitPrice, o.currency) },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (l) => valor(l.lineTotal, o.currency) },
  ];
  const colunasRecepcao: Coluna<Recepcao>[] = [
    { id: "data", cabecalho: "Recebida a", celula: (r) => formatarData(r.receivedOn) },
    { id: "quem", cabecalho: "Por", esconderAte: "sm", celula: (r) => nomeDe(r.receivedByEmployeeId) },
    { id: "guia", cabecalho: "Guia", esconderAte: "md", celula: (r) => r.deliveryNote ?? "—" },
    {
      id: "linhas",
      cabecalho: "Chegou",
      celula: (r) =>
        r.lines
          .map((x) => {
            const l = o.lines.find((y) => y.lineId === x.purchaseOrderLineId);
            return `${qtd(x.quantityReceived)} × ${l?.description ?? "linha"}`;
          })
          .join("; "),
    },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (r) => (
        <div className="flex flex-col gap-0.5">
          <EstadoRecepcao estado={r.status} />
          {r.cancellationReason ? <span className="text-xs text-muted-foreground">{r.cancellationReason}</span> : null}
        </div>
      ),
    },
    ...(pode("procurement.receipts.write") ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (r: Recepcao) => (r.status === "Registered" ? <AnularRecepcao r={r} /> : null) }] : []),
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={`Ordem a ${o.supplierName}`}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoOrdem estado={o.status} recebida={o.fullyReceived} />
            <span>
              {valor(o.total, o.currency)} · emitida a {formatarData(o.issuedOn)}
              {o.expectedOn ? ` · entrega esperada a ${formatarData(o.expectedOn)}` : ""}
            </span>
          </span>
        }
        accao={
          emitida ? (
            <div className="flex flex-wrap gap-2">
              <Can requer="procurement.orders.write">
                <CancelarOrdem o={o} />
              </Can>
              {!o.fullyReceived ? (
                <Can requer="procurement.receipts.write">
                  <RegistarRecepcao key={o.lines.map((l) => String(l.quantityReceived)).join("|")} o={o} />
                </Can>
              ) : null}
            </div>
          ) : undefined
        }
      />
      {o.status === "Cancelled" ? <Alert tom="info" className="mb-4" titulo={`Ordem cancelada${o.cancellationReason ? `: ${o.cancellationReason}` : "."}`} /> : null}
      <p className="mb-3 text-sm">
        <Can requer="procurement.requisitions.read">
          <Link to={`/requisicoes/${o.requisitionId}`} className="underline underline-offset-4">
            Ver a requisição de origem
          </Link>
        </Can>
      </p>
      <Tabela rotulo="Linhas da ordem" colunas={colunas} linhas={o.lines} chave={(l) => l.lineId} aCarregar={false} vazio="Sem linhas." />
      {pode("procurement.receipts.read") ? (
        <section className="mt-8">
          <h2 className="mb-3 text-md font-semibold text-foreground">Recepções</h2>
          <Tabela
            rotulo="Recepções da ordem"
            colunas={colunasRecepcao}
            linhas={recepcoes.data?.items}
            chave={(r) => r.goodsReceiptId}
            aCarregar={recepcoes.isPending}
            erro={recepcoes.error ? <ErrorPanel erro={recepcoes.error} tentarDeNovo={() => void recepcoes.refetch()} /> : undefined}
            vazio="Ainda não chegou nada."
          />
        </section>
      ) : null}
    </>
  );
}
