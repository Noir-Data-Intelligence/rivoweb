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

// Hoje em Africa/Luanda (UTC+1, sem hora de Verão), para as janelas do dashboard.
const HOJE = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
const ANO = HOJE.slice(0, 4);

// Rotas GET da F0, F1 e F2 (§6). As GET com efeito (§5.15) nunca entram aqui.
const LEITURAS = [
  "/health",
  "/identity/me",
  "/identity/me/sessions",
  "/portal/me",
  "/identity/users",
  "/identity/roles",
  "/settings/overview",
  "/fiscal/tax-entity",
  "/hr/departments?page=1&pageSize=25",
  "/hr/positions?page=1&pageSize=25",
  "/hr/employees?page=1&pageSize=25",
  "/dashboard/me",
  `/dashboard/kpis?from=${ANO}-01-01&to=${HOJE}`,
  `/dashboard/overview?from=${ANO}-01-01&to=${HOJE}&topCustomers=5`,
  "/notifications/me?unreadOnly=true&page=1&pageSize=1",
  "/notifications/me/preferences",
  "/alerts/rules",
  "/alerts/events?openOnly=true&limit=200",
  // F3
  "/commercial/customers?page=1&pageSize=25",
  "/finance/series?page=1&pageSize=50",
  "/finance/payment-channels",
  "/fiscal/tax-rates?page=1&pageSize=50",
  `/fiscal/tax-rates/determination?taxCode=NOR&taxPointDate=${HOJE}`,
  "/finance/invoice-drafts",
  "/finance/sales-invoices?page=1&pageSize=25",
  "/finance/credit-notes?page=1&pageSize=25",
  "/finance/receipts?page=1&pageSize=25",
  "/finance/proformas",
  "/finance/receivables/overdue",
  // F4
  "/approval/requests?page=1&pageSize=25",
  "/approval/policies",
];
// Leituras de detalhe a partir do primeiro elemento de uma listagem.
const DETALHES = [
  ["/hr/employees?page=1&pageSize=25", "employeeId", ["/hr/employees/{id}", "/hr/employees/{id}/account-history"]],
  ["/hr/positions?page=1&pageSize=25", "positionId", ["/hr/positions/{id}/assignments"]],
  ["/approval/requests?page=1&pageSize=25", "requestId", ["/approval/requests/{id}", "/approval/requests/{id}/history"]],
];
// 403/404 aceites: conta sem ficha de colaborador; dados da empresa por declarar.
const ACEITES = { "/portal/me": [403], "/fiscal/tax-entity": [404] };
// Quais secções o perfil recebe em /dashboard/kpis (ADR-069).
const SECCOES = (json) => (Array.isArray(json?.sections) ? ` · secções: ${json.sections.join(", ") || "nenhuma"}` : "");
const PERMITIDOS = new Set(["POST /identity/login", "POST /identity/logout"]);

async function pedido(metodo, caminho, { token, corpo } = {}) {
  if (metodo !== "GET" && !PERMITIDOS.has(`${metodo} ${caminho.split("?")[0]}`)) {
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

  const respostas = new Map();
  const ler = async (caminho) => {
    const r = await pedido("GET", caminho, { token });
    respostas.set(caminho, r);
    const ok = r.status === 200 || (ACEITES[caminho] ?? []).includes(r.status);
    if (!ok) falhas++;
    const total = r.headers.get("X-Total-Count");
    console.log(`${ok ? "ok " : "ERRO"} GET ${caminho} → ${r.status} · ${resumo(r.json)}${total !== null ? ` · total ${total}` : ""}${SECCOES(r.json)}`);
    if (caminho === "/identity/me" && r.json) {
      console.log(`     perfis: ${r.json.roles?.join(", ")} · ${r.json.permissions?.length} permissões`);
    }
  };
  for (const caminho of LEITURAS) await ler(caminho);
  for (const [lista, campo, rotas] of DETALHES) {
    const id = respostas.get(lista)?.json?.[0]?.[campo];
    if (typeof id !== "string") {
      console.log(`--   ${rotas.join(", ")}: sem elementos em ${lista}`);
      continue;
    }
    for (const rota of rotas) await ler(rota.replace("{id}", encodeURIComponent(id)));
  }
} finally {
  if (token) {
    const r = await pedido("POST", "/identity/logout", { token });
    console.log(`logout: ${r.status}`);
  }
}
process.exit(falhas > 0 ? 1 : 0);
