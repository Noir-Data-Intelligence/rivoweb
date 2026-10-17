/**
 * Pedidos internos na gestão: a fila (filtros no URL), abrir em nome de um
 * colaborador, e os prazos de resposta e resolução por categoria (SLA).
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { uuid } from "@/lib/validation/text";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { SelectColaborador, useNomeColaborador } from "../escolhas";
import { CATEGORIA_PEDIDO, EstadoPedido, nome, PRIORIDADE_PEDIDO, SlaBadge } from "../estados";
import { erroMensagem, errosSla, horasParaMinutos, MAXIMO_MENSAGEM_PEDIDO, minutosParaHoras } from "../regras";
import {
  useAbrirPedidoEmNome,
  useDefinirSla,
  usePedidosInternos,
  usePoliticasSla,
  type CategoriaPedidoInterno,
  type EstadoPedidoInterno,
  type PedidoInternoGestao,
  type PoliticaSla,
} from "../servicos";

const ESTADOS: Record<EstadoPedidoInterno, string> = { Open: "Abertos", InProgress: "Em curso", Resolved: "Resolvidos", Closed: "Fechados" };
const CATEGORIAS = Object.keys(CATEGORIA_PEDIDO) as CategoriaPedidoInterno[];
const idOuNull = (v: string | null) => (v !== null && uuid.safeParse(v).success ? v : null);
const de = <T extends string>(mapa: Record<string, unknown>, v: string | null) => (v !== null && v in mapa ? (v as T) : null);

function AbrirEmNome() {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState("");
  const [assunto, setAssunto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaPedidoInterno>("HumanResources");
  const [prioridade, setPrioridade] = useState<"Low" | "Normal" | "High" | "Urgent">("Normal");
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirPedidoEmNome();
  const idForm = useId();
  const a = normalizarTexto(assunto);
  const erros = {
    colaborador: colaborador === "" ? "Escolha o colaborador." : undefined,
    assunto: a === "" ? "Indique o assunto." : a.length > 200 ? "No máximo 200 caracteres." : undefined,
    texto: erroMensagem(texto),
  };
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      abrir.reset();
      setTentou(false);
      setColaborador("");
      setAssunto("");
      setTexto("");
      setCategoria("HumanResources");
      setPrioridade("Normal");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir pedido
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Abrir um pedido em nome de um colaborador"
        descricao="Fica em nome do colaborador, que o acompanha no portal. O texto é a primeira mensagem."
        rotuloConfirmar="Abrir pedido"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.colaborador || erros.assunto || erros.texto || abrir.isPending) return;
            abrir.mutate({ requesterEmployeeId: colaborador, subject: a, category: categoria, priority: prioridade, body: normalizarTexto(texto, true) }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
          </Field>
          <Field rotulo="Assunto" erro={tentou ? erros.assunto : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={assunto} onChange={(e) => setAssunto(e.target.value)} />}
          </Field>
          <Field rotulo="Categoria">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaPedidoInterno)}>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {nome(CATEGORIA_PEDIDO, c)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Prioridade">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={prioridade} onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}>
                {Object.entries(PRIORIDADE_PEDIDO).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Mensagem" erro={tentou ? erros.texto : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={4} maxLength={MAXIMO_MENSAGEM_PEDIDO} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Fila() {
  const [params, setParams] = useSearchParams();
  const estado = de<EstadoPedidoInterno>(ESTADOS, params.get("estado"));
  const categoria = de<CategoriaPedidoInterno>(CATEGORIA_PEDIDO, params.get("categoria"));
  const requerente = idOuNull(params.get("colaborador"));
  const responsavel = idOuNull(params.get("responsavel"));
  const lista = usePedidosInternos({ estado, categoria, requerente, responsavel });
  const nomeDe = useNomeColaborador();
  const ids = { estado: useId(), categoria: useId(), requerente: useId(), responsavel: useId() };
  // Do URL actual, não do último render: duas escolhas seguidas não se apagam (as navegações vão em transição).
  const filtrar = (k: string, v: string) => {
    const n = new URLSearchParams(window.location.search);
    if (v === "") n.delete(k);
    else n.set(k, v);
    setParams(n);
  };
  const colunas: Coluna<PedidoInternoGestao>[] = [
    {
      id: "assunto",
      cabecalho: "Pedido",
      celula: (p) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/pedidos-internos/${p.ticketId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {p.subject}
          </Link>
          <span className="truncate text-sm text-muted-foreground">
            {nomeDe(p.requesterEmployeeId)} · {nome(CATEGORIA_PEDIDO, p.category)}
          </span>
        </div>
      ),
      className: "max-w-[20rem]",
    },
    { id: "prioridade", cabecalho: "Prioridade", esconderAte: "md", celula: (p) => nome(PRIORIDADE_PEDIDO, p.priority) },
    { id: "responsavel", cabecalho: "Responsável", esconderAte: "lg", celula: (p) => (p.assigneeEmployeeId ? nomeDe(p.assigneeEmployeeId) : "—") },
    { id: "aberto", cabecalho: "Aberto em", esconderAte: "sm", celula: (p) => formatarDataHora(p.openedAt) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (p) => (
        <div className="flex flex-wrap gap-1">
          <EstadoPedido estado={p.status} />
          <SlaBadge p={p} />
        </div>
      ),
    },
  ];
  const linhas = lista.data ? [...lista.data].sort((x, y) => y.openedAt.localeCompare(x.openedAt)) : undefined;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex w-40 flex-col gap-1.5">
          <label htmlFor={ids.estado} className="text-sm font-medium text-foreground">
            Estado
          </label>
          <Select id={ids.estado} value={estado ?? ""} onChange={(e) => filtrar("estado", e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex w-52 flex-col gap-1.5">
          <label htmlFor={ids.categoria} className="text-sm font-medium text-foreground">
            Categoria
          </label>
          <Select id={ids.categoria} value={categoria ?? ""} onChange={(e) => filtrar("categoria", e.target.value)}>
            <option value="">Todas</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {nome(CATEGORIA_PEDIDO, c)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex w-64 flex-col gap-1.5">
          <label htmlFor={ids.requerente} className="text-sm font-medium text-foreground">
            Colaborador
          </label>
          <SelectColaborador id={ids.requerente} valor={requerente ?? ""} aoMudar={(v) => filtrar("colaborador", v)} soActivos={false} vazio="Todos" />
        </div>
        <div className="flex w-64 flex-col gap-1.5">
          <label htmlFor={ids.responsavel} className="text-sm font-medium text-foreground">
            Responsável
          </label>
          <SelectColaborador id={ids.responsavel} valor={responsavel ?? ""} aoMudar={(v) => filtrar("responsavel", v)} soActivos={false} vazio="Todos" />
        </div>
      </div>
      <Tabela
        rotulo="Pedidos internos"
        colunas={colunas}
        linhas={linhas}
        chave={(p) => p.ticketId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado || categoria || requerente || responsavel ? "Sem pedidos com estes filtros." : "Ainda não há pedidos internos."}
      />
    </>
  );
}

function DefinirSla({ categoria, actual }: { categoria: CategoriaPedidoInterno; actual: PoliticaSla | undefined }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({ resposta: actual ? minutosParaHoras(actual.responseMinutes) : "", resolucao: actual ? minutosParaHoras(actual.resolutionMinutes) : "" });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const definir = useDefinirSla();
  const idForm = useId();
  const erros = errosSla(v.resposta, v.resolucao);
  const n = nome(CATEGORIA_PEDIDO, categoria);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Definir os prazos de ${n}`}>
        Definir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            definir.reset();
            setTentou(false);
            setV(inicial());
          }
        }}
        titulo={`Prazos: ${n}`}
        descricao="Contam desde a abertura do pedido. A primeira resposta da equipa cumpre o prazo de resposta. Aplica-se também aos pedidos já abertos."
        rotuloConfirmar="Guardar"
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
            const r = horasParaMinutos(v.resposta);
            const s = horasParaMinutos(v.resolucao);
            if (erros.resposta || erros.resolucao || r === null || s === null || definir.isPending) return;
            definir.mutate({ category: categoria, responseMinutes: r, resolutionMinutes: s }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Responder em (horas)" erro={tentou ? erros.resposta : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.resposta} onChange={(e) => setV((x) => ({ ...x, resposta: e.target.value }))} />}
          </Field>
          <Field rotulo="Resolver em (horas)" erro={tentou ? erros.resolucao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.resolucao} onChange={(e) => setV((x) => ({ ...x, resolucao: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Prazos() {
  const { pode } = useUtilizador();
  const sla = usePoliticasSla();
  type Linha = { categoria: CategoriaPedidoInterno; p: PoliticaSla | undefined };
  const linhas: Linha[] | undefined = sla.data ? CATEGORIAS.map((c) => ({ categoria: c, p: sla.data.find((x) => x.category === c) })) : undefined;
  const horas = (m: number | string) => `${minutosParaHoras(m)} h`;
  const colunas: Coluna<Linha>[] = [
    { id: "categoria", cabecalho: "Categoria", celula: (l) => <span className="font-medium">{nome(CATEGORIA_PEDIDO, l.categoria)}</span> },
    { id: "resposta", cabecalho: "Responder em", alinhar: "direita", celula: (l) => (l.p ? horas(l.p.responseMinutes) : "Sem prazo") },
    { id: "resolucao", cabecalho: "Resolver em", alinhar: "direita", celula: (l) => (l.p ? horas(l.p.resolutionMinutes) : "Sem prazo") },
    ...(pode("hr.tickets.write") ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (l: Linha) => <DefinirSla categoria={l.categoria} actual={l.p} /> }] : []),
  ];
  return (
    <Tabela
      rotulo="Prazos por categoria"
      colunas={colunas}
      linhas={linhas}
      chave={(l) => l.categoria}
      aCarregar={sla.isPending}
      erro={sla.error ? <ErrorPanel erro={sla.error} tentarDeNovo={() => void sla.refetch()} /> : undefined}
      vazio="Sem categorias."
    />
  );
}

const VISTAS: readonly Vista<"fila" | "prazos">[] = [
  { valor: "fila", texto: "Pedidos" },
  { valor: "prazos", texto: "Prazos (SLA)" },
];

export default function PedidosInternos() {
  const vista = useVista(VISTAS);
  return (
    <>
      <PageHeader
        titulo="Pedidos internos"
        descricao="O que os colaboradores pedem aos serviços, e os prazos para responder e resolver."
        accao={
          <Can requer="hr.tickets.write">
            <AbrirEmNome />
          </Can>
        }
      />
      <Vistas rotulo="Pedidos internos" vistas={VISTAS} actual={vista} />
      {vista === "prazos" ? <Prazos /> : <Fila />}
    </>
  );
}
