/**
 * Blocos do painel no desenho da marca (2026-10-22, a partir do painel em
 * https://rivo.noirdataintelligence.com): atalhos, módulos a que a conta tem
 * acesso, actividade recente, IA e clientes que mais facturaram. Só mostram
 * o que o servidor já dá e o que o perfil pode abrir.
 */
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Banknote, Car, FolderKanban, Globe, Handshake, Lock, Package, Plus, ReceiptText, Sparkles, Users, Wallet } from "lucide-react";
import { Link } from "react-router";
import { REQUISITO_NOVA_FACTURA, REQUISITO_PAGINA as R } from "@/app/requisitos";
import { EstadoDocumento, moeda, useFacturas } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { useIaLigada } from "@/features/ia";
import { formatarData } from "@/lib/format/data";
import type { Requisito } from "@/lib/auth/permissions";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { cn } from "@/ui/cn";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Skeleton } from "@/ui/Layout";
import { Tabela } from "@/ui/Tabela";
import type { KpisFinancas } from "./api";

type Atalho = { para: string; texto: string; icone: LucideIcon; requer: Requisito };

/** Cada atalho leva a uma página que já existe; só aparecem os que o perfil pode abrir. */
const ATALHOS: readonly Atalho[] = [
  { para: "/facturas/rascunhos/novo", texto: "Nova factura", icone: Plus, requer: REQUISITO_NOVA_FACTURA },
  { para: "/recibos", texto: "Recibos", icone: Wallet, requer: R["/recibos"] },
  { para: "/despesas", texto: "Despesas", icone: ReceiptText, requer: R["/despesas"] },
  { para: "/colaboradores", texto: "Colaboradores", icone: Users, requer: R["/colaboradores"] },
  { para: "/salarios", texto: "Salários", icone: Banknote, requer: R["/salarios"] },
];

