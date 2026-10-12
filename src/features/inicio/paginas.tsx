/** Páginas iniciais de cada shell. Só dados reais; sem conteúdo de exemplo. */
import { usePortalCliente, usePortalColaborador } from "@/features/identity/api";
import { useUtilizador } from "@/features/identity/utilizador";
import { Card } from "@/ui/Card";
import { EmptyState, PageHeader } from "@/ui/Layout";

function saudacao(nome: string | null, email: string): string {
  const primeiro = (nome ?? "").trim().split(/\s+/)[0];
  return primeiro ? `Olá, ${primeiro}` : `Olá, ${email}`;
}

export function InicioBackoffice() {
  const { utilizador } = useUtilizador();
  return (
    <>
      <PageHeader titulo={saudacao(utilizador.displayName, utilizador.email)} />
      <Card>
        <EmptyState frase="As áreas de gestão aparecem aqui à medida que forem publicadas." />
      </Card>
    </>
  );
}

export function InicioColaborador() {
  const { utilizador } = useUtilizador();
  const portal = usePortalColaborador();
  const ficha = portal.data;
  return (
    <>
      <PageHeader titulo={saudacao(ficha?.displayName ?? utilizador.displayName, utilizador.email)} />
      {ficha?.currentPosition ? (
        <Card>
          <p className="text-sm text-muted-foreground">Cargo actual</p>
          <p className="mt-1 text-md font-medium">{ficha.currentPosition.name}</p>
        </Card>
      ) : null}
    </>
  );
}

export function InicioCliente() {
  const { utilizador } = useUtilizador();
  const portal = usePortalCliente();
  return <PageHeader titulo={portal.data?.customerName ?? saudacao(utilizador.displayName, utilizador.email)} />;
}
