import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import rivo from "./tailwind.preset";

export default {
  presets: [rivo],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  plugins: [
    // Alvos de 44 px em ecrãs de toque (IV §4.2, WCAG 2.5.8).
    plugin(({ addVariant }) => {
      addVariant("pointer-coarse", "@media (pointer: coarse)");
    }),
  ],
} satisfies Config;
