/**
 * Ficha › Documentos: os documentos anexados à ficha (contrato, BI, …).
 * Anexar = carregar o ficheiro e ligá-lo com uma categoria; retirar desliga-o
 * da ficha com motivo (o ficheiro fica no arquivo). O colaborador vê-os no
 * portal. Descarregar exige `documents.read`.
 */
import { Download, Paperclip } from "lucide-react";
import { useId, useState } from "react";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { Can, useUtilizador } from "@/features/identity";
import { descarregar } from "@/lib/api/download";
import { formatarDataDeInstante } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAnexarDocumento, useDocumentosFicha, useRetirarDocumento, type DocumentoFicha } from "../gestao";

export const CATEGORIAS_DOCUMENTO = ["Contrato", "Bilhete de identidade", "Passaporte", "Certificado de habilitações", "Atestado médico", "Declaração", "Outro"] as const;

function Anexar({ employeeId }: { employeeId: string }) {
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [tentou, setTentou] = useState(false);
  const anexar = useAnexarDocumento(employeeId);
  const idForm = useId();
  const idLista = useId();
  const c = normalizarTexto(categoria);
  const erros = { categoria: c === "" ? "Indique a categoria." : c.length > 100 ? "No máximo 100 caracteres." : undefined, documento: documento ? undefined : "Escolha o ficheiro." };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      anexar.reset();
      setTentou(false);
      setCategoria("");
      setDocumento(null);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Paperclip strokeWidth={1.75} aria-hidden />
        Anexar documento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Anexar um documento à ficha"
        descricao="O colaborador passa a vê-lo e a descarregá-lo no portal."
        rotuloConfirmar="Anexar"
        aCarregar={anexar.isPending}
        erro={anexar.error ? <ErrorPanel erro={anexar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.categoria || !documento || anexar.isPending) return;
            anexar.mutate({ documentId: documento.documentId, category: c }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Categoria" erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => (
              <>
                <Input id={id} list={idLista} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                <datalist id={idLista}>
                  {CATEGORIAS_DOCUMENTO.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <CarregarFicheiro rotulo="Ficheiro" categoria={c || "Documento do colaborador"} documento={documento} aoMudar={setDocumento} />
          {tentou && erros.documento ? (
            <p className="-mt-2 text-xs text-danger" role="alert">
              {erros.documento}
            </p>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function Retirar({ employeeId, d }: { employeeId: string; d: DocumentoFicha }) {
  const retirar = useRetirarDocumento(employeeId);
  return (
    <ConfirmarComMotivo
      rotuloBotao="Retirar"
      titulo={`Retirar ${d.fileName} da ficha?`}
      descricao="Deixa de aparecer na ficha e no portal. O ficheiro continua no arquivo."
      rotuloConfirmar="Retirar"
      rotuloCampo="Motivo (opcional)"
      opcional
      maximo={500}
      aCarregar={retirar.isPending}
      erro={retirar.error ? <ErrorPanel erro={retirar.error} /> : undefined}
      aoConfirmar={(motivo, fechar) => retirar.mutate({ documentId: d.documentId, reason: motivo === "" ? null : motivo }, { onSuccess: fechar })}
    />
  );
}

export function DocumentosFicha({ employeeId }: { employeeId: string }) {
  const { pode } = useUtilizador();
  const lista = useDocumentosFicha(employeeId);
  const [erro, setErro] = useState<unknown>(null);
  const colunas: Coluna<DocumentoFicha>[] = [
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
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (d) => (
        <div className="flex flex-wrap justify-end gap-1">
          {pode("documents.read") ? (
            <Button variante="ghost" tamanho="sm" aria-label={`Descarregar ${d.fileName}`} onClick={() => descarregar(`/documents/${encodeURIComponent(d.documentId)}`, d.fileName).catch(setErro)}>
              <Download strokeWidth={1.75} aria-hidden />
              Descarregar
            </Button>
          ) : null}
          <Can requer="hr.employees.write">
            <Retirar employeeId={employeeId} d={d} />
          </Can>
        </div>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Can requer={{ allOf: ["hr.employees.write", "documents.write"] }}>
        <div>
          <Anexar employeeId={employeeId} />
        </div>
      </Can>
      {erro ? <ErrorPanel erro={erro} /> : null}
      <Tabela
        rotulo="Documentos da ficha"
        colunas={colunas}
        linhas={lista.data}
        chave={(d) => d.documentId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem documentos anexados."
      />
    </div>
  );
}
