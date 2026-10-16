/**
 * Impostos (§5.7): resumo do IVA, retenções na fonte feitas pelos clientes e o
 * ficheiro SAF-T AO de facturação, por mês ou por ano. Nada disto é a
 * declaração oficial: são somas do que está registado.
 */
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { formatarData } from "@/lib/format/data";
import { formatarInteiro, formatarMoeda, formatarNumeroDecimal } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas } from "@/ui/Vistas";
import { useDescarregarSaft, useResumoIva, useResumoRetencoes, type ResumoIva, type ResumoRetencoes } from "../api";
import { EscolhaAnoPeriodo, useAnoPeriodo } from "../comum";
import { janelaDoPeriodo } from "../regras";

const kz = (v: number | string, moeda = "AOA") => formatarMoeda(dinheiro(v), moeda);
const quando = (ano: number, mes: number | null) => (mes === null ? `ano de ${ano}` : `${nomeMes(mes)} de ${ano}`);

function Iva() {
  const { ano, periodo, mudar } = useAnoPeriodo();
  const { de, ate } = janelaDoPeriodo(ano, periodo);
  const r = useResumoIva(de, ate, null);
  type Linha = ResumoIva["output"][number];
  const colunas = (moeda: string): Coluna<Linha>[] => [
    { id: "codigo", cabecalho: "Código", celula: (l) => l.taxCode },
    { id: "taxa", cabecalho: "Taxa", alinhar: "direita", celula: (l) => `${formatarNumeroDecimal(String(l.taxPercentage), 2)} %` },
    { id: "base", cabecalho: "Base tributável", alinhar: "direita", celula: (l) => kz(l.taxableBase, moeda) },
    { id: "imposto", cabecalho: "IVA", alinhar: "direita", celula: (l) => kz(l.tax, moeda) },
    { id: "docs", cabecalho: "Documentos", alinhar: "direita", esconderAte: "sm", celula: (l) => formatarInteiro(Number(l.documents)) },
  ];
  return (
    <>
      <EscolhaAnoPeriodo ano={ano} periodo={periodo} mudar={mudar} />
      {r.isPending ? (
        <Skeleton className="h-40" />
      ) : r.error ? (
        <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} />
      ) : (
        <>
          <Alert tom="info" className="mb-4" titulo="Não é a declaração oficial.">
            {r.data.note}
          </Alert>
          <p className="mb-3 text-sm text-muted-foreground">
            De {formatarData(r.data.from)} a {formatarData(r.data.to)}, em {r.data.currency}.
          </p>
          <GrelhaKpis>
            <Kpi rotulo="IVA liquidado" valor={kz(r.data.outputTax, r.data.currency)} detalhe="Nas facturas emitidas." />
            <Kpi rotulo="IVA regularizado" valor={kz(r.data.creditNoteTax, r.data.currency)} detalhe="Nas notas de crédito." />
            <Kpi rotulo="IVA dedutível" valor={kz(r.data.inputTax, r.data.currency)} detalhe={`Em ${formatarInteiro(Number(r.data.purchaseInvoices))} facturas de compra.`} />
            <Kpi
              rotulo={dinheiro(r.data.netPosition).lt(0) ? "IVA a recuperar" : "IVA a entregar"}
              valor={kz(dinheiro(r.data.netPosition).abs().toString(), r.data.currency)}
              detalhe="Liquidado − regularizado − dedutível."
            />
          </GrelhaKpis>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle>Liquidado por taxa</CardTitle>
              <div className="mt-3">
                <Tabela rotulo="IVA liquidado por taxa" colunas={colunas(r.data.currency)} linhas={r.data.output} chave={(l) => `${l.taxCode}-${l.taxPercentage}`} vazio={`Nenhuma factura no ${quando(ano, periodo)}.`} />
              </div>
            </Card>
            <Card>
              <CardTitle>Regularizado por taxa</CardTitle>
              <div className="mt-3">
                <Tabela rotulo="IVA regularizado por taxa" colunas={colunas(r.data.currency)} linhas={r.data.creditNotes} chave={(l) => `${l.taxCode}-${l.taxPercentage}`} vazio={`Nenhuma nota de crédito no ${quando(ano, periodo)}.`} />
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

function Retencoes() {
  const { ano, periodo, mudar } = useAnoPeriodo();
  const { de, ate } = janelaDoPeriodo(ano, periodo);
  const r = useResumoRetencoes(de, ate, null);
  type Linha = ResumoRetencoes["lines"][number];
  const moeda = r.data?.currency ?? "AOA";
  const colunas: Coluna<Linha>[] = [
    { id: "cliente", cabecalho: "Cliente", celula: (l) => l.customerName, ordenar: (l) => l.customerName },
    { id: "nif", cabecalho: "NIF", esconderAte: "sm", celula: (l) => <span className="tabular-nums">{l.customerTaxId}</span> },
    { id: "facturas", cabecalho: "Facturas", alinhar: "direita", esconderAte: "md", celula: (l) => formatarInteiro(Number(l.invoices)) },
    { id: "base", cabecalho: "Base", alinhar: "direita", esconderAte: "md", celula: (l) => kz(l.taxableBase, moeda) },
    { id: "retido", cabecalho: "Retido", alinhar: "direita", celula: (l) => kz(l.withheld, moeda), ordenar: (l) => Number(l.withheld) },
  ];
  return (
    <>
      <EscolhaAnoPeriodo ano={ano} periodo={periodo} mudar={mudar} />
      {r.data ? (
        <GrelhaKpis>
          <Kpi rotulo="Total retido pelos clientes" valor={kz(r.data.totalWithheld, moeda)} detalhe={`De ${formatarData(r.data.from)} a ${formatarData(r.data.to)}.`} />
        </GrelhaKpis>
      ) : null}
      <div className="mt-4">
        <Tabela
          rotulo={`Retenções na fonte no ${quando(ano, periodo)}`}
          colunas={colunas}
          linhas={r.data?.lines}
          chave={(l) => l.customerId ?? l.customerTaxId}
          aCarregar={r.isPending}
          erro={r.error ? <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} /> : undefined}
          vazio={`Nenhum cliente reteve imposto no ${quando(ano, periodo)}.`}
          ordenavel
        />
      </div>
    </>
  );
}

function Saft() {
  const { ano, periodo, mudar } = useAnoPeriodo();
  const { de, ate } = janelaDoPeriodo(ano, periodo);
  const descarregar = useDescarregarSaft();
  return (
    <>
      <EscolhaAnoPeriodo ano={ano} periodo={periodo} mudar={(c, v) => (descarregar.reset(), mudar(c, v))} />
      <Card>
        <CardTitle>SAF-T AO de facturação</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Facturas, notas de crédito e de débito, pró-formas e recibos de {formatarData(de)} a {formatarData(ate)}, no formato da AGT (TaxAccountingBasis F).
        </p>
        <Alert tom="aviso" className="mt-3" titulo="A Rivo não é software certificado pela AGT.">
          O ficheiro sai com Hash e HashControl a zero. Serve para conferir e para o contabilista; não substitui o ficheiro de um programa certificado.
        </Alert>
        {descarregar.error ? <ErrorPanel erro={descarregar.error} className="mt-3" /> : null}
        <Button className="mt-4" aCarregar={descarregar.isPending} onClick={() => descarregar.mutate({ de, ate })}>
          <Download strokeWidth={1.75} aria-hidden />
          Descarregar SAF-T ({quando(ano, periodo)})
        </Button>
      </Card>
    </>
  );
}

const VISTAS = [
  { valor: "iva", texto: "IVA" },
  { valor: "retencoes", texto: "Retenções na fonte" },
  { valor: "saft", texto: "SAF-T" },
] as const;

export default function Impostos() {
  const vista = useVista(VISTAS);
  const conteudo: Record<(typeof VISTAS)[number]["valor"], ReactNode> = { iva: <Iva />, retencoes: <Retencoes />, saft: <Saft /> };
  return (
    <>
      <PageHeader titulo="Impostos" descricao="Resumo do IVA, retenções na fonte e ficheiro SAF-T, por mês ou por ano." />
      <Vistas rotulo="Impostos" vistas={VISTAS} actual={vista} />
      {vista ? conteudo[vista] : null}
    </>
  );
}
