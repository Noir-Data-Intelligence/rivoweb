/**
 * Portal › Documentos: os documentos pessoais que os RH anexaram à ficha e as
 * declarações que o próprio pode emitir. Emitir uma declaração fica registado
 * (com código de verificação), por isso pede confirmação.
 */
import { Download, FileCheck } from "lucide-react";
import { useState } from "react";
import { formatarDataDeInstante } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useDescarregarDocumento, useEmitirDeclaracao, useMeusDocumentos, useMinhasDeclaracoes, type DocumentoPessoal, type ModeloDeclaracao } from "../api";

function tamanho(bytes: number | string): string {
  const b = Number(bytes);
  if (b < 1024) return `${formatarNumeroDecimal(String(b), 0)} B`;
  if (b < 1024 * 1024) return `${formatarNumeroDecimal((b / 1024).toFixed(0), 0)} KB`;
  return `${formatarNumeroDecimal((b / 1024 / 1024).toFixed(1), 1)} MB`;
}

function Descarregar({ d, aoFalhar }: { d: DocumentoPessoal; aoFalhar: (e: unknown) => void }) {
  const doc = useDescarregarDocumento();
  return (
    <Button variante="ghost" tamanho="sm" aCarregar={doc.isPending} onClick={() => doc.mutate(d, { onError: aoFalhar })} aria-label={`Descarregar ${d.fileName}`}>
      <Download strokeWidth={1.75} aria-hidden />
      Descarregar
    </Button>
  );
}

function Emitir({ m }: { m: ModeloDeclaracao }) {
  const [aberto, setAberto] = useState(false);
  const emitir = useEmitirDeclaracao();
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">{m.name}</p>
        <p className="text-sm text-muted-foreground">{m.title}</p>
      </div>
      <Button variante="secondary" onClick={() => setAberto(true)} aria-label={`Emitir a ${m.name}`}>
        <FileCheck strokeWidth={1.75} aria-hidden />
        Emitir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) emitir.reset();
        }}
        titulo={`Emitir a ${m.name}?`}
        descricao="A declaração sai com os seus dados de hoje e fica registada, com um código para quem a receber a poder verificar. O PDF descarrega a seguir."
        rotuloConfirmar="Emitir e descarregar"
        aCarregar={emitir.isPending}
        erro={emitir.error ? <ErrorPanel erro={emitir.error} /> : undefined}
        aoConfirmar={() => (emitir.isPending ? undefined : emitir.mutate(m, { onSuccess: () => setAberto(false) }))}
      />
    </Card>
  );
}

export default function Documentos() {
  const documentos = useMeusDocumentos();
  const declaracoes = useMinhasDeclaracoes();
  const [erro, setErro] = useState<unknown>(null);
  const colunas: Coluna<DocumentoPessoal>[] = [
    {
      id: "nome",
      cabecalho: "Documento",
      celula: (d) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{d.fileName}</span>
          <span className="text-sm text-muted-foreground">{d.category}</span>
        </div>
      ),
      className: "max-w-[20rem]",
    },
    { id: "data", cabecalho: "Anexado em", esconderAte: "sm", celula: (d) => formatarDataDeInstante(d.attachedAt) },
    { id: "tamanho", cabecalho: "Tamanho", alinhar: "direita", esconderAte: "md", celula: (d) => tamanho(d.sizeInBytes) },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (d) => <Descarregar d={d} aoFalhar={setErro} /> },
  ];
  return (
    <>
      <PageHeader titulo="Documentos" descricao="Os documentos da sua ficha e as declarações que pode pedir." />
      {erro ? <ErrorPanel erro={erro} className="mb-4" /> : null}
      <Tabela
        rotulo="Documentos pessoais"
        colunas={colunas}
        linhas={documentos.data}
        chave={(d) => d.documentId}
        aCarregar={documentos.isPending}
        erro={documentos.error ? <ErrorPanel erro={documentos.error} tentarDeNovo={() => void documentos.refetch()} /> : undefined}
        vazio="Os Recursos Humanos ainda não anexaram documentos à sua ficha."
      />
      <h2 className="mb-3 mt-8 text-md font-semibold text-foreground">Declarações</h2>
      {declaracoes.isPending ? (
        <Skeleton className="h-20" />
      ) : declaracoes.error ? (
        <ErrorPanel erro={declaracoes.error} tentarDeNovo={() => void declaracoes.refetch()} />
      ) : declaracoes.data.length === 0 ? (
        <Alert tom="info" titulo="Ainda não há modelos de declaração." />
      ) : (
        <div className="flex flex-col gap-3">
          {declaracoes.data.map((m) => (
            <Emitir key={m.templateId} m={m} />
          ))}
        </div>
      )}
    </>
  );
}
