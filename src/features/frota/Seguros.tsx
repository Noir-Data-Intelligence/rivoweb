/**
 * Seguros de frota, partilhados pela ficha da viatura e pela lista geral:
 * apólices (contratar, corrigir, anular) e sinistros (abrir, pagar, recusar).
 */
import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { Dialog, DialogContent } from "@/ui/Dialog";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAcaoApolice, useAcaoViatura, useSinistros, type Apolice, type Sinistro } from "./api";
import { EstadoApolice, EstadoSinistro } from "./comum";
import { apoliceParaApi, dinheiroOuNulo, erroPagamento, errosApolice, errosSinistro, sinistroParaApi, temErros, type CamposApolice, type CamposSinistro } from "./regras";

const camposDe = (p?: Apolice): CamposApolice => ({
  seguradora: p?.insurer ?? "",
  numero: p?.policyNumber ?? "",
  cobertura: p?.coverage ?? "",
  inicio: p?.startsOn ?? hojeIso(),
  fim: p?.endsOn ?? "",
  premio: p ? String(p.premium).replace(".", ",") : "",
  moeda: p?.currency ?? "AOA",
  capital: p?.insuredValue === null || p?.insuredValue === undefined ? "" : String(p.insuredValue).replace(".", ","),
  notas: p?.notes ?? "",
});

