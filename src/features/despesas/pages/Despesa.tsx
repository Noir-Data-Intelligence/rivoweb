/** Ficha de uma despesa (§5.6): aprovar, rejeitar (com motivo), reembolsar. */
import { ArrowLeft, Check, Download, Wallet, X } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { useMeuPainel } from "@/features/dashboard";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { useContasAbertas } from "@/features/tesouraria";
import { descarregar } from "@/lib/api/download";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { IsoDate } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useContasRazao } from "@/features/contabilidade";
import { eApiError } from "@/lib/api/problem";
import { normalizarTexto } from "@/lib/validation/text";
import { Textarea } from "@/ui/Controlos";
import { useDecidirDespesa, useDespesa, useReembolsar, type Despesa as TipoDespesa } from "../api";
import { EstadoDespesa } from "../comum";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{rotulo}</dt>
      <dd className="break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Reembolsar({ d }: { d: TipoDespesa }) {
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const contas = useContasAbertas(aberto && pode("finance.payables.read"));
  const reembolsar = useReembolsar(d.expenseId);
  const [data, setData] = useState(hojeIso());
  const [conta, setConta] = useState("");
  const [referencia, setReferencia] = useState("");
  const idForm = useId();
  const dataInvalida = !IsoDate.safeParse(data).success || data > hojeIso();
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) reembolsar.reset();
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Wallet strokeWidth={1.75} aria-hidden />
        Marcar reembolsada
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Reembolsar ${moeda(d.amount, d.currency)} a ${d.employeeName}?`}
        descricao="Regista que o colaborador foi reembolsado. Com a conta, o valor sai dela nessa data (fica no extracto) e lança no razão; sem conta, só fica registado."
        rotuloConfirmar="Marcar reembolsada"
        aCarregar={reembolsar.isPending}
        erro={reembolsar.error ? <ErrorPanel erro={reembolsar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (dataInvalida || reembolsar.isPending) return;
            reembolsar.mutate({ on: data, fromAccountId: conta === "" ? null : conta, reference: referencia.trim() === "" ? null : referencia.trim() }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Data do reembolso" erro={dataInvalida ? "Indique uma data até hoje." : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
          {pode("finance.payables.read") ? (
            <Field rotulo="Conta de onde saiu (opcional)" ajuda={`Só contas abertas em ${d.currency}. Sem conta, o dinheiro não sai de nenhuma.`}>
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} aria-busy={contas.isPending || undefined} value={conta} onChange={(e) => setConta(e.target.value)}>
                  <option value="">Não indicar</option>
                  {(contas.data?.items ?? [])
                    .filter((c) => c.currency === d.currency)
                    .map((c) => (
                      <option key={c.accountId} value={c.accountId}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field rotulo="Referência (opcional)">
            {({ id, descricao }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} value={referencia} onChange={(e) => setReferencia(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/**
 * A conta do custo que quem aprova pode indicar (ADR-119): de movimento, da
 * classe 7, sem a 71, a 73, as de transferência (x.9), a 72.1 e a 72.2 (as
 * remunerações vão pela folha). O servidor confirma e diz a subconta certa.
 */
const eContaDoCusto = (c: string) => /^7/.test(c) && !/^7[13](\.|$)/.test(c) && !/^7\d?\.9(\.|$)/.test(c) && !/^72\.[12](\.|$)/.test(c);

function AprovarDespesa({ id }: { id: string }) {
  const { pode } = useUtilizador();
  const decidir = useDecidirDespesa(id);
  const [aberto, setAberto] = useState(false);
  const [notas, setNotas] = useState("");
  const [conta, setConta] = useState("");
  const [tentou, setTentou] = useState(false);
  const contas = useContasRazao(false, aberto && pode("finance.ledger.read"));
  const sugestoes = (contas.data ?? []).filter((c) => c.isActive && c.acceptsPostings && !c.isAnalytic && eContaDoCusto(c.code));
  const idContas = useId();
  const idForm = useId();
  const codigo = conta.trim();
  const erroConta = codigo !== "" && !/^\d+(\.\d+)*$/.test(codigo) ? "Código de conta do PGC, por exemplo 72.7.2." : undefined;
  // O 400 diz porque a conta não serve (e qual é a subconta certa): fica junto ao campo, e o diálogo não fecha.
  const recusa = decidir.error && eApiError(decidir.error) && decidir.error.status === 400 ? (decidir.error.errors["pedido"] ?? []).join(" ") || decidir.error.detail : null;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      decidir.reset();
      setNotas("");
      setConta("");
      setTentou(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Check strokeWidth={1.75} aria-hidden />
        Aprovar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Aprovar esta despesa?"
        descricao="Fica aprovada para reembolso e lança no razão contra a 36.9. O colaborador vê a decisão no portal."
        rotuloConfirmar="Aprovar"
        aCarregar={decidir.isPending}
        erro={decidir.error && !recusa ? <ErrorPanel erro={decidir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroConta || decidir.isPending) return;
            const n = normalizarTexto(notas);
            decidir.mutate({ aprovar: true, notas: n === "" ? null : n, conta: codigo === "" ? null : codigo }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field
            rotulo="Conta do custo (PGC, opcional)"
            erro={(tentou ? erroConta : undefined) ?? recusa ?? undefined}
            ajuda="Vazio: 75.2.39 Outros serviços. Formação, seguros e outras despesas com o pessoal: 72.x.1 para órgãos sociais, 72.x.2 para o pessoal. Alojamento e alimentação em deslocação: 75.2.23."
          >
            {({ id: idCampo, descricao, invalido }) => (
              <>
                <Input id={idCampo} maxLength={30} autoComplete="off" inputMode="decimal" list={sugestoes.length > 0 ? idContas : undefined} aria-describedby={descricao} invalido={invalido} value={conta} onChange={(e) => setConta(e.target.value)} />
                {sugestoes.length > 0 ? (
                  <datalist id={idContas}>
                    {sugestoes.map((c) => (
                      <option key={c.accountId} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </datalist>
                ) : null}
              </>
            )}
          </Field>
          <Field rotulo="Notas (opcional)">
            {({ id: idCampo, descricao }) => <Textarea id={idCampo} rows={2} maxLength={500} aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Despesa() {
  const { expenseId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useDespesa(expenseId);
  const eu = useMeuPainel().data?.employeeId ?? null;
  const decidir = useDecidirDespesa(expenseId);
  const [erroDescarga, setErroDescarga] = useState<unknown>(null);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/despesas">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Despesas
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
  const d = q.data;
  const minha = eu !== null && eu === d.employeeId;
  const porDecidir = d.status === "Submitted";
  const podeDecidir = porDecidir && pode("finance.expenses.approve") && !minha;
  return (
    <>
      {voltar}
      <PageHeader
        titulo={d.description}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoDespesa estado={d.status} />
            <span>
              {moeda(d.amount, d.currency)} · {d.employeeName}
            </span>
          </span>
        }
        accao={
          podeDecidir || (d.status === "Approved" && pode("finance.expenses.write")) ? (
            <div className="flex flex-wrap gap-2">
              {podeDecidir ? (
                <>
                  <AprovarDespesa id={expenseId} />
                  <ConfirmarComMotivo
                    rotuloBotao="Rejeitar"
                    icone={<X strokeWidth={1.75} aria-hidden />}
                    titulo="Rejeitar esta despesa?"
                    descricao="O colaborador vê o motivo no portal. Não se pode desfazer."
                    rotuloConfirmar="Rejeitar"
                    ajuda="O colaborador lê-o."
                    falta="Indique o motivo da rejeição."
                    maximo={500}
                    aCarregar={decidir.isPending}
                    erro={decidir.error ? <ErrorPanel erro={decidir.error} /> : undefined}
                    aoConfirmar={(notas, fechar) => decidir.mutate({ aprovar: false, notas }, { onSuccess: fechar })}
                  />
                </>
              ) : null}
              {d.status === "Approved" && pode("finance.expenses.write") ? <Reembolsar d={d} /> : null}
            </div>
          ) : undefined
        }
      />
      {porDecidir && minha && pode("finance.expenses.approve") ? (
        <Alert tom="info" className="mb-6" titulo="É a sua despesa.">
          Quem decide não pode ser o colaborador da despesa: outra pessoa tem de a aprovar ou rejeitar.
        </Alert>
      ) : null}
      <Card>
        <CardTitle>Dados</CardTitle>
        <dl className="mt-3 flex flex-col gap-2">
          <Linha rotulo="Colaborador">{d.employeeName}</Linha>
          <Linha rotulo="Data">{formatarData(d.spentOn)}</Linha>
          <Linha rotulo="Categoria">{d.category}</Linha>
          <Linha rotulo="Valor">{moeda(d.amount, d.currency)}</Linha>
          {d.expenseAccountCode ? <Linha rotulo="Conta do custo">{d.expenseAccountCode}</Linha> : null}
          <Linha rotulo="Submetida em">{formatarDataHora(d.submittedAt)}</Linha>
          <Linha rotulo="Comprovativo">
            {d.receiptDocumentId === null ? (
              "Sem comprovativo."
            ) : (
              <Button
                variante="ghost"
                tamanho="sm"
                className="-ml-2"
                onClick={() => {
                  setErroDescarga(null);
                  // Pela despesa (B20, ADR-085): quem a lê abre o comprovativo, sem o arquivo.
                  descarregar(`/finance/expenses/${encodeURIComponent(d.expenseId)}/receipt`, `comprovativo-${d.spentOn}`).catch(setErroDescarga);
                }}
              >
                <Download strokeWidth={1.75} aria-hidden />
                Descarregar
              </Button>
            )}
          </Linha>
          {d.decidedAt ? (
            <Linha rotulo="Decidida em">
              {formatarDataHora(d.decidedAt)}
              {d.decisionNotes ? <span className="block whitespace-pre-line text-muted-foreground">«{d.decisionNotes}»</span> : null}
            </Linha>
          ) : null}
          {d.status === "Reimbursed" ? (
            <Linha rotulo="Reembolsada em">
              {d.reimbursedOn ? formatarData(d.reimbursedOn) : "—"}
              {d.reimbursementReference ? ` · ${d.reimbursementReference}` : ""}
            </Linha>
          ) : null}
        </dl>
        {erroDescarga ? <ErrorPanel erro={erroDescarga} className="mt-3" /> : null}
      </Card>
    </>
  );
}
