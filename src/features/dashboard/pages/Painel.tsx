/**
 * Painel pessoal, a entrada do backoffice (§5.3). Ordem fixa (§4.5): o que é
 * da pessoa (notificações, aprovações, anúncios) e depois os KPIs das secções
 * que o perfil lê (ADR-069). Com a base nova, cartões vazios são o estado real.
 */
import { Bell, CheckSquare } from "lucide-react";
import { Link } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarInteiro } from "@/lib/format/numero";
import { NOME_PERIODO } from "@/lib/format/periodo";
import { Card } from "@/ui/Card";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useKpis, useMeuPainel } from "../api";
import { Anuncios, SeccaoFinancas, SeccaoPessoas, SeccaoVendas, SeletorPeriodo, SemSeccoes, usePeriodo } from "../componentes";

export function saudacao(nome: string | null | undefined, email: string): string {
  const primeiro = (nome ?? "").trim().split(/\s+/)[0];
  return primeiro ? `Olá, ${primeiro}` : `Olá, ${email}`;
}

function Contador({ rotulo, valor, icone: Icone, para }: { rotulo: string; valor: number; icone: typeof Bell; para?: string }) {
  const conteudo = (
    <Card className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icone className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums text-foreground">{formatarInteiro(valor)}</p>
        <p className="truncate text-sm text-muted-foreground">{rotulo}</p>
      </div>
    </Card>
  );
  return para ? (
    <Link to={para} className="rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}

export function ResumoPessoal({ prefixo }: { prefixo: string }) {
  const meu = useMeuPainel();
  const { pode } = useUtilizador();
  // A caixa de aprovações está no backoffice (prefixo «/»).
  const podeAprovacoes = prefixo === "/" && pode("approval.requests.read");
  if (meu.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="A carregar o painel">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (meu.error) return <ErrorPanel erro={meu.error} tentarDeNovo={() => void meu.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Contador rotulo="Notificações por ler" valor={Number(meu.data.unreadNotifications)} icone={Bell} para={`${prefixo}notificacoes`} />
        <Contador rotulo="Aprovações à sua espera" valor={Number(meu.data.pendingApprovals)} icone={CheckSquare} {...(podeAprovacoes ? { para: "/aprovacoes" } : {})} />
      </div>
      <Anuncios anuncios={meu.data.announcements} />
    </div>
  );
}

function Indicadores() {
  const { periodo, janela, mudar } = usePeriodo();
  const kpis = useKpis(janela);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-md font-semibold text-foreground">Indicadores · {NOME_PERIODO[periodo].toLowerCase()}</h2>
        <SeletorPeriodo periodo={periodo} aoMudar={mudar} />
      </div>
      {kpis.isPending ? (
        <Skeleton className="h-40" />
      ) : kpis.error ? (
        <ErrorPanel erro={kpis.error} tentarDeNovo={() => void kpis.refetch()} />
      ) : kpis.data.sections.length === 0 ? (
        <SemSeccoes />
      ) : (
        <div className="flex flex-col gap-8" aria-busy={kpis.isFetching || undefined}>
          {kpis.data.finance ? <SeccaoFinancas f={kpis.data.finance} janela={janela} moedaKpis={kpis.data.currency} /> : null}
          {kpis.data.hr ? <SeccaoPessoas h={kpis.data.hr} janela={janela} /> : null}
          {kpis.data.sales ? <SeccaoVendas v={kpis.data.sales} janela={janela} moedaKpis={kpis.data.currency} /> : null}
        </div>
      )}
    </div>
  );
}

export default function Painel() {
  const { utilizador } = useUtilizador();
  return (
    <>
      <PageHeader titulo={saudacao(utilizador.displayName, utilizador.email)} />
      <div className="flex flex-col gap-8">
        <ResumoPessoal prefixo="/" />
        <Indicadores />
      </div>
    </>
  );
}