/** Contratar (com `viatura`) ou corrigir (com `p`) uma apólice. */
export function EditarApolice({ viatura, p }: { viatura: string; p?: Apolice }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposApolice>(() => camposDe(p));
  const [tentou, setTentou] = useState(false);
  const contratar = useAcaoViatura(viatura);
  const corrigir = useAcaoApolice(p?.policyId ?? "");
  const accao = p ? corrigir : contratar;
  const idForm = useId();
  const erros = errosApolice(v);
  const campo = (k: keyof CamposApolice, x: string) => setV((y) => ({ ...y, [k]: x }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      contratar.reset();
      corrigir.reset();
      setTentou(false);
      setV(camposDe(p));
    }
  };
  return (
    <>
      {p ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir a apólice ${p.policyNumber}`}>
          Corrigir
        </Button>
      ) : (
        <Button tamanho="sm" onClick={() => setAberto(true)}>
          Nova apólice
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        largo
        titulo={p ? `Corrigir a apólice ${p.policyNumber}` : "Nova apólice"}
        rotuloConfirmar={p ? "Guardar" : "Contratar"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            const corpo = apoliceParaApi(v);
            if (p) corrigir.mutate({ acto: "corrigir", corpo }, { onSuccess: () => setAberto(false) });
            else contratar.mutate({ acto: "apolice", corpo }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Seguradora" erro={tentou ? erros.seguradora : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.seguradora} onChange={(e) => campo("seguradora", e.target.value)} />}
          </Field>
          <Field rotulo="N.º da apólice" erro={tentou ? erros.numero : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.numero} onChange={(e) => campo("numero", e.target.value)} />}
          </Field>
          <Field rotulo="Cobertura (opcional)" ajuda="Vazia, «Responsabilidade civil»." erro={tentou ? erros.cobertura : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.cobertura} onChange={(e) => campo("cobertura", e.target.value)} />}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => campo("inicio", e.target.value)} />}
          </Field>
          <Field rotulo="Fim" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || undefined} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => campo("fim", e.target.value)} />}
          </Field>
          <Field rotulo="Prémio" erro={tentou ? erros.premio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.premio} onChange={(e) => campo("premio", e.target.value)} />}
          </Field>
          <Field rotulo="Moeda" erro={tentou ? erros.moeda : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={3} autoComplete="off" className="uppercase" aria-describedby={descricao} invalido={invalido} value={v.moeda} onChange={(e) => campo("moeda", e.target.value)} />}
          </Field>
          <Field rotulo="Capital seguro (opcional)" erro={tentou ? erros.capital : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.capital} onChange={(e) => campo("capital", e.target.value)} />}
          </Field>
          <Field rotulo="Notas (opcional)" erro={tentou ? erros.notas : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={(e) => campo("notas", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function AnularApolice({ p }: { p: Apolice }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoApolice(p.policyId);
  const erro = data === "" ? "Indique a data." : undefined;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Anular a apólice ${p.policyNumber}`}>
        Anular
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            accao.reset();
            setTentou(false);
          }
        }}
        titulo={`Anular a apólice ${p.policyNumber}?`}
        descricao="Deixa de contar como seguro e não se altera mais. Os sinistros só se abrem antes desta data. Não se desfaz."
        rotuloConfirmar="Anular apólice"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || accao.isPending) return;
          accao.mutate({ acto: "anular", corpo: { on: data } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Anulada a" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function PagarSinistro({ p, s }: { p: Apolice; s: Sinistro }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(s.claimedAmount === null ? "" : String(s.claimedAmount).replace(".", ","));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoApolice(p.policyId);
  const erro = erroPagamento(valor);
  const id = useId();
  if (!aberto) {
    return (
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Pagar o sinistro de ${formatarData(s.occurredOn)}`}>
        Pagar
      </Button>
    );
  }
  return (
    <form
      noValidate
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (erro || accao.isPending) return;
        accao.mutate({ acto: "pagar", sinistro: s.claimId, corpo: { settledAmount: dinheiroOuNulo(valor) ?? "0" } }, { onSuccess: () => setAberto(false) });
      }}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Valor pago em {p.currency}
        </label>
        <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" invalido={tentou && Boolean(erro)} aria-describedby={tentou && erro ? `${id}-erro` : undefined} value={valor} onChange={(e) => setValor(e.target.value)} />
        {tentou && erro ? (
          <p id={`${id}-erro`} role="alert" className="text-xs text-danger">
            {erro}
          </p>
        ) : null}
        {accao.error ? <ErrorPanel erro={accao.error} /> : null}
      </div>
      <div className="flex gap-2">
        <Button type="button" variante="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" aCarregar={accao.isPending}>
          Registar pagamento
        </Button>
      </div>
    </form>
  );
}

function RecusarSinistro({ p, s }: { p: Apolice; s: Sinistro }) {
  const accao = useAcaoApolice(p.policyId);
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={accao.isPending} onClick={() => accao.mutate({ acto: "recusar", sinistro: s.claimId })} aria-label={`Recusar o sinistro de ${formatarData(s.occurredOn)}`}>
        Recusar
      </Button>
      {accao.error ? <ErrorPanel erro={accao.error} /> : null}
    </span>
  );
}

function NovoSinistro({ p, aoCriar }: { p: Apolice; aoCriar: () => void }) {
  const vazio = (): CamposSinistro => ({ data: "", descricao: "", valor: "", referencia: "" });
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoApolice(p.policyId);
  const erros = errosSinistro(v, { inicio: p.startsOn, fim: p.endsOn });
  const campo = (k: keyof CamposSinistro) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      noValidate
      className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (temErros(erros) || accao.isPending) return;
        accao.mutate(
          { acto: "sinistro", corpo: sinistroParaApi(v) },
          {
            onSuccess: () => {
              setV(vazio());
              setTentou(false);
              aoCriar();
            },
          },
        );
      }}
    >
      <p className="text-sm font-medium text-foreground sm:col-span-2">Novo sinistro</p>
      <Field rotulo="Data do sinistro" erro={tentou ? erros.data : undefined}>
        {({ id, descricao, invalido }) => <Input id={id} type="date" min={p.startsOn} max={p.endsOn} aria-describedby={descricao} invalido={invalido} value={v.data} onChange={campo("data")} />}
      </Field>
      <Field rotulo={`Valor reclamado em ${p.currency} (opcional)`} erro={tentou ? erros.valor : undefined}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={campo("valor")} />}
      </Field>
      <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
        {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={campo("descricao")} />}
      </Field>
      <Field rotulo="Referência da seguradora (opcional)" erro={tentou ? erros.referencia : undefined}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.referencia} onChange={campo("referencia")} />}
      </Field>
      <div className="flex items-end justify-end">
        <Button type="submit" aCarregar={accao.isPending}>
          Abrir sinistro
        </Button>
      </div>
      {accao.error ? <ErrorPanel erro={accao.error} className="sm:col-span-2" /> : null}
    </form>
  );
}

function SinistrosDaApolice({ p, escreve }: { p: Apolice; escreve: boolean }) {
  const [aberto, setAberto] = useState(false);
  const lista = useSinistros(p.policyId, aberto);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Sinistros da apólice ${p.policyNumber}`}>
        Sinistros{Number(p.openClaims) > 0 ? ` (${String(p.openClaims)} abertos)` : ""}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent titulo={`Sinistros · ${p.insurer} ${p.policyNumber}`} descricao={`Vigência de ${formatarData(p.startsOn)} a ${formatarData(p.endsOn)}.`} className="max-w-2xl">
          {lista.isPending ? (
            <Skeleton className="h-16" />
          ) : lista.error ? (
            <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
          ) : lista.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem sinistros.</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Sinistros">
              {[...lista.data]
                .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
                .map((s) => (
                  <li key={s.claimId} className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {formatarData(s.occurredOn)}
                        {s.reference ? ` · ${s.reference}` : ""}
                      </span>
                      <EstadoSinistro estado={s.status} />
                    </div>
                    <p className="whitespace-pre-line break-words text-foreground">{s.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Reclamado: {s.claimedAmount === null ? "—" : moeda(s.claimedAmount, p.currency)}
                      {s.settledAmount !== null ? ` · Pago: ${moeda(s.settledAmount, p.currency)}` : ""}
                      {s.closedOn ? ` · Encerrado a ${formatarData(s.closedOn)}` : ""}
                    </p>
                    {escreve && s.status === "Open" ? (
                      <div className="flex flex-wrap justify-end gap-1">
                        <PagarSinistro p={p} s={s} />
                        <RecusarSinistro p={p} s={s} />
                      </div>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
          {escreve ? <NovoSinistro p={p} aoCriar={() => void lista.refetch()} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Apólices numa tabela; com `comViatura`, a matrícula liga à ficha. */
export function TabelaApolices({ linhas, aCarregar, erro, comViatura = false, vazio }: { linhas: Apolice[] | undefined; aCarregar: boolean; erro?: ReactNode; comViatura?: boolean; vazio: string }) {
  const { pode } = useUtilizador();
  const escreve = pode("fleet.vehicles.write");
  const colunas: Coluna<Apolice>[] = [
    ...(comViatura
      ? [
          {
            id: "viatura",
            cabecalho: "Viatura",
            celula: (p: Apolice) => (
              <Link to={`/frota/${p.vehicleId}?vista=seguros`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {p.plateNumber ?? "Viatura"}
              </Link>
            ),
          },
        ]
      : []),
    {
      id: "apolice",
      cabecalho: "Apólice",
      className: "max-w-[16rem]",
      celula: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="break-words font-medium">
            {p.insurer} · {p.policyNumber}
          </span>
          <span className="break-words text-xs text-muted-foreground">{p.coverage}</span>
        </span>
      ),
    },
    { id: "vigencia", cabecalho: "Vigência", esconderAte: "md", celula: (p) => `${formatarData(p.startsOn)} a ${formatarData(p.endsOn)}` },
    { id: "premio", cabecalho: "Prémio", alinhar: "direita", esconderAte: "sm", celula: (p) => moeda(p.premium, p.currency) },
    { id: "capital", cabecalho: "Capital", alinhar: "direita", esconderAte: "lg", celula: (p) => (p.insuredValue === null ? "—" : moeda(p.insuredValue, p.currency)) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (p) => (
        <span className="inline-flex flex-col items-start gap-0.5">
          <EstadoApolice estado={p.status} />
          {p.status === "Active" ? <span className="text-xs text-muted-foreground">{`${String(p.daysToExpiry)} dias para caducar`}</span> : null}
        </span>
      ),
    },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (p) => (
        <span className="inline-flex flex-wrap justify-end gap-1">
          <SinistrosDaApolice p={p} escreve={escreve} />
          {escreve && p.status !== "Cancelled" ? (
            <>
              <EditarApolice key={`${p.policyId}-${p.endsOn}-${String(p.premium)}`} viatura={p.vehicleId} p={p} />
              <AnularApolice p={p} />
            </>
          ) : null}
        </span>
      ),
    },
  ];
  return <Tabela rotulo="Apólices" colunas={colunas} linhas={linhas} chave={(p) => p.policyId} aCarregar={aCarregar} erro={erro} vazio={vazio} />;
}
