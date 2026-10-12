/**
 * Faixa «Sem ligação ao servidor» (§2.2). Aparece quando o browser fica offline
 * ou um pedido falha por rede, e desaparece quando `GET /health` volta a
 * responder.
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { api, ler } from "@/lib/api/client";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";

let semLigacao = typeof navigator !== "undefined" && navigator.onLine === false;
const ouvintes = new Set<() => void>();

export function marcarSemLigacao(valor: boolean): void {
  if (semLigacao === valor) return;
  semLigacao = valor;
  for (const f of ouvintes) f();
}

function subscrever(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

export function BarraSemLigacao() {
  const offline = useSyncExternalStore(subscrever, () => semLigacao);

  useEffect(() => {
    const off = () => marcarSemLigacao(true);
    window.addEventListener("offline", off);
    return () => window.removeEventListener("offline", off);
  }, []);

  const saude = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => ler(api.GET("/health", { signal })),
    enabled: offline,
    refetchInterval: 15_000,
    retry: false,
  });

  useEffect(() => {
    if (saude.isSuccess && saude.data.status === "ok") marcarSemLigacao(false);
  }, [saude.isSuccess, saude.data, saude.dataUpdatedAt]);

  if (!offline) return null;
  return (
    <Alert
      tom="aviso"
      className="rounded-none"
      titulo="Sem ligação ao servidor."
      accao={
        <Button variante="secondary" tamanho="sm" aCarregar={saude.isFetching} onClick={() => void saude.refetch()}>
          Tentar de novo
        </Button>
      }
    >
      Os dados podem estar desactualizados. Nada do que fizer agora é enviado.
    </Alert>
  );
}
