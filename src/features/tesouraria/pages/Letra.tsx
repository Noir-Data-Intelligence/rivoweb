/**
 * Ficha de uma letra ou livrança (§5.6). As acções seguem o estado (Facto:
 * `BillOfExchange`): aceitar só pendente; descontar e endossar só a receber,
 * pendente ou aceite; pagar e protestar até descontada; anular pendente ou aceite.
 */
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { dinheiro, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useAccaoLetra, useLetra, type AccaoLetra, type Letra as TipoLetra } from "../api";
import { EstadoLetra, INSTRUMENTOS, SENTIDOS } from "./Letras";

const ACCOES: Readonly<Record<AccaoLetra, { rotulo: string; titulo: string; descricao: string; destrutiva?: boolean }>> = {
  acceptance: { rotulo: "Registar aceite", titulo: "Registar o aceite?", descricao: "O sacado aceitou pagar no vencimento." },
  discount: { rotulo: "Descontar", titulo: "Descontar no banco?", descricao: "O banco adianta o valor menos os encargos. A letra sai da carteira." },
  settlement: { rotulo: "Registar pagamento", titulo: "Registar o pagamento?", descricao: "A letra fica paga nessa data." },
  endorsement: { rotulo: "Endossar", titulo: "Endossar a um terceiro?", descricao: "A letra passa para o endossado e deixa de se descontar ou cobrar por cá." },
  protest: { rotulo: "Protestar", titulo: "Registar o protesto?", descricao: "Não foi paga no vencimento e foi protestada.", destrutiva: true },
  cancellation: { rotulo: "Anular", titulo: "Anular a letra?", descricao: "Fica anulada, com as notas. Não se pode desfazer.", destrutiva: true },
};

/** Acções que o domínio aceita no estado e sentido da letra. */
export function accoesPossiveis(l: Pick<TipoLetra, "status" | "direction">): AccaoLetra[] {
  const r = l.direction === "Receivable";
  const s = l.status;
  const a: AccaoLetra[] = [];
  if (s === "Pending") a.push("acceptance");
  if (r && (s === "Pending" || s === "Accepted")) a.push("discount");
  if (s === "Pending" || s === "Accepted" || s === "Discounted") a.push("settlement");
  if (r && (s === "Pending" || s === "Accepted")) a.push("endorsement");
  if (s === "Pending" || s === "Accepted" || s === "Discounted") a.push("protest");
  if (s === "Pending" || s === "Accepted") a.push("cancellation");
  return a;
}

function Accao({ l, accao }: { l: TipoLetra; accao: AccaoLetra }) {
  const def = ACCOES[accao];
  const [aberto, setAberto] = useState(false);
  const m = useAccaoLetra(l.billId);
  const [data, setData] = useState(hojeIso());
  const [encargos, setEncargos] = useState("0");
  const [banco, setBanco] = useState(l.bank ?? "");
  const [endossado, setEndossado] = useState("");
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const comData = accao === "discount" || accao === "settlement" || accao === "endorsement";
  const fee = lerDinheiroDigitado(encargos, 2);
  const erros = {
    data: comData && !IsoDate.safeParse(data).success ? "Indique a data." : undefined,
    encargos: accao === "discount" && (!fee || fee.lt(0) || fee.gte(dinheiro(l.amount))) ? "Os encargos vão de zero a menos do valor da letra." : undefined,
    endossado: accao === "endorsement" && normalizarTexto(endossado) === "" ? "Indique o endossado." : undefined,
  };
  const t = (s: string) => (normalizarTexto(s) === "" ? null : normalizarTexto(s));
  return (
    <>
      <Button variante={def.destrutiva ? "ghost" : "secondary"} onClick={() => setAberto(true)}>
        {def.rotulo}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            m.reset();
            setTentou(false);
          }
        }}
        titulo={def.titulo}
        descricao={def.descricao}
        rotuloConfirmar={def.rotulo}
        variante={def.destrutiva ? "destructive" : "primary"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.values(erros).some(Boolean) || m.isPending) return;
            m.mutate(
              {
                accao,
                corpo: {
                  on: comData ? data : null,
                  fee: accao === "discount" && fee ? paraApi(fee) : null,
                  bank: accao === "discount" ? t(banco) : null,
                  notes: t(notas),
                  ...(accao === "endorsement" ? { endorsee: normalizarTexto(endossado) } : {}),
                },
              },
              { onSuccess: () => setAberto(false) },
            );
          }}
        >
          {comData ? (
            <Field rotulo="Data" erro={tentou ? erros.data : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
            </Field>
          ) : null}
          {accao === "discount" ? (
            <>
              <Field rotulo={`Encargos (${l.currency})`} erro={tentou ? erros.encargos : undefined}>
                {({ id, descricao, invalido }) => (
                  <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={encargos} onChange={(e) => setEncargos(e.target.value)} />
                )}
              </Field>
              <Field rotulo="Banco">
                {({ id, descricao }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} value={banco} onChange={(e) => setBanco(e.target.value)} />}
              </Field>
            </>
          ) : null}
          {accao === "endorsement" ? (
            <Field rotulo="Endossado" erro={tentou ? erros.endossado : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={endossado} onChange={(e) => setEndossado(e.target.value)} />}
            </Field>
          ) : null}
          <Field rotulo="Notas (opcional)">
            {({ id, descricao }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{rotulo}</dt>
      <dd className="break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function Letra() {
  const { billId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useLetra(billId);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/letras">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Letras e livranças
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
  const l = q.data;
  const accoes = pode("finance.treasury.write") ? accoesPossiveis(l) : [];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={`${INSTRUMENTOS[l.instrument as keyof typeof INSTRUMENTOS] ?? l.instrument} ${l.number}`}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoLetra l={l} />
            <span>
              {moeda(l.amount, l.currency)} · {SENTIDOS[l.direction as keyof typeof SENTIDOS] ?? l.direction}
            </span>
          </span>
        }
        accao={
          accoes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {accoes.map((a) => (
                <Accao key={a} l={l} accao={a} />
              ))}
            </div>
          ) : undefined
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Dados</CardTitle>
          <dl className="mt-3 flex flex-col gap-2">
            <Linha rotulo={l.direction === "Receivable" ? "Sacado" : "Tomador"}>{l.counterpartyName}</Linha>
            <Linha rotulo="Emissão">{formatarData(l.issuedOn)}</Linha>
            <Linha rotulo="Vencimento">{formatarData(l.dueOn)}</Linha>
            <Linha rotulo="Banco">{l.bank ?? "—"}</Linha>
            {l.settledOn ? <Linha rotulo={l.status === "Discounted" ? "Descontada em" : "Paga em"}>{formatarData(l.settledOn)}</Linha> : null}
            {l.discountFee !== null ? <Linha rotulo="Encargos do desconto">{moeda(l.discountFee, l.currency)}</Linha> : null}
            {l.notes ? <Linha rotulo="Notas">{l.notes}</Linha> : null}
          </dl>
        </Card>
        <Card className="self-start">
          <CardTitle>Endossos</CardTitle>
          {(l.endorsements ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sem endossos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {(l.endorsements ?? []).map((e) => (
                <li key={e.endorsementId} className="py-2 text-sm">
                  <p className="text-foreground">{e.endorsee}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatarData(e.on)}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
