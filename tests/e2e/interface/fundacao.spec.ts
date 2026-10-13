import { meCliente, meColaborador, meSuperAdmin } from "../../fixtures/identidade";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test } from "../apoio";

const LARGURAS = [360, 768, 1024, 1440];

test.describe("ecrãs públicos", () => {
  test("entrar: CSP sem violações, axe, responsivo e tema escuro", async ({ page, violacoes }) => {
    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 800 });
      await page.goto("/entrar");
      await expect(page.getByRole("heading", { name: "Entrar na Rivo" })).toBeVisible();
      await semScrollHorizontal(page);
    }
    await semViolacoesAxe(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/entrar");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await semViolacoesAxe(page);
    expect(await violacoes()).toEqual([]);
  });

  test("cabeçalhos de segurança presentes (S14, S28)", async ({ request }) => {
    const r = await request.get("/entrar");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("script-src 'self';");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("require-trusted-types-for 'script'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("no-referrer");
    expect(h["cache-control"]).toBe("no-cache");
  });

  test("convite: o testemunho sai do URL de imediato (S7)", async ({ page }) => {
    await page.goto("/convite?u=00000000-0000-4000-8000-000000000001&t=segredo");
    await expect(page.getByRole("heading", { name: "Aceitar convite" })).toBeVisible();
    expect(await page.evaluate(() => location.search)).toBe("");
    await expect(page.getByLabel("Nova password")).toBeVisible();
  });

  test("ligação de recuperação incompleta mostra o caminho certo", async ({ page }) => {
    await page.goto("/recuperar?u=nao-e-uuid");
    await expect(page.getByText("Ligação inválida ou incompleta.")).toBeVisible();
  });

  test("recuperação responde sempre igual (ADR-065)", async ({ page, api }) => {
    await api.em("POST", "/identity/password-recovery", { status: 204 }).ligar();
    await page.goto("/recuperar-password");
    await page.getByLabel("E-mail").fill("alguem@teste.local");
    await page.getByRole("button", { name: "Enviar ligação" }).click();
    await expect(page.getByText("Se existir uma conta com esse endereço, a mensagem já saiu.")).toBeVisible();
  });

  test("404", async ({ page }) => {
    await page.goto("/nao-existe");
    await expect(page.getByText("Esta página não existe.")).toBeVisible();
  });
});

