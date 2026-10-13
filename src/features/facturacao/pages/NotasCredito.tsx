import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAnularNota, useNota, useNotas, type NotaCredito } from "../api";
import { Anular, DescarregarPdf, EnviarPorEmail, EstadoDocumento, LinhasDocumento, moeda, Totais } from "../comum";

export function ListaNotasCredito() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const notas = useNotas({ pagina, tamanho });
  const colunas: Coluna<NotaCredito>[] = [
    {
      id: "numero",
      cabecalho: "Número",
      celula: (n) => (
        <Link to={`/notas-credito/${n.creditNoteId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {n.number}
        </Link>
      ),
    },
    { id: "data", cabecalho: "Data", esconderAte: "sm", celula: (n) => formatarData(n.issuedOn) },
    { id: "factura", cabecalho: "Corrige", esconderAte: "md", celula: (n) => n.correctedInvoiceNumber },
    { id: "cliente", cabecalho: "Cliente", esconderAte: "lg", celula: (n) => n.customerName, className: "max-w-[14rem] truncate" },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (n) => moeda(n.grossTotal, n.currency) },
    { id: "estado", cabecalho: "Estado", celula: (n) => <EstadoDocumento estado={n.status} /> },
  ];
  return (
    <>
      <PageHeader titulo="Notas de crédito" descricao="Correcções a facturas emitidas. Emitem-se a partir da factura." />
      <Tabela
        rotulo="Notas de crédito"
        colunas={colunas}
        linhas={notas.data?.items}
        chave={(n) => n.creditNoteId}
        aCarregar={notas.isPending}
        erro={notas.error ? <ErrorPanel erro={notas.error} tentarDeNovo={() => void notas.refetch()} /> : undefined}
        vazio="Ainda não há notas de crédito."
        rodape={notas.data && notas.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={notas.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}

export function FichaNotaCredito() {
  const { creditNoteId = "" } = useParams();
  const nota = useNota(creditNoteId);
  const anular = useAnularNota();
  const { pode } = useUtilizador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/notas-credito">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Notas de crédito
      </Link>
    </Button>
  );
  if (nota.isPending) return <CarregandoPagina />;
  if (nota.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={nota.error} tentarDeNovo={() => void nota.refetch()} />
      </>
    );
  }
  const n = nota.data;
  const emVigor = n.status === "Normal";
  return (
    <>
      {voltar}
      <PageHeader
        titulo={n.number}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoDocumento estado={n.status} />
            <span>
              Nota de crédito · {formatarData(n.issuedOn)} · corrige{" "}
              <Link to={`/facturas/${n.salesInvoiceId}`} className="underline-offset-4 hover:underline">
                {n.correctedInvoiceNumber}
              </Link>
            </span>
          </span>
        }
      />
      {n.cancelledAt ? (
        <Alert tom="erro" className="mb-6" titulo={`Anulada a ${formatarDataHora(n.cancelledAt)}.`}>
          {n.cancellationReason}
        </Alert>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-2">
        <DescarregarPdf tipo="nota" id={n.creditNoteId} numero={n.number} />
        {emVigor ? <EnviarPorEmail tipo="nota" id={n.creditNoteId} numero={n.number} /> : null}
        {emVigor && pode("finance.invoices.cancel") ? (
          <Anular
            numero={n.number}
            aCarregar={anular.isPending}
            erro={anular.error}
            aoAnular={(razao, fechar) => anular.mutate({ id: n.creditNoteId, reason: razao }, { onSuccess: () => { fechar(); void nota.refetch(); } })}
          />
        ) : null}
      </div>
      <Card>
        <CardTitle>
          {n.customerName} · NIF {n.customerTaxId}
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Motivo: {n.reason}</p>
        <div className="mt-3">
          <LinhasDocumento linhas={n.lines} moedaDoc={n.currency} />
        </div>
        <Totais
          linhas={[
            ["Líquido", moeda(n.netTotal, n.currency)],
            ["IVA", moeda(n.taxTotal, n.currency)],
            ["Total creditado", moeda(n.grossTotal, n.currency)],
          ]}
        />
        {n.fiscalNotice ? <p className="mt-3 text-xs text-muted-foreground">{n.fiscalNotice}</p> : null}
      </Card>
    </>
  );
}
