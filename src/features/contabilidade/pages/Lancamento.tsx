/** Ficha de um lançamento (§5.7): cabeçalho, linhas e estorno com motivo. */
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { useTodosCentrosCusto } from "@/features/planeamento";
import { eApiError } from "@/lib/api/problem";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useEstornar, useLancamento, type LinhaLancamento } from "../api";
import { NOME_LADO, textoDe, TIPOS_LANCAMENTO } from "../comum";

export default function Lancamento() {
  const { entryId = "" } = useParams();
  const l = useLancamento(entryId);
  const estornar = useEstornar();
  const { pode } = useUtilizador();
  const centros = useTodosCentrosCusto(pode("finance.planning.read"));
  const nomeCentro = (id: string | null) => {
    if (!id) return "—";
    const c = centros.data?.items.find((x) => x.costCentreId === id);
    return c ? `${c.code} · ${c.name}` : "Centro de custo";
  };
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="mb-2 -ml-2">
      <Link to="/lancamentos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Lançamentos
      </Link>
    </Button>
  );
  if (l.isPending) return <Skeleton className="h-60" />;
  if (l.error)
    return (
      <>
        {voltar}
        {eApiError(l.error) && l.error.status === 404 ? <Alert tom="info" titulo="Este lançamento não existe." /> : <ErrorPanel erro={l.error} tentarDeNovo={() => void l.refetch()} />}
      </>
    );
  const e = l.data;
  const colunas: Coluna<LinhaLancamento>[] = [
    { id: "n", cabecalho: "N.º", celula: (x) => String(x.recordNumber) },
    { id: "conta", cabecalho: "Conta", celula: (x) => <span className="tabular-nums">{x.accountCode}</span> },
    { id: "descricao", cabecalho: "Descrição", esconderAte: "md", celula: (x) => x.description },
    { id: "centro", cabecalho: "Centro de custo", esconderAte: "lg", celula: (x) => nomeCentro(x.costCentreId) },
    { id: "debito", cabecalho: "Débito", alinhar: "direita", celula: (x) => (x.side === "Debit" ? formatarMoeda(dinheiro(x.amount)) : "") },
    { id: "credito", cabecalho: "Crédito", alinhar: "direita", celula: (x) => (x.side === "Credit" ? formatarMoeda(dinheiro(x.amount)) : "") },
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={`Lançamento ${e.journalCode} ${e.archivalNumber}`}
        descricao={e.description}
        accao={
          !e.isVoided ? (
            <Can requer="finance.ledger.write">
              <ConfirmarComMotivo
                rotuloBotao="Estornar"
                varianteBotao="secondary"
                titulo="Estornar este lançamento"
                descricao="O lançamento fica no razão marcado como estornado e deixa de contar nos saldos. Não se apaga."
                rotuloConfirmar="Estornar"
                aCarregar={estornar.isPending}
                erro={estornar.error ? <ErrorPanel erro={estornar.error} /> : undefined}
                aoConfirmar={(motivo, feito) => estornar.mutate({ entryId: e.entryId, reason: motivo }, { onSuccess: feito })}
              />
            </Can>
          ) : null
        }
      />
      {e.isVoided ? (
        <Alert tom="aviso" className="mb-4" titulo={`Estornado${e.voidedAt ? ` em ${formatarDataHora(e.voidedAt)}` : ""}.`}>
          {e.voidReason}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Data</dt>
            <dd>{formatarData(e.transactionDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Período</dt>
            <dd>{String(e.period)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tipo</dt>
            <dd>{textoDe(TIPOS_LANCAMENTO, e.type)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Transacção (SAF-T)</dt>
            <dd className="break-all tabular-nums">{e.transactionId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Lançado em</dt>
            <dd>{formatarDataHora(e.postedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>{e.isVoided ? <Badge tom="erro">Estornado</Badge> : <Badge tom="sucesso">Lançado</Badge>}</dd>
          </div>
        </dl>
      </Card>
      <Tabela
        rotulo="Linhas do lançamento"
        colunas={colunas}
        linhas={[...e.lines].sort((a, b) => Number(a.recordNumber) - Number(b.recordNumber))}
        chave={(x) => String(x.recordNumber)}
        vazio="Sem linhas."
        rodape={
          <div className="flex justify-end gap-6 text-sm font-medium tabular-nums">
            <span>
              {NOME_LADO.Debit}: {formatarMoeda(dinheiro(e.totalDebit))}
            </span>
            <span>
              {NOME_LADO.Credit}: {formatarMoeda(dinheiro(e.totalCredit))}
            </span>
          </div>
        }
      />
    </>
  );
}
