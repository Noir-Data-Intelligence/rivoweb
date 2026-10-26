/**
 * Uma auditoria interna: dados, mudar de fase (uma de cada vez), corrigir,
 * cancelar com motivo; os achados com os planos de acção e o histórico (da
 * trilha). O servidor decide; os botões só aparecem quando fazem sentido.
 */
import { ArrowLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarInteiro } from "@/lib/format/numero";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAcaoAuditoriaInterna, useAuditoriaInterna, useHistoricoAuditoria, type Achado, type AuditoriaInterna, type DetalheAuditoria, type PlanoAccao } from "../api";
import { accaoHistorico, ErroAchado, EstadoAchadoBadge, EstadoAuditoriaBadge, EstadoPlanoBadge, riscoDe, RiscoBadge } from "../comum";
import { EditarAchado, EditarAuditoria, EditarPlano } from "../Formularios";
import { aceitaAchados, achadoResolvido, auditoriaEncerrada, fasesSeguintes, MAXIMO_TEXTO, mudarFase, podeFecharAchado, podeFecharAuditoria, resolverAchado, type Fase } from "../regras";

const DESCRICAO_FASE: Record<string, string> = {
  InProgress: "Começa o trabalho de campo: passa a aceitar achados.",
  Reporting: "Passa à fase de relatório; ainda aceita achados e pode voltar ao campo.",
  Closed: "Fica encerrada: não se altera mais, nem os achados nem os planos.",
};

function MudarFase({ a, fase }: { a: AuditoriaInterna; fase: Fase }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoAuditoriaInterna();
  const fechar = fase.alvo === "Closed";
  const bloqueado = fechar && !podeFecharAuditoria(a);
  const voltar = a.status === "Reporting" && fase.alvo === "InProgress";
  const idAviso = `aviso-fechar-${a.auditId}`;
  return (
    <>
      <Button variante={voltar ? "secondary" : "primary"} disabled={bloqueado} aria-describedby={bloqueado ? idAviso : undefined} onClick={() => setAberto(true)}>
        {fase.texto}
      </Button>
      {bloqueado ? (
        <p id={idAviso} className="basis-full text-sm text-muted-foreground">
          {`Para fechar, todos os achados têm de estar fechados ou com o risco aceite (${formatarInteiro(Number(a.findingsOpen))} por resolver).`}
        </p>
      ) : null}
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) accao.reset();
        }}
        titulo={`${fase.texto}: ${a.auditNumber}?`}
        descricao={voltar ? "Volta ao trabalho de campo." : DESCRICAO_FASE[fase.alvo]}
        rotuloConfirmar={fechar ? "Fechar auditoria" : fase.texto}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: "rever", auditoria: a.auditId, corpo: mudarFase(a, fase.alvo) }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Cancelar({ a }: { a: AuditoriaInterna }) {
  const accao = useAcaoAuditoriaInterna();
  return (
    <ConfirmarComMotivo
      rotuloBotao="Cancelar auditoria"
      titulo={`Cancelar ${a.auditNumber}?`}
      descricao="Fica encerrada com o motivo: não se altera mais."
      rotuloConfirmar="Cancelar auditoria"
      maximo={MAXIMO_TEXTO}
      aCarregar={accao.isPending}
      erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
      aoConfirmar={(motivo, fechar) => accao.mutate({ acto: "rever", auditoria: a.auditId, corpo: mudarFase(a, "Cancelled", motivo) }, { onSuccess: fechar })}
    />
  );
}

function FecharAchado({ f }: { f: Achado }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoAuditoriaInterna();
  const pode = podeFecharAchado(f);
  return (
    <>
      <Button variante="ghost" tamanho="sm" disabled={!pode} title={pode ? undefined : "Só fecha com todos os planos concluídos."} onClick={() => setAberto(true)}>
        Fechar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) accao.reset();
        }}
        titulo="Fechar o achado?"
        descricao="Fica resolvido e deixa de se alterar. Quem é responsável por um plano deste achado não o pode fechar."
        rotuloConfirmar="Fechar achado"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErroAchado erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: "reverAchado", achado: f.findingId, corpo: resolverAchado(f, "Closed") }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function AceitarRisco({ f }: { f: Achado }) {
  const accao = useAcaoAuditoriaInterna();
  return (
    <ConfirmarComMotivo
      rotuloBotao="Aceitar o risco"
      titulo="Aceitar o risco deste achado?"
      descricao="Fica resolvido sem correcção, com o motivo registado. Quem é responsável por um plano deste achado não o pode fazer."
      rotuloConfirmar="Aceitar o risco"
      variante="primary"
      maximo={MAXIMO_TEXTO}
      aCarregar={accao.isPending}
      erro={accao.error ? <ErroAchado erro={accao.error} /> : undefined}
      aoConfirmar={(motivo, fechar) => accao.mutate({ acto: "reverAchado", achado: f.findingId, corpo: resolverAchado(f, "AcceptedRisk", motivo) }, { onSuccess: fechar })}
    />
  );
}

