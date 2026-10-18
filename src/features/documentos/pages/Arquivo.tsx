/**
 * Arquivo de documentos (§5.6/§5.13, F10): todos os ficheiros carregados na
 * Rivo, com a categoria e o período no URL. Só para quem lê o arquivo
 * (`documents.read`); os ficheiros carregam-se no contexto de cada área.
 */
import { Download } from "lucide-react";
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { useUtilizadores } from "@/features/administracao";
import { useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { formatarTamanho } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useArquivo, useDescarregarDoArquivo, type Documento } from "../api";

function Descarregar({ d }: { d: Documento }) {
  const descarregar = useDescarregarDoArquivo();
  return (
    <span className="inline-flex flex-col items-end">
      <Button variante="ghost" tamanho="sm" aCarregar={descarregar.isPending} onClick={() => descarregar.mutate(d)} aria-label={`Descarregar ${d.fileName}`}>
        <Download strokeWidth={1.75} aria-hidden />
        Descarregar
      </Button>
      {descarregar.error ? <ErrorPanel erro={descarregar.error} /> : null}
    </span>
  );
}

export default function Arquivo() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const { pode } = useUtilizador();
  const podeLerContas = pode("identity.users.read");
  const utilizadores = useUtilizadores(podeLerContas);
  const idCategoria = useId();
  const idDe = useId();
  const idAte = useId();
  const data = (k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);
  const de = data("de");
  const ate = data("ate");
  const categoria = normalizarTexto(params.get("categoria") ?? "").slice(0, 100);
  const [texto, setTexto] = useState(categoria);
  const arquivo = useArquivo({ categoria, de, ate, pagina, tamanho });
  const filtrar = (k: string, v: string) => {
    const n = new URLSearchParams(window.location.search);
    if (v) n.set(k, v);
    else n.delete(k);
    n.delete("pagina");
    setParams(n);
  };
  const quem = (id: string | null) => (id === null ? "—" : podeLerContas ? (utilizadores.data?.find((u) => u.userId === id)?.email ?? "—") : "—");
  const colunas: Coluna<Documento>[] = [
    {
      id: "ficheiro",
      cabecalho: "Ficheiro",
      className: "max-w-[18rem]",
      celula: (d) => (
        <span className="flex flex-col">
          <span className="truncate font-medium">{d.fileName}</span>
          <span className="text-xs text-muted-foreground">{formatarTamanho(d.sizeInBytes)}</span>
        </span>
      ),
    },
    {
      id: "categoria",
      cabecalho: "Categoria",
      esconderAte: "sm",
      className: "max-w-[12rem] truncate",
      celula: (d) => d.category,
    },
    {
      id: "quando",
      cabecalho: "Carregado a",
      esconderAte: "md",
      celula: (d) => formatarDataHora(d.uploadedAt),
    },
    ...(podeLerContas
      ? [
          {
            id: "quem",
            cabecalho: "Por",
            esconderAte: "lg" as const,
            className: "max-w-[14rem] truncate",
            celula: (d: Documento) => quem(d.uploadedBy),
          },
        ]
      : []),
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (d) => <Descarregar d={d} />,
    },
  ];
  return (
    <>
      <PageHeader titulo="Arquivo de documentos" descricao="Todos os ficheiros carregados na Rivo: comprovativos, anexos, documentos pessoais e partilhados. Descarregam-se sempre como ficheiro." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            filtrar("categoria", normalizarTexto(texto).slice(0, 100));
          }}
        >
          <label htmlFor={idCategoria} className="text-sm font-medium text-foreground">
            Categoria
          </label>
          <Input
            id={idCategoria}
            maxLength={100}
            autoComplete="off"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => filtrar("categoria", normalizarTexto(texto).slice(0, 100))}
          />
        </form>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idDe} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={idDe} type="date" value={de ?? ""} onChange={(e) => filtrar("de", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate ?? ""} onChange={(e) => filtrar("ate", e.target.value)} />
        </div>
      </div>
      <Tabela
        rotulo="Documentos"
        colunas={colunas}
        linhas={arquivo.data?.items}
        chave={(d) => d.documentId}
        aCarregar={arquivo.isPending}
        erro={arquivo.error ? <ErrorPanel erro={arquivo.error} tentarDeNovo={() => void arquivo.refetch()} /> : undefined}
        vazio={categoria || de || ate ? "Nenhum documento com estes filtros." : "Ainda não há documentos."}
        rodape={arquivo.data && arquivo.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={arquivo.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
