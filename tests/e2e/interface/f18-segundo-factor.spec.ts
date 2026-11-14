/**
 * Segundo factor (ADR-127): o login em dois passos, ligar e gerir em «A minha
 * conta», a sessão restrita de quem é obrigado e o «Repor» do admin.
 */
import { ID, meAdminF1 } from "../../fixtures/f1";
import { loginOk } from "../../fixtures/identidade";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test } from "../apoio";
import { comF1 } from "../apoio-f1";

const CHAVE = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const URI = `otpauth://totp/Rivo:admin%40teste.local?secret=${CHAVE}&issuer=Rivo&digits=6`;
const CODIGOS = ["a1b2c-3d4e5", "f6g7h-8i9j0", "k1l2m-3n4o5", "p6q7r-8s9t0", "u1v2w-3x4y5", "z6a7b-8c9d0", "e1f2g-3h4i5", "j6k7l-8m9n0", "o1p2q-3r4s5", "t6u7v-8w9x0"];
const estado = (enabled: boolean, extra: { required?: boolean; enforced?: boolean; recoveryCodesLeft?: number } = {}) => ({ enabled, required: false, enforced: false, recoveryCodesLeft: enabled ? 10 : 0, ...extra });
const naoAutorizado = { status: 401, corpo: { title: "Unauthorized", status: 401 }, cabecalhos: { "Content-Type": "application/problem+json" } };

