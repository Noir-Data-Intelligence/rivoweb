/**
 * Assistente de IA (§5.14, F13): leitura dos indicadores de um período,
 * previsão de receita e despesa e rascunhos de texto. Tudo por botão: nada se
 * pede ao abrir a página nem ao mudar um campo.
 */
import { Copy } from "lucide-react";
import { useId, useState } from "react";
import { moeda } from "@/features/facturacao";
import { formatarData, hojeIso } from "@/lib/format/data";
import { nomeMes } from "@/lib/format/periodo";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Badge, type TomBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useLeituraIa, usePrevisaoIa, useRascunhoIa, type TipoRascunho } from "../api";
import { AvisoCusto, IaDesligada, useIaLigada } from "../comum";

const MOEDAS = ["AOA", "USD", "EUR"] as const;
const AREAS: Readonly<Record<string, string>> = { finance: "Finanças", hr: "Recursos humanos", sales: "Vendas", general: "Geral" };
const GRAVIDADE: Readonly<Record<string, { texto: string; tom: TomBadge }>> = { info: { texto: "Informação", tom: "info" }, attention: { texto: "Atenção", tom: "aviso" }, critical: { texto: "Crítico", tom: "erro" } };
export const TIPOS_RASCUNHO: Readonly<Record<TipoRascunho, string>> = {
  proposal: "Proposta comercial",
  "proposal-template": "Modelo de proposta",
  "declaration-template": "Modelo de declaração",
  announcement: "Anúncio interno",
  email: "E-mail",
  "collection-message": "Mensagem de cobrança",
};
const mes = (aaaamm: string) => `${nomeMes(Number(aaaamm.slice(5, 7)))} ${aaaamm.slice(0, 4)}`;

function SelectMoeda({ valor, aoMudar }: { valor: string; aoMudar: (m: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Moeda
      </label>
      <Select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)}>
        {MOEDAS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </Select>
    </div>
  );
}

