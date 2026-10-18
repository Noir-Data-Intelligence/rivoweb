/** Peças comuns do apoio ao cliente. */
import { Badge } from "@/ui/Badge";
import { ESTADOS_ARTIGO, type EstadoArtigo } from "./api";

export function EstadoArtigoBadge({ estado }: { estado: string }) {
  const tom = estado === "Published" ? "sucesso" : estado === "Draft" ? "aviso" : "neutro";
  return <Badge tom={tom}>{ESTADOS_ARTIGO[estado as EstadoArtigo] ?? estado}</Badge>;
}
