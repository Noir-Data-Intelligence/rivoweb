/**
 * O trabalho de um projecto: tempo registado, orçamento por linhas,
 * ficheiros, recursos alocados e visibilidade ao cliente. Cada escolha de
 * pessoa, viatura ou cliente só para quem lê essa área (B38).
 */
import { Download, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useTodosClientes } from "@/features/clientes";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { descarregar } from "@/lib/api/download";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useEscrita } from "@/lib/api/escrita";
import {
  useAcaoProjecto,
  useFicheirosProjecto,
  useOrcamentoLinhas,
  useTempo,
  useViaturas,
  useVisibilidade,
  type Alocacao,
  type FicheiroProjecto,
  type LinhaOrcamento,
  type Projecto,
  type RegistoTempo,
} from "./api";
import { usePessoas } from "./comum";
import {
  erroFimAlocacao,
  erroMotivoFicheiro,
  errosAlocacao,
  errosLinhaOrcamento,
  errosTempo,
  linhaOrcamentoParaApi,
  tempoParaApi,
  temErros,
  type CamposLinhaOrcamento,
  type CamposTempo,
} from "./regras";

const horas = (h: number | string) => `${formatarNumeroDecimal(String(h), 2)} h`;

// --- Tempo

function RegistarTempo({ p }: { p: Projecto }) {
  const vazio = (): CamposTempo => ({ pessoa: "", tarefa: "", dia: hojeIso(), horas: "", descricao: "", facturavel: true });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const pessoas = usePessoas();
  const idForm = useId();
  const erros = errosTempo(v, hojeIso());
  const campo = (k: keyof CamposTempo) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(vazio());
    else {
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => fechar(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar tempo
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Tempo · ${p.name}`} rotuloConfirmar="Registar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "tempo", corpo: tempoParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Colaborador" erro={tentou ? erros.pessoa : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.pessoa} onChange={campo("pessoa")}>
                <option value="">Escolha…</option>
                {pessoas.activos.map((c) => (
                  <option key={c.employeeId} value={c.employeeId}>
                    {c.fullName}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Tarefa (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tarefa} onChange={campo("tarefa")}>
                <option value="">Do projecto em geral</option>
                {p.tasks
                  .filter((t) => t.status !== "Cancelled")
                  .map((t) => (
                    <option key={t.taskId} value={t.taskId}>
                      {t.title}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Dia" erro={tentou ? erros.dia : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} value={v.dia} onChange={campo("dia")} />}
          </Field>
          <Field rotulo="Horas" erro={tentou ? erros.horas : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.horas} onChange={campo("horas")} />}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={campo("descricao")} />}
          </Field>
          <div className="sm:col-span-2">
            <Checkbox rotulo="Facturável" checked={v.facturavel} onChange={(e) => setV((x) => ({ ...x, facturavel: e.target.checked }))} />
          </div>
        </form>
      </Confirmar>
    </>
  );
}

function ApagarTempo({ p, r, quem }: { p: Projecto; r: RegistoTempo; quem: string }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Apagar o registo de ${formatarData(r.day)} (${horas(r.hours)})`}>
        Apagar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo="Apagar este registo de tempo?"
        descricao={`${quem} · ${formatarData(r.day)} · ${horas(r.hours)}`}
        rotuloConfirmar="Apagar"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: "apagarTempo", registo: r.entryId }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export function TempoDoProjecto({ p }: { p: Projecto }) {
  const tempo = useTempo({ projecto: p.projectId });
  const pessoas = usePessoas();
  const { pode } = useUtilizador();
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  const nome = (id: string) => pessoas.nome(id) ?? "—";
  const tarefa = (id: string | null) => (id ? (p.tasks.find((t) => t.taskId === id)?.title ?? "Tarefa") : "—");
  const colunas: Coluna<RegistoTempo>[] = [
    { id: "dia", cabecalho: "Dia", celula: (r) => formatarData(r.day) },
    { id: "quem", cabecalho: "Colaborador", esconderAte: "sm", className: "max-w-[12rem] truncate", celula: (r) => nome(r.employeeId) },
    { id: "tarefa", cabecalho: "Tarefa", esconderAte: "md", className: "max-w-[14rem] truncate", celula: (r) => tarefa(r.taskId) },
    { id: "desc", cabecalho: "Descrição", esconderAte: "lg", className: "max-w-[16rem] truncate", celula: (r) => r.description ?? "—" },
    { id: "horas", cabecalho: "Horas", alinhar: "direita", celula: (r) => horas(r.hours) },
    { id: "fact", cabecalho: "Facturável", esconderAte: "sm", celula: (r) => (r.billable ? <Badge tom="sucesso">Sim</Badge> : <Badge tom="neutro">Não</Badge>) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (r: RegistoTempo) => <ApagarTempo p={p} r={r} quem={nome(r.employeeId)} /> }] : []),
  ];
  if (tempo.isPending) return <Skeleton className="h-48" />;
  if (tempo.error) return <ErrorPanel erro={tempo.error} tentarDeNovo={() => void tempo.refetch()} />;
  const t = tempo.data;
  return (
    <div className="flex flex-col gap-6">
      <GrelhaKpis>
        <Kpi rotulo="Horas registadas" valor={horas(t.totalHours)} />
        <Kpi rotulo="Facturáveis" valor={horas(t.billableHours)} />
        <Kpi rotulo="Colaboradores" valor={String(t.byEmployee.length)} />
      </GrelhaKpis>
      {pessoas.le && t.byEmployee.length > 0 ? (
        <Card>
          <CardTitle className="mb-2">Por colaborador</CardTitle>
          <ul className="divide-y divide-border text-sm" aria-label="Horas por colaborador">
            {t.byEmployee.map((b) => (
              <li key={b.employeeId} className="flex justify-between gap-2 py-2">
                <span>{nome(b.employeeId)}</span>
                <span className="tabular-nums">{horas(b.hours)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Registos</CardTitle>
          {escreve && pessoas.le ? <RegistarTempo p={p} /> : null}
        </div>
        {escreve && !pessoas.le ? <Alert tom="info" className="mb-3" titulo="Registar tempo exige escolher o colaborador, o que pede a leitura dos Recursos Humanos (B38)." /> : null}
        <Tabela rotulo="Registos de tempo" colunas={colunas} linhas={t.entries} chave={(r) => r.entryId} aCarregar={false} vazio="Ainda não há tempo registado." />
      </Card>
    </div>
  );
}

// --- Orçamento por linhas

const camposLinha = (l?: LinhaOrcamento): CamposLinhaOrcamento => ({
  categoria: l?.category ?? "",
  descricao: l?.description ?? "",
  previsto: l ? String(l.plannedAmount).replace(".", ",") : "",
  gasto: l ? String(l.actualAmount).replace(".", ",") : "",
});

function FormularioLinha({ p, l, moedaP }: { p: Projecto; l?: LinhaOrcamento; moedaP: string }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => camposLinha(l));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const idForm = useId();
  const erros = errosLinhaOrcamento(v);
  const campo = (k: keyof CamposLinhaOrcamento) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(camposLinha(l));
    else {
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      {l ? (
        <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)} aria-label={`Corrigir a linha ${l.category}`}>
          Corrigir
        </Button>
      ) : (
        <Button tamanho="sm" onClick={() => fechar(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Nova linha
        </Button>
      )}
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={l ? `Linha · ${l.category}` : "Nova linha de orçamento"} rotuloConfirmar="Guardar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "linha", linha: l?.lineId ?? null, corpo: linhaOrcamentoParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Categoria" ajuda="Por exemplo: mão-de-obra, materiais, deslocações." erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.categoria} onChange={campo("categoria")} />}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={campo("descricao")} />}
          </Field>
          <Field rotulo={`Previsto em ${moedaP}`} erro={tentou ? erros.previsto : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.previsto} onChange={campo("previsto")} />}
          </Field>
          <Field rotulo={`Gasto em ${moedaP} (opcional)`} erro={tentou ? erros.gasto : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.gasto} onChange={campo("gasto")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function ApagarLinha({ p, l }: { p: Projecto; l: LinhaOrcamento }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Apagar a linha ${l.category}`}>
        Apagar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo={`Apagar a linha «${l.category}»?`}
        rotuloConfirmar="Apagar"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: "apagarLinha", linha: l.lineId }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export function OrcamentoDoProjecto({ p }: { p: Projecto }) {
  const orc = useOrcamentoLinhas(p.projectId);
  const { pode } = useUtilizador();
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  if (orc.isPending) return <Skeleton className="h-48" />;
  if (orc.error) return <ErrorPanel erro={orc.error} tentarDeNovo={() => void orc.refetch()} />;
  const o = orc.data;
  const m = o.currency ?? p.budget?.currency ?? "AOA";
  const colunas: Coluna<LinhaOrcamento>[] = [
    {
      id: "cat",
      cabecalho: "Categoria",
      className: "max-w-[16rem]",
      celula: (l) => (
        <span className="flex flex-col">
          <span className="truncate font-medium">{l.category}</span>
          {l.description ? <span className="truncate text-xs text-muted-foreground">{l.description}</span> : null}
        </span>
      ),
    },
    { id: "prev", cabecalho: "Previsto", alinhar: "direita", celula: (l) => moeda(l.plannedAmount, m) },
    { id: "gasto", cabecalho: "Gasto", alinhar: "direita", celula: (l) => moeda(l.actualAmount, m) },
    { id: "desvio", cabecalho: "Desvio", alinhar: "direita", esconderAte: "sm", celula: (l) => moeda(l.variance, m) },
    ...(escreve
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (l: LinhaOrcamento) => (
              <span className="inline-flex gap-1">
                <FormularioLinha p={p} l={l} moedaP={m} />
                <ApagarLinha p={p} l={l} />
              </span>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <GrelhaKpis>
        <Kpi rotulo="Aprovado" valor={o.approvedAmount === null ? "—" : moeda(o.approvedAmount, m)} />
        <Kpi rotulo="Previsto nas linhas" valor={moeda(o.plannedTotal, m)} />
        <Kpi rotulo="Gasto" valor={moeda(o.actualTotal, m)} />
        <Kpi rotulo="Desvio" valor={moeda(o.variance, m)} detalhe="Previsto menos gasto" />
      </GrelhaKpis>
      {o.plannedExceedsApproved ? <Alert tom="aviso" titulo="O previsto nas linhas passa o orçamento aprovado." /> : null}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Linhas</CardTitle>
          {escreve ? <FormularioLinha p={p} moedaP={m} /> : null}
        </div>
        <Tabela rotulo="Linhas do orçamento" colunas={colunas} linhas={o.lines} chave={(l) => l.lineId} aCarregar={false} vazio="Sem linhas de orçamento." />
      </Card>
    </div>
  );
}

// --- Ficheiros

function Anexar({ p }: { p: Projecto }) {
  const [aberto, setAberto] = useState(false);
  const [doc, setDoc] = useState<Documento | null>(null);
  const [categoria, setCategoria] = useState("");
  const [tarefa, setTarefa] = useState("");
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const cat = normalizarTexto(categoria);
  const erros = { doc: doc === null ? "Carregue o ficheiro." : undefined, categoria: cat.length > 100 ? "No máximo 100 caracteres." : undefined };
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setDoc(null);
      setCategoria("");
      setTarefa("");
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Juntar ficheiro
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Ficheiro · ${p.name}`}
        rotuloConfirmar="Juntar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (temErros(erros) || !doc || accao.isPending) return;
          accao.mutate({ acto: "anexar", corpo: { documentId: doc.documentId, taskId: tarefa === "" ? null : tarefa, category: cat === "" ? null : cat } }, { onSuccess: () => fechar(false) });
        }}
      >
        <div className="grid gap-4">
          <CarregarFicheiro rotulo="Ficheiro" categoria="Projecto" documento={doc} aoMudar={setDoc} />
          {tentou && erros.doc ? (
            <p role="alert" className="text-xs text-danger">
              {erros.doc}
            </p>
          ) : null}
          <Field rotulo="Categoria (opcional)" erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={categoria} onChange={(e) => setCategoria(e.target.value)} />}
          </Field>
          <Field rotulo="Tarefa (opcional)">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tarefa} onChange={(e) => setTarefa(e.target.value)}>
                <option value="">Do projecto em geral</option>
                {p.tasks.map((t) => (
                  <option key={t.taskId} value={t.taskId}>
                    {t.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Confirmar>
    </>
  );
}

function Retirar({ p, f }: { p: Projecto; f: FicheiroProjecto }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const erro = erroMotivoFicheiro(motivo);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Retirar ${f.category}`}>
        Retirar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            accao.reset();
            setMotivo("");
            setTentou(false);
          }
        }}
        titulo={`Retirar «${f.category}» do projecto?`}
        descricao="A ligação e o documento ficam no registo."
        rotuloConfirmar="Retirar"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || accao.isPending) return;
          accao.mutate({ acto: "retirarFicheiro", ficheiro: f.linkId, corpo: { reason: normalizarTexto(motivo, true) } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Motivo" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function Abrir({ f }: { f: FicheiroProjecto }) {
  const d = useEscrita({ mutationFn: () => descarregar(`/documents/${encodeURIComponent(f.documentId)}`, `${f.category}`) });
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={d.isPending} onClick={() => d.mutate()} aria-label={`Descarregar ${f.category}`}>
        <Download strokeWidth={1.75} aria-hidden />
        Descarregar
      </Button>
      {d.error ? <ErrorPanel erro={d.error} /> : null}
    </span>
  );
}

export function FicheirosDoProjecto({ p }: { p: Projecto }) {
  const lista = useFicheirosProjecto(p.projectId);
  const { pode } = useUtilizador();
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  const tarefa = (id: string | null) => (id ? (p.tasks.find((t) => t.taskId === id)?.title ?? "Tarefa") : "—");
  const colunas: Coluna<FicheiroProjecto>[] = [
    { id: "cat", cabecalho: "Ficheiro", celula: (f) => <span className="font-medium">{f.category}</span> },
    { id: "tarefa", cabecalho: "Tarefa", esconderAte: "md", className: "max-w-[14rem] truncate", celula: (f) => tarefa(f.taskId) },
    { id: "quando", cabecalho: "Junto a", esconderAte: "sm", celula: (f) => formatarDataHora(f.attachedAt) },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (f) => (
        <span className="inline-flex gap-1">
          {pode("documents.read") ? <Abrir f={f} /> : null}
          {escreve ? <Retirar p={p} f={f} /> : null}
        </span>
      ),
    },
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Ficheiros</CardTitle>
        {escreve && pode("documents.write") ? <Anexar p={p} /> : null}
      </div>
      {escreve && !pode("documents.write") ? <Alert tom="info" className="mb-3" titulo="Juntar e abrir ficheiros pede acesso aos documentos, que este perfil não tem (B38)." /> : null}
      <Tabela
        rotulo="Ficheiros do projecto"
        colunas={colunas}
        linhas={lista.data}
        chave={(f) => f.linkId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem ficheiros."
      />
    </Card>
  );
}

// --- Recursos

function Alocar({ p }: { p: Projecto }) {
  const pessoas = usePessoas();
  const { pode } = useUtilizador();
  const leFrota = pode("fleet.vehicles.read");
  const viaturas = useViaturas(leFrota);
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ tipo: pessoas.le ? "0" : "1", recurso: "", inicio: hojeIso() });
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const idForm = useId();
  const erros = errosAlocacao(v, p.startDate);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV({ tipo: pessoas.le ? "0" : "1", recurso: "", inicio: hojeIso() });
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Alocar recurso
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Alocar a ${p.name}`} rotuloConfirmar="Alocar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "alocar", corpo: { kind: Number(v.tipo), resourceId: v.recurso, startsOn: v.inicio } }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value, recurso: "" }))}>
                {pessoas.le ? <option value="0">Colaborador</option> : null}
                {leFrota ? <option value="1">Viatura</option> : null}
              </Select>
            )}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={p.startDate} aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => setV((x) => ({ ...x, inicio: e.target.value }))} />}
          </Field>
          <Field rotulo={v.tipo === "0" ? "Colaborador" : "Viatura"} erro={tentou ? erros.recurso : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.recurso} onChange={(e) => setV((x) => ({ ...x, recurso: e.target.value }))}>
                <option value="">Escolha…</option>
                {v.tipo === "0"
                  ? pessoas.activos.map((c) => (
                      <option key={c.employeeId} value={c.employeeId}>
                        {c.fullName}
                      </option>
                    ))
                  : (viaturas.data?.items ?? [])
                      .filter((x) => x.status === "Active")
                      .map((x) => (
                        <option key={x.vehicleId} value={x.vehicleId}>
                          {x.plateNumber} · {x.model}
                        </option>
                      ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function TerminarAlocacao({ p, a, nome }: { p: Projecto; a: Alocacao; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [fim, setFim] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoProjecto(p.projectId);
  const erro = erroFimAlocacao(fim, a.startsOn);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Terminar a alocação de ${nome}`}>
        Terminar
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
        titulo={`Terminar a alocação de ${nome}?`}
        rotuloConfirmar="Terminar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || accao.isPending) return;
          accao.mutate({ acto: "terminarAlocacao", alocacao: a.allocationId, corpo: { endsOn: fim } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Termina a" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" min={a.startsOn} aria-describedby={descricao} invalido={invalido} value={fim} onChange={(e) => setFim(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

export function RecursosDoProjecto({ p }: { p: Projecto }) {
  const pessoas = usePessoas();
  const { pode } = useUtilizador();
  const leFrota = pode("fleet.vehicles.read");
  const viaturas = useViaturas(leFrota);
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  const nome = (a: Alocacao) =>
    a.kind === "Employee" ? (pessoas.nome(a.resourceId) ?? "—") : (() => {
      const x = viaturas.data?.items.find((y) => y.vehicleId === a.resourceId);
      return x ? `${x.plateNumber} · ${x.model}` : "—";
    })();
  const colunas: Coluna<Alocacao>[] = [
    { id: "tipo", cabecalho: "Tipo", celula: (a) => (a.kind === "Employee" ? "Colaborador" : "Viatura") },
    { id: "nome", cabecalho: "Recurso", className: "max-w-[14rem] truncate", celula: (a) => nome(a) },
    { id: "de", cabecalho: "Desde", celula: (a) => formatarData(a.startsOn) },
    { id: "ate", cabecalho: "Até", celula: (a) => (a.endsOn ? formatarData(a.endsOn) : <Badge tom="info">Em curso</Badge>) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (a: Alocacao) => (a.endsOn ? null : <TerminarAlocacao p={p} a={a} nome={nome(a)} />) }] : []),
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Recursos</CardTitle>
        {escreve && (pessoas.le || leFrota) ? <Alocar p={p} /> : null}
      </div>
      {escreve && !pessoas.le && !leFrota ? <Alert tom="info" className="mb-3" titulo="Alocar exige escolher o colaborador ou a viatura, o que pede a leitura dos Recursos Humanos ou da frota (B38)." /> : null}
      <Tabela rotulo="Recursos alocados" colunas={colunas} linhas={p.allocations} chave={(a) => a.allocationId} aCarregar={false} vazio="Sem recursos alocados." />
    </Card>
  );
}

// --- Cliente

export function ClienteDoProjecto({ p }: { p: Projecto }) {
  const vis = useVisibilidade(p.projectId);
  const { pode } = useUtilizador();
  const leClientes = pode("commercial.customers.read");
  const clientes = useTodosClientes(leClientes);
  const escreve = pode("projects.projects.write") && p.status !== "Closed";
  const accao = useAcaoProjecto(p.projectId);
  const [cliente, setCliente] = useState<string | null>(null);
  const id = useId();
  if (vis.isPending) return <Skeleton className="h-32" />;
  if (vis.error) return <ErrorPanel erro={vis.error} tentarDeNovo={() => void vis.refetch()} />;
  const v = vis.data;
  const escolhido = cliente ?? v.customerId ?? "";
  const depois = { onSuccess: () => void vis.refetch() };
  return (
    <Card>
      <CardTitle>Cliente e portal</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">Com um cliente ligado, o projecto pode aparecer no portal desse cliente: progresso, marcos e os comentários dos marcos (o cliente também comenta).</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Cliente</dt>
          <dd className="text-base text-foreground">{v.customerName ?? "Nenhum"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">No portal do cliente</dt>
          <dd className="text-base text-foreground">{v.visibleToCustomer ? "Visível" : "Escondido"}</dd>
        </div>
      </dl>
      {accao.error ? <ErrorPanel erro={accao.error} className="mt-3" /> : null}
      {escreve ? (
        <div className="mt-4 flex flex-col gap-3">
          {leClientes ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor={id} className="text-sm font-medium text-foreground">
                  Ligar a um cliente
                </label>
                <Select id={id} value={escolhido} onChange={(e) => setCliente(e.target.value)}>
                  <option value="">Nenhum</option>
                  {(clientes.data?.items ?? [])
                    .filter((c) => c.status === "Active" || c.customerId === v.customerId)
                    .map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              </div>
              <Button variante="secondary" aCarregar={accao.isPending} disabled={escolhido === (v.customerId ?? "")} onClick={() => accao.mutate({ acto: "visibilidade", corpo: { customerId: escolhido === "" ? null : escolhido, visible: escolhido === "" ? false : v.visibleToCustomer } }, depois)}>
                Guardar cliente
              </Button>
            </div>
          ) : (
            <Alert tom="info" titulo="Ligar o projecto a um cliente exige escolher o cliente, o que pede a leitura dos clientes (B38)." />
          )}
          {v.customerId ? (
            <div>
              <Button aCarregar={accao.isPending} onClick={() => accao.mutate({ acto: "visibilidade", corpo: { customerId: v.customerId, visible: !v.visibleToCustomer } }, depois)}>
                {v.visibleToCustomer ? "Esconder do portal do cliente" : "Mostrar no portal do cliente"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
