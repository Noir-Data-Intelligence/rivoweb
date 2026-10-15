/**
 * Campo de ficheiro que carrega logo ao escolher e devolve o documento. O
 * formulário que o usa só envia o `documentId`. Um ficheiro carregado e não
 * usado fica no arquivo da conta (como em qualquer carregamento).
 */
import { FileCheck2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useUtilizador } from "@/features/identity";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { ACEITES, motivoParaRecusar, tectoBytes, useCarregarDocumento, type Documento } from "./api";

export function CarregarFicheiro({
  rotulo,
  categoria,
  documento,
  aoMudar,
  ajuda,
}: {
  rotulo: string;
  categoria: string;
  documento: Documento | null;
  aoMudar: (d: Documento | null) => void;
  ajuda?: string;
}) {
  const { pode } = useUtilizador();
  const podeLer = pode("documents.read");
  const carregar = useCarregarDocumento();
  const [recusa, setRecusa] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const texto = ajuda ?? `PDF, imagem ou documento de escritório, até ${String(tectoBytes(podeLer) / (1024 * 1024))} MB.`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {rotulo}
      </label>
      {documento ? (
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <FileCheck2 strokeWidth={1.75} className="size-4 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{documento.fileName}</span>
          <Button
            type="button"
            variante="ghost"
            tamanho="sm"
            onClick={() => {
              aoMudar(null);
              carregar.reset();
              if (entrada.current) entrada.current.value = "";
            }}
          >
            <X strokeWidth={1.75} aria-hidden />
            Retirar
          </Button>
        </div>
      ) : (
        <input
          ref={entrada}
          id={id}
          type="file"
          accept={ACEITES}
          aria-describedby={idAjuda}
          aria-busy={carregar.isPending || undefined}
          disabled={carregar.isPending}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-foreground"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setRecusa(null);
            carregar.reset();
            if (!f) return;
            const motivo = motivoParaRecusar(f, podeLer);
            if (motivo) {
              setRecusa(motivo);
              e.target.value = "";
              return;
            }
            carregar.mutate({ ficheiro: f, categoria }, { onSuccess: (d) => aoMudar(d) });
          }}
        />
      )}
      <p id={idAjuda} className="text-xs text-muted-foreground">
        {carregar.isPending ? "A carregar…" : texto}
      </p>
      {recusa ? (
        <p className="text-xs text-danger" role="alert">
          {recusa}
        </p>
      ) : null}
      {carregar.error ? <ErrorPanel erro={carregar.error} /> : null}
    </div>
  );
}
