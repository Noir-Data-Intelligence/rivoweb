/** Páginas iniciais de cada shell. Só dados reais; sem conteúdo de exemplo. */
import { usePortalCliente, usePortalColaborador } from "@/features/identity/api";
import { useUtilizador } from "@/features/identity/utilizador";
import { ResumoPessoal } from "@/features/dashboard";
import { Card } from "@/ui/Card";
import { PageHeader } from "@/ui/Layout";

function saudacao(nome: string | null, email: string): string {
  const primeiro = (nome ?? "").trim().split(/\s+/)[0];
  return primeiro ? `Olá, ${primeiro}` : `Olá, ${email}`;
}

export function InicioColaborador() {
  const { utilizador } = useUtilizador();
  const portal = usePortalColaborador();
  const ficha = portal.data;
  return (
    <>
      <PageHeader titulo={saudacao(ficha?.displayName ?? utilizador.displayName, utilizador.email)} />
      <div className="flex flex-col gap-6">
        {ficha?.currentPosition ? (
          <Card>
            <p className="text-sm text-muted-foreground">Cargo actual</p>
            <p className="mt-1 text-md font-medium">{ficha.currentPosition.name}</p>
          </Card>
        ) : null}
        <ResumoPessoal prefixo="/eu/" />
      </div>
    </>
  );
}

export function InicioCliente() {
  const { utilizador } = useUtilizador();
  const portal = usePortalCliente();
  return <PageHeader titulo={portal.data?.customerName ?? saudacao(utilizador.displayName, utilizador.email)} />;
}