function LeituraDoPeriodo() {
  const hoje = hojeIso();
  const [v, setV] = useState({ de: `${hoje.slice(0, 4)}-01-01`, ate: hoje, moeda: "AOA" });
  const [tentou, setTentou] = useState(false);
  const pedido = useLeituraIa();
  const erro = v.de === "" || v.ate === "" ? "Indique as duas datas." : v.de > v.ate ? "O fim não pode ser antes do início." : undefined;
  const r = pedido.data;
  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(3,minmax(0,12rem))_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setTentou(true);
          if (erro || pedido.isPending) return;
          pedido.mutate({ from: v.de, to: v.ate, currency: v.moeda });
        }}
      >
        <Field rotulo="De">{({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={v.de} onChange={(e) => setV((x) => ({ ...x, de: e.target.value }))} />}</Field>
        <Field rotulo="Até" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.ate} onChange={(e) => setV((x) => ({ ...x, ate: e.target.value }))} />}
        </Field>
        <SelectMoeda valor={v.moeda} aoMudar={(m) => setV((x) => ({ ...x, moeda: m }))} />
        <Button type="submit" aCarregar={pedido.isPending}>
          Pedir a leitura
        </Button>
      </form>
      <AvisoCusto />
      {pedido.error ? <ErrorPanel erro={pedido.error} /> : null}
      {pedido.isPending ? <Skeleton className="h-40" /> : null}
      {r ? (
        <Card>
          <CardTitle>{`Leitura de ${formatarData(r.from)} a ${formatarData(r.to)}`}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Áreas lidas: {r.sections.map((s) => AREAS[s] ?? s).join(", ") || "—"} · {r.model}
          </p>
          <p className="mt-3 whitespace-pre-line break-words text-sm text-foreground">{r.summary}</p>
          <ul className="mt-4 flex flex-col gap-2" aria-label="Observações">
            {r.insights.map((o, k) => (
              <li key={k} className="rounded-md border border-border p-3 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tom={GRAVIDADE[o.severity]?.tom ?? "neutro"}>{GRAVIDADE[o.severity]?.texto ?? o.severity}</Badge>
                  <span className="text-xs text-muted-foreground">{AREAS[o.area] ?? o.area}</span>
                </div>
                <p className="break-words font-medium text-foreground">{o.title}</p>
                <p className="whitespace-pre-line break-words text-muted-foreground">{o.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function PrevisaoDeReceita() {
  const [v, setV] = useState({ meses: "3", moeda: "AOA" });
  const pedido = usePrevisaoIa();
  const idMeses = useId();
  const r = pedido.data;
  const linhas = r ? [...r.history.map((p) => ({ ...p, real: true })), ...r.forecast.map((p) => ({ ...p, real: false }))] : [];
  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(2,minmax(0,12rem))_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (pedido.isPending) return;
          pedido.mutate({ months: Number(v.meses), currency: v.moeda });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idMeses} className="text-sm font-medium text-foreground">
            Meses a prever
          </label>
          <Select id={idMeses} value={v.meses} onChange={(e) => setV((x) => ({ ...x, meses: e.target.value }))}>
            {Array.from({ length: 12 }, (_, k) => (
              <option key={k} value={String(k + 1)}>
                {k + 1}
              </option>
            ))}
          </Select>
        </div>
        <SelectMoeda valor={v.moeda} aoMudar={(m) => setV((x) => ({ ...x, moeda: m }))} />
        <Button type="submit" aCarregar={pedido.isPending}>
          Pedir a previsão
        </Button>
      </form>
      <AvisoCusto />
      {pedido.error ? <ErrorPanel erro={pedido.error} /> : null}
      {pedido.isPending ? <Skeleton className="h-40" /> : null}
      {r ? (
        <Card>
          <CardTitle>Previsão em {r.currency}</CardTitle>
          <Alert tom="info" className="my-3" titulo="Estimativa a partir dos últimos 12 meses reais: não entra em cálculos nem em relatórios." />
          <dl className="mb-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Método</dt>
            <dd className="break-words">{r.method}</dd>
            <dt className="text-muted-foreground">Pressupostos</dt>
            <dd className="whitespace-pre-line break-words">{r.assumptions}</dd>
            <dt className="text-muted-foreground">Confiança</dt>
            <dd className="break-words">{r.confidence}</dd>
            <dt className="text-muted-foreground">Modelo</dt>
            <dd>{r.model}</dd>
          </dl>
          <Tabela
            rotulo="Receita e despesa por mês"
            colunas={[
              { id: "mes", cabecalho: "Mês", celula: (p) => mes(p.month) },
              { id: "tipo", cabecalho: "", celula: (p) => (p.real ? <Badge>Real</Badge> : <Badge tom="info">Previsto</Badge>) },
              { id: "receita", cabecalho: "Receita", alinhar: "direita", celula: (p) => moeda(p.revenue, r.currency) },
              { id: "despesa", cabecalho: "Despesa", alinhar: "direita", celula: (p) => moeda(p.expenses, r.currency) },
            ]}
            linhas={linhas}
            chave={(p) => `${p.month}-${String(p.real)}`}
            aCarregar={false}
            vazio="Sem meses."
          />
        </Card>
      ) : null}
    </div>
  );
}

function RascunhoDeTexto() {
  const [v, setV] = useState<{ tipo: TipoRascunho; instrucoes: string; contexto: string }>({ tipo: "email", instrucoes: "", contexto: "" });
  const [tentou, setTentou] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const pedido = useRascunhoIa();
  const instr = normalizarTexto(v.instrucoes, true);
  const erros = {
    instrucoes: instr === "" ? "Diga o que pretende." : instr.length > 4000 ? "No máximo 4000 caracteres." : undefined,
    contexto: normalizarTexto(v.contexto, true).length > 20000 ? "No máximo 20 000 caracteres." : undefined,
  };
  const r = pedido.data;
  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTentou(true);
          if (erros.instrucoes || erros.contexto || pedido.isPending) return;
          setCopiado(false);
          const ctx = normalizarTexto(v.contexto, true);
          pedido.mutate({ kind: v.tipo, instructions: instr, context: ctx === "" ? null : ctx });
        }}
      >
        <Field rotulo="Tipo de texto" className="sm:max-w-xs">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value as TipoRascunho }))}>
              {Object.entries(TIPOS_RASCUNHO).map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field rotulo="O que pretende" erro={tentou ? erros.instrucoes : undefined}>
          {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={4000} aria-describedby={descricao} invalido={invalido} value={v.instrucoes} onChange={(e) => setV((x) => ({ ...x, instrucoes: e.target.value }))} />}
        </Field>
        <Field rotulo="Contexto (opcional)" ajuda="Dados que o texto deve usar. Não ponha palavras-passe nem dados que não possam sair da empresa." erro={tentou ? erros.contexto : undefined}>
          {({ id, descricao, invalido }) => <Textarea id={id} rows={4} maxLength={20000} aria-describedby={descricao} invalido={invalido} value={v.contexto} onChange={(e) => setV((x) => ({ ...x, contexto: e.target.value }))} />}
        </Field>
        <div>
          <Button type="submit" aCarregar={pedido.isPending}>
            Escrever o rascunho
          </Button>
        </div>
      </form>
      <AvisoCusto />
      {pedido.error ? <ErrorPanel erro={pedido.error} /> : null}
      {pedido.isPending ? <Skeleton className="h-40" /> : null}
      {r ? (
        <Card>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{TIPOS_RASCUNHO[r.kind as TipoRascunho] ?? r.kind}</CardTitle>
            <Button
              variante="secondary"
              tamanho="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(r.text).then(() => setCopiado(true));
              }}
            >
              <Copy strokeWidth={1.75} aria-hidden />
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Rascunho de {r.model}: reveja antes de enviar ou publicar.</p>
          <div className="whitespace-pre-line break-words rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground" aria-label="Rascunho">
            {r.text}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

type VistaIa = "leitura" | "previsao" | "rascunho";
const VISTAS: readonly Vista<VistaIa>[] = [
  { valor: "leitura", texto: "Leitura do período" },
  { valor: "previsao", texto: "Previsão de receita" },
  { valor: "rascunho", texto: "Rascunhos" },
];

export default function Assistente() {
  const vista = useVista(VISTAS);
  const ia = useIaLigada();
  return (
    <>
      <PageHeader titulo="Assistente de IA" descricao={ia.estado?.enabled ? `Com ${ia.estado.provider ?? "—"} (${ia.estado.model ?? "—"}). Usa só os dados a que a sua conta tem acesso.` : "Leituras, previsões e rascunhos a pedido."} />
      {ia.aCarregar ? (
        <Skeleton className="h-24" />
      ) : !ia.ligada ? (
        <IaDesligada />
      ) : (
        <>
          <Vistas rotulo="Assistente" vistas={VISTAS} actual={vista} />
          {vista === "previsao" ? <PrevisaoDeReceita /> : vista === "rascunho" ? <RascunhoDeTexto /> : <LeituraDoPeriodo />}
        </>
      )}
    </>
  );
}