test.describe("segundo factor", () => {
  test("login em dois passos: o código da app, o código errado e o de recuperação", async ({ page, api, violacoes }) => {
    let tentativas = 0;
    await api
      .comConta()
      .em("POST", "/identity/login", { status: 202, corpo: { mfaChallenge: "desafio-de-teste", expiresInSeconds: 300 } })
      .em("POST", "/identity/login/mfa", () => (++tentativas === 1 ? naoAutorizado : { status: 200, corpo: loginOk() }))
      .ligar();
    await entrar(page, undefined, { esperar: false });
    await expect(page.getByRole("heading", { name: "Segundo factor" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("rivo.sessao"))).toBeNull();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Escreva os 6 dígitos da app.")).toBeVisible();
    await expect(page.getByLabel("Código da app")).toBeFocused();
    await page.getByLabel("Código da app").fill("111 111");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Código errado. Tente de novo.")).toBeVisible();
    await expect(page.getByLabel("Código da app")).toHaveValue("");

    await page.getByRole("button", { name: "Usar um código de recuperação" }).click();
    await page.getByLabel("Código de recuperação").fill(" a1b2c-3d4e5 ");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /Olá/ })).toBeVisible();
    expect(api.escritas("POST", "/identity/login/mfa").map((p) => p.corpo)).toEqual([
      { challenge: "desafio-de-teste", code: "111111" },
      { challenge: "desafio-de-teste", code: "a1b2c-3d4e5" },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("o desafio expira: volta ao primeiro passo, com a password limpa", async ({ page, api }) => {
    await api.comConta().em("POST", "/identity/login", { status: 202, corpo: { mfaChallenge: "desafio-curto", expiresInSeconds: 1 } }).ligar();
    await entrar(page, undefined, { esperar: false });
    await expect(page.getByLabel("Código da app")).toBeVisible();
    await expect(page.getByText("O tempo para o código acabou. Entre de novo.")).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Password")).toHaveValue("");
    expect(api.escritas("POST", "/identity/login/mfa")).toHaveLength(0);
  });

  test("a minha conta: ligar com a chave, confirmar e guardar os códigos", async ({ page, api, violacoes }) => {
    let ligado = false;
    await api
      .comConta()
      .em("GET", "/identity/me/mfa", () => ({ status: 200, corpo: estado(ligado) }))
      .em("POST", "/identity/me/mfa/authenticator", { status: 200, corpo: { sharedKey: CHAVE, authenticatorUri: URI } })
      .em("POST", "/identity/me/mfa/authenticator/confirmation", (route) => {
        const corpo = route.request().postDataJSON() as { code: string };
        if (corpo.code !== "123456") return { status: 400, corpo: { title: "Bad Request", status: 400, errors: { code: ["O código não confere."] } }, cabecalhos: { "Content-Type": "application/problem+json" } };
        ligado = true;
        return { status: 200, corpo: { recoveryCodes: CODIGOS } };
      })
      .ligar();
    await entrar(page);
    await page.goto("/conta");
    const cartao = page.locator("div", { has: page.getByRole("heading", { name: "Segundo factor" }) }).last();
    await cartao.getByRole("button", { name: "Ligar o segundo factor" }).click();
    await expect(page.getByLabel("Chave para a app")).toHaveText("JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP");
    await expect(page.getByRole("link", { name: "abra-a directamente na app" })).toHaveAttribute("href", URI);
    // O QR desenha-se no browser, a partir do `otpauth://`: módulos no SVG, nada pedido lá fora.
    const qr = page.getByRole("img", { name: "QR para ler com a app autenticadora" });
    await expect(qr).toBeVisible();
    expect(((await qr.locator("path").getAttribute("d")) ?? "").length).toBeGreaterThan(500);
    await page.getByRole("button", { name: "Confirmar e ligar" }).click();
    await expect(page.getByText("Escreva os 6 dígitos da app.")).toBeVisible();
    await page.getByLabel("Código da app").fill("654321");
    await page.getByRole("button", { name: "Confirmar e ligar" }).click();
    await expect(page.getByText("O código não confere.")).toBeVisible();
    await page.getByLabel("Código da app").fill("123 456");
    await page.getByRole("button", { name: "Confirmar e ligar" }).click();
    await expect(page.getByText("Guarde estes códigos agora: não voltam a aparecer.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Códigos de recuperação" }).getByRole("listitem")).toHaveCount(10);
    await expect(page.getByRole("button", { name: "Copiar" })).toBeVisible();
    await semViolacoesAxe(page);
    const descarga = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarregar" }).click();
    expect((await descarga).suggestedFilename()).toBe("rivo-codigos-recuperacao.txt");
    await page.getByRole("button", { name: "Já os guardei" }).click();
    await expect(page.getByText("Restam 10 códigos de recuperação por usar.")).toBeVisible();
    expect(api.escritas("POST", "/identity/me/mfa/authenticator/confirmation").map((p) => p.corpo)).toEqual([{ code: "654321" }, { code: "123456" }]);
    expect(await violacoes()).toEqual([]);
  });

  test("a minha conta: gerar códigos novos e desligar, com um código; o obrigado não desliga", async ({ page, api }) => {
    let obrigado = false;
    await api
      .comConta()
      .em("GET", "/identity/me/mfa", () => ({ status: 200, corpo: estado(true, { required: obrigado, enforced: obrigado, recoveryCodesLeft: 2 }) }))
      .em("POST", "/identity/me/mfa/recovery-codes", { status: 200, corpo: { recoveryCodes: CODIGOS } })
      .em("POST", "/identity/me/mfa/deactivation", { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/conta");
    await expect(page.getByText("Restam 2 códigos de recuperação por usar.")).toBeVisible();
    await expect(page.getByText("Restam poucos códigos de recuperação. Gere códigos novos.")).toBeVisible();

    await page.getByRole("button", { name: "Gerar códigos novos" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Gerar" }).click();
    await expect(d.getByText("Escreva o código da app ou um de recuperação.")).toBeVisible();
    await d.getByLabel("Código da app ou de recuperação").fill("246810");
    await d.getByRole("button", { name: "Gerar" }).click();
    await expect(d.getByRole("list", { name: "Códigos de recuperação" }).getByRole("listitem")).toHaveCount(10);
    await d.getByRole("button", { name: "Fechar", exact: true }).getByText("Fechar").click();

    await page.getByRole("button", { name: "Desligar" }).click();
    await d.getByLabel("Código da app ou de recuperação").fill("135790");
    await d.getByRole("button", { name: "Desligar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/identity/me/mfa/recovery-codes").map((p) => p.corpo)).toEqual([{ code: "246810" }]);
    expect(api.escritas("POST", "/identity/me/mfa/deactivation").map((p) => p.corpo)).toEqual([{ code: "135790" }]);

    obrigado = true;
    await page.reload();
    await expect(page.getByText("O seu perfil é obrigado ao segundo factor: não se desliga.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Desligar" })).toHaveCount(0);
  });

  test("sessão restrita: obrigado e sem segundo factor, só o liga; depois, a Rivo toda", async ({ page, api, violacoes }) => {
    let ligado = false;
    await api
      .comConta()
      .em("POST", "/identity/login", { status: 200, corpo: { ...loginOk(), mfaEnrolmentRequired: true } })
      .em("GET", "/identity/me/mfa", () => ({ status: 200, corpo: estado(ligado, { required: true, enforced: true }) }))
      .em("POST", "/identity/me/mfa/authenticator", { status: 200, corpo: { sharedKey: CHAVE, authenticatorUri: URI } })
      .em("POST", "/identity/me/mfa/authenticator/confirmation", () => {
        ligado = true;
        return { status: 200, corpo: { recoveryCodes: CODIGOS } };
      })
      .ligar();
    await entrar(page);
    await expect(page.getByRole("heading", { name: "Ligue o segundo factor para continuar" })).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await semViolacoesAxe(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Ligue o segundo factor para continuar" })).toBeVisible();
    await page.getByRole("button", { name: "Ligar o segundo factor" }).click();
    await page.getByLabel("Código da app").fill("123456");
    await page.getByRole("button", { name: "Confirmar e ligar" }).click();
    await expect(page.getByText("Guarde estes códigos agora: não voltam a aparecer.")).toBeVisible();
    await page.getByRole("button", { name: "Já os guardei: continuar" }).click();
    await expect(page.getByRole("heading", { name: /Olá/ })).toBeVisible();
    expect(await violacoes()).toEqual([]);
  });

  test("um 401 com mfa_enrolment_required não termina a sessão: leva ao ecrã de ligar", async ({ page, api }) => {
    let restrita = false;
    await api
      .comConta()
      .em("GET", "/identity/me/sessions", () =>
        restrita ? { status: 401, cabecalhos: { "WWW-Authenticate": 'Bearer error="invalid_token", error_description="mfa_enrolment_required"' } } : { status: 200, corpo: [] },
      )
      .ligar();
    await entrar(page);
    await expect(page.getByRole("heading", { name: /Olá/ })).toBeVisible();
    restrita = true;
    await page.goto("/conta");
    await expect(page.getByRole("heading", { name: "Ligue o segundo factor para continuar" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("rivo.sessao"))).not.toBeNull();
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });

  test("admin: repor o segundo factor de outra pessoa, com a razão", async ({ page, api }) => {
    await comF1(api).em("POST", `/identity/users/${ID.user1}/mfa/reset`, { status: 204 }).ligar();
    await entrar(page);
    await page.goto(`/utilizadores/${ID.user1}`);
    await page.getByRole("button", { name: "Repor segundo factor" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Repor" }).click();
    await expect(d.getByText("Indique a razão: fica na trilha de auditoria.")).toBeVisible();
    await d.getByLabel("Razão").fill("Perdeu o telemóvel");
    await d.getByRole("button", { name: "Repor" }).click();
    await expect(page.getByText("Segundo factor reposto. As sessões da pessoa terminaram.")).toBeVisible();
    expect(api.escritas("POST", `/identity/users/${ID.user1}/mfa/reset`).map((p) => p.corpo)).toEqual([{ reason: "Perdeu o telemóvel" }]);
    await page.goto(`/utilizadores/${meAdminF1.userId}`);
    await expect(page.getByRole("button", { name: "Repor segundo factor" })).toHaveCount(0);
  });
});
