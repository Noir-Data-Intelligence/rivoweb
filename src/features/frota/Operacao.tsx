/**
 * As vistas da ficha de uma viatura: manutenção (registos e planos),
 * atribuições, viagens, custos e documentos. Uma viatura inactiva não recebe
 * manutenção, atribuições, planos, viagens nem despesas.
 */
import Big from "big.js";
import { Download } from "lucide-react";
import { useId, useState } from "react";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { descarregar } from "@/lib/api/download";
import { useEscrita } from "@/lib/api/escrita";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal, formatarTamanho } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAcaoViatura, useDocumentosViatura, type Atribuicao, type Despesa, type DocumentoViatura, type Plano, type RegistoManutencao, type Viagem, type Viatura } from "./api";
import { CATEGORIA_DESPESA, TIPO_MANUTENCAO, useMotoristas } from "./comum";
import {
  despesaParaApi,
  dinheiroOuNulo,
  erroFimAtribuicao,
  erroMotivo,
  errosAtribuicao,
  errosDespesa,
  errosDocumento,
  errosFecho,
  errosManutencao,
  errosPlano,
  errosViagem,
  planoParaApi,
  temErros,
  viagemParaApi,
  type CamposDespesa,
  type CamposFecho,
  type CamposManutencao,
  type CamposPlano,
  type CamposViagem,
  type CategoriaDespesa,
} from "./regras";

const km = (v: number | string) => `${formatarNumeroDecimal(String(v), 0)} km`;
const soma = (valores: (number | string | null)[]) => valores.reduce<Big>((t, v) => (v === null ? t : t.plus(String(v))), new Big(0));

/** Quem escreve e se a viatura ainda recebe trabalho. */
function useEscreve(x: Viatura) {
  const { pode } = useUtilizador();
  const escreve = pode("fleet.vehicles.write");
  return { escreve, activa: escreve && x.status !== "Inactive" };
}

// --- Manutenção

