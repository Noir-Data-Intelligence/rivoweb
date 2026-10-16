/**
 * Separadores de uma página no URL (`?vista=…`), para o «voltar» do browser e
 * uma ligação partilhada abrirem a mesma vista. A primeira vista visível é a
 * omissão; uma vista pedida a que a conta não tem acesso cai na omissão. Os
 * outros filtros (ano, período) passam de uma vista para a outra; a página da
 * lista recomeça.
 */
import { NavLink, useLocation, useSearchParams } from "react-router";
import { cn } from "./cn";

export type Vista<V extends string> = { readonly valor: V; readonly texto: string; readonly visivel?: boolean };

export function useVista<V extends string>(vistas: readonly Vista<V>[]): V | null {
  const [params] = useSearchParams();
  const visiveis = vistas.filter((v) => v.visivel !== false);
  const pedida = params.get("vista");
  return visiveis.find((v) => v.valor === pedida)?.valor ?? visiveis[0]?.valor ?? null;
}

export function Vistas<V extends string>({ rotulo, vistas, actual }: { rotulo: string; vistas: readonly Vista<V>[]; actual: V | null }) {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const destino = (valor: string, omissao: boolean) => {
    const n = new URLSearchParams(params);
    n.delete("pagina");
    if (omissao) n.delete("vista");
    else n.set("vista", valor);
    const q = n.toString();
    return q ? `${pathname}?${q}` : pathname;
  };
  const visiveis = vistas.filter((v) => v.visivel !== false);
  if (visiveis.length < 2) return null;
  const omissao = visiveis[0]?.valor;
  return (
    <nav aria-label={rotulo} className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
      {visiveis.map((v) => {
        const activa = v.valor === actual;
        return (
          <NavLink
            key={v.valor}
            to={destino(v.valor, v.valor === omissao)}
            end
            aria-current={activa ? "page" : undefined}
            className={() =>
              cn(
                "inline-flex h-9 shrink-0 items-center border-b-2 px-3 text-base pointer-coarse:h-11",
                activa ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )
            }
          >
            {v.texto}
          </NavLink>
        );
      })}
    </nav>
  );
}
