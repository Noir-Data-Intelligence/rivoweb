/**
 * Desempenho: ciclos de avaliação (planear, corrigir, iniciar, fechar) e, no
 * ciclo escolhido, os objectivos com os resultados-chave e o progresso.
 * Fechado o ciclo, tudo fica só de leitura; um objectivo abandonado não recebe
 * progresso.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { uuid } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { BarraProgresso } from "@/ui/BarraProgresso";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { useTodosDepartamentos } from "../api";
import { SelectColaborador } from "../escolhas";
import { EstadoCiclo } from "../estados";
import { errosCiclo, errosObjectivo, errosResultadoChave, lerValorKr } from "../regras";
import {
  useCiclos,
  useCorrigirCiclo,
  useCorrigirObjectivo,
  useDefinirObjectivo,
  useJuntarResultadoChave,
  useMudarCiclo,
  useObjectivosGestao,
  usePlanearCiclo,
  useRegistarProgressoGestao,
  type Ciclo,
  type ObjectivoGestao,
  type ResultadoChaveGestao,
} from "../talento";

/** Com as casas que o valor tem (até 4): «2,5», não «2,50». */
const num = (v: number | string) => formatarNumeroDecimal(String(v), Math.min((String(v).split(".")[1] ?? "").length, 4));
const texto = (v: number | string) => String(v).replace(".", ",");
function mudarUrl(setParams: ReturnType<typeof useSearchParams>[1], k: string, v: string) {
  const n = new URLSearchParams(window.location.search);
  if (v === "") n.delete(k);
  else n.set(k, v);
  setParams(n);
}

