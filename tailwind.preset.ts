/**
 * Rivo — preset Tailwind (v3). Consome as variáveis de `tokens.css`.
 *
 *   // tailwind.config.ts
 *   import rivo from "./identidade/tailwind.preset";
 *   export default { presets: [rivo], content: ["./index.html", "./src/**\/*.{ts,tsx}"] };
 *
 * Tailwind v4: importar `tokens.css` e mapear o mesmo em `@theme inline`.
 */
import type { Config } from "tailwindcss";

const c = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;
const pair = (name: string) => ({ DEFAULT: c(name), foreground: c(`${name}-foreground`) });
const status = (name: string) => ({ DEFAULT: c(name), soft: c(`${name}-soft`) });

export default {
  darkMode: "class",
  theme: {
    screens: {
      sm: "640px",   // telemóvel na horizontal
      md: "768px",   // tablet — aparece a barra lateral compacta
      lg: "1024px",  // portátil — barra lateral completa
      xl: "1280px",
      "2xl": "1536px",
    },
    container: { center: true, padding: { DEFAULT: "1rem", md: "1.5rem", lg: "2rem" } },
    extend: {
      colors: {
        background: c("background"),
        foreground: c("foreground"),
        border: c("border"),
        input: c("input"),
        ring: c("ring"),
        card: pair("card"),
        popover: pair("popover"),
        primary: { ...pair("primary"), hover: c("primary-hover") },
        secondary: pair("secondary"),
        muted: { ...pair("muted"), subtle: c("subtle-foreground") },
        accent: pair("accent"),
        destructive: pair("destructive"),
        success: status("success"),
        warning: status("warning"),
        danger: status("danger"),
        info: status("info"),
        ai: status("ai"),
        sidebar: {
          DEFAULT: c("sidebar"),
          foreground: c("sidebar-foreground"),
          active: c("sidebar-active"),
          "active-foreground": c("sidebar-active-foreground"),
          border: c("sidebar-border"),
        },
        chart: {
          1: c("chart-1"),
          2: c("chart-2"),
          3: c("chart-3"),
          4: c("chart-4"),
          5: c("chart-5"),
          neutral: c("chart-neutral"),
          grid: c("chart-grid"),
        },
        marca: {
          tinta: c("marca-tinta"),
          ciano: c("marca-ciano"),
          azul: c("marca-azul"),
          indigo: c("marca-indigo"),
          violeta: c("marca-violeta"),
        },
      },
      backgroundImage: { "marca-gradiente": "var(--marca-gradiente)" },
      borderRadius: {
        card: "var(--radius-card)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        // [tamanho, { altura de linha, espessura sugerida }]
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],      // 11 — legendas de eixo
        xs: ["0.75rem", { lineHeight: "1rem" }],           // 12 — rótulos, badges
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],      // 13 — tabelas
        base: ["0.875rem", { lineHeight: "1.375rem" }],    // 14 — texto da app
        md: ["1rem", { lineHeight: "1.5rem" }],            // 16 — títulos de cartão
        lg: ["1.25rem", { lineHeight: "1.75rem" }],        // 20 — título de página
        xl: ["1.5rem", { lineHeight: "2rem" }],            // 24 — valor de KPI
        "2xl": ["1.875rem", { lineHeight: "2.25rem" }],    // 30 — número de destaque
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      transitionDuration: { DEFAULT: "150ms" },
    },
  },
} satisfies Partial<Config>;
