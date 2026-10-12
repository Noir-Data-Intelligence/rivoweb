/** Configuração de build. Nada aqui é segredo. */
const bruto = import.meta.env.VITE_API_URL ?? "";

/** Origem da API, sem barra final. Vazia nos previews (D10): não há API. */
export const API_URL: string = bruto.replace(/\/+$/, "");

export const API_DISPONIVEL: boolean = API_URL !== "";

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? "dev";
