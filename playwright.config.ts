import { defineConfig, devices } from "@playwright/test";

/**
 * Dois projectos (§8):
 * - `interface`: o build de produção servido com os cabeçalhos do vercel.json,
 *   com a API simulada em tests/fixtures (nunca no bundle). Corre nos três motores.
 * - `leitura-producao`: smoke contra https://syyt.tech, só GET + login/logout,
 *   com a conta do .env.local. Só corre quando pedido (RIVO_SMOKE_PRODUCAO=1).
 */
const API_SIMULADA = "http://localhost:5080";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // Localmente, muitos Firefox em paralelo esgotavam o compositor por software
  // (GraphicsCriticalError, SWGL) e falhavam testes que passam sozinhos.
  workers: process.env.CI ? undefined : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure", locale: "pt-AO", timezoneId: "Africa/Luanda" },
  // Três motores em paralelo numa só máquina: 5 s davam esperas falhadas por carga.
  expect: { timeout: 10_000 },
  webServer: {
    command: "node scripts/serve-dist.mjs",
    url: "http://localhost:4173/entrar",
    reuseExistingServer: !process.env.CI,
    env: { PORT: "4173", API_TESTE: API_SIMULADA },
  },
  projects: [
    { name: "chromium", testDir: "tests/e2e/interface", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4173" } },
    { name: "firefox", testDir: "tests/e2e/interface", use: { ...devices["Desktop Firefox"], baseURL: "http://localhost:4173" } },
    { name: "webkit", testDir: "tests/e2e/interface", use: { ...devices["Desktop Safari"], baseURL: "http://localhost:4173" } },
    {
      // Escritas contra a API local em Docker (D1). Nunca produção.
      name: "escritas-local",
      testDir: "tests/e2e/local",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5173" },
    },
    {
      name: "leitura-producao",
      testDir: "tests/e2e/leitura",
      use: { ...devices["Desktop Chrome"], baseURL: process.env.RIVO_FRONT_URL ?? "http://localhost:4173" },
    },
  ],
});