test.describe("sessão", () => {
  test("rota protegida sem sessão vai ao login com retorno validado (S6)", async ({ page, api }) => {
    await api.comConta().ligar();
    await page.goto("/conta");
    await expect(page).toHaveURL(/\/entrar\?voltar=%2Fconta$/);
    await entrar(page, undefined, { navegar: false });
    await expect(page).toHaveURL(/\/conta$/);
    await expect(page.getByRole("heading", { name: "A minha conta" })).toBeVisible();
  });

  test("voltar externo é ignorado", async ({ page, api }) => {
    await api.comConta().ligar();
    await page.goto("/entrar?voltar=%2F%2Fevil.example");
    await entrar(page, undefined, { navegar: false });
    await expect(page).toHaveURL("http://localhost:4173/");
  });

  test("credenciais erradas: mensagem própria, sem sessão", async ({ page, api }) => {
    await api.em("POST", "/identity/login", { status: 401 }).ligar();
    await entrar(page);
    await expect(page.getByText("E-mail ou password incorrectos.")).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("rivo.sessao"))).toBeNull();
  });

  test("token só em sessionStorage e só para a API (S1, S2)", async ({ page, api }) => {
    await api.comConta().ligar();
    await entrar(page);
    await expect(page.getByRole("heading", { name: /Olá/ })).toBeVisible();
    const local = await page.evaluate(() => Object.keys(localStorage));
    expect(local.every((k) => k === "rivo.prefs")).toBe(true);
    const me = api.pedidos.find((p) => p.caminho === "/identity/me");
    expect(me?.autorizacao).toBe("Bearer token-de-teste");
    expect(api.pedidos.find((p) => p.caminho === "/identity/login")?.autorizacao).toBeNull();
  });

  test("um 401 termina a sessão e volta ao login (S3)", async ({ page, api }) => {
    let revogada = false;
    await api
      .comConta()
      .em("GET", "/identity/me/sessions", () =>
        revogada ? { status: 401, cabecalhos: { "WWW-Authenticate": 'Bearer error="invalid_token"' } } : { status: 200, corpo: [] },
      )
      .ligar();
    await entrar(page);
    await expect(page.getByRole("heading", { name: /Olá/ })).toBeVisible();
    revogada = true;
    await page.goto("/conta");
    await expect(page).toHaveURL(/\/entrar\?voltar=%2Fconta$/);
    await expect(page.getByText("A sessão terminou. Entre de novo.")).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("rivo.sessao"))).toBeNull();
  });

  test("password actual errada não termina a sessão", async ({ page, api }) => {
    await api
      .comConta()
      .em("POST", "/identity/me/password", {
        status: 401,
        corpo: { title: "Unauthorized", status: 401, detail: "A password actual não confere." },
        cabecalhos: { "Content-Type": "application/problem+json" },
      })
      .ligar();
    await entrar(page);
    await page.goto("/conta");
    await page.getByLabel("Password actual").fill("Errada!2026xx");
    await page.getByLabel("Password nova", { exact: true }).fill("Nova!2026xxxx");
    await page.getByLabel("Repita a password nova").fill("Nova!2026xxxx");
    await page.getByRole("button", { name: "Mudar password" }).click();
    await expect(page.getByText("A password actual não confere.")).toBeVisible();
    await expect(page).toHaveURL(/\/conta$/);
  });

  test("logout limpa localmente mesmo com a rede a falhar (S4)", async ({ page, api }) => {
    await api.comConta().ligar();
    await page.route("**/identity/logout", (r) => r.abort());
    await entrar(page);
    // Sair a partir de outra página não guarda o retorno para o próximo login.
    await page.goto("/conta");
    await page.getByRole("button", { name: /Conta de/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    expect(await page.evaluate(() => sessionStorage.getItem("rivo.sessao"))).toBeNull();
  });

  test("inactividade avisa e termina (S5)", async ({ page, api }) => {
    await api.comConta().em("POST", "/identity/login", { status: 200, corpo: { accessToken: "t", expiresAt: new Date(Date.now() + 3600_000).toISOString(), idleTimeoutSeconds: 125 } }).ligar();
    await page.clock.install();
    await entrar(page);
    await expect(page.getByRole("heading", { name: /Olá/ })).toBeVisible();
    await page.clock.runFor(10_000);
    await expect(page.getByRole("dialog", { name: "A sessão vai terminar por inactividade" })).toBeVisible();
    await page.clock.runFor(120_000);
    await expect(page).toHaveURL(/\/entrar/);
    await expect(page.getByText("A sessão terminou por inactividade.")).toBeVisible();
  });
});

test.describe("shells", () => {
  test("backoffice: shell responsivo, axe, sessões activas e CSP com diálogos", async ({ page, api, violacoes }) => {
    await api.comConta().em("POST", "/identity/me/sessions/00000000-0000-4000-8000-000000000101/revocation", { status: 204 }).ligar();
    await entrar(page);
    await page.goto("/conta");
    await expect(page.getByText("Chrome em Windows")).toBeVisible();
    for (const largura of LARGURAS) {
      await page.setViewportSize({ width: largura, height: 800 });
      await semScrollHorizontal(page);
    }
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Terminar sessão" }).nth(1).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("dialog").getByRole("button", { name: "Terminar sessão" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(api.pedidos.some((p) => p.metodo === "POST" && p.caminho.endsWith("/revocation"))).toBe(true);
    expect(await violacoes()).toEqual([]);
  });

  test("gaveta no telemóvel", async ({ page, api }) => {
    await api.comConta().ligar();
    await page.setViewportSize({ width: 360, height: 740 });
    await entrar(page);
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Início" })).toBeVisible();
    await semViolacoesAxe(page);
  });

  test("SuperAdmin vê a faixa de conta de operação", async ({ page, api }) => {
    await api.comConta(meSuperAdmin).ligar();
    await entrar(page);
    await expect(page.getByText("Conta de operação. Use-a só para desbloquear configuração inicial.")).toBeVisible();
  });

  test("colaborador vai para /eu e vê o cargo", async ({ page, api }) => {
    await api.comConta(meColaborador).ligar();
    await entrar(page, meColaborador.email);
    await expect(page).toHaveURL(/\/eu$/);
    await expect(page.getByText("Técnico")).toBeVisible();
    await semViolacoesAxe(page);
  });

  test("cliente sem associação vê a mensagem e não chega ao portal", async ({ page, api }) => {
    await api
      .comConta(meCliente)
      .em("GET", "/customer-portal/me", { status: 403, corpo: { title: "Forbidden" }, cabecalhos: { "Content-Type": "application/problem+json" } })
      .ligar();
    await entrar(page, meCliente.email);
    await expect(page).toHaveURL(/\/cliente$/);
    await expect(page.getByText("Esta conta não está associada a um cliente.")).toBeVisible();
  });
});
