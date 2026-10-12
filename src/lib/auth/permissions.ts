/** Modelo de permissões (§3). O backend é sempre a autoridade. */
export type Perm = string;

export type Requisito =
  | "autenticado"
  | Perm
  | { readonly anyOf: readonly Perm[] }
  | { readonly allOf: readonly Perm[] };

export function pode(permissoes: ReadonlySet<Perm>, req: Requisito): boolean {
  if (req === "autenticado") return true;
  if (typeof req === "string") return permissoes.has(req);
  if ("anyOf" in req) return req.anyOf.some((p) => permissoes.has(p));
  return req.allOf.every((p) => permissoes.has(p));
}

export type Shell = "backoffice" | "colaborador" | "cliente";

/**
 * Shell inicial a partir de `/identity/me` (§3.3). A confirmação no portal do
 * cliente e no do colaborador faz-se depois, com `GET …/me`.
 */
export function shellInicial(roles: readonly string[], permissoes: readonly string[]): Shell {
  if (roles.includes("Cliente")) return "cliente";
  if (permissoes.length > 0) return "backoffice";
  return "colaborador";
}

export const PREFIXO_SHELL: Readonly<Record<Shell, string>> = {
  backoffice: "/",
  colaborador: "/eu",
  cliente: "/cliente",
};
