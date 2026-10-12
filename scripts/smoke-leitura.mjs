// Smoke de leitura contra a API de produção (§8.3), sem browser e sem CORS.
// Só GET, mais POST /identity/login e /identity/logout. O token vive só em
// memória: nunca vai para ficheiros nem para a saída.
//
//   npm run smoke:leitura           (lê RIVO_PROD_* do .env.local)
import { readFileSync } from "node:fs";

function lerEnvLocal() {
  try {
    for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    // sem .env.local: usa o ambiente
  }
}
lerEnvLocal();

const BASE = (process.env.RIVO_PROD_API_URL ?? "https://syyt.tech").replace(/\/+$/, "");
const EMAIL = process.env.RIVO_PROD_EMAIL;
const PASSWORD = process.env.RIVO_PROD_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Defina RIVO_PROD_EMAIL e RIVO_PROD_PASSWORD no .env.local.");
  process.exit(2);
}

// Rotas GET da F0 (§6). As GET com efeito (§5.15) nunca entram aqui.
const LEITURAS = ["/health", "/identity/me", "/identity/me/sessions", "/portal/me"];
const PERMITIDOS = new Set(["POST /identity/login", "POST /identity/logout"]);

async function pedido(metodo, caminho, { token, corpo } = {}) {
  if (metodo !== "GET" && !PERMITIDOS.has(`${metodo} ${caminho}`)) {
    throw new Error(`Bloqueado: ${metodo} ${caminho} não é leitura.`);
  }
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { "Content-Type": "application/json" } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  const texto = await r.text();
  let json;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  return { status: r.status, json, headers: r.headers };
}

function resumo(v) {
  if (Array.isArray(v)) return `array(${v.length})${v[0] ? ` campos: ${Object.keys(v[0]).join(", ")}` : ""}`;
  if (v && typeof v === "object") return `campos: ${Object.keys(v).join(", ")}`;
  return String(v);
}

let token = null;
let falhas = 0;
try {
  const login = await pedido("POST", "/identity/login", { corpo: { email: EMAIL, password: PASSWORD } });
  if (login.status !== 200 || typeof login.json?.accessToken !== "string") {
    console.error(`login: ${login.status}`);
    process.exit(1);
  }
  token = login.json.accessToken;
  console.log(`login: 200 · expira ${login.json.expiresAt} · inactividade ${login.json.idleTimeoutSeconds}s`);

  for (const caminho of LEITURAS) {
    const r = await pedido("GET", caminho, { token });
    const ok = r.status === 200 || (caminho === "/portal/me" && r.status === 403);
    if (!ok) falhas++;
    console.log(`${ok ? "ok " : "ERRO"} GET ${caminho} → ${r.status} · ${resumo(r.json)}`);
    if (caminho === "/identity/me" && r.json) {
      console.log(`     perfis: ${r.json.roles?.join(", ")} · ${r.json.permissions?.length} permissões`);
    }
  }
} finally {
  if (token) {
    const r = await pedido("POST", "/identity/logout", { token });
    console.log(`logout: ${r.status}`);
  }
}
process.exit(falhas > 0 ? 1 : 0);
