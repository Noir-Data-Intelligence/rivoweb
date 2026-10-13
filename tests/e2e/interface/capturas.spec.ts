/** Capturas para revisão visual (não comparam pixels). Só com RIVO_CAPTURAS=1. */
import { ID } from "../../fixtures/f1";
import { entrar, test } from "../apoio";
import { comF1 } from "../apoio-f1";

test.skip(process.env.RIVO_CAPTURAS !== "1", "Só com RIVO_CAPTURAS=1.");

for (const tema of ["light", "dark"] as const) {
  test(`capturas ${tema}`, async ({ page, api }, info) => {
    test.skip(info.project.name !== "chromium");
    await page.emulateMedia({ colorScheme: tema });
    await api.comConta().ligar();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/entrar");
    await page.screenshot({ path: `test-results/capturas/entrar-${tema}.png` });
    await entrar(page);
    await page.goto("/conta");
    await page.getByText("Chrome em Windows").waitFor();
    await page.screenshot({ path: `test-results/capturas/conta-${tema}.png`, fullPage: true });
    await page.setViewportSize({ width: 360, height: 740 });
    await page.screenshot({ path: `test-results/capturas/conta-360-${tema}.png`, fullPage: true });
  });
}

for (const tema of ["light", "dark"] as const) {
  test(`capturas F1 ${tema}`, async ({ page, api }, info) => {
    test.skip(info.project.name !== "chromium");
    await page.emulateMedia({ colorScheme: tema });
    await comF1(api).ligar();
    await page.setViewportSize({ width: 1280, height: 800 });
    await entrar(page);
    const ecras: [string, string, string][] = [
      ["utilizadores", "/utilizadores", "ana@teste.local"],
      ["utilizador", `/utilizadores/${ID.user1}`, "Perfis de acesso"],
      ["configuracoes", "/configuracoes", "Governação"],
      ["colaboradores", "/colaboradores", "Carlos Teste"],
      ["ficha", `/colaboradores/${ID.emp2}`, "Conta de acesso"],
      ["departamentos", "/departamentos", "Operações"],
      ["cargos", "/cargos", "Director"],
    ];
    for (const [nome, caminho, espera] of ecras) {
      await page.goto(caminho);
      await page.getByText(espera).first().waitFor();
      await page.screenshot({ path: `test-results/capturas/f1-${nome}-${tema}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 360, height: 740 });
    for (const [nome, caminho, espera] of ecras.filter(([n]) => ["colaboradores", "ficha", "utilizadores"].includes(n))) {
      await page.goto(caminho);
      await page.getByText(espera).first().waitFor();
      await page.screenshot({ path: `test-results/capturas/f1-${nome}-360-${tema}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/colaboradores/${ID.emp2}`);
    await page.getByRole("button", { name: "Atribuir cargo" }).click();
    await page.getByLabel("Cargo", { exact: true }).selectOption(ID.cargoAprovador);
    await page.screenshot({ path: `test-results/capturas/f1-dialogo-cargo-${tema}.png` });
  });
}
