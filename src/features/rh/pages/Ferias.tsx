/**
 * Férias e ausências na gestão: os pedidos (de todos ou de um colaborador),
 * pedir em nome de alguém (vai a aprovação), retirar um pedido por decidir,
 * aplicar a decisão já tomada na caixa de aprovações; e os saldos do ano, com
 * o direito de cada pessoa (dado configurado pelos RH, não calculado).
 */
import { CalendarCheck, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { FiltroColaborador, SelectColaborador, useFiltroColaborador, useNomeColaborador } from "../escolhas";
import { EstadoAusencia, nome, TIPO_AUSENCIA } from "../estados";
import { useAusencias, useDefinirDireito, usePedirAusencia, useRetirarAusencia, useSaldosAusencias, useVerDecisaoAusencia, type Ausencia, type SaldoAusencias, type TipoAusencia } from "../gestao";
import { diasDeCalendario, lerDias, validarFerias } from "../regras";

const dias = (v: number | string) => formatarNumeroDecimal(String(v), Number.isInteger(Number(v)) ? 0 : 1);

export function PedirAusencia({ colaboradorFixo }: { colaboradorFixo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? "");
  const [tipo, setTipo] = useState("Annual");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const pedir = usePedirAusencia();
  const idForm = useId();
  const m = normalizarTexto(motivo, true);
  const erros = { ...validarFerias({ tipo, de, ate }), colaborador: colaborador ? undefined : "Escolha o colaborador.", motivo: m.length > 1000 ? "No máximo 1000 caracteres." : undefined };
  const total = diasDeCalendario(de, ate);
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      pedir.reset();
      setTentou(false);
      setDe("");
      setAte("");
      setMotivo("");
      if (!colaboradorFixo) setColaborador("");
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
        titulo="Pedir uma ausência em nome do colaborador"
        descricao="Vai para aprovação, como se fosse o próprio a pedir."
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
            if (erros.colaborador || erros.tipo || erros.de || erros.ate || erros.motivo || pedir.isPending) return;
            pedir.mutate({ employeeId: colaborador, type: tipo, startsOn: de, endsOn: ate, reason: m === "" ? null : m }, { onSuccess: () => mudar(false) });
          }}
        >
          {colaboradorFixo ? null : (
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined} className="sm:col-span-2">
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Field rotulo="Tipo" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tipo} onChange={(e) => setTipo(e.target.value)}>
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
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Retirar({ a }: { a: Ausencia }) {
  const [aberto, setAberto] = useState(false);
  const retirar = useRetirarAusencia();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Retirar o pedido de ${formatarData(a.startsOn)}`}>
        Retirar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(v) => {
          setAberto(v);
          if (!v) retirar.reset();
        }}
        titulo="Retirar este pedido?"
        descricao="Deixa de ir a decisão e fica no histórico como retirado."
        rotuloConfirmar="Retirar pedido"
        variante="destructive"
        aCarregar={retirar.isPending}
        erro={retirar.error ? <ErrorPanel erro={retirar.error} /> : undefined}
        aoConfirmar={() => (retirar.isPending ? undefined : retirar.mutate(a.leaveId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

/** Aplica ao pedido a decisão já tomada na caixa de aprovações; se não houver, diz isso. */
function VerDecisao({ a }: { a: Ausencia }) {
  const ver = useVerDecisaoAusencia();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variante="ghost" tamanho="sm" aCarregar={ver.isPending} onClick={() => ver.mutate(a.leaveId)} aria-label={`Ver a decisão do pedido de ${formatarData(a.startsOn)}`}>
        <CalendarCheck strokeWidth={1.75} aria-hidden />
        Ver decisão
      </Button>
      {ver.data?.detalhe ? <span className="max-w-[16rem] text-right text-xs text-muted-foreground">{ver.data.detalhe}</span> : null}
      {ver.error ? <ErrorPanel erro={ver.error} /> : null}
    </div>
  );
}

export function ListaAusencias({ colaborador, comNome }: { colaborador: string | null; comNome: boolean }) {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useAusencias({ colaborador, pagina, tamanho });
  const nomeDe = useNomeColaborador();
  const colunas: Coluna<Ausencia>[] = [
    ...(comNome
      ? [
          {
            id: "colaborador",
            cabecalho: "Colaborador",
            celula: (a: Ausencia) => (
              <Link to={`/colaboradores/${a.employeeId}?vista=ferias`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {nomeDe(a.employeeId)}
              </Link>
            ),
          } satisfies Coluna<Ausencia>,
        ]
      : []),
    {
      id: "tipo",
      cabecalho: "Ausência",
      celula: (a) => (
        <div className="flex min-w-0 flex-col">
          <span>{nome(TIPO_AUSENCIA, a.type)}</span>
          {a.reason ? <span className="truncate text-sm text-muted-foreground">{a.reason}</span> : null}
        </div>
      ),
      className: "max-w-[16rem]",
    },
    { id: "periodo", cabecalho: "Período", celula: (a) => (a.startsOn === a.endsOn ? formatarData(a.startsOn) : `${formatarData(a.startsOn)} a ${formatarData(a.endsOn)}`) },
    { id: "dias", cabecalho: "Dias", alinhar: "direita", esconderAte: "md", celula: (a) => dias(a.calendarDays) },
    { id: "estado", cabecalho: "Estado", celula: (a) => <EstadoAusencia estado={a.status} /> },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (a) =>
        a.status === "Pending" ? (
          <Can requer="hr.leave.write">
            <div className="flex flex-wrap justify-end gap-1">
              {a.approvalRequestId ? <VerDecisao a={a} /> : null}
              <Retirar a={a} />
            </div>
          </Can>
        ) : null,
    },
  ];
  return (
    <>
      <Tabela
        rotulo="Pedidos de ausência"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(a) => a.leaveId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem pedidos de ausência."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
      <p className="mt-2 text-sm text-muted-foreground">A decisão toma-se em Aprovações; «Ver decisão» traz para aqui a que já foi tomada.</p>
    </>
  );
}

export function DefinirDireito({ ano, colaboradorFixo, saldo }: { ano: number; colaboradorFixo?: string; saldo?: SaldoAusencias }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? saldo?.employeeId ?? "");
  const [tipo, setTipo] = useState<TipoAusencia>((saldo?.type as TipoAusencia | undefined) ?? "Annual");
  const [diasTexto, setDias] = useState("");
  const [transitados, setTransitados] = useState("");
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const definir = useDefinirDireito();
  const idForm = useId();
  const nomeDe = useNomeColaborador();
  const d = lerDias(diasTexto);
  const t = transitados.trim() === "" ? "0" : lerDias(transitados);
  const erros = {
    colaborador: colaborador ? undefined : "Escolha o colaborador.",
    dias: d === null ? "De 0 a 366, até 2 casas decimais." : undefined,
    transitados: t === null ? "De 0 a 366, até 2 casas decimais." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (a) {
      setDias(saldo?.configured ? String(saldo.entitled) : "");
      setTransitados(saldo?.configured ? String(saldo.carriedOver) : "");
    } else {
      definir.reset();
      setTentou(false);
      setNotas("");
    }
  };
  return (
    <>
      {saldo ? (
        <Button variante="ghost" tamanho="sm" onClick={() => mudar(true)} aria-label={`Definir o direito de ${saldo.employeeName}`}>
          Definir
        </Button>
      ) : (
        <Button variante="secondary" onClick={() => mudar(true)}>
          Definir direito
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Direito a dias em ${ano}`}
        descricao="Os dias a que a pessoa tem direito nesse ano e os que transitam do anterior. Substitui o que estiver definido."
        rotuloConfirmar="Gravar"
        aCarregar={definir.isPending}
        erro={definir.error ? <ErrorPanel erro={definir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.colaborador || d === null || t === null || definir.isPending) return;
            const n = normalizarTexto(notas);
            definir.mutate({ employeeId: colaborador, year: ano, type: tipo, days: d, carriedOverDays: t, notes: n === "" ? null : n }, { onSuccess: () => mudar(false) });
          }}
        >
          {colaboradorFixo || saldo ? (
            <p className="text-sm text-foreground sm:col-span-2">{saldo?.employeeName ?? nomeDe(colaboradorFixo ?? "")}</p>
          ) : (
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined} className="sm:col-span-2">
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Field rotulo="Tipo" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tipo} disabled={Boolean(saldo)} onChange={(e) => setTipo(e.target.value as TipoAusencia)}>
                {Object.entries(TIPO_AUSENCIA).map(([v, x]) => (
                  <option key={v} value={v}>
                    {x}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Dias de direito" erro={tentou ? erros.dias : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={diasTexto} onChange={(e) => setDias(e.target.value)} />}
          </Field>
          <Field rotulo="Transitados (opcional)" erro={tentou ? erros.transitados : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={transitados} onChange={(e) => setTransitados(e.target.value)} />}
          </Field>
          <Field rotulo="Notas (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export function useAnoUrl() {
  const [params, setParams] = useSearchParams();
  const actual = Number(hojeIso().slice(0, 4));
  const pedido = Number(params.get("ano"));
  const ano = Number.isInteger(pedido) && pedido >= 2000 && pedido <= actual + 1 ? pedido : actual;
  const mudar = (a: number) =>
    setParams(
      (x) => {
        const n = new URLSearchParams(x);
        if (a === actual) n.delete("ano");
        else n.set("ano", String(a));
        return n;
      },
      { replace: true },
    );
  return { ano, actual, mudar };
}

export function Saldos({ colaborador, comNome }: { colaborador: string | null; comNome: boolean }) {
  const { ano, actual, mudar } = useAnoUrl();
  const idAno = useId();
  const saldos = useSaldosAusencias(ano, colaborador);
  const colunas: Coluna<SaldoAusencias>[] = [
    ...(comNome
      ? [
          {
            id: "colaborador",
            cabecalho: "Colaborador",
            celula: (s: SaldoAusencias) => (
              <Link to={`/colaboradores/${s.employeeId}?vista=ferias`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {s.employeeName}
              </Link>
            ),
          } satisfies Coluna<SaldoAusencias>,
        ]
      : []),
    { id: "tipo", cabecalho: "Tipo", celula: (s) => nome(TIPO_AUSENCIA, s.type) },
    { id: "direito", cabecalho: "Direito", alinhar: "direita", esconderAte: "sm", celula: (s) => (s.configured ? dias(s.entitled) : "—") },
    { id: "transitados", cabecalho: "Transitados", alinhar: "direita", esconderAte: "md", celula: (s) => (s.configured ? dias(s.carriedOver) : "—") },
    { id: "gozados", cabecalho: "Gozados", alinhar: "direita", esconderAte: "md", celula: (s) => dias(s.taken) },
    { id: "pendentes", cabecalho: "Por decidir", alinhar: "direita", esconderAte: "lg", celula: (s) => dias(s.pending) },
    { id: "restantes", cabecalho: "Por gozar", alinhar: "direita", celula: (s) => (s.configured ? <span className="font-medium">{dias(s.remaining)}</span> : <span className="text-muted-foreground">Sem direito definido</span>) },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (s) => <Can requer="hr.leave.write"><DefinirDireito ano={ano} saldo={s} /></Can> },
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAno} className="text-sm font-medium text-foreground">
            Ano
          </label>
          <Select id={idAno} className="w-28" value={ano} onChange={(e) => mudar(Number(e.target.value))}>
            {[actual + 1, actual, actual - 1, actual - 2].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <Can requer="hr.leave.write">
          <DefinirDireito ano={ano} {...(colaborador ? { colaboradorFixo: colaborador } : {})} />
        </Can>
      </div>
      <Tabela
        rotulo={`Saldos de ${ano}`}
        colunas={colunas}
        linhas={saldos.data}
        chave={(s) => `${s.employeeId}-${s.type}`}
        aCarregar={saldos.isPending}
        erro={saldos.error ? <ErrorPanel erro={saldos.error} tentarDeNovo={() => void saldos.refetch()} /> : undefined}
        vazio={`Sem saldos em ${ano}. Defina o direito de cada colaborador.`}
      />
    </>
  );
}

const VISTAS: readonly Vista<"pedidos" | "saldos">[] = [
  { valor: "pedidos", texto: "Pedidos" },
  { valor: "saldos", texto: "Saldos" },
];

export default function Ferias() {
  const { colaborador, mudar } = useFiltroColaborador();
  const vista = useVista(VISTAS);
  return (
    <>
      <PageHeader
        titulo="Férias e ausências"
        descricao="Pedidos, decisões e o saldo de cada colaborador."
        accao={
          <Can requer="hr.leave.write">
            <PedirAusencia />
          </Can>
        }
      />
      <Vistas rotulo="Férias e ausências" vistas={VISTAS} actual={vista} />
      <div className="mb-4">
        <FiltroColaborador colaborador={colaborador} mudar={mudar} />
      </div>
      {vista === "saldos" ? <Saldos colaborador={colaborador} comNome /> : <ListaAusencias colaborador={colaborador} comNome />}
      {vista === "pedidos" ? null : <Alert tom="info" className="mt-4" titulo="O direito a dias é configurado pelos Recursos Humanos; o sistema só conta o que foi gozado e pedido." />}
    </>
  );
}
