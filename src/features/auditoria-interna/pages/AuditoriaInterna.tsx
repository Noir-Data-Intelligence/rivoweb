/**
 * Auditoria interna (ADR-089, backend #119): cartões do topo e três vistas
 * no URL: auditorias, achados e planos de acção. O Admin planeia; o Manager
 * só lê. Não é a trilha técnica (`/auditoria`).
 */
import { useState } from "react";
import { Link } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarInteiro, formatarPercentagem } from "@/lib/format/numero";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useAchados, useAuditoriasInternas, usePlanosAccao, useResumoAuditoriaInterna, type Achado, type AuditoriaInterna as TipoAuditoria, type PlanoAccao } from "../api";
import { conformidade, ESTADOS_ACHADO, ESTADOS_AUDITORIA, ESTADOS_PLANO, EstadoAchadoBadge, EstadoAuditoriaBadge, EstadoPlanoBadge, Filtro, RiscoBadge, RISCOS } from "../comum";
import { EditarAuditoria } from "../Formularios";

type VistaAuditoria = "auditorias" | "achados" | "planos";
const VISTAS: readonly Vista<VistaAuditoria>[] = [
  { valor: "auditorias", texto: "Auditorias" },
  { valor: "achados", texto: "Achados" },
  { valor: "planos", texto: "Planos de acção" },
];

const ligacao = (auditId: string, texto: string) => (
  <Link to={`/auditoria-interna/${auditId}`} className="font-medium underline-offset-4 hover:underline">
    {texto}
  </Link>
);

function Resumo() {
  const r = useResumoAuditoriaInterna();
  if (r.isPending) return <Skeleton className="mb-6 h-24" />;
  if (r.error) return <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} className="mb-6" />;
  return (
    <div className="mb-6">
      <GrelhaKpis>
        <Kpi rotulo="Auditorias activas" valor={formatarInteiro(Number(r.data.activeAudits))} detalhe="Planeadas, em curso ou em relatório." />
        <Kpi rotulo="Achados abertos" valor={formatarInteiro(Number(r.data.openFindings))} detalhe="Por fechar ou aceitar o risco." />
        <Kpi rotulo="Planos atrasados" valor={formatarInteiro(Number(r.data.overdueActionPlans))} detalhe="Prazo passado e por concluir." />
        <Kpi rotulo="Conformidade" valor={conformidade(r.data.compliancePercent, (x) => formatarPercentagem(x, 1))} detalhe={r.data.compliancePercent === null ? "Sem achados, não há conformidade medida." : "Achados fechados ou com o risco aceite."} />
      </GrelhaKpis>
    </div>
  );
}