function AbrirManutencao({ x }: { x: Viatura }) {
  const vazio = (): CamposManutencao => ({ tipo: "Corrective", descricao: "", inicio: hojeIso() });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const idForm = useId();
  const erros = errosManutencao(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(vazio());
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Enviar para manutenção
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Manutenção · ${x.plateNumber}`} descricao="A viatura fica «em manutenção» até fechar o registo." rotuloConfirmar="Abrir" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "abrirManutencao", corpo: { type: v.tipo, description: normalizarTexto(v.descricao, true), startedOn: v.inicio } }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => setV((y) => ({ ...y, tipo: e.target.value as CamposManutencao["tipo"] }))}>
                {Object.entries(TIPO_MANUTENCAO).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => setV((y) => ({ ...y, inicio: e.target.value }))} />}
          </Field>
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => setV((y) => ({ ...y, descricao: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function FecharManutencao({ x, m }: { x: Viatura; m: RegistoManutencao }) {
  const vazio = (): CamposFecho => ({ fim: hojeIso() < m.startedOn ? m.startedOn : hojeIso(), custo: "" });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const idForm = useId();
  const erros = errosFecho(v, m.startedOn);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Fechar a manutenção de ${formatarData(m.startedOn)}`}>
        Fechar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            setV(vazio());
            setTentou(false);
            accao.reset();
          }
        }}
        titulo="Fechar a manutenção"
        descricao={`${m.description} · desde ${formatarData(m.startedOn)}. A viatura volta a activa.`}
        rotuloConfirmar="Fechar manutenção"
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
            accao.mutate({ acto: "fecharManutencao", manutencao: m.maintenanceId, corpo: { endedOn: v.fim, cost: dinheiroOuNulo(v.custo) } }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Fim" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={m.startedOn} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => setV((y) => ({ ...y, fim: e.target.value }))} />}
          </Field>
          <Field rotulo="Custo em AOA (opcional)" erro={tentou ? erros.custo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.custo} onChange={(e) => setV((y) => ({ ...y, custo: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function AgendarPlano({ x }: { x: Viatura }) {
  const vazio = (): CamposPlano => ({ descricao: "", intervalo: "", primeira: "" });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const idForm = useId();
  const erros = errosPlano(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(vazio());
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" variante="secondary" onClick={() => setAberto(true)}>
        Novo plano
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Plano preventivo · ${x.plateNumber}`} descricao="Cada ciclo concluído reagenda o seguinte para a data de conclusão mais o intervalo." rotuloConfirmar="Agendar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "agendarPlano", corpo: planoParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => setV((y) => ({ ...y, descricao: e.target.value }))} />}
          </Field>
          <Field rotulo="Intervalo em dias" erro={tentou ? erros.intervalo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.intervalo} onChange={(e) => setV((y) => ({ ...y, intervalo: e.target.value }))} />}
          </Field>
          <Field rotulo="Primeira data" erro={tentou ? erros.primeira : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.primeira} onChange={(e) => setV((y) => ({ ...y, primeira: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function ConcluirCiclo({ x, p }: { x: Viatura; p: Plano }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const erro = data === "" ? "Indique a data." : undefined;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Concluir o ciclo de ${p.description}`}>
        Concluir ciclo
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            setTentou(false);
            accao.reset();
          }
        }}
        titulo={`Concluir o ciclo · ${p.description}`}
        descricao={`O próximo fica para a data de conclusão mais ${String(p.intervalDays)} dias.`}
        rotuloConfirmar="Concluir"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || accao.isPending) return;
          accao.mutate({ acto: "concluirCiclo", plano: p.planId, corpo: { completedOn: data } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Concluído a" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function CancelarPlano({ x, p }: { x: Viatura; p: Plano }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Cancelar o plano ${p.description}`}>
        Cancelar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo={`Cancelar o plano «${p.description}»?`}
        descricao="Deixa de prever manutenções. Não se desfaz."
        rotuloConfirmar="Cancelar plano"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: "cancelarPlano", plano: p.planId }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export function ManutencaoDaViatura({ x }: { x: Viatura }) {
  const { escreve, activa } = useEscreve(x);
  const registos: Coluna<RegistoManutencao>[] = [
    { id: "tipo", cabecalho: "Tipo", celula: (m) => TIPO_MANUTENCAO[m.type as keyof typeof TIPO_MANUTENCAO] ?? m.type },
    { id: "desc", cabecalho: "Descrição", className: "max-w-[18rem]", celula: (m) => <span className="line-clamp-2 break-words">{m.description}</span> },
    { id: "periodo", cabecalho: "Período", esconderAte: "sm", celula: (m) => `${formatarData(m.startedOn)} → ${m.endedOn ? formatarData(m.endedOn) : "em curso"}` },
    { id: "custo", cabecalho: "Custo", alinhar: "direita", esconderAte: "md", celula: (m) => (m.cost === null ? "—" : moeda(m.cost)) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (m: RegistoManutencao) => (m.endedOn ? null : <FecharManutencao x={x} m={m} />) }] : []),
  ];
  const planos: Coluna<Plano>[] = [
    { id: "desc", cabecalho: "Plano", className: "max-w-[18rem]", celula: (p) => <span className="break-words font-medium">{p.description}</span> },
    { id: "intervalo", cabecalho: "Intervalo", esconderAte: "sm", celula: (p) => `cada ${String(p.intervalDays)} dias` },
    {
      id: "proxima",
      cabecalho: "Próxima",
      celula: (p) =>
        p.isActive ? (
          <span className="inline-flex flex-wrap items-center gap-1">
            {formatarData(p.nextDueOn)}
            {p.isOverdue ? <Badge tom="erro">Em atraso</Badge> : null}
          </span>
        ) : (
          <Badge>Cancelado</Badge>
        ),
    },
    ...(escreve
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (p: Plano) =>
              p.isActive ? (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  {activa ? <ConcluirCiclo x={x} p={p} /> : null}
                  <CancelarPlano x={x} p={p} />
                </span>
              ) : null,
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Registos de manutenção</CardTitle>
          {activa && x.status === "Active" ? <AbrirManutencao x={x} /> : null}
        </div>
        <Tabela rotulo="Registos de manutenção" colunas={registos} linhas={[...x.maintenances].sort((a, b) => b.startedOn.localeCompare(a.startedOn))} chave={(m) => m.maintenanceId} aCarregar={false} vazio="Sem manutenções registadas." />
      </Card>
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Planos preventivos</CardTitle>
          {activa ? <AgendarPlano x={x} /> : null}
        </div>
        <Tabela rotulo="Planos preventivos" colunas={planos} linhas={x.plans} chave={(p) => p.planId} aCarregar={false} vazio="Sem planos." />
      </Card>
    </div>
  );
}

// --- Atribuições

function Atribuir({ x }: { x: Viatura }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ pessoa: "", inicio: hojeIso() });
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const motoristas = useMotoristas();
  const idForm = useId();
  const erros = errosAtribuicao(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV({ pessoa: "", inicio: hojeIso() });
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Atribuir
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Atribuir ${x.plateNumber}`} descricao="Uma atribuição de cada vez: para reatribuir, termine a actual." rotuloConfirmar="Atribuir" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "atribuir", corpo: { employeeId: v.pessoa, startedOn: v.inicio } }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Colaborador" erro={tentou ? erros.pessoa : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.pessoa} onChange={(e) => setV((y) => ({ ...y, pessoa: e.target.value }))}>
                <option value="">Escolha…</option>
                {motoristas.activos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Desde" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => setV((y) => ({ ...y, inicio: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function TerminarAtribuicao({ x, a, nome }: { x: Viatura; a: Atribuicao; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [fim, setFim] = useState(hojeIso() < a.startedOn ? a.startedOn : hojeIso());
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const erro = erroFimAtribuicao(fim, a.startedOn);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Terminar a atribuição a ${nome}`}>
        Terminar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(y) => {
          setAberto(y);
          if (!y) {
            setTentou(false);
            accao.reset();
          }
        }}
        titulo={`Terminar a atribuição a ${nome}?`}
        rotuloConfirmar="Terminar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || accao.isPending) return;
          accao.mutate({ acto: "terminarAtribuicao", atribuicao: a.assignmentId, corpo: { endedOn: fim } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Termina a" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" min={a.startedOn} aria-describedby={descricao} invalido={invalido} value={fim} onChange={(e) => setFim(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

export function AtribuicoesDaViatura({ x }: { x: Viatura }) {
  const { escreve, activa } = useEscreve(x);
  const motoristas = useMotoristas();
  const nome = (id: string) => motoristas.nome(id) ?? "—";
  const aberta = x.assignments.some((a) => !a.endedOn);
  const colunas: Coluna<Atribuicao>[] = [
    { id: "quem", cabecalho: "Colaborador", className: "max-w-[14rem] truncate", celula: (a) => nome(a.employeeId) },
    { id: "desde", cabecalho: "Desde", celula: (a) => formatarData(a.startedOn) },
    { id: "ate", cabecalho: "Até", celula: (a) => (a.endedOn ? formatarData(a.endedOn) : <Badge tom="info">Em curso</Badge>) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (a: Atribuicao) => (a.endedOn ? null : <TerminarAtribuicao x={x} a={a} nome={nome(a.employeeId)} />) }] : []),
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Atribuições</CardTitle>
        {activa && motoristas.le && !aberta ? <Atribuir x={x} /> : null}
      </div>
      {activa && !motoristas.le ? <Alert tom="info" className="mb-3" titulo="Atribuir exige escolher o colaborador, o que pede a lista dos activos fixos, que este perfil não tem (B40)." /> : null}
      <Tabela rotulo="Atribuições" colunas={colunas} linhas={[...x.assignments].sort((a, b) => b.startedOn.localeCompare(a.startedOn))} chave={(a) => a.assignmentId} aCarregar={false} vazio="Nunca foi atribuída." />
    </Card>
  );
}

// --- Viagens

function RegistarViagem({ x }: { x: Viatura }) {
  const ultimo = x.trips.reduce<string>((m, t) => (new Big(String(t.endOdometer)).gt(m) ? String(t.endOdometer) : m), "0");
  const vazio = (): CamposViagem => ({ motorista: "", inicio: hojeIso(), fim: hojeIso(), kmInicio: ultimo === "0" ? "" : ultimo.replace(".", ","), kmFim: "", motivo: "" });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const motoristas = useMotoristas();
  const idForm = useId();
  const erros = errosViagem(v);
  const campo = (k: keyof CamposViagem) => (e: { target: { value: string } }) => setV((y) => ({ ...y, [k]: e.target.value }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(vazio());
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Registar viagem
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} largo titulo={`Viagem · ${x.plateNumber}`} descricao="Uma viagem já feita, para o controlo dos quilómetros." rotuloConfirmar="Registar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "viagem", corpo: viagemParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          {motoristas.le ? (
            <Field rotulo="Motorista (opcional)" className="sm:col-span-2">
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={v.motorista} onChange={campo("motorista")}>
                  <option value="">Sem motorista indicado</option>
                  {motoristas.activos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={campo("inicio")} />}
          </Field>
          <Field rotulo="Fim" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || undefined} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={campo("fim")} />}
          </Field>
          <Field rotulo="Odómetro à partida (km)" erro={tentou ? erros.kmInicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.kmInicio} onChange={campo("kmInicio")} />}
          </Field>
          <Field rotulo="Odómetro à chegada (km)" erro={tentou ? erros.kmFim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.kmFim} onChange={campo("kmFim")} />}
          </Field>
          <Field rotulo="Motivo (opcional)" erro={tentou ? erros.motivo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.motivo} onChange={campo("motivo")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export function ViagensDaViatura({ x }: { x: Viatura }) {
  const { activa } = useEscreve(x);
  const motoristas = useMotoristas();
  const colunas: Coluna<Viagem>[] = [
    { id: "periodo", cabecalho: "Período", celula: (t) => (t.startedOn === t.endedOn ? formatarData(t.startedOn) : `${formatarData(t.startedOn)} → ${formatarData(t.endedOn)}`) },
    { id: "quem", cabecalho: "Motorista", esconderAte: "sm", className: "max-w-[12rem] truncate", celula: (t) => (t.driverId ? (motoristas.nome(t.driverId) ?? "—") : "Não indicado") },
    { id: "odometro", cabecalho: "Odómetro", esconderAte: "lg", celula: (t) => `${km(t.startOdometer)} → ${km(t.endOdometer)}` },
    { id: "dist", cabecalho: "Distância", alinhar: "direita", celula: (t) => km(t.distance) },
    { id: "motivo", cabecalho: "Motivo", esconderAte: "md", className: "max-w-[16rem] truncate", celula: (t) => t.purpose ?? "—" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <GrelhaKpis>
        <Kpi rotulo="Viagens" valor={String(x.trips.length)} />
        <Kpi rotulo="Quilómetros" valor={km(soma(x.trips.map((t) => t.distance)).toString())} />
      </GrelhaKpis>
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Viagens</CardTitle>
          {activa ? <RegistarViagem x={x} /> : null}
        </div>
        <Tabela rotulo="Viagens" colunas={colunas} linhas={[...x.trips].sort((a, b) => b.startedOn.localeCompare(a.startedOn))} chave={(t) => t.tripId} aCarregar={false} vazio="Sem viagens registadas." />
      </Card>
    </div>
  );
}

// --- Custos

function RegistarDespesa({ x }: { x: Viatura }) {
  const vazio = (): CamposDespesa => ({ categoria: "Fuel", valor: "", data: hojeIso(), descricao: "" });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const idForm = useId();
  const erros = errosDespesa(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(vazio());
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Registar despesa
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={`Despesa · ${x.plateNumber}`} descricao="Sempre em AOA. Não lança na contabilidade." rotuloConfirmar="Registar" aCarregar={accao.isPending} erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            accao.mutate({ acto: "despesa", corpo: despesaParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Categoria">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.categoria} onChange={(e) => setV((y) => ({ ...y, categoria: e.target.value as CategoriaDespesa }))}>
                {Object.entries(CATEGORIA_DESPESA).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Data" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.data} onChange={(e) => setV((y) => ({ ...y, data: e.target.value }))} />}
          </Field>
          <Field rotulo="Valor em AOA" erro={tentou ? erros.valor : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={(e) => setV((y) => ({ ...y, valor: e.target.value }))} />}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => setV((y) => ({ ...y, descricao: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export function CustosDaViatura({ x }: { x: Viatura }) {
  const { activa } = useEscreve(x);
  const porCategoria = (c: CategoriaDespesa) => moeda(soma(x.expenses.filter((d) => d.category === c).map((d) => d.amount)).toFixed(2));
  const colunas: Coluna<Despesa>[] = [
    { id: "data", cabecalho: "Data", celula: (d) => formatarData(d.occurredOn) },
    { id: "cat", cabecalho: "Categoria", celula: (d) => CATEGORIA_DESPESA[d.category as CategoriaDespesa] ?? d.category },
    { id: "desc", cabecalho: "Descrição", esconderAte: "md", className: "max-w-[16rem] truncate", celula: (d) => d.description ?? "—" },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (d) => moeda(d.amount) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <GrelhaKpis>
        <Kpi rotulo="Combustível" valor={porCategoria("Fuel")} />
        <Kpi rotulo="Portagens" valor={porCategoria("Toll")} />
        <Kpi rotulo="Estacionamento" valor={porCategoria("Parking")} />
        <Kpi rotulo="Manutenções" valor={moeda(soma(x.maintenances.map((m) => m.cost)).toFixed(2))} detalhe="Custos registados ao fechar." />
      </GrelhaKpis>
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Despesas</CardTitle>
          {activa ? <RegistarDespesa x={x} /> : null}
        </div>
        <Tabela rotulo="Despesas" colunas={colunas} linhas={[...x.expenses].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))} chave={(d) => d.expenseId} aCarregar={false} vazio="Sem despesas registadas." />
      </Card>
    </div>
  );
}

// --- Documentos

function JuntarDocumento({ x }: { x: Viatura }) {
  const [aberto, setAberto] = useState(false);
  const [doc, setDoc] = useState<Documento | null>(null);
  const [categoria, setCategoria] = useState("");
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const erros = errosDocumento({ doc: doc !== null, categoria });
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setDoc(null);
      setCategoria("");
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      <Button tamanho="sm" onClick={() => setAberto(true)}>
        Juntar documento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Documento · ${x.plateNumber}`}
        descricao="Livrete, inspecção, licença ou outro documento legal da viatura."
        rotuloConfirmar="Juntar"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (temErros(erros) || !doc || accao.isPending) return;
          accao.mutate({ acto: "anexar", corpo: { documentId: doc.documentId, category: normalizarTexto(categoria) } }, { onSuccess: () => fechar(false) });
        }}
      >
        <div className="grid gap-4">
          <CarregarFicheiro rotulo="Ficheiro" categoria="Frota" documento={doc} aoMudar={setDoc} />
          {tentou && erros.doc ? (
            <p role="alert" className="text-xs text-danger">
              {erros.doc}
            </p>
          ) : null}
          <Field rotulo="Categoria" erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={categoria} onChange={(e) => setCategoria(e.target.value)} />}
          </Field>
        </div>
      </Confirmar>
    </>
  );
}

function RetirarDocumento({ x, d }: { x: Viatura; d: DocumentoViatura }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  const erro = erroMotivo(motivo);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Retirar ${d.fileName}`}>
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
        titulo={`Retirar «${d.fileName}» da viatura?`}
        descricao="A ligação e o documento ficam no registo."
        rotuloConfirmar="Retirar"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || accao.isPending) return;
          accao.mutate({ acto: "retirarDocumento", documento: d.documentId, corpo: { reason: normalizarTexto(motivo, true) } }, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Motivo" erro={tentou ? erro : undefined}>
          {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

function AbrirDocumento({ d }: { d: DocumentoViatura }) {
  const q = useEscrita({ mutationFn: () => descarregar(`/documents/${encodeURIComponent(d.documentId)}`, d.fileName) });
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={q.isPending} onClick={() => q.mutate()} aria-label={`Descarregar ${d.fileName}`}>
        <Download strokeWidth={1.75} aria-hidden />
        Descarregar
      </Button>
      {q.error ? <ErrorPanel erro={q.error} /> : null}
    </span>
  );
}

export function DocumentosDaViatura({ x }: { x: Viatura }) {
  const { pode } = useUtilizador();
  const { escreve } = useEscreve(x);
  const [pag, setPag] = useState({ pagina: 1, tamanho: 25 });
  const lista = useDocumentosViatura(x.vehicleId, pag);
  const colunas: Coluna<DocumentoViatura>[] = [
    {
      id: "doc",
      cabecalho: "Documento",
      className: "max-w-[18rem]",
      celula: (d) => (
        <span className="flex min-w-0 flex-col">
          <span className="break-words font-medium">{d.category}</span>
          <span className="truncate text-xs text-muted-foreground">{d.fileName}</span>
        </span>
      ),
    },
    { id: "tamanho", cabecalho: "Tamanho", alinhar: "direita", esconderAte: "md", celula: (d) => formatarTamanho(d.sizeInBytes) },
    { id: "quando", cabecalho: "Junto a", esconderAte: "sm", celula: (d) => formatarDataHora(d.attachedAt) },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (d) => (
        <span className="inline-flex gap-1">
          {pode("documents.read") ? <AbrirDocumento d={d} /> : null}
          {escreve ? <RetirarDocumento x={x} d={d} /> : null}
        </span>
      ),
    },
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Documentos</CardTitle>
        {escreve && pode("documents.write") ? <JuntarDocumento x={x} /> : null}
      </div>
      {escreve && !pode("documents.write") ? <Alert tom="info" className="mb-3" titulo="Juntar e abrir documentos pede acesso ao arquivo, que este perfil não tem (B40)." /> : null}
      <Tabela
        rotulo="Documentos da viatura"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(d) => d.documentId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem documentos."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pag.pagina} tamanho={pag.tamanho} total={lista.data.total} aoMudar={setPag} /> : undefined}
      />
    </Card>
  );
}
