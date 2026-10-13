/**
 * Escritas da F1 contra a API LOCAL em Docker (D1, §8.3), num browser real.
 * Nunca contra produção: qualquer pedido que não vá para localhost:5080 ou
 * para o próprio front aborta e faz falhar o teste.
 *
 *   RIVO_ESCRITAS_LOCAL=1 RIVO_LOCAL_EMAIL=… RIVO_LOCAL_PASSWORD=… \
 *     npx playwright test --project=escritas-local
 *
 * Pressupõe o build com VITE_API_URL=http://localhost:5080 servido em
 * http://localhost:5173 (a origem que o CORS local aceita).
 */
import { expect, test, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1", "Só com RIVO_ESCRITAS_LOCAL=1 e a API local de pé.");
test.describe.configure({ mode: "serial" });

// Os nomes de departamento e cargo são únicos na base: a marca não se repete entre corridas.
const marca = `[TESTE] ${new Date().toISOString().slice(0, 19).replace("T", " ")} ${Math.random().toString(36).slice(2, 6)}`;
const emailConvite = `teste-${Date.now()}@teste.local`;

async function soLocal(page: Page, foraDoSitio: string[]) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL)) return route.continue();
    foraDoSitio.push(url);
    return route.abort("blockedbyclient");
  });
}

async function entrar(page: Page) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(process.env.RIVO_LOCAL_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.RIVO_LOCAL_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
}

