// Verificação do bundle depois do build (§8.4, S10, S15, S26).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const API = (process.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const ORCAMENTO_INICIAL_GZIP = 150 * 1024;
const falhas = [];

function ficheiros(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? ficheiros(p) : [p];
  });
}

const todos = ficheiros(DIST);
const js = todos.filter((f) => f.endsWith(".js"));

// 1. Sem source maps.
for (const f of todos) if (f.endsWith(".map")) falhas.push(`source map publicado: ${f}`);

for (const f of js) {
  const s = readFileSync(f, "utf8");
  const nome = relative(DIST, f);
  if (s.includes("sourceMappingURL")) falhas.push(`${nome}: referência a source map`);
  // 2. Sem MSW nem fixtures (§8.2).
  for (const proibido of ["mockServiceWorker", "msw/", "@faker-js", "tests/fixtures"]) {
    if (s.includes(proibido)) falhas.push(`${nome}: contém «${proibido}»`);
  }
  // 3. Sem eval nem new Function no nosso código (S10). O React não os usa em produção.
  if (/\beval\(|new Function\(/.test(s)) falhas.push(`${nome}: eval ou new Function`);
}

// 4. Sem hosts de terceiros em runtime (S26): só a API e os namespaces XML/SVG/W3C.
// Literais conhecidos das bibliotecas que não são pedidos: namespaces SVG, ligações
// em mensagens de erro do React e do React Router, e a base `new URL(…, "http://localhost")`
// do router. Desde a F2, as mensagens de erro do Redux Toolkit e do Immer (usados por
// dentro do Recharts, só no chunk dos gráficos): `redux.js.org/Errors`,
// `redux-toolkit.js.org/Errors` e `bit.ly/3cXEKWf` (Immer). Os pedidos reais verificam-se no e2e (S26). Um host novo aqui é revisto.
const PERMITIDOS = [
  /^https:\/\/syyt\.tech$/,
  /^http:\/\/www\.w3\.org$/,
  /^https:\/\/react\.dev$/,
  /^https:\/\/reactjs\.org$/,
  /^https:\/\/reactrouter\.com$/,
  /^https:\/\/github\.com$/,
  /^http:\/\/localhost$/,
  /^https:\/\/redux\.js\.org$/,
  /^https:\/\/redux-toolkit\.js\.org$/,
  /^https:\/\/bit\.ly$/,
];
if (API) PERMITIDOS.push(new RegExp(`^${API.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
for (const f of js) {
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?/g)) {
    const url = m[0];
    if (!PERMITIDOS.some((r) => r.test(url))) falhas.push(`${relative(DIST, f)}: URL externo ${url}`);
  }
}

// 5. Orçamento do chunk inicial (shell + login).
const html = readFileSync(join(DIST, "index.html"), "utf8");
const iniciais = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const tamanho = iniciais.reduce((t, a) => t + gzipSync(readFileSync(join(DIST, a))).length, 0);
console.log(`chunk inicial: ${(tamanho / 1024).toFixed(1)} KB gzip (${iniciais.length} ficheiros)`);
if (tamanho > ORCAMENTO_INICIAL_GZIP) falhas.push(`chunk inicial acima do orçamento: ${(tamanho / 1024).toFixed(1)} KB`);

// 6. Sem scripts inline no index.html (a CSP não tem 'unsafe-inline').
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) falhas.push("index.html tem script inline");

if (falhas.length > 0) {
  console.error("Verificação do bundle falhou:\n- " + [...new Set(falhas)].join("\n- "));
  process.exit(1);
}
console.log("Verificação do bundle: ok");
