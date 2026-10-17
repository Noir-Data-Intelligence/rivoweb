/**
 * Portal do cliente › Documentos: o que a empresa partilhou consigo e os
 * ficheiros que carregou (os comprovativos). Descarregar é sempre em anexo,
 * sem pré-visualização (§7.5).
 */
import { Download } from "lucide-react";
import { useState } from "react";
import { formatarDataDeInstante } from "@/lib/format/data";
import { formatarTamanho } from "@/lib/format/numero";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useDescarregarFicheiro, useDescarregarPartilhado, useMeusFicheiros, usePartilhados, type Ficheiro, type Partilhado } from "../api";

function DescarregarPartilhado({ d, aoFalhar }: { d: Partilhado; aoFalhar: (e: unknown) => void }) {
  const doc = useDescarregarPartilhado();
  return (
    <Button variante="ghost" tamanho="sm" aCarregar={doc.isPending} onClick={() => doc.mutate(d, { onError: aoFalhar })} aria-label={`Descarregar ${d.title}`}>
      <Download strokeWidth={1.75} aria-hidden />
      Descarregar
    </Button>
  );
}

function DescarregarFicheiro({ d, aoFalhar }: { d: Ficheiro; aoFalhar: (e: unknown) => void }) {
  const doc = useDescarregarFicheiro();
  return (
    <Button variante="ghost" tamanho="sm" aCarregar={doc.isPending} onClick={() => doc.mutate(d, { onError: aoFalhar })} aria-label={`Descarregar ${d.fileName}`}>
      <Download strokeWidth={1.75} aria-hidden />
      Descarregar
    </Button>
  );
}

export default function Documentos() {
  const partilhados = usePartilhados();
  const ficheiros = useMeusFicheiros();
  const [erro, setErro] = useState<unknown>(null);
  const colPartilhados: Coluna<Partilhado>[] = [
    {
      id: "titulo",
      cabecalho: "Documento",
      className: "max-w-[20rem]",
      celula: (d) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{d.title}</span>
          <span className="truncate text-sm text-muted-foreground">{[d.category, d.fileName].filter(Boolean).join(" · ")}</span>
        </div>
      ),
    },
    { id: "data", cabecalho: "Partilhado a", esconderAte: "sm", celula: (d) => formatarDataDeInstante(d.sharedAt) },
    { id: "tamanho", cabecalho: "Tamanho", alinhar: "direita", esconderAte: "md", celula: (d) => (d.sizeInBytes === null ? "—" : formatarTamanho(d.sizeInBytes)) },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (d) => <DescarregarPartilhado d={d} aoFalhar={setErro} /> },
  ];
  const colFicheiros: Coluna<Ficheiro>[] = [
    {
      id: "nome",
      cabecalho: "Ficheiro",
      className: "max-w-[20rem]",
      celula: (d) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{d.fileName}</span>
          <span className="truncate text-sm text-muted-foreground">{d.category}</span>
        </div>
      ),
    },
    { id: "data", cabecalho: "Carregado a", esconderAte: "sm", celula: (d) => formatarDataDeInstante(d.uploadedAt) },
    { id: "tamanho", cabecalho: "Tamanho", alinhar: "direita", esconderAte: "md", celula: (d) => formatarTamanho(d.sizeInBytes) },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (d) => <DescarregarFicheiro d={d} aoFalhar={setErro} /> },
  ];
  return (
    <>
      <PageHeader titulo="Documentos" descricao="O que a empresa partilhou consigo e os ficheiros que carregou." />
      {erro ? (
        <div className="mb-4">
          <ErrorPanel erro={erro} />
        </div>
      ) : null}
      <h2 className="mb-3 text-base font-semibold text-foreground">Partilhados consigo</h2>
      <Tabela
        rotulo="Documentos partilhados"
        colunas={colPartilhados}
        linhas={partilhados.data ? [...partilhados.data].sort((a, b) => b.sharedAt.localeCompare(a.sharedAt)) : undefined}
        chave={(d) => d.shareId}
        aCarregar={partilhados.isPending}
        erro={partilhados.error ? <ErrorPanel erro={partilhados.error} tentarDeNovo={() => void partilhados.refetch()} /> : undefined}
        vazio="Ainda não há documentos partilhados consigo."
      />
      <h2 className="mb-3 mt-8 text-base font-semibold text-foreground">Carregados por si</h2>
      <Tabela
        rotulo="Ficheiros carregados"
        colunas={colFicheiros}
        linhas={ficheiros.data ? [...ficheiros.data].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)) : undefined}
        chave={(d) => d.documentId}
        aCarregar={ficheiros.isPending}
        erro={ficheiros.error ? <ErrorPanel erro={ficheiros.error} tentarDeNovo={() => void ficheiros.refetch()} /> : undefined}
        vazio="Ainda não carregou ficheiros."
      />
    </>
  );
}
