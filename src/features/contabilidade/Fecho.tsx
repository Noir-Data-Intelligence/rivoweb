/**
 * Fecho pelo PGC (ADR-094, ADR-095), só com `finance.ledger.close`:
 * - apuramento de resultados a 31/12 (período 13, diário APU) e abertura do
 *   exercício a 01/01 com os saldos do anterior (diário ABE);
 * - lançar o histórico: os documentos emitidos antes das regras, cada um na
 *   sua data e ao câmbio desse dia. Primeiro simula-se; repetir não duplica;
 * - actualização cambial dos depósitos em moeda estrangeira no fim do mês
 *   (ADR-103): a 43.2 ao câmbio do último dia, contra 66.2.2 ou 76.2.2;
 *   e das facturas de venda e de compra em aberto (ADR-105) e das despesas de
 *   colaborador por reembolsar (ADR-115), estornada no dia 1 do mês seguinte.
 * O pró-rata do IVA, a regularização de existências e a estimativa do imposto
 * industrial estão em `FechoAno.tsx`.
 */
import { useState } from "react";
import { Link } from "react-router";
import { hojeIso, formatarData } from "@/lib/format/data";
import { formatarInteiro, formatarMoeda, formatarNumeroDecimal } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useActualizacaoCambial, useExercicio, useLancarHistorico, type ActualizacaoCambial as ActualizacaoView, type Exercicio as ExercicioView } from "./api";
import { AvisosServidor } from "./FechoAno";
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

/** Leva ao cartão do fecho que o aviso pede (o diálogo fecha antes). */
function irPara(id: string, fechar: () => void) {
  fechar();
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}

function ResultadoExercicio({ r, fechar }: { r: ExercicioView; fechar: () => void }) {
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
      {/* Avisa sem recusar: falta a estimativa do imposto, a 87.1 não bate com ela, ou a actualização cambial de 31/12 deixaria diferenças (ADR-118, ADR-121). */}
      <AvisosServidor notas={r.notes} />
      {r.notes.some((n) => /imposto/i.test(n)) || r.notes.some((n) => /actualiza[çc][ãa]o cambial/i.test(n)) ? (
        <div className="flex flex-wrap gap-2">
          {r.notes.some((n) => /imposto/i.test(n)) ? (
            <Button variante="secondary" tamanho="sm" onClick={() => irPara("imposto-industrial", fechar)}>
              Ir para o imposto industrial
            </Button>
          ) : null}
          {r.notes.some((n) => /actualiza[çc][ãa]o cambial/i.test(n)) ? (
            <Button variante="secondary" tamanho="sm" onClick={() => irPara("actualizacao-cambial", fechar)}>
              Ir para a actualização cambial (Dezembro)
            </Button>
          ) : null}
        </div>
      ) : null}
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
        {r ? <ResultadoExercicio r={r} fechar={() => mudar(false)} /> : null}
      </Confirmar>
    </>
  );
}

export function FechoExercicio({ ano }: { ano: number }) {
  return (
    <Card className="mt-6">
      <CardTitle>Fecho do exercício de {ano}</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Pelo PGC, por esta ordem: a actualização cambial de Dezembro, o pró-rata do IVA (antes de apurar o IVA de Dezembro), a regularização de existências e a estimativa do imposto industrial; depois apura-se o exercício que acaba e abre-se o seguinte com os saldos dele. O apuramento avisa se faltar alguma coisa, sem recusar.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <AccaoExercicio ano={ano} acto="apurar" />
        <AccaoExercicio ano={ano} acto="abrir" />
      </div>
    </Card>
  );
}

type ContaActualizada = ActualizacaoView["accounts"][number];
type FacturaActualizada = ActualizacaoView["documents"][number];

/** De que lado é o documento em aberto: a despesa de colaborador por reembolsar (36.9) também se actualiza (ADR-115). */
export function documentoActualizado(f: Pick<FacturaActualizada, "kind" | "documentId">): { tipo: string; ligacao: string } {
  if (f.kind === "Payable") return { tipo: "Compra", ligacao: `/facturas-compra/${f.documentId}` };
  if (f.kind === "EmployeeExpense") return { tipo: "Despesa de colaborador", ligacao: `/despesas/${f.documentId}` };
  return { tipo: "Venda", ligacao: `/facturas/${f.documentId}` };
}

