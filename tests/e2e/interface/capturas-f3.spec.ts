/** Capturas da F3 para revisão visual. Só com RIVO_CAPTURAS=1. */
import { IDF3 } from "../../fixtures/f3";
import { entrar, test } from "../apoio";
import { comF3 } from "../apoio-f3";

test.skip(process.env.RIVO_CAPTURAS !== "1", "Só com RIVO_CAPTURAS=1.");

for (const tema of ["light", "dark"] as const) {
  test(`capturas F3 ${tema}`, async ({ page, api }, info) => {
    test.skip(info.project.name !== "chromium");
    await page.emulateMedia({ colorScheme: tema });
    await comF3(api).ligar();
    await page.setViewportSize({ width: 1280, height: 900 });
    await entrar(page);
    for (const [nome, caminho, espera] of [
      ["facturas", "/facturas", "FT S001/17"],
      ["factura", `/facturas/${IDF3.factura}`, "Saldo"],
      ["rascunho", "/facturas/rascunhos/novo", "Linhas"],
      ["clientes", "/clientes", "Cliente Teste, Lda"],
    ] as const) {
      await page.goto(caminho);
      await page.getByText(espera).first().waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `test-results/capturas/f3-${nome}-${tema}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 360, height: 800 });
    for (const [nome, caminho, espera] of [["factura", `/facturas/${IDF3.factura}`, "Saldo"], ["rascunho", "/facturas/rascunhos/novo", "Linhas"]] as const) {
      await page.goto(caminho);
      await page.getByText(espera).first().waitFor();
      await page.screenshot({ path: `test-results/capturas/f3-${nome}-360-${tema}.png`, fullPage: true });
    }
  });
}
