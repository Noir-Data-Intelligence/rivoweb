/**
 * Registo de tempo de todos os projectos (§5.13, F12), num período (por
 * omissão, o mês corrente; no URL): totais, horas por projecto e por
 * colaborador, e os registos.
 */
import { Link } from "react-router";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Badge } from "@/ui/Badge";
import { Card, CardTitle } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { FiltroJanela, useJanelaUrl } from "@/ui/JanelaDatas";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useProjectos, useTempo, type RegistoTempo } from "../api";

const horas = (h: number | string) => `${formatarNumeroDecimal(String(h), 2)} h`;

export default function Tempo() {
  const hoje = hojeIso();
  const { de, ate, mudar } = useJanelaUrl({ de: `${hoje.slice(0, 7)}-01`, ate: hoje });
  const erroJanela = de > ate ? "O fim não pode ser antes do início." : undefined;
  const tempo = useTempo({ de, ate });
  const projectos = useProjectos({ fechados: true, pagina: 1, tamanho: 200 });
  const nomeProjecto = (id: string) => projectos.data?.items.find((p) => p.projectId === id)?.name ?? "Projecto";
  const t = tempo.data;
  const porProjecto = t
    ? [...t.entries.reduce((m, e) => m.set(e.projectId, (m.get(e.projectId) ?? 0) + Number(e.hours)), new Map<string, number>())].sort((a, b) => b[1] - a[1])
    : [];
  const colunas: Coluna<RegistoTempo>[] = [
    { id: "dia", cabecalho: "Dia", celula: (r) => formatarData(r.day) },
    {
      id: "proj",
      cabecalho: "Projecto",
      className: "max-w-[14rem] truncate",
      celula: (r) => (
        <Link to={`/projectos/${r.projectId}?vista=tempo`} className="underline-offset-4 hover:underline">
          {nomeProjecto(r.projectId)}
        </Link>
      ),
    },
    { id: "quem", cabecalho: "Colaborador", esconderAte: "md", className: "max-w-[12rem] truncate", celula: (r) => r.employeeName ?? "—" },
    { id: "desc", cabecalho: "Descrição", esconderAte: "lg", className: "max-w-[16rem] truncate", celula: (r) => r.description ?? "—" },
    { id: "horas", cabecalho: "Horas", alinhar: "direita", celula: (r) => horas(r.hours) },
    { id: "fact", cabecalho: "Facturável", esconderAte: "sm", celula: (r) => (r.billable ? <Badge tom="sucesso">Sim</Badge> : <Badge tom="neutro">Não</Badge>) },
  ];
  return (
    <>
      <PageHeader titulo="Registo de tempo" descricao="As horas registadas em todos os projectos, num período." />
      <FiltroJanela de={de} ate={ate} mudar={mudar} erro={erroJanela} />
      {tempo.error ? <ErrorPanel erro={tempo.error} tentarDeNovo={() => void tempo.refetch()} /> : null}
      {!t ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="flex flex-col gap-6">
          <GrelhaKpis>
            <Kpi rotulo="Horas registadas" valor={horas(t.totalHours)} />
            <Kpi rotulo="Facturáveis" valor={horas(t.billableHours)} />
            <Kpi rotulo="Projectos" valor={String(porProjecto.length)} />
          </GrelhaKpis>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle className="mb-2">Por projecto</CardTitle>
              {porProjecto.length === 0 ? <p className="text-sm text-muted-foreground">Sem horas no período.</p> : null}
              <ul className="divide-y divide-border text-sm" aria-label="Horas por projecto">
                {porProjecto.map(([id, h]) => (
                  <li key={id} className="flex justify-between gap-2 py-2">
                    <span className="truncate">{nomeProjecto(id)}</span>
                    <span className="tabular-nums">{horas(h.toFixed(2))}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle className="mb-2">Por colaborador</CardTitle>
              <ul className="divide-y divide-border text-sm" aria-label="Horas por colaborador">
                {t.byEmployee.map((b) => (
                  <li key={b.employeeId} className="flex justify-between gap-2 py-2">
                    <span className="truncate">{b.employeeName ?? "—"}</span>
                    <span className="tabular-nums">{horas(b.hours)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <Tabela rotulo="Registos de tempo" colunas={colunas} linhas={t.entries} chave={(r) => r.entryId} aCarregar={false} vazio="Sem horas no período." />
        </div>
      )}
    </>
  );
}
