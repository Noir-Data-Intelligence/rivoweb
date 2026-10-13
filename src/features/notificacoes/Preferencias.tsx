/** A minha conta › Notificações (ADR-071). */
import { useState } from "react";
import { Alert } from "@/ui/Alert";
import { Card, CardTitle } from "@/ui/Card";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Skeleton } from "@/ui/Layout";
import { useGuardarPreferencias, usePreferencias } from "./api";

export function PreferenciasNotificacoes() {
  const prefs = usePreferencias();
  const guardar = useGuardarPreferencias();
  // A escolha fica visível de imediato e só volta atrás se o pedido falhar.
  const [escolha, setEscolha] = useState<boolean | null>(null);
  return (
    <Card>
      <CardTitle>Notificações</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">As notificações aparecem sempre na Rivo. Escolha se também as quer receber por e-mail.</p>
      {prefs.isPending ? (
        <Skeleton className="mt-4 h-8" />
      ) : prefs.error ? (
        <ErrorPanel erro={prefs.error} tentarDeNovo={() => void prefs.refetch()} className="mt-4" />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <Checkbox
            rotulo="Receber também por e-mail"
            ajuda="Os convites e as ligações de recuperação de password vão sempre por e-mail."
            checked={escolha ?? prefs.data.emailEnabled}
            disabled={guardar.isPending}
            aria-busy={guardar.isPending || undefined}
            onChange={(e) => {
              const v = e.target.checked;
              setEscolha(v);
              guardar.mutate(v, { onError: () => setEscolha(null) });
            }}
          />
          {guardar.isSuccess ? <Alert tom="sucesso" titulo="Preferência guardada." /> : null}
          {guardar.error ? <ErrorPanel erro={guardar.error} /> : null}
        </div>
      )}
    </Card>
  );
}
