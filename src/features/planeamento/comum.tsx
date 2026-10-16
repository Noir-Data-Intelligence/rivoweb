/**
 * Nomes de departamentos e colaboradores no planeamento. As vistas do
 * servidor só trazem ids (B22); os nomes vêm das listas de RH, que só quem
 * lê RH carrega. Sem elas, o front nunca mostra o id: diz que não tem acesso.
 */
import { useUtilizador } from "@/features/identity";
import { useTodosColaboradores, useTodosDepartamentos } from "@/features/rh";

export function useNomesOrganizacao() {
  const { pode } = useUtilizador();
  const leDepartamentos = pode("hr.departments.read");
  const leColaboradores = pode("hr.employees.read");
  const departamentos = useTodosDepartamentos(leDepartamentos);
  const colaboradores = useTodosColaboradores(leColaboradores);
  return {
    leDepartamentos,
    leColaboradores,
    departamentos: departamentos.data?.items ?? [],
    colaboradores: colaboradores.data?.items ?? [],
    nomeDepartamento: (id: string | null) => {
      if (!id) return "—";
      if (!leDepartamentos) return "Departamento";
      return departamentos.data?.items.find((d) => d.departmentId === id)?.name ?? "Departamento";
    },
    nomeColaborador: (id: string | null) => {
      if (!id) return "—";
      if (!leColaboradores) return "Colaborador";
      return colaboradores.data?.items.find((c) => c.employeeId === id)?.fullName ?? "Colaborador";
    },
  };
}

export const MOEDAS = ["AOA", "USD", "EUR"] as const;
