/**
 * Uma proposta: o texto, as linhas e o total; no rascunho, corrigir,
 * acrescentar e tirar linhas e enviar; enviada, registar a decisão do cliente
 * (aceite ou recusada, com notas). PDF a pedido e as versões guardadas em cada
 * correcção e envio.
 */
import Big from "big.js";
import { ArrowLeft, Download } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { lerDecimalDigitado, lerDinheiroDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useTiposServico } from "../api";
import { EstadoPropostaBadge, NomeCliente } from "../comum";
import { CamposDaProposta, camposDaProposta } from "../FormularioProposta";
import {
  errosLinha,
  errosProposta,
  linhaParaApi,
  propostaParaApi,
  totalLinha,
  useAcaoProposta,
  useAcrescentarLinha,
  useDescarregarProposta,
  useGuardarProposta,
  useProposta,
  useTirarLinha,
  useVersoes,
  type CamposLinha,
  type LinhaProposta,
  type Proposta as TipoProposta,
} from "../propostas";
import { temErros } from "../regras";

/** «1,5» · «12» — quantidade sem zeros à direita. */
const qtd = (v: number | string) => {
  const t = new Big(String(v)).toString();
  const casas = t.includes(".") ? (t.split(".")[1]?.length ?? 0) : 0;
  return formatarNumeroDecimal(t, casas);
};