const rotuloResultado = (d: ReturnType<typeof dinheiro>, onde: string) => (d.lt(0) ? `Perda ${onde} (76.2.2)` : `Ganho ${onde} (66.2.2)`);

/** Simular e lançar a actualização cambial de um mês (Dezembro por omissão: antes de apurar o ano). */
export function ActualizacaoCambial({ ano }: { ano: number }) {
  const [mes, setMes] = useState(12);
  const [simulado, setSimulado] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const actualizar = useActualizacaoCambial();
  const r = actualizar.data;
  const mudarMes = (m: number) => {
    setMes(m);
    setSimulado(null);
    actualizar.reset();
  };
  const colunas: Coluna<ContaActualizada>[] = [
    { id: "conta", cabecalho: "Conta", celula: (c) => <span className="font-medium">{c.name}</span> },
    { id: "saldo", cabecalho: "Saldo", alinhar: "direita", celula: (c) => formatarMoeda(dinheiro(c.balance), c.currency) },
    { id: "cambio", cabecalho: "Câmbio", alinhar: "direita", esconderAte: "sm", celula: (c) => `${formatarNumeroDecimal(String(c.rate), 6)} (${formatarData(c.rateOn)})` },
    { id: "kz", cabecalho: "Em kwanzas", alinhar: "direita", celula: (c) => kz(c.kwanzas) },
  ];
  const colunasFacturas: Coluna<FacturaActualizada>[] = [
    {
      id: "factura",
      cabecalho: "Documento",
      celula: (f) => {
        const d = documentoActualizado(f);
        return (
          <span className="flex flex-col">
            <Link to={d.ligacao} className="font-medium text-primary underline-offset-4 hover:underline">
              {f.number}
            </Link>
            <span className="text-xs text-muted-foreground">{d.tipo}</span>
          </span>
        );
      },
    },
    { id: "parte", cabecalho: "Cliente, fornecedor ou colaborador", celula: (f) => f.party },
    { id: "aberto", cabecalho: "Em aberto", alinhar: "direita", celula: (f) => formatarMoeda(dinheiro(f.open), f.currency) },
    { id: "cambio", cabecalho: "Câmbio", alinhar: "direita", esconderAte: "md", celula: (f) => `${formatarNumeroDecimal(String(f.rate), 6)} (${formatarData(f.rateOn)})` },
    { id: "conta", cabecalho: "Conta", esconderAte: "md", celula: (f) => f.accountCode },
    { id: "registado", cabecalho: "Como lançou", alinhar: "direita", esconderAte: "sm", celula: (f) => kz(f.registered) },
    { id: "actualizado", cabecalho: "Ao câmbio", alinhar: "direita", celula: (f) => kz(f.revalued) },
    { id: "diferenca", cabecalho: "Diferença", alinhar: "direita", celula: (f) => kz(f.difference) },
  ];
  const diferenca = r ? dinheiro(r.difference) : null;
  const diferencaDividas = r ? dinheiro(r.debtsDifference) : null;
  return (
    <Card className="mt-6" id="actualizacao-cambial">
      <CardTitle>Actualização cambial</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        O dinheiro nas contas em moeda estrangeira (43.2), as facturas de venda e de compra em moeda estrangeira por receber ou por pagar e as despesas de colaborador em moeda estrangeira por reembolsar (36.9) entram ao câmbio de cada dia; no fim do mês valem ao câmbio desse dia. O ganho vai para 66.2.2 e a perda para 76.2.2. A actualização dos clientes, fornecedores e despesas estorna-se no dia 1 do mês seguinte. No fecho do ano, actualize Dezembro e regularize as existências antes de apurar os resultados.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field rotulo="Mês" className="w-48">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={mes} onChange={(e) => mudarMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} · {nomeMes(m)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="mb-0.5 flex flex-wrap gap-2">
          <Button variante="secondary" aCarregar={actualizar.isPending && actualizar.variables.dryRun} onClick={() => actualizar.mutate({ fiscalYear: ano, month: mes, dryRun: true }, { onSuccess: () => setSimulado(mes) })}>
            Simular {nomeMes(mes)} de {ano}
          </Button>
          <Button disabled={simulado !== mes || actualizar.isPending} onClick={() => setConfirmar(true)}>
            Lançar {nomeMes(mes)} de {ano}
          </Button>
        </div>
      </div>
      {actualizar.error && !confirmar ? <ErrorPanel erro={actualizar.error} className="mt-3" /> : null}
      {r && diferenca && diferencaDividas ? (
        <section aria-label="Resultado da actualização cambial" className="mt-4 flex flex-col gap-3">
          <Alert
            tom={r.outcome === "Revalued" ? "sucesso" : "info"}
            titulo={
              r.outcome === "Preview"
                ? `Simulação a ${formatarData(r.on)}: nada foi gravado.`
                : r.outcome === "Revalued"
                  ? `Actualização de ${nomeMes(Number(r.month))} de ${String(r.fiscalYear)} lançada.`
                  : "Nada a fazer: os depósitos, os clientes, os fornecedores e as despesas já valem o câmbio do fim do mês."
            }
          >
            {r.entryId || r.debtsEntryId || r.debtsReversalEntryId ? (
              <ul className="flex flex-col gap-1">
                {r.entryId ? (
                  <li>
                    <Link to={`/lancamentos/${r.entryId}`} className="text-primary underline-offset-4 hover:underline">
                      Ver o lançamento dos depósitos {r.transactionId ?? ""}
                    </Link>
                  </li>
                ) : null}
                {r.debtsEntryId ? (
                  <li>
                    <Link to={`/lancamentos/${r.debtsEntryId}`} className="text-primary underline-offset-4 hover:underline">
                      Ver o lançamento dos clientes, fornecedores e despesas
                    </Link>
                  </li>
                ) : null}
                {r.debtsReversalEntryId ? (
                  <li>
                    <Link to={`/lancamentos/${r.debtsReversalEntryId}`} className="text-primary underline-offset-4 hover:underline">
                      Ver o estorno no dia 1 do mês seguinte
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </Alert>
          {r.notes.length > 0 ? (
            <Alert tom="aviso" titulo={r.notes.length === 1 ? "Aviso do servidor" : "Avisos do servidor"}>
              <ul className="list-inside list-disc">
                {r.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <GrelhaKpis>
            <Kpi rotulo="43.2 no razão" valor={kz(r.ledgerBalance)} />
            <Kpi rotulo="Ao câmbio do fim do mês" valor={kz(r.revaluedBalance)} />
            <Kpi rotulo={rotuloResultado(diferenca, "nos depósitos")} valor={kz(diferenca.abs().toString())} />
            <Kpi rotulo={rotuloResultado(diferencaDividas, "nos clientes, fornecedores e despesas")} valor={kz(diferencaDividas.abs().toString())} detalhe="Estornado no dia 1 do mês seguinte." />
          </GrelhaKpis>
          <Tabela rotulo="Contas em moeda estrangeira" colunas={colunas} linhas={r.accounts} chave={(c) => c.accountId} vazio="Nenhuma conta em moeda estrangeira com saldo." />
          <Tabela rotulo="Documentos em moeda estrangeira em aberto" colunas={colunasFacturas} linhas={r.documents} chave={(f) => f.documentId} vazio="Nenhuma factura nem despesa por reembolsar em moeda estrangeira em aberto." />
        </section>
      ) : null}
      <Confirmar
        aberto={confirmar}
        aoMudar={setConfirmar}
        titulo={`Lançar a actualização cambial de ${nomeMes(mes)} de ${ano}`}
        descricao="Lança no razão no último dia do mês os depósitos e, à parte, os clientes, os fornecedores e as despesas por reembolsar, com o estorno no dia 1 do mês seguinte. Não se apaga: só se estorna."
        rotuloConfirmar="Lançar"
        aCarregar={actualizar.isPending}
        erro={actualizar.error ? <ErrorPanel erro={actualizar.error} /> : undefined}
        aoConfirmar={() => actualizar.mutate({ fiscalYear: ano, month: mes, dryRun: false }, { onSuccess: () => setConfirmar(false) })}
      />
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
        Os documentos emitidos antes das regras de lançamento (facturas, notas de crédito, recibos, facturas de compra e pagamentos) lançam como a emissão os teria lançado: cada um na sua data e ao câmbio desse dia (as notas de crédito em moeda estrangeira, ao câmbio da factura que corrigem). Os anulados não lançam, e repetir não duplica.
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
