/**
 * Preferências não sensíveis (§1.4): só o tema e a barra lateral. Único módulo
 * autorizado a usar `localStorage` (a lint proíbe-o no resto do código).
 * `public/theme-init.js` lê a mesma chave antes do primeiro paint.
 */
export type Tema = "sistema" | "claro" | "escuro";

export type Prefs = {
  readonly tema: Tema;
  readonly barraColapsada: boolean;
};

const CHAVE = "rivo.prefs";
const OMISSAO: Prefs = { tema: "sistema", barraColapsada: false };

export function lerPrefs(): Prefs {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return OMISSAO;
    const v = JSON.parse(bruto) as Partial<Record<keyof Prefs, unknown>>;
    return {
      tema: v.tema === "claro" || v.tema === "escuro" ? v.tema : "sistema",
      barraColapsada: v.barraColapsada === true,
    };
  } catch {
    return OMISSAO;
  }
}

export function gravarPrefs(alteracao: Partial<Prefs>): Prefs {
  const novo = { ...lerPrefs(), ...alteracao };
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(novo));
  } catch {
    // armazenamento bloqueado: a preferência vale só nesta página
  }
  return novo;
}
