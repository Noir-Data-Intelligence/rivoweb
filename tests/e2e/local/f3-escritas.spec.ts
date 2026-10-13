/**
 * F3 contra a API LOCAL em Docker (D1, §8.3): o fluxo fiscal completo
 * (cliente → rascunho → emitir → PDF → recibo → nota de crédito → anular),
 * pró-forma convertida, importação CSV e o envio por e-mail sem SMTP (501).
 * Nada sai de localhost. Os totais do ecrã comparam-se com os do servidor.
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1", "Só com RIVO_ESCRITAS_LOCAL=1 e a API local de pé.");

const sufixo = `${Date.now()}`.slice(-9);
const marca = `[TESTE] ${sufixo}`;

async function soLocal(page: Page, fora: string[]) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL)) return route.continue();
    fora.push(url);
    return route.abort("blockedbyclient");
  });
}

test("F3 de ponta a ponta na base local", async ({ page }) => {
  test.setTimeout(240_000);
  const fora: string[] = [];
  await soLocal(page, fora);
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();

  // Preparação SÓ da base local: a pauta de IVA «NOR» (14 %) tem de existir.
  // O front não cria taxas (leitura apenas); faz-se directamente na API local.
  const token = await page.evaluate(() => (JSON.parse(sessionStorage.getItem("rivo.sessao") ?? "{}") as { token?: string }).token ?? "");
  const h = { Authorization: `Bearer ${token}` };
  const pautas = (await (await page.request.get(`${API_LOCAL}/fiscal/tax-rates?page=1&pageSize=200`, { headers: h })).json()) as { code: string; scheduleId: string }[];
  if (!pautas.some((p) => p.code === "NOR")) {
    const criada = (await (await page.request.post(`${API_LOCAL}/fiscal/tax-rates`, { headers: h, data: { kind: 0, code: "NOR", description: "Taxa normal (local)" } })).json()) as { scheduleId: string };
    const v = await page.request.post(`${API_LOCAL}/fiscal/tax-rates/${criada.scheduleId}/versions`, {
      headers: h,
      data: { percentage: "14", effectiveFrom: "2019-10-01", effectiveTo: null, legalInstrument: "Lei n.º 7/19 (base local de teste)" },
    });
    expect(v.status()).toBe(201);
  }

  // Cliente novo
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome", { exact: true }).fill(`${marca} Cliente`);
  await page.getByLabel("NIF").fill(`9${sufixo}`);
  await page.getByLabel("Morada de facturação").fill("Rua de Teste, 1");
  await page.getByLabel("Cidade").fill("Luanda");
  await page.getByLabel("E-mail").fill(`cliente-${sufixo}@teste.local`);
  await page.getByRole("button", { name: "Registar cliente" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Cliente`, level: 1 })).toBeVisible();

  // Rascunho → emitir (FT, retenção 6,5 %)
  await page.goto("/facturas/rascunhos/novo");
  await expect(page.getByRole("heading", { name: "Nova factura", level: 1 })).toBeVisible();
  await page.getByLabel("Cliente").selectOption({ label: `${marca} Cliente · NIF 9${sufixo}` });
  await page.getByLabel("Retenção na fonte (%)").fill("6,5");
  await page.getByLabel("Descrição").fill("Consultoria de teste");
  await page.getByLabel("Qtd.").fill("2,5");
  await page.getByLabel("Preço unitário").fill("1 000,10");
  // Previsão no ecrã (com a taxa em vigor) antes de emitir.
  const previstos = page.getByLabel("Totais previstos");
  for (const v of ["2 500,25 Kz", "350,04 Kz", "162,52 Kz", "2 687,77 Kz"]) await expect(previstos).toContainText(v);
  await page.getByRole("button", { name: "Guardar rascunho" }).click();
  await expect(page).toHaveURL(/\/facturas\/rascunhos\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Emitir…" }).click();
  await expect(page.getByRole("dialog")).toContainText("não se apaga");
  await page.getByRole("dialog").getByRole("button", { name: "Emitir documento" }).dblclick();
  await expect(page).toHaveURL(/\/facturas\/[0-9a-f-]{36}$/);
  const numero = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
  expect(numero).toMatch(/^FT /);
  // Totais do servidor iguais aos previstos, ao cêntimo (mais o total bruto).
  for (const v of ["2 500,25 Kz", "350,04 Kz", "2 850,29 Kz", "162,52 Kz", "2 687,77 Kz"]) await expect(page.getByText(v).first()).toBeVisible();

  // PDF
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PDF" }).click()]);
  expect(descarga.suggestedFilename()).toMatch(/^FT .*\.pdf$/);

  // Envio por e-mail sem SMTP local: a API recusa (501) e a interface di-lo.
  await page.getByRole("button", { name: "Enviar ao cliente" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar e-mail" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  // Recibo parcial
  const urlFactura = page.url();
  await page.getByRole("button", { name: "Registar recebimento" }).click();
  await page.getByLabel("Valor recebido").fill("1 000,00");
  await page.getByLabel("Meio").selectOption("TB");
  await page.getByRole("button", { name: "Emitir recibo" }).click();
  await expect(page).toHaveURL(/\/recibos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("1 000,00 Kz").first()).toBeVisible();
  await page.goto(urlFactura);
  // ADR-083: o recibo leva o dinheiro (1 000,00) e o retido (162,52, sugerido);
  // em aberto fica 2 850,29 − 1 000,00 − 162,52.
  await expect(page.getByText("1 687,77 Kz").first()).toBeVisible();
  await expect(page.getByText("162,52 Kz").first()).toBeVisible();

  // Nota de crédito de 1 unidade e anulação dela
  await page.getByRole("button", { name: "Nota de crédito" }).click();
  await page.getByRole("dialog").getByLabel(/Consultoria de teste/).fill("1");
  await page.getByRole("dialog").getByLabel("Motivo").fill(`${marca} correcção`);
  await page.getByRole("button", { name: "Emitir nota de crédito" }).click();
  await expect(page).toHaveURL(/\/notas-credito\/[0-9a-f-]{36}$/);
  await expect(page.getByText("1 140,11 Kz").first()).toBeVisible();
  await page.getByRole("button", { name: "Anular" }).click();
  await page.getByLabel("Motivo").fill(`${marca} anulação`);
  await page.getByRole("dialog").getByRole("button", { name: "Anular documento" }).click();
  await expect(page.getByText(/Anulada a/)).toBeVisible();

  // Pró-forma e conversão em factura-recibo
  await page.goto("/proformas/nova");
  await page.getByLabel("Cliente").selectOption({ label: `${marca} Cliente` });
  await page.getByLabel("Descrição").fill("Proposta de teste");
  await page.getByLabel("Preço unitário").fill("500");
  await page.getByRole("button", { name: "Emitir pró-forma" }).click();
  await expect(page).toHaveURL(/\/proformas$/);
  const linha = page.getByRole("row").filter({ hasText: `${marca} Cliente` }).first();
  await linha.getByRole("button", { name: "Converter" }).click();
  await page.getByRole("dialog").getByLabel("Tipo").selectOption("FR");
  await page.getByRole("dialog").getByLabel("Meio de pagamento").selectOption("NU");
  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(page).toHaveURL(/\/facturas\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^FR /);
  await expect(page.getByText("570,00 Kz").first()).toBeVisible();

  // Importação CSV (um cliente novo e um duplicado do anterior)
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Importar CSV" }).click();
  // B18: com ponto e vírgula, como o Excel em português grava.
  const csv = `Nome;NIF;Morada;Cidade;Pais\n${marca} Importado;8${sufixo};Rua 2;Luanda;AO\n${marca} Repetido;9${sufixo};Rua 3;Luanda;AO\n`;
  await page.getByLabel("Ficheiro").setInputFiles({ name: "clientes.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
  await page.getByRole("dialog").getByRole("button", { name: "Importar" }).click();
  await expect(page.getByText(/1 importados, 1 duplicados, 0 recusados/)).toBeVisible();

  expect(fora).toEqual([]);
});
