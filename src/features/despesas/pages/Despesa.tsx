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
        descricao="Regista que o colaborador foi reembolsado. Não movimenta a conta nem gera lançamento: faça o pagamento pelo meio habitual."
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
            <Field rotulo="Conta de onde saiu (opcional)">
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
                  <ConfirmarComMotivo
                    rotuloBotao="Aprovar"
                    icone={<Check strokeWidth={1.75} aria-hidden />}
                    varianteBotao="primary"
                    titulo="Aprovar esta despesa?"
                    descricao="Fica aprovada para reembolso. O colaborador vê a decisão no portal."
                    rotuloConfirmar="Aprovar"
                    variante="primary"
                    rotuloCampo="Notas (opcional)"
                    opcional
                    maximo={500}
                    aCarregar={decidir.isPending}
                    erro={decidir.error ? <ErrorPanel erro={decidir.error} /> : undefined}
                    aoConfirmar={(notas, fechar) => decidir.mutate({ aprovar: true, notas: notas === "" ? null : notas }, { onSuccess: fechar })}
                  />
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
