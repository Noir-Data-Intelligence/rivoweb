/**
 * Fecho pelo PGC (ADR-094, ADR-095), só com `finance.ledger.close`:
 * - apuramento de resultados a 31/12 (período 13, diário APU) e abertura do
 *   exercício a 01/01 com os saldos do anterior (diário ABE);
 * - lançar o histórico: os documentos emitidos antes das regras, cada um na
 *   sua data e ao câmbio desse dia. Primeiro simula-se; repetir não duplica.
 */
import { useState } from "react";
import { Link } from "react-router";
import { hojeIso, formatarData } from "@/lib/format/data";
import { formatarInteiro, formatarMoeda } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useExercicio, useLancarHistorico, type Exercicio as ExercicioView } from "./api";
import { janelaDoPeriodo, janelasDoAno, somarHistorico } from "./regras";

const kz = (v: number | string) => formatarMoeda(dinheiro(v));

const TIPOS_DOCUMENTO: Readonly<Record<string, string>> = {
  SalesInvoice: "Facturas",
  CreditNote: "Notas de crédito",
  Receipt: "Recibos",
  PurchaseInvoice: "Facturas de compra",
  Payment: "Pagamentos",
};

type LancamentoFeito = ExercicioView["entries"][number];

function ResultadoExercicio({ r }: { r: ExercicioView }) {
  const colunas: Coluna<LancamentoFeito>[] = [
    {
      id: "lancamento",
      cabecalho: "Lançamento",
      celula: (l) => (
        <Link to={`/lancamentos/${l.entryId}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {l.transactionId}
        </Link>
      ),
    },
    { id: "descricao", cabecalho: "Descrição", celula: (l) => l.description },
    { id: "linhas", cabecalho: "Linhas", alinhar: "direita", esconderAte: "sm", celula: (l) => formatarInteiro(Number(l.lines)) },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (l) => kz(l.total) },
  ];
  return (
    <div className="flex flex-col gap-3">
      <Alert tom={r.outcome === "Done" ? "sucesso" : "info"} titulo={r.outcome === "Done" ? "Feito." : "Nada a fazer: já estava feito."}>
        {r.message}
      </Alert>
      {r.netResult !== null ? <p className="text-sm">Resultado líquido do exercício: <span className="font-semibold tabular-nums">{kz(r.netResult)}</span></p> : null}
      {r.entries.length > 0 ? <Tabela rotulo="Lançamentos feitos" colunas={colunas} linhas={r.entries} chave={(l) => l.entryId} vazio="Nenhum lançamento." /> : null}
    </div>
  );
}

function AccaoExercicio({ ano, acto }: { ano: number; acto: "apurar" | "abrir" }) {
  const [aberto, setAberto] = useState(false);
  const exercicio = useExercicio();
  const r = exercicio.data;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) exercicio.reset();
  };
  const titulo = acto === "apurar" ? `Apurar os resultados de ${ano}` : `Abrir ${ano} com os saldos de ${ano - 1}`;
  return (
    <>
      <Button variante={acto === "apurar" ? "primary" : "secondary"} onClick={() => setAberto(true)}>
        {titulo}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo={Boolean(r)}
        titulo={titulo}
        descricao={
          acto === "apurar"
            ? `Lança a 31/12/${ano}, no período 13 e no diário APU, a transferência das classes 6 e 7 e do imposto (87) para as contas de resultados, e daí para o resultado líquido (88). Repetir não duplica.`
            : `Lança a 01/01/${ano}, no diário ABE, os saldos de fecho de ${ano - 1}; o resultado passa para «Resultados transitados». Exige ${ano - 1} apurado, e só se faz uma vez.`
        }
        rotuloConfirmar={r ? "Fechar" : acto === "apurar" ? "Apurar resultados" : "Abrir exercício"}
        aCarregar={exercicio.isPending}
        erro={exercicio.error ? <ErrorPanel erro={exercicio.error} /> : undefined}
        aoConfirmar={() => (r ? mudar(false) : exercicio.mutate({ ano, acto }))}
      >
        {r ? <ResultadoExercicio r={r} /> : null}
      </Confirmar>
    </>
  );
}

export function FechoExercicio({ ano }: { ano: number }) {
  return (
    <Card className="mt-6">
      <CardTitle>Fecho do exercício de {ano}</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Pelo PGC: primeiro apura-se o exercício que acaba, depois abre-se o seguinte com os saldos dele.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <AccaoExercicio ano={ano} acto="apurar" />
        <AccaoExercicio ano={ano} acto="abrir" />
      </div>
    </Card>
  );
}

type Problema = ReturnType<typeof somarHistorico>["problemas"][number];

export function LancarHistorico({ ano }: { ano: number }) {
  const hoje = hojeIso();
  // Um ano passado começa em Dezembro; o corrente, no mês de hoje.
  const [mes, setMes] = useState(ano < Number(hoje.slice(0, 4)) ? `${ano}-12` : hoje.slice(0, 7));
  const [anoInteiro, setAnoInteiro] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const lancar = useLancarHistorico();
  const janelas = anoInteiro ? janelasDoAno(ano, hoje) : /^\d{4}-\d{2}$/.test(mes) && mes <= hoje.slice(0, 7) ? [janelaDoPeriodo(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)))] : [];
  const chave = janelas.map((j) => j.de).join(",");
  const [simulado, setSimulado] = useState<string | null>(null);
  const feito = lancar.data ? somarHistorico(lancar.data) : null;
  const simulacao = lancar.variables?.simular ?? true;
  const quando = anoInteiro ? `o ano de ${ano}` : janelas[0] ? `${nomeMes(Number(mes.slice(5, 7)))} de ${mes.slice(0, 4)}` : "";
  const mudarEscolha = (f: () => void) => {
    f();
    lancar.reset();
    setSimulado(null);
  };
  const colunas: Coluna<Problema>[] = [
    { id: "documento", cabecalho: "Documento", celula: (p) => <span className="font-medium">{p.document}</span> },
    { id: "data", cabecalho: "Data", esconderAte: "sm", celula: (p) => formatarData(p.date) },
    { id: "erro", cabecalho: "Porque não lançou", celula: (p) => p.error },
  ];
  return (
    <Card className="mt-6">
      <CardTitle>Lançar o histórico</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Os documentos emitidos antes das regras de lançamento (facturas, notas de crédito, recibos, facturas de compra e pagamentos) lançam como a emissão os teria lançado: cada um na sua data e ao câmbio desse dia. Os anulados não lançam, e repetir não duplica.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field rotulo="Mês" className="w-48">
          {({ id, descricao }) => <Input id={id} type="month" max={hoje.slice(0, 7)} disabled={anoInteiro} aria-describedby={descricao} value={mes} onChange={(e) => mudarEscolha(() => setMes(e.target.value))} />}
        </Field>
        <div className="mb-2">
          <Checkbox rotulo={`O ano de ${ano} inteiro, mês a mês`} checked={anoInteiro} onChange={(e) => mudarEscolha(() => setAnoInteiro(e.target.checked))} />
        </div>
      </div>
      {janelas.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{anoInteiro ? `${ano} ainda não começou.` : "Escolha um mês até ao corrente."}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variante="secondary"
          disabled={janelas.length === 0}
          aCarregar={lancar.isPending && simulacao}
          onClick={() => lancar.mutate({ janelas, simular: true }, { onSuccess: () => setSimulado(chave) })}
        >
          Simular {quando}
        </Button>
        <Button disabled={simulado !== chave || janelas.length === 0 || lancar.isPending} onClick={() => setConfirmar(true)}>
          Lançar {quando}
        </Button>
      </div>
      {simulado !== chave ? <p className="mt-2 text-xs text-muted-foreground">Simule primeiro: mostra o que lançaria, sem gravar.</p> : null}
      {lancar.error && !confirmar ? <ErrorPanel erro={lancar.error} className="mt-3" /> : null}
      {feito ? (
        <section aria-label={simulacao ? "Resultado da simulação" : "Resultado do lançamento"} className="mt-4">
          <Alert tom={simulacao ? "info" : "sucesso"} className="mb-3" titulo={simulacao ? `Simulação de ${quando}: nada foi gravado.` : `Histórico de ${quando} lançado.`} />
          <GrelhaKpis>
            <Kpi rotulo={simulacao ? "Lançaria" : "Lançados"} valor={formatarInteiro(feito.lancados)} />
            <Kpi rotulo="Já lançados" valor={formatarInteiro(feito.jaLancados)} />
            <Kpi rotulo="Anulados" valor={formatarInteiro(feito.anulados)} detalhe="Não lançam." />
            <Kpi rotulo="Sem regra activa" valor={formatarInteiro(feito.semRegra)} />
          </GrelhaKpis>
          {Object.keys(feito.porTipo).length > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Por tipo:{" "}
              {Object.entries(feito.porTipo)
                .map(([k, n]) => `${TIPOS_DOCUMENTO[k] ?? k} ${formatarInteiro(n)}`)
                .join(" · ")}
            </p>
          ) : null}
          {feito.problemas.length > 0 ? (
            <div className="mt-4">
              <Tabela rotulo="Documentos que não lançaram" colunas={colunas} linhas={feito.problemas} chave={(p) => `${p.document}-${p.date}`} vazio="Nenhum problema." />
              <p className="mt-2 text-xs text-muted-foreground">Corrija a causa (por exemplo o câmbio do dia ou o período fechado) e volte a lançar: o que já lançou não se repete.</p>
            </div>
          ) : null}
        </section>
      ) : null}
      <Confirmar
        aberto={confirmar}
        aoMudar={setConfirmar}
        titulo={`Lançar o histórico de ${quando}`}
        descricao="Os lançamentos ficam no razão, nos períodos de cada documento. Não se apagam: só se estornam."
        rotuloConfirmar="Lançar"
        aCarregar={lancar.isPending}
        erro={lancar.error ? <ErrorPanel erro={lancar.error} /> : undefined}
        aoConfirmar={() => lancar.mutate({ janelas, simular: false }, { onSuccess: () => setConfirmar(false) })}
      />
    </Card>
  );
}
