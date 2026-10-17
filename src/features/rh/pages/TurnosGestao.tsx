/**
 * Turnos na gestão, em três vistas: a escala (por omissão os próximos 7 dias;
 * escalar substitui o turno que a pessoa já tinha nesses dias), os pedidos de
 * troca (aprovar passa o turno ao colega proposto ou liberta-o) e os tipos de
 * turno (o código só se dá ao criar).
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { uuid } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useTodosDepartamentos } from "../api";
import { SelectColaborador } from "../escolhas";
import { EstadoTroca } from "../estados";
import { diasDeCalendario, errosEscala, errosTipoTurno, horaDaApi, horaParaApi, MAXIMO_DIAS_ESCALA, passaMeiaNoite } from "../regras";
import {
  useCorrigirTipoTurno,
  useDecidirTroca,
  useDefinirTipoTurno,
  useEscala,
  useEscalar,
  useTiposTurno,
  useTirarDaEscala,
  useTrocasGestao,
  type EstadoTroca as TipoEstadoTroca,
  type TipoTurno,
  type TrocaGestao,
  type TurnoEscalado,
} from "../tempo";

const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const horario = (inicio: string, fim: string) => `${horaDaApi(inicio)}–${horaDaApi(fim)}${passaMeiaNoite(horaDaApi(inicio), horaDaApi(fim)) ? " (dia seguinte)" : ""}`;
/** Do URL actual, não do último render (as navegações vão em transição). */
function mudarUrl(setParams: ReturnType<typeof useSearchParams>[1], k: string, v: string) {
  const n = new URLSearchParams(window.location.search);
  if (v === "") n.delete(k);
  else n.set(k, v);
  setParams(n);
}

// --- Escala