function EditarCiclo({ c }: { c?: Ciclo }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({ nome: c?.name ?? "", inicio: c?.startsOn ?? "", fim: c?.endsOn ?? "" });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const planear = usePlanearCiclo();
  const corrigir = useCorrigirCiclo();
  const m = c ? corrigir : planear;
  const idForm = useId();
  const erros = errosCiclo(v);
  return (
    <>
      {c ? (
        <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Planear ciclo
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            planear.reset();
            corrigir.reset();
            setTentou(false);
            setV(inicial());
          }
        }}
        titulo={c ? "Corrigir o ciclo" : "Planear um ciclo de avaliação"}
        descricao="Fica planeado até o iniciar; fechado, os objectivos ficam só de leitura."
        rotuloConfirmar={c ? "Guardar" : "Planear"}
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
            const corpo = { name: normalizarTexto(v.nome), startsOn: v.inicio, endsOn: v.fim };
            if (c) corrigir.mutate({ cycleId: c.cycleId, ...corpo }, { onSuccess: () => setAberto(false) });
            else planear.mutate(corpo, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={150} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => setV((x) => ({ ...x, inicio: e.target.value }))} />}
          </Field>
          <Field rotulo="Fim" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || undefined} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => setV((x) => ({ ...x, fim: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function MudarCiclo({ c, accao }: { c: Ciclo; accao: "activation" | "closure" }) {
  const [aberto, setAberto] = useState(false);
  const mudar = useMudarCiclo();
  const iniciar = accao === "activation";
  return (
    <>
      <Button variante={iniciar ? "primary" : "secondary"} tamanho="sm" onClick={() => setAberto(true)}>
        {iniciar ? "Iniciar ciclo" : "Fechar ciclo"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) mudar.reset();
        }}
        titulo={iniciar ? `Iniciar «${c.name}»?` : `Fechar «${c.name}»?`}
        descricao={iniciar ? "Os colaboradores passam a ver e a actualizar os seus objectivos no portal." : "Os objectivos e o progresso ficam só de leitura. Não se reabre."}
        rotuloConfirmar={iniciar ? "Iniciar" : "Fechar ciclo"}
        variante={iniciar ? "primary" : "destructive"}
        aCarregar={mudar.isPending}
        erro={mudar.error ? <ErrorPanel erro={mudar.error} /> : undefined}
        aoConfirmar={() => (mudar.isPending ? undefined : mudar.mutate({ cycleId: c.cycleId, accao }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

/** Definir (sem `o`) ou corrigir (com `o`, incluindo abandonar). Dono: um colaborador ou um departamento. */
function EditarObjectivo({ ciclo, o }: { ciclo: Ciclo; o?: ObjectivoGestao }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({
    titulo: o?.title ?? "",
    descricao: o?.description ?? "",
    tipoDono: o?.departmentId && !o.ownerEmployeeId ? "departamento" : "colaborador",
    colaborador: o?.ownerEmployeeId ?? "",
    departamento: o?.departmentId ?? "",
    peso: o ? String(o.weight) : "",
    abandonado: o?.dropped ?? false,
  });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const definir = useDefinirObjectivo();
  const corrigir = useCorrigirObjectivo();
  const m = o ? corrigir : definir;
  const departamentos = useTodosDepartamentos(aberto);
  const idForm = useId();
  const erros = errosObjectivo(v);
  return (
    <>
      {o ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir o objectivo ${o.title}`}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Definir objectivo
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
        largo
        titulo={o ? "Corrigir o objectivo" : `Definir um objectivo em «${ciclo.name}»`}
        descricao="O peso conta na média do ciclo (sem peso, vale 100). Os resultados-chave juntam-se depois."
        rotuloConfirmar={o ? "Guardar" : "Definir"}
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
            const d = normalizarTexto(v.descricao, true);
            const comum = {
              title: normalizarTexto(v.titulo),
              description: d === "" ? null : d,
              ownerEmployeeId: v.tipoDono === "colaborador" && v.colaborador !== "" ? v.colaborador : null,
              departmentId: v.tipoDono === "departamento" && v.departamento !== "" ? v.departamento : null,
              weight: v.peso.trim() === "" ? null : Number(v.peso),
            };
            if (o) corrigir.mutate({ objectiveId: o.objectiveId, ...comum, dropped: v.abandonado }, { onSuccess: () => setAberto(false) });
            else definir.mutate({ cycleId: ciclo.cycleId, ...comum }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} />}
          </Field>
          <Field rotulo="De quem é">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tipoDono} onChange={(e) => setV((x) => ({ ...x, tipoDono: e.target.value }))}>
                <option value="colaborador">Um colaborador</option>
                <option value="departamento">Um departamento</option>
              </Select>
            )}
          </Field>
          {v.tipoDono === "colaborador" ? (
            <Field rotulo="Colaborador (opcional)">
              {({ id, descricao }) => <SelectColaborador id={id} aria-describedby={descricao} valor={v.colaborador} aoMudar={(c) => setV((x) => ({ ...x, colaborador: c }))} vazio="Nenhum" />}
            </Field>
          ) : (
            <Field rotulo="Departamento (opcional)">
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={v.departamento} onChange={(e) => setV((x) => ({ ...x, departamento: e.target.value }))}>
                  <option value="">Nenhum</option>
                  {(departamentos.data?.items ?? []).map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field rotulo="Peso de 1 a 100 (opcional)" erro={tentou ? erros.peso : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.peso} onChange={(e) => setV((x) => ({ ...x, peso: e.target.value }))} />}
          </Field>
          {o ? (
            <div className="flex items-end">
              <Checkbox rotulo="Abandonado" ajuda="Sai da média e não recebe mais progresso." checked={v.abandonado} onChange={(e) => setV((x) => ({ ...x, abandonado: e.target.checked }))} />
            </div>
          ) : null}
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => setV((x) => ({ ...x, descricao: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function JuntarKr({ o }: { o: ObjectivoGestao }) {
  const [aberto, setAberto] = useState(false);
  const inicial = { titulo: "", unidade: "", partida: "", meta: "" };
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const juntar = useJuntarResultadoChave();
  const idForm = useId();
  const erros = errosResultadoChave(v);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Juntar um resultado-chave a ${o.title}`}>
        <Plus strokeWidth={1.75} aria-hidden />
        Resultado-chave
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            juntar.reset();
            setTentou(false);
            setV(inicial);
          }
        }}
        titulo={`Resultado-chave de «${o.title}»`}
        descricao="O progresso mede-se do ponto de partida até à meta (que pode ser descer, se for menor)."
        rotuloConfirmar="Juntar"
        aCarregar={juntar.isPending}
        erro={juntar.error ? <ErrorPanel erro={juntar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const meta = lerValorKr(v.meta);
            const partida = v.partida.trim() === "" ? null : lerValorKr(v.partida);
            if (Object.keys(erros).length > 0 || meta === null || juntar.isPending) return;
            const u = normalizarTexto(v.unidade);
            juntar.mutate({ objectiveId: o.objectiveId, title: normalizarTexto(v.titulo), unit: u === "" ? null : u, startValue: partida, targetValue: meta }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} />}
          </Field>
          <Field rotulo="Ponto de partida (opcional)" erro={tentou ? erros.partida : undefined} ajuda="Vazio é zero.">
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.partida} onChange={(e) => setV((x) => ({ ...x, partida: e.target.value }))} />}
          </Field>
          <Field rotulo="Meta" erro={tentou ? erros.meta : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.meta} onChange={(e) => setV((x) => ({ ...x, meta: e.target.value }))} />}
          </Field>
          <Field rotulo="Unidade (opcional)" erro={tentou ? erros.unidade : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.unidade} onChange={(e) => setV((x) => ({ ...x, unidade: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function RegistarValor({ k }: { k: ResultadoChaveGestao }) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(texto(k.currentValue));
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarProgressoGestao();
  const idForm = useId();
  const v = lerValorKr(valor);
  const erro = v === null ? "Número inválido (até 4 casas decimais)." : undefined;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Registar o valor de ${k.title}`}>
        Registar valor
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            registar.reset();
            setTentou(false);
            setValor(texto(k.currentValue));
          }
        }}
        titulo={`Valor actual de «${k.title}»`}
        descricao={`De ${num(k.startValue)} até ${num(k.targetValue)}${k.unit ? ` ${k.unit}` : ""}.`}
        rotuloConfirmar="Registar"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (v === null || registar.isPending) return;
            registar.mutate({ keyResultId: k.keyResultId, currentValue: v }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Valor actual" erro={tentou ? erro : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function CartaoObjectivo({ ciclo, o, nomeDep }: { ciclo: Ciclo; o: ObjectivoGestao; nomeDep: (id: string | null) => string | null }) {
  const { pode } = useUtilizador();
  const editavel = pode("hr.performance.write") && ciclo.status !== "Closed";
  const dono = o.ownerEmployeeId ? (
    <Link to={`/colaboradores/${o.ownerEmployeeId}`} className="underline-offset-4 hover:underline">
      {o.ownerName ?? "Colaborador"}
    </Link>
  ) : o.departmentId ? (
    (nomeDep(o.departmentId) ?? "Departamento")
  ) : (
    "Sem responsável"
  );
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-md font-semibold text-foreground">{o.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {dono} · peso {String(o.weight)}
          </p>
          {o.description ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{o.description}</p> : null}
        </div>
        <div className="flex items-center gap-1">
          {o.dropped ? <Badge>Abandonado</Badge> : null}
          {editavel ? <EditarObjectivo key={`${o.objectiveId}-${o.title}-${String(o.weight)}-${String(o.dropped)}`} ciclo={ciclo} o={o} /> : null}
        </div>
      </div>
      <div className="mt-3">
        <BarraProgresso valor={o.progress} rotulo={`Progresso de ${o.title}`} />
      </div>
      {o.keyResults.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sem resultados-chave.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border" aria-label={`Resultados-chave de ${o.title}`}>
          {o.keyResults.map((k) => (
            <li key={k.keyResultId} className="flex flex-col gap-1 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-foreground">{k.title}</span>
                <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                  {num(k.currentValue)} de {num(k.targetValue)}
                  {k.unit ? ` ${k.unit}` : ""}
                  {editavel && !o.dropped ? <RegistarValor key={`${k.keyResultId}-${String(k.currentValue)}`} k={k} /> : null}
                </span>
              </div>
              <BarraProgresso valor={k.progress} rotulo={`Progresso de ${k.title}`} />
            </li>
          ))}
        </ul>
      )}
      {editavel && !o.dropped ? (
        <div className="mt-2">
          <JuntarKr o={o} />
        </div>
      ) : null}
    </Card>
  );
}

function Objectivos({ ciclo }: { ciclo: Ciclo }) {
  const [params, setParams] = useSearchParams();
  const c = params.get("colaborador");
  const colaborador = c && uuid.safeParse(c).success ? c : null;
  const d = params.get("departamento");
  const departamento = d && uuid.safeParse(d).success ? d : null;
  const lista = useObjectivosGestao({ ciclo: ciclo.cycleId, colaborador, departamento });
  const departamentos = useTodosDepartamentos();
  const nomeDep = (id: string | null) => (id ? (departamentos.data?.items.find((x) => x.departmentId === id)?.name ?? null) : null);
  const ids = { col: useId(), dep: useId() };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex w-64 flex-col gap-1.5">
          <label htmlFor={ids.col} className="text-sm font-medium text-foreground">
            Colaborador
          </label>
          <SelectColaborador id={ids.col} valor={colaborador ?? ""} aoMudar={(v) => mudarUrl(setParams, "colaborador", v)} soActivos={false} vazio="Todos" />
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
        {ciclo.status !== "Closed" ? (
          <Can requer="hr.performance.write">
            <div className="ml-auto">
              <EditarObjectivo ciclo={ciclo} />
            </div>
          </Can>
        ) : null}
      </div>
      {lista.isPending ? (
        <Skeleton className="h-48" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
      ) : lista.data.length === 0 ? (
        <EmptyState frase={colaborador || departamento ? "Sem objectivos com estes filtros." : "Este ciclo ainda não tem objectivos."} />
      ) : (
        <div className="flex flex-col gap-4">
          {[...lista.data]
            .sort((a, b) => Number(a.dropped) - Number(b.dropped) || a.title.localeCompare(b.title))
            .map((o) => (
              <CartaoObjectivo key={o.objectiveId} ciclo={ciclo} o={o} nomeDep={nomeDep} />
            ))}
        </div>
      )}
    </>
  );
}

export default function Desempenho() {
  const [params, setParams] = useSearchParams();
  const ciclos = useCiclos();
  const id = useId();
  const lista = ciclos.data ? [...ciclos.data].sort((a, b) => b.startsOn.localeCompare(a.startsOn)) : [];
  const pedido = params.get("ciclo");
  const ciclo = lista.find((c) => c.cycleId === pedido) ?? lista.find((c) => c.status === "Active") ?? lista[0];
  return (
    <>
      <PageHeader
        titulo="Desempenho"
        descricao="Ciclos de avaliação, objectivos e resultados-chave."
        accao={
          <Can requer="hr.performance.write">
            <EditarCiclo />
          </Can>
        }
      />
      {ciclos.isPending ? (
        <Skeleton className="h-32" />
      ) : ciclos.error ? (
        <ErrorPanel erro={ciclos.error} tentarDeNovo={() => void ciclos.refetch()} />
      ) : !ciclo ? (
        <EmptyState frase="Ainda não há ciclos de avaliação." />
      ) : (
        <>
          <Card className="mb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex w-72 flex-col gap-1.5">
                <label htmlFor={id} className="text-sm font-medium text-foreground">
                  Ciclo
                </label>
                <Select id={id} value={ciclo.cycleId} onChange={(e) => mudarUrl(setParams, "ciclo", e.target.value)}>
                  {lista.map((c) => (
                    <option key={c.cycleId} value={c.cycleId}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              {ciclo.status !== "Closed" ? (
                <Can requer="hr.performance.write">
                  <div className="flex flex-wrap gap-2">
                    <EditarCiclo key={`${ciclo.cycleId}-${ciclo.name}-${ciclo.startsOn}-${ciclo.endsOn}`} c={ciclo} />
                    {ciclo.status === "Planned" ? <MudarCiclo c={ciclo} accao="activation" /> : null}
                    <MudarCiclo c={ciclo} accao="closure" />
                  </div>
                </Can>
              ) : null}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <EstadoCiclo estado={ciclo.status} />
              {formatarData(ciclo.startsOn)} a {formatarData(ciclo.endsOn)} · {String(ciclo.objectives)} {Number(ciclo.objectives) === 1 ? "objectivo" : "objectivos"}
            </p>
            <div className="mt-3">
              <BarraProgresso valor={ciclo.averageProgress} rotulo={`Progresso médio de ${ciclo.name}`} />
            </div>
          </Card>
          {ciclo.status === "Closed" ? <Alert tom="info" className="mb-4" titulo="Ciclo fechado: os objectivos são só de leitura." /> : null}
          <Objectivos key={ciclo.cycleId} ciclo={ciclo} />
        </>
      )}
    </>
  );
}
