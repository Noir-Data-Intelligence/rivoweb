/** Portal › Férias e ausências: saldo do ano, pedidos, pedir férias (vai a aprovação) e retirar um pedido por decidir. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { EstadoAusencia, nome, TIPO_AUSENCIA } from "@/features/rh";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useMeusSaldos, useMinhasFerias, usePedirFerias, useRetirarFerias, type PedidoFerias, type SaldoFerias } from "../api";
import { diasDeCalendario, validarFerias } from "../regras";

const MAXIMO_MOTIVO = 1000;
const dias = (v: number | string) => formatarNumeroDecimal(String(v), Number.isInteger(Number(v)) ? 0 : 1);

function Pedir() {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState("Annual");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const pedir = usePedirFerias();
  const idForm = useId();
  const m = normalizarTexto(motivo, true);
  const erros = { ...validarFerias({ tipo, de, ate }), motivo: m.length > MAXIMO_MOTIVO ? `No máximo ${MAXIMO_MOTIVO} caracteres.` : undefined };
  const total = diasDeCalendario(de, ate);
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      pedir.reset();
      setTentou(false);
      setDe("");
      setAte("");
      setMotivo("");
      setTipo("Annual");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Pedir ausência
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Pedir férias ou outra ausência"
        descricao="Vai para aprovação. Só conta como ausência depois de aprovado."
        rotuloConfirmar="Enviar pedido"
        aCarregar={pedir.isPending}
        erro={pedir.error ? <ErrorPanel erro={pedir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.tipo || erros.de || erros.ate || erros.motivo || pedir.isPending) return;
            pedir.mutate({ type: tipo, startsOn: de, endsOn: ate, reason: m === "" ? null : m }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Tipo" erro={tentou ? erros.tipo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {Object.entries(TIPO_AUSENCIA).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Primeiro dia" erro={tentou ? erros.de : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={de} onChange={(e) => setDe(e.target.value)} />}
          </Field>
          <Field rotulo="Último dia" erro={tentou ? erros.ate : undefined} ajuda={total !== null ? `${total} ${total === 1 ? "dia" : "dias"} de calendário.` : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={de || undefined} aria-describedby={descricao} invalido={invalido} value={ate} onChange={(e) => setAte(e.target.value)} />}
          </Field>
          <Field rotulo="Motivo (opcional)" erro={tentou ? erros.motivo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_MOTIVO} aria-describedby={descricao} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Retirar({ p }: { p: PedidoFerias }) {
  const [aberto, setAberto] = useState(false);
  const retirar = useRetirarFerias();
  const periodo = p.startsOn === p.endsOn ? formatarData(p.startsOn) : `${formatarData(p.startsOn)} a ${formatarData(p.endsOn)}`;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Retirar o pedido de ${formatarData(p.startsOn)}`}>
        Retirar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) retirar.reset();
        }}
        titulo="Retirar este pedido?"
        descricao={`${nome(TIPO_AUSENCIA, p.type)}, ${periodo}. Deixa de esperar aprovação; para voltar a pedir, faz um pedido novo.`}
        rotuloConfirmar="Retirar pedido"
        variante="destructive"
        aCarregar={retirar.isPending}
        erro={retirar.error ? <ErrorPanel erro={retirar.error} /> : undefined}
        aoConfirmar={() => (retirar.isPending ? undefined : retirar.mutate(p.leaveId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Saldo({ s }: { s: SaldoFerias }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{nome(TIPO_AUSENCIA, s.type)}</p>
      {s.configured ? (
        <>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {dias(s.remaining)} <span className="text-base font-normal text-muted-foreground">dias por gozar</span>
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Direito</dt>
            <dd className="text-right tabular-nums">{dias(s.entitled)}</dd>
            <dt className="text-muted-foreground">Transitados</dt>
            <dd className="text-right tabular-nums">{dias(s.carriedOver)}</dd>
            <dt className="text-muted-foreground">Gozados</dt>
            <dd className="text-right tabular-nums">{dias(s.taken)}</dd>
            <dt className="text-muted-foreground">Por decidir</dt>
            <dd className="text-right tabular-nums">{dias(s.pending)}</dd>
          </dl>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Direito não configurado pelos Recursos Humanos. Gozados: {dias(s.taken)}; por decidir: {dias(s.pending)}.
        </p>
      )}
    </Card>
  );
}

export default function Ferias() {
  const [params, setParams] = useSearchParams();
  const anoActual = Number(hojeIso().slice(0, 4));
  const pedido = Number(params.get("ano"));
  const ano = Number.isInteger(pedido) && pedido >= 2000 && pedido <= anoActual + 1 ? pedido : anoActual;
  const idAno = useId();
  const saldos = useMeusSaldos(ano);
  const pedidos = useMinhasFerias();
  const colunas: Coluna<PedidoFerias>[] = [
    {
      id: "tipo",
      cabecalho: "Ausência",
      celula: (p) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{nome(TIPO_AUSENCIA, p.type)}</span>
          {p.reason ? <span className="truncate text-sm text-muted-foreground">{p.reason}</span> : null}
        </div>
      ),
      className: "max-w-[18rem]",
    },
    { id: "periodo", cabecalho: "Período", celula: (p) => (p.startsOn === p.endsOn ? formatarData(p.startsOn) : `${formatarData(p.startsOn)} a ${formatarData(p.endsOn)}`) },
    { id: "dias", cabecalho: "Dias", alinhar: "direita", esconderAte: "sm", celula: (p) => dias(p.calendarDays) },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoAusencia estado={p.status} /> },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (p) => (p.status === "Pending" ? <Retirar p={p} /> : null) },
  ];
  return (
    <>
      <PageHeader titulo="Férias e ausências" descricao="O seu saldo e os seus pedidos." accao={<Pedir />} />
      <section aria-labelledby={`${idAno}-t`} className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 id={`${idAno}-t`} className="text-md font-semibold text-foreground">
            Saldo de {ano}
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor={idAno} className="text-sm text-muted-foreground">
              Ano
            </label>
            <Select
              id={idAno}
              className="w-28"
              value={ano}
              onChange={(e) =>
                setParams(
                  (a) => {
                    const n = new URLSearchParams(a);
                    if (Number(e.target.value) === anoActual) n.delete("ano");
                    else n.set("ano", e.target.value);
                    return n;
                  },
                  { replace: true },
                )
              }
            >
              {[anoActual + 1, anoActual, anoActual - 1, anoActual - 2].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {saldos.isPending ? (
          <Skeleton className="h-36" />
        ) : saldos.error ? (
          <ErrorPanel erro={saldos.error} tentarDeNovo={() => void saldos.refetch()} />
        ) : saldos.data.length === 0 ? (
          <Alert tom="info" titulo={`Sem saldo de férias definido para ${ano}.`}>
            Os Recursos Humanos definem o direito anual de cada colaborador.
          </Alert>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saldos.data.map((s) => (
              <Saldo key={s.type} s={s} />
            ))}
          </div>
        )}
      </section>
      <h2 className="mb-3 text-md font-semibold text-foreground">Pedidos</h2>
      <Tabela
        rotulo="Pedidos de ausência"
        colunas={colunas}
        linhas={pedidos.data}
        chave={(p) => p.leaveId}
        aCarregar={pedidos.isPending}
        erro={pedidos.error ? <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} /> : undefined}
        vazio="Ainda não pediu férias nem ausências."
      />
    </>
  );
}
