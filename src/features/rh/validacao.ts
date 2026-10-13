export { emailOpcional } from "@/lib/validation/text";

/** Campo opcional vazio sobe como `null` (na API, «vazio apaga»). */
export function vazioParaNull(v: string): string | null {
  return v === "" ? null : v;
}