export function AtalhosPainel() {
  const { pode } = useUtilizador();
  const visiveis = ATALHOS.filter((a) => pode(a.requer));
  if (visiveis.length === 0) return null;
  return (
    <nav aria-label="Atalhos" className="flex flex-wrap gap-2">
      {visiveis.map((a, i) => (
        <Button
          key={a.para}
          asChild
          tamanho="sm"
          variante={i === 0 && a.para.endsWith("/novo") ? "primary" : "secondary"}
          className={i === 0 && a.para.endsWith("/novo") ? "bg-[image:var(--marca-gradiente-rivo)] text-white hover:opacity-90" : ""}
        >
          <Link to={a.para}>
            <a.icone strokeWidth={1.75} aria-hidden />
            {a.texto}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

type Modulo = { nome: string; para: string; icone: LucideIcon; requer: Requisito };

const MODULOS: readonly Modulo[] = [
  { nome: "Finanças", para: "/facturas", icone: Wallet, requer: R["/facturas"] },
  { nome: "RH", para: "/colaboradores", icone: Users, requer: R["/colaboradores"] },
  { nome: "Comercial", para: "/leads", icone: Handshake, requer: R["/leads"] },
  { nome: "Projectos", para: "/projectos", icone: FolderKanban, requer: R["/projectos"] },
  { nome: "Inventário", para: "/artigos", icone: Package, requer: R["/artigos"] },
  { nome: "Frota", para: "/frota", icone: Car, requer: R["/frota"] },
  { nome: "ESG", para: "/esg", icone: Globe, requer: R["/esg"] },
];

/** Os módulos da Rivo, acesos os que o perfil abre (com ligação) e com cadeado os outros. */
export function EcossistemaRivo() {
  const { pode } = useUtilizador();
  const comAcesso = MODULOS.filter((m) => pode(m.requer)).length;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle>O seu ecossistema Rivo</CardTitle>
        <p className="text-xs text-muted-foreground">
          {comAcesso} de {MODULOS.length} módulos disponíveis para si
        </p>
      </div>
      <ul className="relative mt-6 flex flex-wrap gap-x-6 gap-y-4" aria-label="Módulos">
        <li aria-hidden className="absolute inset-x-6 top-7 -z-0 hidden h-0.5 rounded-full bg-[image:var(--marca-gradiente-rivo)] opacity-40 sm:block" />
        {MODULOS.map((m) => {
          const acesso = pode(m.requer);
          const circulo = (
            <span
              className={cn(
                "relative flex size-14 items-center justify-center rounded-full border bg-card",
                acesso ? "border-[var(--marca-destaque)] text-[var(--marca-destaque)]" : "border-dashed border-border text-muted-foreground",
              )}
            >
              <m.icone className="size-5" strokeWidth={1.75} aria-hidden />
              {acesso ? null : (
                <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border border-border bg-card">
                  <Lock className="size-3" strokeWidth={1.75} aria-hidden />
                </span>
              )}
            </span>
          );
          return (
            <li key={m.nome} className="relative flex w-16 flex-col items-center gap-1.5 text-center">
              {acesso ? (
                <Link to={m.para} className="flex flex-col items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {circulo}
                  <span className="text-xs font-medium text-foreground">{m.nome}</span>
                </Link>
              ) : (
                <>
                  {circulo}
                  <span className="text-xs text-muted-foreground">
                    {m.nome}
                    <span className="sr-only"> (sem acesso)</span>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** As facturas mais recentes, para quem lê a facturação. */
export function ActividadeRecente() {
  const { pode } = useUtilizador();
  const le = pode(R["/facturas"]);
  const lista = useFacturas({ pagina: 1, tamanho: 5, customerId: null, from: null, to: null }, le);
  if (!le) return null;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Actividade recente</CardTitle>
        <Link to="/facturas" className="inline-flex items-center gap-1 text-sm text-[var(--marca-destaque)] underline-offset-4 hover:underline">
          Ver todas
          <ArrowRight className="size-3.5" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <Tabela
        rotulo="Facturas mais recentes"
        colunas={[
          { id: "numero", cabecalho: "Factura", celula: (f) => <Link to={`/facturas/${f.invoiceId}`} className="font-medium text-foreground hover:underline">{f.number}</Link> },
          { id: "cliente", cabecalho: "Cliente", esconderAte: "md", className: "max-w-[12rem] truncate", celula: (f) => f.customerName },
          { id: "data", cabecalho: "Emissão", esconderAte: "sm", celula: (f) => formatarData(f.issuedOn) },
          { id: "estado", cabecalho: "Estado", celula: (f) => <EstadoDocumento estado={f.status} /> },
          { id: "valor", cabecalho: "Montante", alinhar: "direita", celula: (f) => moeda(f.grossTotal, f.currency) },
        ]}
        linhas={lista.data?.items}
        chave={(f) => f.invoiceId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há facturas."
      />
    </Card>
  );
}

/** A IA no painel leva ao assistente: nenhum pedido pago sai daqui. */
export function InsightsIa() {
  const { pode } = useUtilizador();
  const usa = pode(R["/assistente"]);
  const ia = useIaLigada();
  if (!usa || !ia.ligada) return null;
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <CardTitle className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-[var(--marca-destaque)]" strokeWidth={1.75} aria-hidden />
          Insights IA
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Peça ao assistente uma leitura dos indicadores do período, uma previsão ou um rascunho.</p>
      </div>
      <Button asChild tamanho="sm" className="bg-[image:var(--marca-gradiente-rivo)] text-white hover:opacity-90">
        <Link to="/assistente">
          <Sparkles strokeWidth={1.75} aria-hidden />
          Abrir o assistente
        </Link>
      </Button>
    </Card>
  );
}

/** Os 5 clientes que mais facturaram no período (vem nos KPIs de finanças). */
export function TopClientesCartao({ f, moedaKpis, aCarregar }: { f: KpisFinancas | null | undefined; moedaKpis: string; aCarregar: boolean }) {
  if (aCarregar) return <Skeleton className="h-48" />;
  if (!f) return null;
  const top = f.topCustomers.slice(0, 5);
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Top 5 clientes</CardTitle>
      {top.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Ainda não há facturação neste período.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border" aria-label="Clientes que mais facturaram no período">
          {top.map((c, i) => (
            <li key={c.customerId} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--marca-destaque-suave)] text-xs font-semibold text-[var(--marca-destaque)]">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-foreground">{c.customerName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{moeda(c.netRevenue, moedaKpis)}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
