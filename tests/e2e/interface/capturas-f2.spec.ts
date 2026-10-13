/** Capturas da F2 para revisão visual. Só com RIVO_CAPTURAS=1. */
import { entrar, test } from "../apoio";
import { comF2 } from "../apoio-f2";

test.skip(process.env.RIVO_CAPTURAS !== "1", "Só com RIVO_CAPTURAS=1.");

for (const tema of ["light", "dark"] as const) {
  test(`capturas F2 ${tema}`, async ({ page, api }, info) => {
    test.skip(info.project.name !== "chromium");
    await page.emulateMedia({ colorScheme: tema });
    await comF2(api).ligar();
    await page.setViewportSize({ width: 1280, height: 900 });
    await entrar(page);
    for (const [nome, caminho, espera] of [
      ["painel", "/", "Fecho do mês"],
      ["executivo", "/dashboard", "Cliente Teste, Lda"],
      ["notificacoes", "/notificacoes", "Perfil de acesso atribuído"],
      ["alertas", "/alertas", "FT 2026/17 vencida"],
    ] as const) {
      await page.goto(caminho);
      await page.getByText(espera).first().waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `test-results/capturas/f2-${nome}-${tema}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await page.getByText("Fecho do mês").waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test-results/capturas/f2-painel-360-${tema}.png`, fullPage: true });
  });
}
