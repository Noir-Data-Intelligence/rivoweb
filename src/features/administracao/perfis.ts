/**
 * Nomes dos perfis para a interface. A chave é o nome técnico que a API usa
 * (Facto: `AccessProfiles.cs`); um perfil novo sem tradução mostra-se tal como
 * vem.
 */
const NOMES: Readonly<Record<string, string>> = {
  Admin: "Administração",
  Manager: "Gestão",
  Finance: "Finanças",
  HR: "Recursos Humanos",
  Sales: "Vendas",
  AssetManager: "Gestão de activos",
  ProjectManager: "Gestão de projectos",
  Cliente: "Cliente",
  Colaborador: "Colaborador",
  SuperAdmin: "SuperAdmin",
};

export function nomePerfil(tecnico: string): string {
  return NOMES[tecnico] ?? tecnico;
}

export const SUPER_ADMIN = "SuperAdmin";

/** Gerir uma conta SuperAdmin exige ser SuperAdmin (ADR-070). */
export function contaProtegida(perfisDoAlvo: readonly string[], souSuperAdmin: boolean): boolean {
  return perfisDoAlvo.includes(SUPER_ADMIN) && !souSuperAdmin;
}