function AchadoCartao({ f, planos, editavel, n }: { f: Achado; planos: readonly PlanoAccao[]; editavel: boolean; n: number }) {
  const { pode } = useUtilizador();
  const escreveAchado = editavel && pode("internalaudit.findings.write");
  const escrevePlano = editavel && pode("internalaudit.actions.write");
  const colunas: Coluna<PlanoAccao>[] = [
    { id: "accao", cabecalho: "Acção", className: "max-w-[20rem]", celula: (p) => <span className="whitespace-pre-line break-words">{p.action}</span> },
    { id: "quem", cabecalho: "Responsável", esconderAte: "sm", className: "max-w-[12rem] truncate", celula: (p) => p.ownerName ?? "—" },
    { id: "prazo", cabecalho: "Prazo", celula: (p) => formatarData(p.dueDate) },
    { id: "feito", cabecalho: "Concluído", esconderAte: "md", celula: (p) => (p.completedAt ? formatarDataHora(p.completedAt) : "—") },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoPlanoBadge estado={p.status} atrasado={p.isOverdue} /> },
    ...(escrevePlano ? [{ id: "editar", cabecalho: "", alinhar: "direita" as const, celula: (p: PlanoAccao) => <EditarPlano key={`${p.actionPlanId}-${p.status}-${p.dueDate}`} achado={f.findingId} p={p} /> }] : []),
  ];
  const titulo = `Achado ${String(n)}`;
  return (
    <Card>
      <section aria-label={titulo} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{titulo}</CardTitle>
          <RiscoBadge risco={f.severity} />
          <EstadoAchadoBadge estado={f.status} />
          {f.controlRef ? <span className="text-sm text-muted-foreground">{`Controlo ${f.controlRef}`}</span> : null}
          {escreveAchado ? (
            <span className="ml-auto inline-flex flex-wrap gap-1">
              <EditarAchado key={`${f.findingId}-${f.description}-${f.severity}`} auditoria={f.auditId} f={f} />
              <FecharAchado f={f} />
              <AceitarRisco f={f} />
            </span>
          ) : null}
        </div>
        <p className="whitespace-pre-line break-words text-base text-foreground">{f.description}</p>
        {f.recommendation ? (
          <div>
            <p className="text-sm text-muted-foreground">Recomendação</p>
            <p className="whitespace-pre-line break-words text-sm text-foreground">{f.recommendation}</p>
          </div>
        ) : null}
        {f.status === "AcceptedRisk" && f.resolutionNotes ? (
          <Alert tom="info" titulo="Risco aceite.">
            {f.resolutionNotes}
          </Alert>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {`Registado ${formatarDataHora(f.identifiedAt)}`}
          {f.resolvedAt ? ` · resolvido ${formatarDataHora(f.resolvedAt)}` : ""}
          {` · ${formatarInteiro(Number(f.actionPlansDone))} de ${formatarInteiro(Number(f.actionPlansTotal))} planos concluídos`}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Planos de acção</h3>
          {escrevePlano ? <EditarPlano achado={f.findingId} /> : null}
        </div>
        <Tabela rotulo={`Planos de acção do ${titulo.toLowerCase()}`} colunas={colunas} linhas={planos} chave={(p) => p.actionPlanId} aCarregar={false} vazio="Ainda sem planos de acção." />
      </section>
    </Card>
  );
}

function Historico({ d }: { d: DetalheAuditoria }) {
  const h = useHistoricoAuditoria(d.audit.auditId);
  // O histórico não traz os valores: diz-se a que achado ou plano se refere, pelo estado actual.
  const sobre = (tipo: string, id: string) => {
    if (tipo === "internalaudit.finding") {
      const k = d.findings.findIndex((f) => f.findingId === id);
      return k >= 0 ? `Achado ${String(k + 1)}` : null;
    }
    if (tipo === "internalaudit.action_plan") return d.actionPlans.find((p) => p.actionPlanId === id)?.action ?? null;
    return null;
  };
  return (
    <Card>
      <CardTitle>Histórico</CardTitle>
      {h.isPending ? (
        <Skeleton className="mt-3 h-24" />
      ) : h.error ? (
        <ErrorPanel erro={h.error} tentarDeNovo={() => void h.refetch()} className="mt-3" />
      ) : h.data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sem registos.</p>
      ) : (
        <ol className="mt-2 divide-y divide-border text-sm" aria-label="Histórico da auditoria">
          {[...h.data]
            .sort((x, y) => x.occurredAt.localeCompare(y.occurredAt))
            .map((e, k) => {
              const s = sobre(e.entityType, e.entityId);
              return (
                <li key={`${e.action}-${e.entityId}-${e.occurredAt}-${String(k)}`} className="py-2">
                  <p className="text-foreground">{accaoHistorico(e.action)}</p>
                  {s ? <p className="truncate text-muted-foreground">{s}</p> : null}
                  <p className="text-muted-foreground">{`${formatarDataHora(e.occurredAt)} · ${e.actorName ?? "Sistema"}`}</p>
                </li>
              );
            })}
        </ol>
      )}
    </Card>
  );
}

