/** Modelo de permissões (§3). O backend é sempre a autoridade. */
export type Perm = string;

/** Requisito de permissões; combina-se («A, ou B e C») com `anyOf`/`allOf` aninhados. */
export type Requisito =
  | "autenticado"
  | Perm
  | { readonly anyOf: readonly Requisito[] }
  | { readonly allOf: readonly Requisito[] };

export function pode(permissoes: ReadonlySet<Perm>, req: Requisito): boolean {
  if (req === "autenticado") return true;
  if (typeof req === "string") return permissoes.has(req);
  if ("anyOf" in req) return req.anyOf.some((r) => pode(permissoes, r));
  return req.allOf.every((r) => pode(permissoes, r));
}

export type Shell = "backoffice" | "colaborador" | "cliente";

/**
 * Shell inicial a partir de `/identity/me` (§3.3). A confirmação no portal do
 * cliente e no do colaborador faz-se depois, com `GET …/me`.
 */
export function shellInicial(roles: readonly string[], permissoes: readonly string[]): Shell {
  if (roles.includes("Cliente")) return "cliente";
  if (temGestao(permissoes)) return "backoffice";
  return "colaborador";
}

/**
 * Permissões que os portais também têm e que, por isso, não fazem de ninguém
 * gestor. Facto (catálogo de 2026-10-13): `Colaborador` e `Cliente` têm só
 * `documents.write`, para carregarem ficheiros no portal (B12, ADR-080).
 */
export const PERMISSOES_DE_PORTAL: ReadonlySet<Perm> = new Set(["documents.write"]);

/** Tem pelo menos uma permissão de gestão (backoffice)? */
export function temGestao(permissoes: readonly string[]): boolean {
  return permissoes.some((p) => !PERMISSOES_DE_PORTAL.has(p));
}

export const PREFIXO_SHELL: Readonly<Record<Shell, string>> = {
  backoffice: "/",
  colaborador: "/eu",
  cliente: "/cliente",
};
