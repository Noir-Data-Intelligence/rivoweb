/** Peças comuns da auditoria interna: textos dos valores, estados, histórico e erros. */
import { useId } from "react";
import { eApiError } from "@/lib/api/problem";
import { Alert } from "@/ui/Alert";
import { Badge, type TomBadge } from "@/ui/Badge";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import type { EstadoAchado, EstadoAuditoria, EstadoPlano, Risco } from "./regras";

export const RISCOS: Readonly<Record<Risco, string>> = { Low: "Baixo", Medium: "Médio", High: "Alto", Critical: "Crítico" };
export const ESTADOS_AUDITORIA: Readonly<Record<EstadoAuditoria, string>> = { Planned: "Planeada", InProgress: "Em curso", Reporting: "Relatório", Closed: "Fechada", Cancelled: "Cancelada" };
export const ESTADOS_ACHADO: Readonly<Record<EstadoAchado, string>> = { Open: "Aberto", InRemediation: "Em correcção", Closed: "Fechado", AcceptedRisk: "Risco aceite" };
export const ESTADOS_PLANO: Readonly<Record<EstadoPlano, string>> = { Pending: "Pendente", InProgress: "Em curso", Done: "Concluído" };

const TOM_RISCO: Record<string, TomBadge> = { Low: "neutro", Medium: "info", High: "aviso", Critical: "erro" };
const TOM_AUDITORIA: Record<string, TomBadge> = { Planned: "neutro", InProgress: "info", Reporting: "aviso", Closed: "sucesso", Cancelled: "neutro" };
const TOM_ACHADO: Record<string, TomBadge> = { Open: "aviso", InRemediation: "info", Closed: "sucesso", AcceptedRisk: "neutro" };
const TOM_PLANO: Record<string, TomBadge> = { Pending: "neutro", InProgress: "info", Done: "sucesso" };

const texto = (mapa: Readonly<Record<string, string>>, v: string) => mapa[v] ?? v;
export const riscoDe = (v: string) => texto(RISCOS, v);
export const estadoAuditoriaDe = (v: string) => texto(ESTADOS_AUDITORIA, v);
export const estadoAchadoDe = (v: string) => texto(ESTADOS_ACHADO, v);
export const estadoPlanoDe = (v: string) => texto(ESTADOS_PLANO, v);

export const RiscoBadge = ({ risco }: { risco: string }) => <Badge tom={TOM_RISCO[risco] ?? "neutro"}>{riscoDe(risco)}</Badge>;
export const EstadoAuditoriaBadge = ({ estado }: { estado: string }) => <Badge tom={TOM_AUDITORIA[estado] ?? "neutro"}>{estadoAuditoriaDe(estado)}</Badge>;
export const EstadoAchadoBadge = ({ estado }: { estado: string }) => <Badge tom={TOM_ACHADO[estado] ?? "neutro"}>{estadoAchadoDe(estado)}</Badge>;
export const EstadoPlanoBadge = ({ estado, atrasado }: { estado: string; atrasado: boolean }) => (
  <span className="inline-flex flex-wrap gap-1">
    <Badge tom={TOM_PLANO[estado] ?? "neutro"}>{estadoPlanoDe(estado)}</Badge>
    {atrasado ? <Badge tom="erro">Atrasado</Badge> : null}
  </span>
);

const ACCOES_HISTORICO: Readonly<Record<string, string>> = {
  "internalaudit.audit.planned": "Auditoria planeada",
  "internalaudit.audit.revised": "Auditoria revista",
  "internalaudit.audit.status_changed": "Fase da auditoria alterada",
  "internalaudit.finding.identified": "Achado registado",
  "internalaudit.finding.revised": "Achado revisto",
  "internalaudit.finding.status_changed": "Estado do achado alterado",
  "internalaudit.action_plan.created": "Plano de acção criado",
  "internalaudit.action_plan.revised": "Plano de acção revisto",
  "internalaudit.action_plan.status_changed": "Estado do plano alterado",
};
export const accaoHistorico = (v: string) => texto(ACCOES_HISTORICO, v);

/** Conformidade: nula sem achados; mostra-se «—», nunca 100 %. */
export const conformidade = (v: number | string | null, formatar: (x: string) => string) => (v === null ? "—" : formatar(String(v)));

export const AVISO_SEPARACAO = "Quem executa um plano não pode fechar o achado.";

/** Erro de uma escrita num achado: o 403 é a separação de funções (com permissão de escrita, é a única recusa). */
export function ErroAchado({ erro }: { erro: unknown }) {
  if (eApiError(erro) && erro.status === 403) {
    return (
      <Alert tom="erro" titulo={AVISO_SEPARACAO}>
        {erro.detail ?? undefined}
      </Alert>
    );
  }
  return <ErrorPanel erro={erro} />;
}

/** Filtro de lista: um select com «Todos» por omissão. */
export function Filtro({ rotulo, valor, opcoes, todos = "Todos", aoMudar }: { rotulo: string; valor: string; opcoes: Readonly<Record<string, string>>; todos?: string; aoMudar: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex min-w-[10rem] flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {rotulo}
      </label>
      <Select id={id} value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">{todos}</option>
        {Object.entries(opcoes).map(([k, t]) => (
          <option key={k} value={k}>
            {t}
          </option>
        ))}
      </Select>
    </div>
  );
}