test("F1 de ponta a ponta na base local", async ({ page }) => {
  test.setTimeout(180_000);
  const fora: string[] = [];
  await soLocal(page, fora);
  await entrar(page);

  // Departamento
  await page.goto("/departamentos");
  await page.getByRole("button", { name: "Novo departamento" }).click();
  await page.getByLabel("Nome").fill(`${marca} Departamento`);
  await page.getByRole("button", { name: "Criar departamento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Cargos: um com autoridade, um simples
  await page.goto("/cargos");
  for (const [nome, autoridade] of [
    [`${marca} Aprovador`, true],
    [`${marca} Técnico`, false],
  ] as const) {
    await page.getByRole("button", { name: "Novo cargo" }).click();
    await page.getByLabel("Nome").fill(nome);
    await page.getByLabel("Nível hierárquico").fill(autoridade ? "1" : "7");
    if (autoridade) await page.getByLabel("Dá autoridade para aprovar").check();
    await page.getByRole("button", { name: "Criar cargo" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  // Admissão → ficha
  await page.goto("/colaboradores");
  await page.getByRole("button", { name: "Admitir colaborador" }).click();
  await page.getByLabel("Nome completo").fill(`${marca} Colaborador`);
  await page.getByLabel("Departamento").selectOption({ label: `${marca} Departamento` });
  await page.getByRole("button", { name: "Admitir", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${marca} Colaborador`, level: 1 })).toBeVisible();
  await expect(page.getByText(`${marca} Departamento`)).toBeVisible();
  const ficha = new URL(page.url()).pathname;

  // Corrigir nome (com If-Match, a API local já expõe o ETag) e contactos
  const comIfMatch: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT" && r.url().startsWith(`${API_LOCAL}/hr/employees/`)) comIfMatch.push(r.headers()["if-match"] ?? "");
  });
  await page.getByRole("button", { name: "Corrigir nome" }).click();
  await page.getByLabel("Nome completo").fill(`${marca} Colaborador Corrigido`);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: `${marca} Colaborador Corrigido`, level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Mudar contactos" }).click();
  await page.getByLabel("Telefone").fill("+244 900 000 000");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("+244 900 000 000")).toBeVisible();
  expect(comIfMatch.length).toBe(2);
  expect(comIfMatch.every((v) => /^"\d+"$/.test(v))).toBe(true);

  // Cargo simples: em vigor de imediato
  await page.getByRole("button", { name: "Atribuir cargo" }).click();
  await page.getByLabel("Cargo", { exact: true }).selectOption({ label: `${marca} Técnico` });
  await page.getByRole("button", { name: "Atribuir", exact: true }).click();
  await expect(page.getByText(`${marca} Técnico`).first()).toBeVisible();

  // Cargo com autoridade: vai para aprovação (202)
  await page.getByRole("button", { name: "Atribuir outro cargo" }).click();
  await page.getByLabel("Cargo", { exact: true }).selectOption({ label: `${marca} Aprovador (com autoridade)` });
  await page.getByRole("button", { name: /Enviar para aprovação|Atribuir/ }).click();
  await expect(page.getByText(/Enviado para aprovação|Não foi possível|não está configurad/i).first()).toBeVisible();

  // Encerrar o cargo actual
  await page.getByRole("button", { name: "Encerrar cargo actual" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Encerrar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Desactivar com uma atribuição pendente: a regra de negócio (409) aparece tal
  // como o servidor a diz, sem oferecer «recarregar» (não é conflito de versão).
  await page.getByRole("button", { name: "Desactivar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
  await expect(page.getByRole("dialog").getByText(/Encerre-o antes de o arquivar/)).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Recarregar" })).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  // Convite (sem SMTP local: fica na fila)
  await page.goto("/utilizadores");
  await page.getByRole("button", { name: "Convidar" }).click();
  await page.getByLabel("E-mail").fill(emailConvite);
  await page.getByLabel("Perfil de acesso").selectOption("Colaborador");
  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByText("Convite enviado.")).toBeVisible();

  // Perfis e estado da conta convidada
  await page.getByRole("link", { name: emailConvite }).click();
  await page.getByLabel("Juntar perfil").selectOption("HR");
  await page.getByRole("button", { name: "Atribuir" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Recursos Humanos" })).toBeVisible();
  await page.getByRole("listitem").filter({ hasText: "Recursos Humanos" }).getByRole("button", { name: "Retirar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Retirar perfil" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ hasText: "Recursos Humanos" })).toHaveCount(0);

  const botaoEstado = page.getByRole("button", { name: /Desactivar conta|Reactivar conta/ });
  const inicial = await botaoEstado.textContent();
  await botaoEstado.click();
  await page.getByLabel("Razão").fill(`${marca} verificação local`);
  await page.getByRole("dialog").getByRole("button", { name: /^(Desactivar|Reactivar)$/ }).click();
  await expect(page.getByRole("button", { name: inicial?.includes("Desactivar") ? "Reactivar conta" : "Desactivar conta" })).toBeVisible();

  // A conta convidada fica activa para a poder ligar à ficha.
  if (await page.getByRole("button", { name: "Reactivar conta" }).isVisible()) {
    await page.getByRole("button", { name: "Reactivar conta" }).click();
    await page.getByLabel("Razão").fill(`${marca} reactivar para ligar`);
    await page.getByRole("dialog").getByRole("button", { name: "Reactivar" }).click();
    await expect(page.getByRole("button", { name: "Desactivar conta" })).toBeVisible();
  }

  // Ligar e desligar a conta na ficha
  await page.goto(ficha);
  await page.getByRole("button", { name: "Ligar conta" }).click();
  await page.getByLabel("Conta", { exact: true }).selectOption({ label: emailConvite });
  await page.getByRole("dialog").getByRole("button", { name: "Ligar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(emailConvite).first()).toBeVisible();
  await expect(page.getByText(" · em vigor", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Desligar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desligar" }).click();
  await expect(page.getByRole("button", { name: "Ligar conta" })).toBeVisible();
  await expect(page.getByText(" · desligada ", { exact: false })).toBeVisible();

  // Dados da empresa: corrigir com os mesmos valores (local)
  await page.goto("/configuracoes");
  await page.getByRole("button", { name: /Corrigir|Declarar/ }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Dados da empresa guardados.")).toBeVisible();

  // Correio: sem SMTP local, a API responde 501 e a interface di-lo
  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Enviar e-mail de teste" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Esta funcionalidade não está configurada.").first()).toBeVisible();

  expect(fora).toEqual([]);
});
