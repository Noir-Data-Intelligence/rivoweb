/**
 * Carregamento de ficheiros (§5.6, antecipado da F10). `POST /documents`, em
 * multipart com `file` e `category`. O servidor reconhece o tipo pelo conteúdo;
 * aqui só se poupa a viagem a quem escolhe um ficheiro que nunca passaria.
 */
import { useEscrita } from "@/lib/api/escrita";
import { api, ler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Documento = components["schemas"]["DocumentDescriptor"];

/** Facto: `DocumentContentPolicy` (PDF, imagens, escritório, texto). */
export const EXTENSOES = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".docx", ".xlsx", ".pptx", ".odt", ".ods", ".doc", ".xls", ".txt", ".csv"] as const;
export const ACEITES = EXTENSOES.join(",");

/** Contas sem `documents.read` têm tecto de 10 MB e 20 ficheiros por dia (ADR-070); as outras, 25 MB. */
export const tectoBytes = (podeLerArquivo: boolean) => (podeLerArquivo ? 25 : 10) * 1024 * 1024;

/** Motivo para recusar o ficheiro antes de o enviar, ou `null`. */
export function motivoParaRecusar(f: File, podeLerArquivo: boolean): string | null {
  if (f.size === 0) return "O ficheiro está vazio.";
  const tecto = tectoBytes(podeLerArquivo);
  if (f.size > tecto) return `O ficheiro passa de ${String(tecto / (1024 * 1024))} MB.`;
  const ext = /\.[^.]+$/.exec(f.name.toLowerCase())?.[0] ?? "";
  if (!(EXTENSOES as readonly string[]).includes(ext)) return "Formato não aceite. Envie PDF, imagem, documento de escritório ou texto.";
  return null;
}

export function useCarregarDocumento() {
  return useEscrita({
    mutationFn: ({ ficheiro, categoria }: { ficheiro: File; categoria: string }) => {
      const corpo = new FormData();
      corpo.append("file", ficheiro, ficheiro.name);
      corpo.append("category", categoria);
      return ler(api.POST("/documents", { body: corpo as never, bodySerializer: (b: unknown) => b as FormData })) as Promise<Documento>;
    },
  });
}
