// Regras de segurança do plano (§7.4, §7.6, §8.2) aplicadas pela lint.
import js from "@eslint/js";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const restricoesSintaxe = [
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: "Proibido (S10). Para HTML rico use o componente SafeHtml.",
  },
  {
    selector: "Literal[value=/^\\s*javascript:/i]",
    message: "URLs javascript: são proibidos (S12).",
  },
  {
    selector: "TemplateElement[value.raw=/^\\s*javascript:/i]",
    message: "URLs javascript: são proibidos (S12).",
  },
  {
    selector: "JSXOpeningElement[name.name='iframe']",
    message: "Sem iframes: a CSP fecha frame-src e as descargas são sempre anexo (S17).",
  },
  {
    selector: "CallExpression[callee.object.name='window'][callee.property.name='open']",
    message: "Sem window.open (S17).",
  },
  {
    selector: "Literal[value=/[?&](nif|email|nome|iban|bi)=/i]",
    message: "Nada de dados pessoais em URLs; só ids (S19).",
  },
];

export default tseslint.config(
  { ignores: ["dist", "coverage", "playwright-report", "test-results", "src/lib/api/schema.d.ts", "public"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser }, ecmaVersion: 2023 },
    plugins: { "react-hooks": reactHooks, "import-x": importX },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      // Os sanitizadores (§7.3) removem controlos de propósito.
      "no-control-regex": "off",
      "no-console": "error",
      "no-debugger": "error",
      "no-restricted-globals": [
        "error",
        { name: "localStorage", message: "Só em src/lib/prefs.ts. O token nunca vai para localStorage (S1)." },
        { name: "indexedDB", message: "Proibido: nada sensível em armazenamento persistente (S1)." },
      ],
      "no-restricted-properties": [
        "error",
        { property: "innerHTML", message: "Proibido (S10)." },
        { property: "outerHTML", message: "Proibido (S10)." },
        { property: "insertAdjacentHTML", message: "Proibido (S10)." },
        { object: "document", property: "write", message: "Proibido (S10)." },
        { object: "document", property: "cookie", message: "Sem cookies (ADR-013/033)." },
        { object: "window", property: "localStorage", message: "Só em src/lib/prefs.ts (S1)." },
      ],
      "no-restricted-syntax": ["error", ...restricoesSintaxe],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            { target: "./src", from: "./tests", message: "Fixtures e MSW só em tests/ (§8.2)." },
            { target: "./src/ui", from: "./src/features", message: "ui/ não conhece features (§1.3)." },
            { target: "./src/ui", from: "./src/lib/api", message: "ui/ não conhece a API (§1.3)." },
            { target: "./src/lib", from: "./src/features", message: "lib/ não depende de features (§1.3)." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "msw", message: "MSW só em tests/ (§8.2)." },
            { name: "@vercel/analytics", message: "Sem analytics (§7.6)." },
            { name: "@vercel/speed-insights", message: "Sem analytics (§7.6)." },
          ],
          patterns: [{ group: ["msw/*"], message: "MSW só em tests/ (§8.2)." }],
        },
      ],
    },
  },
  {
    // Único ponto autorizado a usar localStorage (preferências não sensíveis).
    files: ["src/lib/prefs.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  {
    files: ["*.config.{js,ts}", "scripts/**/*.mjs", "tests/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "no-console": "off" },
  },
  {
    // Os testes usam de propósito os vectores que a lint proíbe no produto
    // (javascript:, localStorage) para provar que são recusados.
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "no-script-url": "off",
      "no-restricted-syntax": "off",
      "no-restricted-globals": "off",
      // `use` das fixtures do Playwright não é o hook do React.
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
