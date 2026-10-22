/**
 * Ler uma factura de fornecedor com IA (§5.14, F13): PDF ou imagem até 10 MB;
 * devolve os campos para pré-preencher o registo. Nada é gravado: quem regista
 * confirma os valores. Por botão; mostra os avisos e as linhas lidas.
 */
import { Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { moeda } from "@/features/facturacao";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { useLerFactura, type FacturaLida } from "./api";
import { AvisoCusto, useIaLigada } from "./comum";

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX = 10 * 1024 * 1024;

export function LerFacturaComIa({ aoLer }: { aoLer: (f: FacturaLida) => void }) {
  const ia = useIaLigada();
  const ler = useLerFactura();
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [lida, setLida] = useState<FacturaLida | null>(null);
  const id = useId();
  if (!ia.ligada) return null;
  const erro = ficheiro && !TIPOS.includes(ficheiro.type) ? "Só PDF ou imagem (JPEG, PNG, WebP, GIF)." : ficheiro && ficheiro.size > MAX ? "O ficheiro excede 10 MB." : undefined;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3 sm:col-span-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Ler a factura com IA (opcional)
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={id}
          type="file"
          accept={TIPOS.join(",")}
          className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm"
          aria-describedby={erro ? `${id}-erro` : undefined}
          onChange={(e) => {
            setFicheiro(e.target.files?.[0] ?? null);
            setLida(null);
            ler.reset();
          }}
        />
        <Button
          type="button"
          variante="secondary"
          tamanho="sm"
          aCarregar={ler.isPending}
          disabled={!ficheiro || Boolean(erro)}
          onClick={() => {
            if (!ficheiro || erro || ler.isPending) return;
            ler.mutate(ficheiro, {
              onSuccess: (f) => {
                setLida(f);
                aoLer(f);
              },
            });
          }}
        >
          <Sparkles strokeWidth={1.75} aria-hidden />
          Ler com IA
        </Button>
      </div>
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-xs text-danger">
          {erro}
        </p>
      ) : null}
      <AvisoCusto />
      {ler.error ? <ErrorPanel erro={ler.error} /> : null}
      {lida ? (
        <div className="flex flex-col gap-1 text-sm" role="status">
          <p className="font-medium text-foreground">Campos preenchidos com o que se leu: confirme-os antes de registar.</p>
          {lida.warnings.length > 0 ? (
            <ul className="list-disc pl-5 text-warning" aria-label="Avisos da leitura">
              {lida.warnings.map((w, k) => (
                <li key={k} className="break-words">
                  {w}
                </li>
              ))}
            </ul>
          ) : null}
          {lida.lines.length > 0 ? (
            <ul className="list-disc pl-5 text-muted-foreground" aria-label="Linhas lidas">
              {lida.lines.map((l, k) => (
                <li key={k} className="break-words">
                  {l.description}
                  {l.total !== null ? ` · ${moeda(l.total, lida.currency ?? "AOA")}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
