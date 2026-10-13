import { CheckCheck } from "lucide-react";
import { useSearchParams } from "react-router";
import { formatarDataHora } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useMarcarLida, useMarcarTodasLidas, useNotificacoes, type Notificacao } from "../api";

function Linha({ n }: { n: Notificacao }) {
  const marcar = useMarcarLida();
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-start gap-2 font-medium text-foreground">
          {!n.read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden /> : null}
          <span className="min-w-0 break-words">
            {n.title}
            {!n.read ? <span className="sr-only"> (por ler)</span> : null}
          </span>
        </p>
        {/* Texto simples: nunca interpretado como HTML (S10). */}
        <p className="mt-0.5 whitespace-pre-line break-words text-sm text-muted-foreground">{n.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatarDataHora(n.createdAt)}</p>
        {marcar.error ? <ErrorPanel erro={marcar.error} className="mt-2" /> : null}
      </div>
      {!n.read ? (
        <Button variante="ghost" tamanho="sm" className="self-start" aCarregar={marcar.isPending} onClick={() => marcar.mutate(n.notificationId)}>
          Marcar como lida
        </Button>
      ) : null}
    </li>
  );
}

export default function Notificacoes() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const soPorLer = params.get("por-ler") === "1";
  const lista = useNotificacoes({ pagina, tamanho, soPorLer });
  const todas = useMarcarTodasLidas();
  const haPorLer = (lista.data?.items ?? []).some((n) => !n.read) || soPorLer;
  return (
    <>
      <PageHeader
        titulo="Notificações"
        accao={
          haPorLer ? (
            <Button variante="secondary" aCarregar={todas.isPending} onClick={() => todas.mutate()}>
              <CheckCheck strokeWidth={1.75} aria-hidden />
              Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />
      {todas.isSuccess ? (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {Number(todas.data.marcadas) === 1 ? "1 notificação marcada como lida." : `${String(todas.data.marcadas)} notificações marcadas como lidas.`}
        </p>
      ) : null}
      {todas.error ? <ErrorPanel erro={todas.error} className="mb-4" /> : null}
      <Checkbox
        className="mb-4"
        rotulo="Só as por ler"
        checked={soPorLer}
        onChange={(e) =>
          setParams((a) => {
            const n = new URLSearchParams(a);
            if (e.target.checked) n.set("por-ler", "1");
            else n.delete("por-ler");
            n.delete("pagina");
            return n;
          })
        }
      />
      <Card>
        {lista.isPending ? (
          <div className="flex flex-col gap-3" aria-label="A carregar notificações">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : lista.error ? (
          <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
        ) : lista.data.items.length === 0 ? (
          <EmptyState frase={soPorLer ? "Não tem notificações por ler." : "Ainda não tem notificações."} />
        ) : (
          <>
            <ul className="divide-y divide-border" aria-busy={lista.isFetching || undefined}>
              {lista.data.items.map((n) => (
                <Linha key={n.notificationId} n={n} />
              ))}
            </ul>
            <div className="mt-2 border-t border-border pt-3">
              <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} />
            </div>
          </>
        )}
      </Card>
    </>
  );
}
