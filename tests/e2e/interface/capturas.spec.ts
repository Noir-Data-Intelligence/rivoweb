/** Capturas para revisão visual (não comparam pixels). Só com RIVO_CAPTURAS=1. */
import { entrar, test } from "../apoio";

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
