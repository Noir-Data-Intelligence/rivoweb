/** Superfície pública de `tesouraria` para as outras features (§1.3). */
export { useContasAbertas, type Conta } from "./api";
export { erroDataValor, MEIOS_POR_BANCO } from "./regras";
export { PagamentoPeloBanco } from "./Liquidacoes";
