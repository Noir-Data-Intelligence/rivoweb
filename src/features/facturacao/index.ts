/** Superfície pública de `facturacao` para as outras features (§1.3). */
export { EstadoDocumento, MEIOS, moeda, type Valor } from "./comum";
export { useFacturas } from "./api";
export { VenderActivo, type ActivoAVender } from "./VenderActivo";
