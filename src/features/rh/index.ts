/** Superfície pública de `rh` para as outras features (§1.3). */
export { useTodosCargos, useTodosColaboradores, useTodosDepartamentos } from "./api";
export * from "./estados";
export { diasDeCalendario, validarFerias, type ErrosFerias } from "./regras";
export { SelectColaborador, useNomeColaborador } from "./escolhas";
export { useContratos } from "./gestao";