export default function AuditoriaInternaDetalhe() {
  const { auditId = "" } = useParams();
  const detalhe = useAuditoriaInterna(auditId);
  const { pode } = useUtilizador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/auditoria-interna">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Auditoria interna
      </Link>
    </Button>
  );
  if (detalhe.isPending) return <CarregandoPagina />;
  if (detalhe.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={detalhe.error} tentarDeNovo={() => void detalhe.refetch()} />
      </>
    );
  }
  const d = detalhe.data;
  const a = d.audit;
  const encerrada = auditoriaEncerrada(a.status);
  const escreve = pode("internalaudit.audits.write") && !encerrada;
  const linha = (r: string, v: ReactNode) => (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{r}</dt>
      <dd className="whitespace-pre-line break-words text-base text-foreground">{v ?? "—"}</dd>
    </div>
  );
  return (
    <>
      {voltar}
      <PageHeader
        titulo={`${a.auditNumber} · ${a.title}`}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoAuditoriaBadge estado={a.status} />
            <span>{`Risco ${riscoDe(a.riskRating).toLowerCase()} · planeada ${formatarDataHora(a.createdAt)}${a.closedAt ? ` · fechada ${formatarDataHora(a.closedAt)}` : ""}`}</span>
          </span>
        }
      />
      {escreve ? (
        <div className="mb-6 flex flex-wrap items-start gap-3">
          {fasesSeguintes(a.status).map((f) => (
            <MudarFase key={f.alvo} a={a} fase={f} />
          ))}
          <EditarAuditoria key={`${a.auditId}-${a.title}-${a.plannedEnd}`} a={a} />
          <Cancelar a={a} />
        </div>
      ) : null}
      {a.status === "Cancelled" && a.cancellationReason ? (
        <Alert tom="erro" className="mb-6" titulo="Cancelada.">
          {a.cancellationReason}
        </Alert>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Dados</CardTitle>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {linha("Departamento auditado", a.departmentName ?? "—")}
            {linha("Responsável", a.ownerName ?? "—")}
            {linha("Período previsto", `${formatarData(a.plannedStart)} → ${formatarData(a.plannedEnd)}`)}
            {linha("Risco", <RiscoBadge risco={a.riskRating} />)}
            {linha("Achados", `${formatarInteiro(Number(a.findingsTotal))} · ${formatarInteiro(Number(a.findingsOpen))} por resolver`)}
            {linha("Objectivos", a.objectives ?? "—")}
            {linha("Âmbito", a.scope ?? "—")}
          </dl>
        </Card>
        <Historico d={d} />
      </div>
      <section aria-labelledby="titulo-achados" className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-achados" className="text-lg font-semibold text-foreground">
            Achados
          </h2>
          {aceitaAchados(a.status) && pode("internalaudit.findings.write") ? <EditarAchado auditoria={a.auditId} /> : null}
        </div>
        {d.findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{a.status === "Planned" ? "Os achados registam-se depois de iniciar a auditoria." : "Sem achados registados."}</p>
        ) : (
          d.findings.map((f, k) => <AchadoCartao key={f.findingId} f={f} n={k + 1} planos={d.actionPlans.filter((p) => p.findingId === f.findingId)} editavel={!encerrada && !achadoResolvido(f.status)} />)
        )}
      </section>
    </>
  );
}
