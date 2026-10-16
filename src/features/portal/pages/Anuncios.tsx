/** Portal › Anúncios: os comunicados em vigor, os fixados primeiro. */
import { Alert } from "@/ui/Alert";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useMeusAnuncios } from "../api";
import { CartaoAnuncio } from "../comum";
import { ordenarAnuncios } from "../regras";

export default function Anuncios() {
  const anuncios = useMeusAnuncios();
  return (
    <>
      <PageHeader titulo="Anúncios" descricao="Comunicados da empresa." />
      {anuncios.isPending ? (
        <Skeleton className="h-40" />
      ) : anuncios.error ? (
        <ErrorPanel erro={anuncios.error} tentarDeNovo={() => void anuncios.refetch()} />
      ) : anuncios.data.length === 0 ? (
        <Alert tom="info" titulo="Não há anúncios em vigor." />
      ) : (
        <div className="flex flex-col gap-4">
          {ordenarAnuncios(anuncios.data).map((a) => (
            <CartaoAnuncio key={a.announcementId} a={a} />
          ))}
        </div>
      )}
    </>
  );
}
