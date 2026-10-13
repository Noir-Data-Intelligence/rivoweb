import { ArrowLeft } from "lucide-react";
import { useId } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { IsoDate } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAnularRecibo, useRecibo, useRecibos, type Recibo } from "../api";
import { Anular, DescarregarPdf, EnviarPorEmail, EstadoDocumento, MEIOS, moeda } from "../comum";

export function ListaRecibos() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const idDe = useId();
  const idAte = useId();
  const data = (k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);
  const de = data("de");
  const ate = data("ate");
  const recibos = useRecibos({ pagina, tamanho, from: de, to: ate });
  const filtrar = (k: string, v: string) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      if (v) n.set(k, v);
      else n.delete(k);
      n.delete("pagina");
      return n;
    });
  const colunas: Coluna<Recibo>[] = [
    {
      id: "numero",
      cabecalho: "Número",
      celula: (r) => (
        <Link to={`/recibos/${r.receiptId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {r.number}
        </Link>
      ),
    },
    { id: "data", cabecalho: "Data", esconderAte: "sm", celula: (r) => formatarData(r.receivedOn) },
    { id: "cliente", cabecalho: "Cliente", esconderAte: "md", celula: (r) => r.customerName, className: "max-w-[14rem] truncate" },
    { id: "meio", cabecalho: "Meio", esconderAte: "lg", celula: (r) => MEIOS[r.method] ?? r.method },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (r) => moeda(r.total, r.currency) },
    { id: "estado", cabecalho: "Estado", celula: (r) => <EstadoDocumento estado={r.status} /> },
  ];
  return (
    <>
      <PageHeader titulo="Recibos" descricao="Recebimentos de facturas. Registam-se a partir da factura." />
      <div className="mb-4 grid gap-3 sm:max-w-md sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idDe} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={idDe} type="date" value={de ?? ""} onChange={(e) => filtrar("de", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate ?? ""} onChange={(e) => filtrar("ate", e.target.value)} />
        </div>
      </div>
      <Tabela
        rotulo="Recibos"
        colunas={colunas}
        linhas={recibos.data?.items}
        chave={(r) => r.receiptId}
        aCarregar={recibos.isPending}
        erro={recibos.error ? <ErrorPanel erro={recibos.error} tentarDeNovo={() => void recibos.refetch()} /> : undefined}
        vazio={de || ate ? "Nenhum recibo neste intervalo." : "Ainda não há recibos."}
        rodape={recibos.data && recibos.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={recibos.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}

export function FichaRecibo() {
  const { receiptId = "" } = useParams();
  const recibo = useRecibo(receiptId);
  const anular = useAnularRecibo();
  const { pode } = useUtilizador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/recibos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Recibos
      </Link>
    </Button>
  );
  if (recibo.isPending) return <CarregandoPagina />;
  if (recibo.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={recibo.error} tentarDeNovo={() => void recibo.refetch()} />
      </>
    );
  }
  const r = recibo.data;
  const emVigor = r.status === "Normal";
  return (
    <>
      {voltar}
      <PageHeader
        titulo={r.number}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoDocumento estado={r.status} />
            <span>
              Recibo · {formatarData(r.receivedOn)} · {MEIOS[r.method] ?? r.method}
            </span>
          </span>
        }
      />
      {r.cancelledAt ? (
        <Alert tom="erro" className="mb-6" titulo={`Anulado a ${formatarDataHora(r.cancelledAt)}.`}>
          {r.cancellationReason}
        </Alert>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-2">
        <DescarregarPdf tipo="recibo" id={r.receiptId} numero={r.number} />
        {emVigor ? <EnviarPorEmail tipo="recibo" id={r.receiptId} numero={r.number} /> : null}
        {emVigor && pode("finance.invoices.cancel") ? (
          <Anular
            numero={r.number}
            aCarregar={anular.isPending}
            erro={anular.error}
            aviso="O recibo fica anulado e o valor volta a ficar em aberto nas facturas. Fica no registo e não se pode desfazer."
            aoAnular={(razao, fechar) => anular.mutate({ id: r.receiptId, reason: razao }, { onSuccess: () => { fechar(); void recibo.refetch(); } })}
          />
        ) : null}
      </div>
      <Card>
        <CardTitle>
          {r.customerName} · NIF {r.customerTaxId}
        </CardTitle>
        <ul className="mt-3 divide-y divide-border text-sm" aria-label="Facturas liquidadas">
          {r.settlements.map((s) => (
            <li key={String(s.lineNumber)} className="flex items-center justify-between gap-3 py-2">
              <Link to={`/facturas/${s.salesInvoiceId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {s.invoiceNumber}
              </Link>
              <span className="tabular-nums">{moeda(s.amount, r.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right text-sm font-semibold tabular-nums">Total: {moeda(r.total, r.currency)}</p>
        {r.notes ? <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.notes}</p> : null}
        {r.fiscalNotice ? <p className="mt-3 text-xs text-muted-foreground">{r.fiscalNotice}</p> : null}
      </Card>
    </>
  );
}
