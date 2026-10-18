/**
 * A fila de comprovativos (a página e a ficha do cliente): descarregar o
 * ficheiro, confirmar (regista o recibo) e rejeitar com o motivo.
 */
import { Download } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useUtilizador } from "@/features/identity";
import { EstadoComprovativo } from "@/features/portalcliente";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { dinheiro, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { erroMotivo, MAXIMO_MOTIVO, useConfirmarComprovativo, useDescarregarComprovativo, useRejeitarComprovativo, type PedidoComprovativo } from "./api";

const quem = (p: PedidoComprovativo) => p.customerName ?? "Cliente";
const qual = (p: PedidoComprovativo) => p.invoiceNumber ?? "a factura";
/** Na moeda da factura, que o pedido não diz (B34). */
const valor = (p: PedidoComprovativo) => formatarNumeroDecimal(paraApi(dinheiro(p.amount)), 2);

function Descarregar({ p }: { p: PedidoComprovativo }) {
  const d = useDescarregarComprovativo();
  if (!p.fileName) return null;
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={d.isPending} onClick={() => d.mutate(p)} aria-label={`Descarregar o comprovativo de ${quem(p)} (${p.fileName})`}>
        <Download strokeWidth={1.75} aria-hidden />
        Ficheiro
      </Button>
      {d.error ? <ErrorPanel erro={d.error} /> : null}
    </span>
  );
}

function ConfirmarPedido({ p, aoConfirmar }: { p: PedidoComprovativo; aoConfirmar: (receiptId: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const confirmar = useConfirmarComprovativo();
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)} aria-label={`Confirmar o pagamento de ${quem(p)} (${qual(p)})`}>
        Confirmar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) confirmar.reset();
        }}
        titulo={`Confirmar o pagamento de ${quem(p)}`}
        descricao={`Regista um recibo de ${valor(p)} (na moeda da factura) para ${qual(p)}, por transferência bancária a ${formatarData(p.paidOn)}. Confira o ficheiro antes: o recibo só se desfaz anulando-o.`}
        rotuloConfirmar="Confirmar e registar o recibo"
        aCarregar={confirmar.isPending}
        erro={confirmar.error ? <ErrorPanel erro={confirmar.error} /> : undefined}
        aoConfirmar={() =>
          confirmar.mutate(p.id, {
            onSuccess: (r) => {
              setAberto(false);
              aoConfirmar(r.receiptId);
            },
          })
        }
      />
    </>
  );
}

function RejeitarPedido({ p }: { p: PedidoComprovativo }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const rejeitar = useRejeitarComprovativo();
  const erro = erroMotivo(motivo);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Rejeitar o comprovativo de ${quem(p)} (${qual(p)})`}>
        Rejeitar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            rejeitar.reset();
            setTentou(false);
            setMotivo("");
          }
        }}
        titulo={`Rejeitar o comprovativo de ${quem(p)}`}
        descricao="O cliente vê o motivo no portal e pode enviar outro. O pedido fica no registo."
        rotuloConfirmar="Rejeitar"
        variante="destructive"
        aCarregar={rejeitar.isPending}
        erro={rejeitar.error ? <ErrorPanel erro={rejeitar.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || rejeitar.isPending) return;
          rejeitar.mutate({ id: p.id, motivo: normalizarTexto(motivo, true) }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Motivo" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => (
            <Textarea id={id} rows={3} maxLength={MAXIMO_MOTIVO} aria-describedby={descricao} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          )}
        </Field>
      </Confirmar>
    </>
  );
}

export function FilaComprovativos({
  rotulo,
  linhas,
  aCarregar,
  erro,
  vazio,
  comCliente = true,
  paginacao,
}: {
  rotulo: string;
  linhas: readonly PedidoComprovativo[] | undefined;
  aCarregar: boolean;
  erro: unknown;
  vazio: string;
  comCliente?: boolean;
  paginacao?:
    | undefined
    | {
        pagina: number;
        tamanho: number;
        total: number;
        aoMudar: (p: { pagina: number; tamanho: number }) => void;
      };
}) {
  const { pode } = useUtilizador();
  const decide = pode("finance.receipts.write");
  const [recibo, setRecibo] = useState<{ id: string; de: string } | null>(null);
  const colunas: Coluna<PedidoComprovativo>[] = [
    ...(comCliente
      ? [
          {
            id: "cliente",
            cabecalho: "Cliente",
            className: "max-w-[14rem] truncate",
            celula: (p: PedidoComprovativo) =>
              pode("commercial.customers.read") ? (
                <Link to={`/clientes/${p.customerId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {quem(p)}
                </Link>
              ) : (
                <span className="font-medium">{quem(p)}</span>
              ),
          },
        ]
      : []),
    {
      id: "factura",
      cabecalho: "Factura",
      celula: (p) =>
        pode("finance.invoices.read") ? (
          <Link to={`/facturas/${p.salesInvoiceId}`} className="underline-offset-4 hover:underline">
            {p.invoiceNumber ?? "Factura"}
          </Link>
        ) : (
          (p.invoiceNumber ?? "—")
        ),
    },
    {
      id: "pago",
      cabecalho: "Pago a",
      esconderAte: "sm",
      celula: (p) => formatarData(p.paidOn),
    },
    {
      id: "enviado",
      cabecalho: "Enviado a",
      esconderAte: "lg",
      celula: (p) => formatarDataHora(p.submittedAt),
    },
    {
      id: "valor",
      cabecalho: "Valor pago",
      alinhar: "direita",
      celula: (p) => valor(p),
    },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (p) => (
        <span className="flex flex-col gap-1">
          <EstadoComprovativo estado={p.status} />
          {p.rejectionReason ? <span className="whitespace-pre-line text-xs text-muted-foreground">{p.rejectionReason}</span> : null}
          {p.notes ? <span className="whitespace-pre-line text-xs text-muted-foreground">Nota do cliente: {p.notes}</span> : null}
        </span>
      ),
    },
    {
      id: "accoes",
      cabecalho: "",
      alinhar: "direita",
      celula: (p) => (
        <span className="inline-flex flex-wrap items-start justify-end gap-1">
          <Descarregar p={p} />
          {decide && p.status === "Pending" ? (
            <>
              <ConfirmarPedido p={p} aoConfirmar={(id) => setRecibo({ id, de: quem(p) })} />
              <RejeitarPedido p={p} />
            </>
          ) : null}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      {recibo ? (
        <Alert tom="sucesso" titulo={`Pagamento de ${recibo.de} confirmado.`}>
          {pode("finance.receipts.read") ? (
            <Link to={`/recibos/${recibo.id}`} className="underline underline-offset-4">
              Ver o recibo registado
            </Link>
          ) : null}
        </Alert>
      ) : null}
      <Tabela
        rotulo={rotulo}
        colunas={colunas}
        linhas={linhas}
        chave={(p) => p.id}
        aCarregar={aCarregar}
        erro={erro ? <ErrorPanel erro={erro} /> : undefined}
        vazio={vazio}
        rodape={paginacao && paginacao.total > 0 ? <Paginacao pagina={paginacao.pagina} tamanho={paginacao.tamanho} total={paginacao.total} aoMudar={paginacao.aoMudar} /> : undefined}
      />
    </div>
  );
}