function Auditorias() {
  const { pode } = useUtilizador();
  const [estado, setEstado] = useState("");
  const [departamento, setDepartamento] = useState("");
  const lista = useAuditoriasInternas({ estado: estado || null, departamento: departamento || null });
  // Os departamentos do filtro saem das auditorias (sem pedir os lookups, que exigem escrita).
  const todas = useAuditoriasInternas({ estado: null, departamento: null });
  const departamentos = Object.fromEntries((todas.data ?? []).map((a) => [a.departmentId, a.departmentName ?? "—"]));
  const colunas: Coluna<TipoAuditoria>[] = [
    { id: "numero", cabecalho: "Número", celula: (a) => ligacao(a.auditId, a.auditNumber) },
    { id: "titulo", cabecalho: "Auditoria", className: "max-w-[18rem]", celula: (a) => <span className="break-words">{a.title}</span> },
    { id: "dep", cabecalho: "Departamento", esconderAte: "md", className: "max-w-[12rem] truncate", celula: (a) => a.departmentName ?? "—" },
    { id: "quem", cabecalho: "Responsável", esconderAte: "lg", className: "max-w-[12rem] truncate", celula: (a) => a.ownerName ?? "—" },
    { id: "periodo", cabecalho: "Período previsto", esconderAte: "lg", celula: (a) => `${formatarData(a.plannedStart)} → ${formatarData(a.plannedEnd)}` },
    { id: "risco", cabecalho: "Risco", esconderAte: "sm", celula: (a) => <RiscoBadge risco={a.riskRating} /> },
    { id: "achados", cabecalho: "Achados abertos", alinhar: "direita", esconderAte: "md", celula: (a) => `${formatarInteiro(Number(a.findingsOpen))} de ${formatarInteiro(Number(a.findingsTotal))}` },
    { id: "estado", cabecalho: "Fase", celula: (a) => <EstadoAuditoriaBadge estado={a.status} /> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Filtro rotulo="Fase" valor={estado} opcoes={ESTADOS_AUDITORIA} todos="Todas" aoMudar={setEstado} />
        <Filtro rotulo="Departamento" valor={departamento} opcoes={departamentos} aoMudar={setDepartamento} />
        {pode("internalaudit.audits.write") ? (
          <div className="sm:ml-auto">
            <EditarAuditoria />
          </div>
        ) : null}
      </div>
      <Tabela
        rotulo="Auditorias"
        colunas={colunas}
        linhas={lista.data}
        chave={(a) => a.auditId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado || departamento ? "Nenhuma auditoria com estes filtros." : "Ainda não há auditorias."}
      />
    </div>
  );
}

function Achados() {
  const [estado, setEstado] = useState("");
  const [gravidade, setGravidade] = useState("");
  const lista = useAchados({ estado: estado || null, gravidade: gravidade || null });
  const colunas: Coluna<Achado>[] = [
    { id: "aud", cabecalho: "Auditoria", className: "max-w-[14rem]", celula: (f) => <span className="flex min-w-0 flex-col">{ligacao(f.auditId, f.auditNumber)}<span className="truncate text-xs text-muted-foreground">{f.auditTitle}</span></span> },
    { id: "desc", cabecalho: "Achado", className: "max-w-[20rem]", celula: (f) => <span className="line-clamp-3 whitespace-pre-line break-words">{f.description}</span> },
    { id: "grav", cabecalho: "Gravidade", celula: (f) => <RiscoBadge risco={f.severity} /> },
    { id: "planos", cabecalho: "Planos concluídos", alinhar: "direita", esconderAte: "md", celula: (f) => `${formatarInteiro(Number(f.actionPlansDone))} de ${formatarInteiro(Number(f.actionPlansTotal))}` },
    { id: "quando", cabecalho: "Registado", esconderAte: "lg", celula: (f) => formatarDataHora(f.identifiedAt) },
    { id: "estado", cabecalho: "Estado", celula: (f) => <EstadoAchadoBadge estado={f.status} /> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Filtro rotulo="Estado" valor={estado} opcoes={ESTADOS_ACHADO} aoMudar={setEstado} />
        <Filtro rotulo="Gravidade" valor={gravidade} opcoes={RISCOS} todos="Todas" aoMudar={setGravidade} />
      </div>
      <Tabela
        rotulo="Achados"
        colunas={colunas}
        linhas={lista.data}
        chave={(f) => f.findingId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado || gravidade ? "Nenhum achado com estes filtros." : "Ainda não há achados."}
      />
    </div>
  );
}

function Planos() {
  const [estado, setEstado] = useState("");
  const [atrasados, setAtrasados] = useState(false);
  const lista = usePlanosAccao({ estado: estado || null, atrasados });
  const colunas: Coluna<PlanoAccao>[] = [
    { id: "aud", cabecalho: "Auditoria", celula: (p) => ligacao(p.auditId, p.auditNumber) },
    { id: "accao", cabecalho: "Acção", className: "max-w-[20rem]", celula: (p) => <span className="line-clamp-3 whitespace-pre-line break-words">{p.action}</span> },
    { id: "quem", cabecalho: "Responsável", esconderAte: "md", className: "max-w-[12rem] truncate", celula: (p) => p.ownerName ?? "—" },
    { id: "prazo", cabecalho: "Prazo", celula: (p) => formatarData(p.dueDate) },
    { id: "feito", cabecalho: "Concluído", esconderAte: "lg", celula: (p) => (p.completedAt ? formatarDataHora(p.completedAt) : "—") },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoPlanoBadge estado={p.status} atrasado={p.isOverdue} /> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Filtro rotulo="Estado" valor={estado} opcoes={ESTADOS_PLANO} aoMudar={setEstado} />
        <div className="flex h-10 items-center pointer-coarse:h-11">
          <Checkbox rotulo="Só os atrasados" checked={atrasados} onChange={(e) => setAtrasados(e.target.checked)} />
        </div>
      </div>
      <Tabela
        rotulo="Planos de acção"
        colunas={colunas}
        linhas={lista.data}
        chave={(p) => p.actionPlanId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado || atrasados ? "Nenhum plano com estes filtros." : "Ainda não há planos de acção."}
      />
    </div>
  );
}

export default function AuditoriaInterna() {
  const vista = useVista(VISTAS);
  return (
    <>
      <PageHeader titulo="Auditoria interna" descricao="Auditorias planeadas aos departamentos, os achados de cada uma e os planos de acção para os corrigir." />
      <Resumo />
      <Vistas rotulo="Auditoria interna" vistas={VISTAS} actual={vista} />
      {vista === "achados" ? <Achados /> : vista === "planos" ? <Planos /> : <Auditorias />}
    </>
  );
}
