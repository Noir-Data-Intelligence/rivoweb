/**
 * Escolher um colaborador (formulários e filtros) a partir da lista de apoio
 * (até ao tecto do servidor). O filtro vai para o URL só como id (§7.6).
 */
import { useId, type SelectHTMLAttributes } from "react";
import { useSearchParams } from "react-router";
import { uuid } from "@/lib/validation/text";
import { Select } from "@/ui/Controlos";
import { useTodosColaboradores } from "./api";
import { nomeColaborador } from "./comum";

/** Nome a partir do id, com a lista de apoio já carregada (nunca mostra o id). */
export function useNomeColaborador() {
  const lista = useTodosColaboradores();
  return (id: string) => nomeColaborador(lista.data?.items, id);
}

export function SelectColaborador({
  valor,
  aoMudar,
  soActivos = true,
  vazio = "Escolha…",
  ...resto
}: { valor: string; aoMudar: (id: string) => void; soActivos?: boolean; vazio?: string } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & { invalido?: boolean }) {
  const lista = useTodosColaboradores();
  const itens = (lista.data?.items ?? []).filter((c) => !soActivos || c.status === "Active" || c.employeeId === valor);
  return (
    <Select {...resto} value={valor} onChange={(e) => aoMudar(e.target.value)}>
      <option value="">{lista.isPending ? "A carregar…" : vazio}</option>
      {itens.map((c) => (
        <option key={c.employeeId} value={c.employeeId}>
          {c.fullName}
        </option>
      ))}
    </Select>
  );
}

/** Filtro «Colaborador» de uma lista, no URL (`?colaborador=<id>`). */
export function useFiltroColaborador() {
  const [params, setParams] = useSearchParams();
  const v = params.get("colaborador") ?? "";
  const colaborador = uuid.safeParse(v).success ? v : null;
  // Do URL actual, não do último render: com outro filtro mudado logo antes, nenhum se perde (as navegações vão em transição).
  const mudar = (id: string) => {
    const n = new URLSearchParams(window.location.search);
    if (id) n.set("colaborador", id);
    else n.delete("colaborador");
    n.delete("pagina");
    setParams(n);
  };
  return { colaborador, mudar };
}

export function FiltroColaborador({ colaborador, mudar }: { colaborador: string | null; mudar: (id: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5 sm:w-72">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Colaborador
      </label>
      <SelectColaborador id={id} valor={colaborador ?? ""} aoMudar={mudar} soActivos={false} vazio="Todos" />
    </div>
  );
}