function Escalar() {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState("");
  const [tipo, setTipo] = useState("");
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState("");
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const [substituidos, setSubstituidos] = useState<number | null>(null);
  const escalar = useEscalar();
  const tipos = useTiposTurno(false);
  const idForm = useId();
  const erros = errosEscala({ colaborador, tipo, de, ate });
  const dias = de && (ate === "" ? 1 : diasDeCalendario(de, ate));
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      escalar.reset();
      setTentou(false);
      setColaborador("");
      setTipo("");
      setAte("");
      setNotas("");
      setDe(hojeIso());
    }
  };
  return (
    <>
      <Button
        onClick={() => {
          setSubstituidos(null);
          setAberto(true);
        }}
      >
        <Plus strokeWidth={1.75} aria-hidden />
        Escalar
      </Button>
      {substituidos ? (
        <Alert tom="info" className="mt-2" titulo={`${substituidos} ${substituidos === 1 ? "turno anterior foi substituído" : "turnos anteriores foram substituídos"}.`} />
      ) : null}
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Escalar um colaborador"
        descricao="Um turno por dia: nos dias em que a pessoa já tinha turno, o novo substitui o anterior."
        rotuloConfirmar="Escalar"
        aCarregar={escalar.isPending}
        erro={escalar.error ? <ErrorPanel erro={escalar.error} /> : tipos.error ? <ErrorPanel erro={tipos.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || escalar.isPending) return;
            const n = normalizarTexto(notas, true);
            escalar.mutate(
              { employeeId: colaborador, shiftTypeId: tipo, from: de, to: ate === "" ? null : ate, notes: n === "" ? null : n },
              {
                onSuccess: (r) => {
                  setSubstituidos(r.days.filter((d) => d.replacedAssignmentId !== null).length);
                  mudar(false);
                },
              },
            );
          }}
        >
          <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
          </Field>
          <Field rotulo="Turno" erro={tentou ? erros.tipo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">{tipos.isPending ? "A carregar…" : "Escolha…"}</option>
                {(tipos.data ?? []).map((t) => (
                  <option key={t.shiftTypeId} value={t.shiftTypeId}>
                    {t.code} · {t.name} ({horario(t.startsAt, t.endsAt)})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Primeiro dia" erro={tentou ? erros.de : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={de} onChange={(e) => setDe(e.target.value)} />}
          </Field>
          <Field rotulo="Último dia (opcional)" erro={tentou ? erros.ate : undefined} ajuda={typeof dias === "number" ? `${dias} ${dias === 1 ? "dia" : "dias"} (no máximo ${MAXIMO_DIAS_ESCALA}).` : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={de || undefined} aria-describedby={descricao} invalido={invalido} value={ate} onChange={(e) => setAte(e.target.value)} />}
          </Field>
          <Field rotulo="Notas (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Tirar({ t }: { t: TurnoEscalado }) {
  const [aberto, setAberto] = useState(false);
  const tirar = useTirarDaEscala();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Tirar ${t.employeeName} da escala de ${formatarData(t.day)}`}>
        Tirar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) tirar.reset();
        }}
        titulo="Tirar da escala?"
        descricao={`${t.employeeName} deixa de ter o turno ${t.shiftName} a ${formatarData(t.day)}.`}
        rotuloConfirmar="Tirar"
        variante="destructive"
        aCarregar={tirar.isPending}
        erro={tirar.error ? <ErrorPanel erro={tirar.error} /> : undefined}
        aoConfirmar={() => (tirar.isPending ? undefined : tirar.mutate(t.assignmentId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Escala() {
  const [params, setParams] = useSearchParams();
  const { pode } = useUtilizador();
  const hoje = hojeIso();
  const de = params.get("de") ?? hoje;
  const ate = params.get("ate") ?? somarDias(hoje, 6);
  const c = params.get("colaborador");
  const colaborador = c && uuid.safeParse(c).success ? c : null;
  const d = params.get("departamento");
  const departamento = d && uuid.safeParse(d).success ? d : null;
  const dias = diasDeCalendario(de, ate);
  const erroJanela = dias === null ? "A data final não pode ser anterior à inicial." : dias > MAXIMO_DIAS_ESCALA ? `No máximo ${MAXIMO_DIAS_ESCALA} dias.` : undefined;
  const escala = useEscala({ de, ate, colaborador, departamento }, !erroJanela);
  const departamentos = useTodosDepartamentos();
  const ids = { de: useId(), ate: useId(), dep: useId(), col: useId() };
  const colunas: Coluna<TurnoEscalado>[] = [
    { id: "dia", cabecalho: "Dia", celula: (t) => formatarData(t.day) },
    {
      id: "colaborador",
      cabecalho: "Colaborador",
      celula: (t) => (
        <Link to={`/colaboradores/${t.employeeId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {t.employeeName}
        </Link>
      ),
    },
    { id: "turno", cabecalho: "Turno", celula: (t) => `${t.shiftCode} · ${t.shiftName}` },
    { id: "horario", cabecalho: "Horário", esconderAte: "sm", celula: (t) => horario(t.startsAt, t.endsAt) },
    { id: "notas", cabecalho: "Notas", esconderAte: "lg", celula: (t) => t.notes ?? "—" },
    ...(pode("hr.shifts.write") ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (t: TurnoEscalado) => <Tirar t={t} /> }] : []),
  ];
  const linhas = escala.data ? [...escala.data].sort((a, b) => a.day.localeCompare(b.day) || a.startsAt.localeCompare(b.startsAt) || a.employeeName.localeCompare(b.employeeName)) : undefined;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex w-40 flex-col gap-1.5">
          <label htmlFor={ids.de} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={ids.de} type="date" value={de} onChange={(e) => mudarUrl(setParams, "de", e.target.value)} />
        </div>
        <div className="flex w-40 flex-col gap-1.5">
          <label htmlFor={ids.ate} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={ids.ate} type="date" value={ate} onChange={(e) => mudarUrl(setParams, "ate", e.target.value)} />
        </div>
        <div className="flex w-52 flex-col gap-1.5">
          <label htmlFor={ids.dep} className="text-sm font-medium text-foreground">
            Departamento
          </label>
          <Select id={ids.dep} value={departamento ?? ""} onChange={(e) => mudarUrl(setParams, "departamento", e.target.value)}>
            <option value="">Todos</option>
            {(departamentos.data?.items ?? []).map((x) => (
              <option key={x.departmentId} value={x.departmentId}>
                {x.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex w-64 flex-col gap-1.5">
          <label htmlFor={ids.col} className="text-sm font-medium text-foreground">
            Colaborador
          </label>
          <SelectColaborador id={ids.col} valor={colaborador ?? ""} aoMudar={(v) => mudarUrl(setParams, "colaborador", v)} soActivos={false} vazio="Todos" />
        </div>
      </div>
      {erroJanela ? (
        <Alert tom="aviso" titulo={erroJanela} />
      ) : (
        <Tabela
          rotulo="Escala"
          colunas={colunas}
          linhas={linhas}
          chave={(t) => t.assignmentId}
          aCarregar={escala.isPending}
          erro={escala.error ? <ErrorPanel erro={escala.error} tentarDeNovo={() => void escala.refetch()} /> : undefined}
          vazio="Ninguém escalado neste período."
        />
      )}
    </>
  );
}

// --- Trocas

function Decidir({ t }: { t: TrocaGestao }) {
  const [aberto, setAberto] = useState<"aprovar" | "recusar" | null>(null);
  const [notas, setNotas] = useState("");
  const decidir = useDecidirTroca();
  const id = useId();
  const aprovar = aberto === "aprovar";
  return (
    <div className="flex justify-end gap-1">
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto("aprovar")} aria-label={`Aprovar a troca de ${t.requesterName} a ${formatarData(t.day)}`}>
        Aprovar
      </Button>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto("recusar")} aria-label={`Recusar a troca de ${t.requesterName} a ${formatarData(t.day)}`}>
        Recusar
      </Button>
      <Confirmar
        aberto={aberto !== null}
        aoMudar={(a) => {
          if (!a) {
            setAberto(null);
            setNotas("");
            decidir.reset();
          }
        }}
        titulo={aprovar ? "Aprovar a troca?" : "Recusar a troca?"}
        descricao={
          aprovar
            ? t.proposedName
              ? `O turno de ${formatarData(t.day)} passa de ${t.requesterName} para ${t.proposedName}.`
              : `${t.requesterName} sai do turno de ${formatarData(t.day)} e ninguém fica com ele.`
            : `${t.requesterName} continua escalado a ${formatarData(t.day)}.`
        }
        rotuloConfirmar={aprovar ? "Aprovar" : "Recusar"}
        variante={aprovar ? "primary" : "destructive"}
        aCarregar={decidir.isPending}
        erro={decidir.error ? <ErrorPanel erro={decidir.error} /> : undefined}
        aoConfirmar={() => {
          if (decidir.isPending) return;
          const n = normalizarTexto(notas, true);
          decidir.mutate({ requestId: t.requestId, approved: aprovar, notes: n === "" ? null : n }, { onSuccess: () => setAberto(null) });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Notas (opcional)
          </label>
          <Textarea id={id} rows={2} maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
      </Confirmar>
    </div>
  );
}

const ESTADOS_TROCA: Record<TipoEstadoTroca, string> = { Pending: "Por decidir", Approved: "Aprovadas", Rejected: "Recusadas", Cancelled: "Canceladas" };

function Trocas() {
  const [params, setParams] = useSearchParams();
  const { pode } = useUtilizador();
  const e = params.get("estado");
  const estado = e === null ? "Pending" : e in ESTADOS_TROCA ? (e as TipoEstadoTroca) : null;
  const lista = useTrocasGestao(estado);
  const id = useId();
  const colunas: Coluna<TrocaGestao>[] = [
    { id: "dia", cabecalho: "Turno de", celula: (t) => formatarData(t.day) },
    {
      id: "quem",
      cabecalho: "Pedido por",
      celula: (t) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{t.requesterName}</span>
          <span className="truncate text-sm text-muted-foreground">{t.reason}</span>
        </div>
      ),
      className: "max-w-[18rem]",
    },
    { id: "colega", cabecalho: "Fica com o turno", esconderAte: "sm", celula: (t) => t.proposedName ?? "Ninguém (liberta o turno)" },
    { id: "pedido", cabecalho: "Pedido a", esconderAte: "lg", celula: (t) => formatarDataHora(t.requestedAt) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (t) => (
        <div className="flex flex-col gap-0.5">
          <EstadoTroca estado={t.status} />
          {t.decisionNotes ? <span className="text-xs text-muted-foreground">«{t.decisionNotes}»</span> : null}
        </div>
      ),
    },
    ...(pode("hr.shifts.write") ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (t: TrocaGestao) => (t.status === "Pending" ? <Decidir t={t} /> : null) }] : []),
  ];
  return (
    <>
      <div className="mb-4 flex w-48 flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Estado
        </label>
        <Select id={id} value={estado ?? ""} onChange={(ev) => mudarUrl(setParams, "estado", ev.target.value === "Pending" ? "" : ev.target.value === "" ? "todos" : ev.target.value)}>
          <option value="">Todos</option>
          {Object.entries(ESTADOS_TROCA).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <Tabela
        rotulo="Pedidos de troca"
        colunas={colunas}
        linhas={lista.data ? [...lista.data].sort((a, b) => a.day.localeCompare(b.day)) : undefined}
        chave={(t) => t.requestId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado === "Pending" ? "Nenhum pedido de troca por decidir." : "Sem pedidos de troca."}
      />
    </>
  );
}

