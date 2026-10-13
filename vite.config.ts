/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // Sem VITE_API_URL, um build de produção falha (§2 do plano). Os previews da
  // Vercel constroem sem API de propósito (D10); como a Vercel não aceita
  // variáveis vazias, lá a ausência vale como vazio. Fora da Vercel, usar
  // VITE_API_URL= (vazio) para um build sem API.
  if (env.VITE_API_URL === undefined && process.env.VERCEL_ENV === "preview") {
    env.VITE_API_URL = "";
    process.env.VITE_API_URL = "";
  }
  if (mode === "production" && env.VITE_API_URL === undefined && !process.env.VITEST) {
    throw new Error(
      `VITE_API_URL não está definido${process.env.VERCEL_ENV ? ` (Vercel: ${process.env.VERCEL_ENV})` : ""}. Use VITE_API_URL= (vazio) para um build sem API.`,
    );
  }
  if (env.VITE_API_URL && !/^https:\/\/[^/]+$|^http:\/\/localhost:\d+$/.test(env.VITE_API_URL)) {
    throw new Error("VITE_API_URL tem de ser https://<host> (sem barra final) ou http://localhost:<porto>.");
  }

  return {
    plugins: [react()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      ),
    },
    server: { port: 5173, strictPort: true },
    build: {
      sourcemap: false,
      // Sem data: URIs, a CSP mantém img-src/font-src em 'self'.
      assetsInlineLimit: 0,
      target: "es2022",
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
      restoreMocks: true,
      // API fictícia e fixa nos testes, independente do .env.local.
      env: { VITE_API_URL: "https://api.teste" },
      coverage: {
        provider: "v8",
        include: ["src/lib/**"],
        exclude: ["src/lib/api/schema.d.ts"],
        thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
      },
    },
  };
});
