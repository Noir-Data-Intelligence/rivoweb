/**
 * Departamentos e colaboradores no planeamento. As vistas trazem os nomes
 * (B22); para escolher, quem escreve no planeamento usa
 * `/finance/planning/lookups`, sem as permissões de RH. Quem só lê usa as
 * listas de RH se as ler (para filtrar), ou fica sem filtro.
 */
import { useUtilizador } from "@/features/identity";
import { useTodosDepartamentos } from "@/features/rh";
import { useEscolhasPlaneamento } from "./api";

export type Escolha = { id: string; name: string };

export function useEscolhasOrganizacao() {
  const { pode } = useUtilizador();
  const escreve = pode("finance.planning.write");
  const leDepartamentos = !escreve && pode("hr.departments.read");
  const escolhas = useEscolhasPlaneamento(escreve);
  const rh = useTodosDepartamentos(leDepartamentos);
  const departamentos: Escolha[] = escreve ? (escolhas.data?.departments ?? []) : (rh.data?.items ?? []).map((d) => ({ id: d.departmentId, name: d.name }));
  return {
    /** Há lista de departamentos para filtrar ou escolher. */
    temDepartamentos: escreve || leDepartamentos,
    departamentos,
    colaboradores: escolhas.data?.employees ?? [],
    aCarregar: escreve && escolhas.isPending,
    erro: escreve ? escolhas.error : null,
  };
}

/** Nome vindo do servidor; `null` com id quer dizer que os RH já não o conhecem. */
export function nomeOuTraco(id: string | null, nome: string | null) {
  if (!id) return "—";
  return nome ?? "Removido";
}

export const MOEDAS = ["AOA", "USD", "EUR"] as const;