// --- Tipos

function EditarTipo({ t }: { t?: TipoTurno }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({ codigo: t?.code ?? "", nome: t?.name ?? "", inicio: t ? horaDaApi(t.startsAt) : "", fim: t ? horaDaApi(t.endsAt) : "", activo: t?.active ?? true });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const definir = useDefinirTipoTurno();
  const corrigir = useCorrigirTipoTurno();
  const m = t ? corrigir : definir;
  const idForm = useId();
  const erros = errosTipoTurno({ ...v, novo: !t });
  return (
    <>
      {t ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir o turno ${t.name}`}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Novo tipo de turno
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            definir.reset();
            corrigir.reset();
            setTentou(false);
            setV(inicial());
          }
        }}
        titulo={t ? `Corrigir o turno ${t.code}` : "Novo tipo de turno"}
        descricao="Se o fim for antes do início, o turno acaba no dia seguinte. Um turno desactivado não se escala, mas a escala que já tem fica."
        rotuloConfirmar={t ? "Guardar" : "Criar"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || m.isPending) return;
            const corpo = { code: t ? null : normalizarTexto(v.codigo).toUpperCase(), name: normalizarTexto(v.nome), startsAt: horaParaApi(v.inicio), endsAt: horaParaApi(v.fim), active: v.activo };
            const fechar = { onSuccess: () => setAberto(false) };
            if (t) corrigir.mutate({ shiftTypeId: t.shiftTypeId, ...corpo }, fechar);
            else definir.mutate(corpo, fechar);
          }}
        >
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined} ajuda={t ? "Não muda depois de criado." : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={20} autoComplete="off" disabled={Boolean(t)} aria-describedby={descricao} invalido={invalido} value={v.codigo} onChange={(e) => setV((x) => ({ ...x, codigo: e.target.value }))} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="time" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => setV((x) => ({ ...x, inicio: e.target.value }))} />}
          </Field>
          <Field rotulo="Fim" erro={tentou ? erros.fim : undefined} ajuda={/^\d{2}:\d{2}$/.test(v.inicio) && /^\d{2}:\d{2}$/.test(v.fim) && passaMeiaNoite(v.inicio, v.fim) ? "Acaba no dia seguinte." : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="time" aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => setV((x) => ({ ...x, fim: e.target.value }))} />}
          </Field>
          {t ? (
            <div className="sm:col-span-2">
              <Checkbox rotulo="Activo" checked={v.activo} onChange={(e) => setV((x) => ({ ...x, activo: e.target.checked }))} />
            </div>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function Tipos() {
  const { pode } = useUtilizador();
  const [inactivos, setInactivos] = useState(false);
  const lista = useTiposTurno(inactivos);
  const colunas: Coluna<TipoTurno>[] = [
    { id: "codigo", cabecalho: "Código", celula: (t) => <span className="font-medium">{t.code}</span> },
    { id: "nome", cabecalho: "Nome", celula: (t) => t.name },
    { id: "horario", cabecalho: "Horário", celula: (t) => horario(t.startsAt, t.endsAt) },
    { id: "estado", cabecalho: "Estado", celula: (t) => (t.active ? <Badge tom="sucesso">Activo</Badge> : <Badge>Inactivo</Badge>) },
    ...(pode("hr.shifts.write") ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (t: TipoTurno) => <EditarTipo key={`${t.shiftTypeId}-${t.name}-${t.startsAt}-${t.endsAt}-${String(t.active)}`} t={t} /> }] : []),
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Checkbox rotulo="Mostrar os inactivos" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} />
        <Can requer="hr.shifts.write">
          <EditarTipo />
        </Can>
      </div>
      <Tabela
        rotulo="Tipos de turno"
        colunas={colunas}
        linhas={lista.data}
        chave={(t) => t.shiftTypeId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há tipos de turno."
      />
    </>
  );
}

const VISTAS: readonly Vista<"escala" | "trocas" | "tipos">[] = [
  { valor: "escala", texto: "Escala" },
  { valor: "trocas", texto: "Pedidos de troca" },
  { valor: "tipos", texto: "Tipos de turno" },
];

export default function TurnosGestao() {
  const vista = useVista(VISTAS);
  return (
    <>
      <PageHeader
        titulo="Turnos"
        descricao="Quem trabalha em que turno, os pedidos de troca e os horários."
        accao={
          vista === "escala" ? (
            <Can requer="hr.shifts.write">
              <Escalar />
            </Can>
          ) : undefined
        }
      />
      <Vistas rotulo="Turnos" vistas={VISTAS} actual={vista} />
      {vista === "trocas" ? <Trocas /> : vista === "tipos" ? <Tipos /> : <Escala />}
    </>
  );
}
