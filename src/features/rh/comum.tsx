/** Peças partilhadas pelos ecrãs de RH. */
import type { Pagina } from "@/lib/api/pagination";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import type { Colaborador, Departamento } from "./api";

/** Nome a partir de uma lista de apoio. Sem o nome, diz isso, e nunca mostra o id. */
export function nomeColaborador(lista: readonly Colaborador[] | undefined, id: string): string {
  if (!lista) return "…";
  return lista.find((c) => c.employeeId === id)?.fullName ?? "Colaborador fora da lista";
}

export function nomeDepartamento(lista: readonly Departamento[] | undefined, id: string | null): string {
  if (id === null) return "Sem departamento";
  if (!lista) return "…";
  return lista.find((d) => d.departmentId === id)?.name ?? "Departamento fora da lista";
}

/**
 * Nome já usado por outro registo da lista (sem distinguir maiúsculas nem
 * acentos, como a colação da base). Só vê a lista carregada (até 200).
 */
export function nomeRepetido(lista: readonly { id: string; nome: string }[] | undefined, nome: string, proprio?: string): boolean {
  if (!lista) return false;
  const c = new Intl.Collator("pt", { sensitivity: "base" });
  return lista.some((x) => x.id !== proprio && c.compare(x.nome.trim(), nome.trim()) === 0);
}

/**
 * As listas de apoio pedem a primeira página com o tecto do servidor (200).
 * Se houver mais, avisa em vez de esconder (sem pesquisa no servidor, B6).
 */
export function AvisoListaIncompleta({ pagina, oque }: { pagina: Pagina<unknown>; oque: string }) {
  if (pagina.total <= pagina.items.length) return null;
  return (
    <Alert tom="aviso" titulo={`Só aparecem os primeiros ${pagina.items.length} de ${pagina.total} ${oque}.`}>
      A API ainda não pesquisa por nome.
    </Alert>
  );
}

export function EstadoColaborador({ estado }: { estado: string }) {
  if (estado === "Active") return <Badge tom="sucesso">Activo</Badge>;
  if (estado === "Inactive") return <Badge tom="aviso">Inactivo</Badge>;
  return <Badge>{estado}</Badge>;
}

export function EstadoOcupacao({ estado }: { estado: string }) {
  if (estado === "Effective") return <Badge tom="sucesso">Em vigor</Badge>;
  if (estado === "Pending") return <Badge tom="aviso">Pendente de aprovação</Badge>;
  if (estado === "Rejected") return <Badge tom="erro">Recusada</Badge>;
  return <Badge>{estado}</Badge>;
}
