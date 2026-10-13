/** Apoio ao e2e de interface: API simulada, CSP, axe e responsividade. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page, type Route } from "@playwright/test";
import { fichaColaborador, loginOk, meAdmin, sessoes } from "../fixtures/identidade";

export const API = "http://localhost:5080";

type Resposta = { status: number; corpo?: unknown; cabecalhos?: Record<string, string>; bruto?: { conteudo: string; tipo: string }; atrasoMs?: number };
type Handler = (route: Route) => Resposta | Promise<Resposta>;

export class ApiSimulada {
  readonly pedidos: { metodo: string; caminho: string; query: string; autorizacao: string | null; ifMatch: string | null; corpo: unknown }[] = [];
  private readonly handlers = new Map<string, Handler>();

  constructor(private readonly page: Page) {}

  em(metodo: string, caminho: string, h: Handler | Resposta): this {
    this.handlers.set(`${metodo} ${caminho}`, typeof h === "function" ? h : () => h);
    return this;
  }

  async ligar(): Promise<void> {
    await this.page.route(`${API}/**`, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const cors = { "Access-Control-Allow-Origin": "http://localhost:4173", "Access-Control-Expose-Headers": "WWW-Authenticate, X-Page, X-Page-Size, X-Total-Count, ETag" };
      if (req.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: { ...cors, "Access-Control-Allow-Headers": "authorization, content-type, if-match", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE" } });
        return;
      }
      let corpo: unknown;
      try {
        corpo = req.postDataJSON() as unknown;
      } catch {
        corpo = req.postData();
      }
      this.pedidos.push({
        metodo: req.method(),
        caminho: url.pathname,
        query: url.search,
        autorizacao: req.headers()["authorization"] ?? null,
        ifMatch: req.headers()["if-match"] ?? null,
        corpo,
      });
      const h = this.handlers.get(`${req.method()} ${url.pathname}`);
      if (!h) {
        await route.fulfill({ status: 599, headers: cors, body: `sem handler para ${req.method()} ${url.pathname}` });
        return;
      }
      const r = await h(route);
      if (r.atrasoMs) await new Promise((ok) => setTimeout(ok, r.atrasoMs));
      if (r.bruto) {
        await route.fulfill({ status: r.status, headers: { ...cors, "Content-Type": r.bruto.tipo, ...r.cabecalhos }, body: r.bruto.conteudo });
        return;
      }
      await route.fulfill({
        status: r.status,
        headers: { ...cors, ...(r.corpo !== undefined ? { "Content-Type": "application/json" } : {}), ...r.cabecalhos },
        ...(r.corpo !== undefined ? { body: JSON.stringify(r.corpo) } : {}),
      });
    });
  }

  /** Escritas feitas (para confirmar o que subiu à API). */
  escritas(metodo: string, caminho: string) {
    return this.pedidos.filter((p) => p.metodo === metodo && p.caminho === caminho);
  }

  /** Conta autenticada pronta: login, me e sessões. */
  comConta(me = meAdmin): this {
    return this.em("POST", "/identity/login", { status: 200, corpo: loginOk() })
      .em("GET", "/identity/me", { status: 200, corpo: me })
      .em("GET", "/identity/me/sessions", { status: 200, corpo: sessoes() })
      .em("POST", "/identity/logout", { status: 204 })
      // F2: o sino e o painel pedem isto em todas as páginas; por omissão, vazio.
      .em("GET", "/notifications/me", { status: 200, corpo: [], cabecalhos: { "X-Page": "1", "X-Page-Size": "1", "X-Total-Count": "0" } })
      .em("GET", "/dashboard/me", { status: 200, corpo: { employeeId: null, displayName: null, unreadNotifications: 0, pendingApprovals: 0, announcements: [] } })
      .em("GET", "/dashboard/kpis", { status: 200, corpo: { from: "2026-01-01", to: "2026-10-13", currency: "AOA", sections: [], finance: null, hr: null, sales: null } })
      .em("GET", "/portal/me", me.roles.includes("Colaborador") ? { status: 200, corpo: fichaColaborador } : { status: 403, corpo: { title: "Forbidden" }, cabecalhos: { "Content-Type": "application/problem+json" } });
  }
}

export const test = base.extend<{ api: ApiSimulada; violacoes: () => Promise<string[]> }>({
  api: async ({ page }, use) => {
    const api = new ApiSimulada(page);
    await use(api);
  },
  // Recolhe violações de CSP (S13) e Trusted Types (report-only) em cada página.
  violacoes: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as unknown as { __violacoes: string[] }).__violacoes = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { __violacoes: string[] }).__violacoes.push(`${e.effectiveDirective} ${e.blockedURI} ${e.disposition}`);
      });
    });
    await use(() => page.evaluate(() => (window as unknown as { __violacoes: string[] }).__violacoes));
  },
});

export async function entrar(page: Page, email = "admin@teste.local", { navegar = true } = {}): Promise<void> {
  if (navegar) await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill("Qualquer!2026x");
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function semViolacoesAxe(page: Page): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function semScrollHorizontal(page: Page): Promise<void> {
  const largo = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(largo).toBe(true);
}

export { expect };