function Corrigir({ p }: { p: TipoProposta }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => camposDaProposta(p));
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarProposta();
  const idForm = useId();
  const erros = errosProposta(v, false, hojeIso());
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(camposDaProposta(p));
    else {
      setTentou(false);
      guardar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => fechar(true)}>
        Corrigir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Corrigir ${p.number}`}
        descricao="Fica guardada uma versão com o que estava."
        rotuloConfirmar="Guardar"
        aCarregar={guardar.isPending}
        erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
        formulario={idForm}
        largo
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: p.proposalId, corpo: propostaParaApi(v, p) }, { onSuccess: () => fechar(false) });
          }}
        >
          <CamposDaProposta v={v} setV={setV} erros={tentou ? erros : {}} nova={false} />
        </form>
      </Confirmar>
    </>
  );
}

const LINHA_VAZIA: CamposLinha = { servico: "", descricao: "", quantidade: "1", preco: "", desconto: "" };

function AcrescentarLinha({ p }: { p: TipoProposta }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(LINHA_VAZIA);
  const [tentou, setTentou] = useState(false);
  const acrescentar = useAcrescentarLinha(p.proposalId);
  const servicos = useTiposServico(false, aberto);
  const idForm = useId();
  const erros = errosLinha(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(LINHA_VAZIA);
      setTentou(false);
      acrescentar.reset();
    }
  };
  // Só os serviços na moeda da proposta: o servidor copia o preço sem converter.
  const daMoeda = (servicos.data ?? []).filter((s) => s.currency === p.currency);
  const escolhido = daMoeda.find((s) => s.serviceTypeId === v.servico);
  const q = lerDecimalDigitado(v.quantidade, 4);
  const preco = v.preco.trim() === "" ? (escolhido ? new Big(String(escolhido.unitPrice)) : null) : lerDinheiroDigitado(v.preco);
  const d = v.desconto.trim() === "" ? new Big(0) : lerDecimalDigitado(v.desconto, 2);
  const previsto = q && preco && d && !temErros(erros) ? totalLinha(q, preco, d) : null;
  const campo = (k: keyof CamposLinha) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)}>
        Acrescentar linha
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Linha · ${p.number}`} rotuloConfirmar="Acrescentar" aCarregar={acrescentar.isPending} erro={acrescentar.error ? <ErrorPanel erro={acrescentar.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || acrescentar.isPending) return;
            acrescentar.mutate(linhaParaApi(v), { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Serviço (opcional)" ajuda={`Só os do catálogo em ${p.currency}. Vazios a descrição e o preço, ficam os do serviço.`} className="sm:col-span-3">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.servico} onChange={campo("servico")}>
                <option value="">Nenhum (linha livre)</option>
                {daMoeda.map((s) => (
                  <option key={s.serviceTypeId} value={s.serviceTypeId}>
                    {s.code} · {s.name} · {moeda(s.unitPrice, s.currency)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo={escolhido ? "Descrição (vazia, a do serviço)" : "Descrição"} erro={tentou ? erros.descricao : undefined} className="sm:col-span-3">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" placeholder={escolhido?.name} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={campo("descricao")} />}
          </Field>
          <Field rotulo="Quantidade" erro={tentou ? erros.quantidade : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.quantidade} onChange={campo("quantidade")} />}
          </Field>
          <Field rotulo={`Preço unitário em ${p.currency}`} erro={tentou ? erros.preco : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" placeholder={escolhido ? String(escolhido.unitPrice).replace(".", ",") : undefined} aria-describedby={descricao} invalido={invalido} value={v.preco} onChange={campo("preco")} />}
          </Field>
          <Field rotulo="Desconto (%)" erro={tentou ? erros.desconto : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.desconto} onChange={campo("desconto")} />}
          </Field>
          <p className="text-sm text-muted-foreground sm:col-span-3" aria-live="polite">
            {previsto ? `Total da linha: ${moeda(previsto.toFixed(2), p.currency)}` : "\u00A0"}
          </p>
        </form>
      </Confirmar>
    </>
  );
}

function TirarLinha({ p, l }: { p: TipoProposta; l: LinhaProposta }) {
  const tirar = useTirarLinha(p.proposalId);
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={tirar.isPending} onClick={() => tirar.mutate(l.lineId)} aria-label={`Tirar a linha ${l.description}`}>
        Tirar
      </Button>
      {tirar.error ? <ErrorPanel erro={tirar.error} /> : null}
    </span>
  );
}

function Enviar({ p }: { p: TipoProposta }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoProposta(p.proposalId);
  return (
    <>
      <Button onClick={() => setAberto(true)} disabled={p.lines.length === 0}>
        Marcar como enviada
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo={`Enviar ${p.number}?`}
        descricao={`Fica registada como enviada ao cliente, com o total de ${moeda(p.total, p.currency)}, e deixa de se corrigir. Guarda-se uma versão do que foi enviado. Envie o PDF ao cliente pelo meio habitual.`}
        rotuloConfirmar="Enviada"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ accao: "enviar" }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Decidir({ p, aceite }: { p: TipoProposta; aceite: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [notas, setNotas] = useState("");
  const accao = useAcaoProposta(p.proposalId);
  const n = normalizarTexto(notas, true);
  const erro = n.length > 2000 ? "No máximo 2000 caracteres." : undefined;
  return (
    <>
      <Button variante={aceite ? "primary" : "secondary"} onClick={() => setAberto(true)}>
        {aceite ? "Cliente aceitou" : "Cliente recusou"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            accao.reset();
            setNotas("");
          }
        }}
        titulo={aceite ? `${p.number} aceite?` : `${p.number} recusada?`}
        descricao="A decisão fica registada e a proposta deixa de mudar."
        rotuloConfirmar={aceite ? "Aceite" : "Recusada"}
        variante={aceite ? "primary" : "destructive"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (erro || accao.isPending ? undefined : accao.mutate({ accao: aceite ? "aceitar" : "recusar", notas: n === "" ? null : n }, { onSuccess: () => setAberto(false) }))}
      >
        <Field rotulo="Notas (opcional)" erro={erro}>
          {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={notas} onChange={(e) => setNotas(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function Pdf({ p }: { p: TipoProposta }) {
  const d = useDescarregarProposta();
  return (
    <span className="inline-flex flex-col">
      <Button variante="secondary" aCarregar={d.isPending} onClick={() => d.mutate(p)}>
        <Download strokeWidth={1.75} aria-hidden />
        PDF
      </Button>
      {d.error ? <ErrorPanel erro={d.error} /> : null}
    </span>
  );
}

type Foto = { title?: unknown; total?: unknown; lines?: unknown };
const RAZOES: Record<string, string> = { revised: "Correcção", sent: "Envio" };

function Versoes({ p }: { p: TipoProposta }) {
  const versoes = useVersoes(p.proposalId);
  return (
    <Card>
      <CardTitle>Versões</CardTitle>
      {versoes.isPending ? (
        <Skeleton className="mt-3 h-12" />
      ) : versoes.error ? (
        <ErrorPanel erro={versoes.error} tentarDeNovo={() => void versoes.refetch()} className="mt-3" />
      ) : versoes.data.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Guarda-se uma versão em cada correcção e em cada envio.</p>
      ) : (
        <ol className="mt-2 divide-y divide-border text-sm" aria-label="Versões da proposta">
          {[...versoes.data]
            .sort((a, b) => Number(b.number) - Number(a.number))
            .map((v) => {
              const foto = (typeof v.snapshot === "object" && v.snapshot !== null ? v.snapshot : {}) as Foto;
              const linhas = Array.isArray(foto.lines) ? (foto.lines as { description?: unknown; total?: unknown }[]) : [];
              return (
                <li key={v.versionId} className="py-2">
                  <details>
                    <summary className="cursor-pointer text-foreground">
                      Versão {String(v.number)} · {RAZOES[v.reason] ?? v.reason} · {formatarDataHora(v.createdAt)} · {moeda(v.total, p.currency)}
                    </summary>
                    <div className="mt-2 text-muted-foreground">
                      {typeof foto.title === "string" ? <p className="font-medium text-foreground">{foto.title}</p> : null}
                      <ul className="mt-1 list-disc pl-5">
                        {linhas.map((l, i) => (
                          <li key={i}>
                            {typeof l.description === "string" ? l.description : "—"}
                            {typeof l.total === "number" || typeof l.total === "string" ? ` · ${moeda(l.total, p.currency)}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </li>
              );
            })}
        </ol>
      )}
    </Card>
  );
}

export default function Proposta() {
  const { proposalId = "" } = useParams();
  const proposta = useProposta(proposalId);
  const { pode } = useUtilizador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/propostas">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Propostas
      </Link>
    </Button>
  );
  if (proposta.isPending) return <CarregandoPagina />;
  if (proposta.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={proposta.error} tentarDeNovo={() => void proposta.refetch()} />
      </>
    );
  }
  const p = proposta.data;
  const escreve = pode("commercial.crm.write");
  const rascunho = p.status === "Draft";
  const linha = (r: string, v: ReactNode) => (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{r}</dt>
      <dd className="break-words text-base text-foreground">{v ?? "—"}</dd>
    </div>
  );
  const colunas: Coluna<LinhaProposta>[] = [
    { id: "pos", cabecalho: "#", esconderAte: "sm", celula: (l) => String(l.position) },
    { id: "desc", cabecalho: "Descrição", className: "max-w-[20rem] whitespace-normal break-words", celula: (l) => l.description },
    { id: "q", cabecalho: "Qtd.", alinhar: "direita", celula: (l) => qtd(l.quantity) },
    { id: "p", cabecalho: "Preço", alinhar: "direita", esconderAte: "md", celula: (l) => moeda(l.unitPrice, p.currency) },
    { id: "d", cabecalho: "Desc.", alinhar: "direita", esconderAte: "md", celula: (l) => (Number(l.discountPercent) > 0 ? `${qtd(l.discountPercent)}%` : "—") },
    { id: "t", cabecalho: "Total", alinhar: "direita", celula: (l) => moeda(l.total, p.currency) },
    ...(escreve && rascunho ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (l: LinhaProposta) => <TirarLinha p={p} l={l} /> }] : []),
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={p.title}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoPropostaBadge estado={p.status} />
            <span>
              {p.number} · criada {formatarDataHora(p.createdAt)}
              {p.sentAt ? ` · enviada ${formatarDataHora(p.sentAt)}` : ""}
              {p.decidedAt ? ` · decidida ${formatarDataHora(p.decidedAt)}` : ""}
            </span>
          </span>
        }
      />
      <div className="mb-6 flex flex-wrap items-start gap-2">
        <Pdf p={p} />
        {escreve && rascunho ? (
          <>
            <Corrigir p={p} />
            <Enviar p={p} />
          </>
        ) : null}
        {escreve && p.status === "Sent" ? (
          <>
            <Decidir p={p} aceite />
            <Decidir p={p} aceite={false} />
          </>
        ) : null}
      </div>
      {escreve && rascunho && p.lines.length === 0 ? <Alert tom="info" className="mb-6" titulo="Uma proposta sem linhas não se envia: acrescente pelo menos uma." /> : null}
      {p.decisionNotes ? <Alert tom={p.status === "Accepted" ? "sucesso" : "erro"} className="mb-6" titulo={p.status === "Accepted" ? "Aceite pelo cliente." : "Recusada pelo cliente."}>{p.decisionNotes}</Alert> : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Linhas</CardTitle>
              {escreve && rascunho ? <AcrescentarLinha p={p} /> : null}
            </div>
            <Tabela rotulo="Linhas da proposta" colunas={colunas} linhas={p.lines} chave={(l) => l.lineId} aCarregar={false} vazio="Sem linhas." />
            <p className="mt-3 text-right text-base font-semibold tabular-nums">Total: {moeda(p.total, p.currency)}</p>
          </Card>
          {p.body ? (
            <Card>
              <CardTitle>Texto</CardTitle>
              <p className="mt-2 whitespace-pre-line break-words text-foreground">{p.body}</p>
            </Card>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <dl className="grid gap-3">
              {linha("Para", p.customerId ? <NomeCliente id={p.customerId} nome={p.customerName ?? null} /> : p.leadId ? <Link to={`/leads/${p.leadId}`} className="underline-offset-4 hover:underline">{p.leadName ?? "Abrir o lead"}</Link> : "—")}
              {linha("Oportunidade", p.opportunityId ? <Link to={`/oportunidades/${p.opportunityId}`} className="underline-offset-4 hover:underline">Abrir a oportunidade</Link> : "—")}
              {linha("Moeda", p.currency)}
              {linha("Válida até", p.validUntil ? formatarData(p.validUntil) : "—")}
              {p.notes ? linha("Notas", <span className="whitespace-pre-line">{p.notes}</span>) : null}
            </dl>
          </Card>
          <Versoes p={p} />
        </div>
      </div>
    </>
  );
}
