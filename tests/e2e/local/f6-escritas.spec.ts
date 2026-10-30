/**
 * F6 contra a API LOCAL (D1, §8.3), com a conta Admin local e pela interface:
 * contabilidade (diário, contas, período de regularização, lançamento em
 * partida dobrada, balancete, estorno, fecho e reabertura, classe de reporte,
 * versão do plano, regra contabilística), configuração fiscal (o servidor
 * recusa versões sobrepostas; nada da configuração existente muda),
 * planeamento (centro de custo, orçamento revisto e aprovado, previsão
 * submetida, rascunho revisto e submetido depois — B23) e o
 * SAF-T descarregado.
 *
 * Não define regras de lançamento automático: mudariam a emissão de facturas
 * dos outros testes locais.
 */
import { readFileSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API_LOCAL = "http://localhost:5080";
const FRONT_LOCAL = "http://localhost:5173";

test.skip(process.env.RIVO_ESCRITAS_LOCAL !== "1" || !process.env.RIVO_LOCAL_ADMIN_EMAIL, "Só com a API local e a conta Admin local.");

const sufixo = Date.now().toString(36).toUpperCase();
const marca = `[TESTE] ${sufixo}`;
const hoje = new Date().toISOString().slice(0, 10);
const ano = Number(hoje.slice(0, 4));
const mes = Number(hoje.slice(5, 7));

async function soLocal(page: Page) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    return url.startsWith(API_LOCAL) || url.startsWith(FRONT_LOCAL) ? route.continue() : route.abort("blockedbyclient");
  });
}

async function entrar(page: Page, email: string, password: string) {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /^Olá/ })).toBeVisible();
}

type Chamar = <T = unknown>(metodo: string, caminho: string, corpo?: unknown) => Promise<{ status: number; corpo: T }>;

async function sessaoApi(request: APIRequestContext, email: string, password: string): Promise<Chamar> {
  const r = await request.post(`${API_LOCAL}/identity/login`, { data: { email, password } });
  expect(r.status(), `login ${email}`).toBe(200);
  const { accessToken } = (await r.json()) as { accessToken: string };
  return async (metodo, caminho, corpo) => {
    const x = await request.fetch(`${API_LOCAL}${caminho}`, { method: metodo, headers: { Authorization: `Bearer ${accessToken}` }, ...(corpo === undefined ? {} : { data: corpo }) });
    const texto = await x.text();
    return { status: x.status(), corpo: (texto ? JSON.parse(texto) : null) as never };
  };
}

const adminEmail = () => process.env.RIVO_LOCAL_ADMIN_EMAIL ?? "";
const adminPass = () => process.env.RIVO_LOCAL_ADMIN_PASSWORD ?? "";

test("F6: contabilidade — diário, contas, lançamento, balancete, estorno, períodos, classes, plano e regra", async ({ page, request }) => {
  test.setTimeout(300_000);
  await soLocal(page);
  const ad = await sessaoApi(request, adminEmail(), adminPass());
  // O período do mês corrente tem de estar aberto para lançar (preparação pela API, idempotente).
  const existentes = await ad<{ number: number; status: string }[]>("GET", `/finance/ledger/periods?fiscalYear=${ano}`);
  const corrente = existentes.corpo.find((p) => Number(p.number) === mes);
  if (!corrente) expect((await ad("POST", "/finance/ledger/periods", { fiscalYear: ano, number: mes })).status).toBe(201);
  else if (corrente.status !== "Open") expect((await ad("POST", `/finance/ledger/periods/${ano}/${mes}/reopening`, { reason: `${marca} preparação` })).status).toBe(204);

  await entrar(page, adminEmail(), adminPass());

  // Diário e contas (1.º grau e duas de movimento), pela interface.
  const diario = `T${sufixo}`.slice(0, 30);
  await page.goto("/lancamentos?vista=diarios");
  await page.getByRole("button", { name: "Abrir diário" }).click();
  await page.getByRole("dialog").getByLabel("Código").fill(diario);
  await page.getByRole("dialog").getByLabel("Nome").fill(`${marca} diário`);
  await page.getByRole("dialog").getByRole("button", { name: "Abrir diário" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell", { name: diario, exact: true })).toBeVisible();

  const raiz = `Z${sufixo}`;
  const abrirConta = async (codigo: string, categoria: string, mae: string | null, nome: string) => {
    await page.getByRole("button", { name: "Abrir conta" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Categoria").selectOption(categoria);
    await d.getByLabel("Código").fill(codigo);
    if (mae) await d.getByLabel("Conta-mãe").fill(mae);
    await d.getByLabel("Descrição").fill(nome);
    await d.getByRole("button", { name: "Abrir conta" }).click();
    await expect(d).toHaveCount(0);
  };
  await page.goto("/plano-contas");
  await abrirConta(raiz, "GR", null, `${marca} classe`);
  await abrirConta(`${raiz}1`, "GM", raiz, `${marca} caixa`);
  await abrirConta(`${raiz}2`, "GM", raiz, `${marca} proveitos`);
  await page.getByLabel("Procurar").fill(raiz);
  await expect(page.getByRole("cell", { name: `${raiz}2`, exact: true })).toBeVisible();

  // Lançamento em partida dobrada.
  await page.goto("/lancamentos/novo");
  await page.getByLabel("Diário").selectOption({ label: `${diario} · ${marca} diário` });
  await page.getByLabel("N.º de arquivo").fill(`A-${sufixo}`);
  await page.getByLabel("Descrição", { exact: true }).fill(`${marca} venda a dinheiro`);
  await page.getByLabel("Conta · linha 1").fill(`${raiz}1`);
  await page.getByLabel("Valor · linha 1").fill("1 000,50");
  await page.getByLabel("Descrição · linha 1").fill("Recebido");
  await page.getByLabel("Conta · linha 2").fill(`${raiz}2`);
  await page.getByLabel("Valor · linha 2").fill("1000,50");
  await page.getByLabel("Descrição · linha 2").fill("Venda");
  await page.getByRole("button", { name: "Lançar" }).click();
  await expect(page.getByRole("heading", { name: `Lançamento ${diario} A-${sufixo}`, level: 1 })).toBeVisible();
  const idLancamento = page.url().split("/").pop() ?? "";

  // Subconta debaixo de uma conta de movimento já com lançamentos: o servidor recusa (409) e o front mostra a razão.
  await page.goto("/plano-contas");
  await page.getByRole("button", { name: "Abrir conta" }).click();
  await page.getByRole("dialog").getByLabel("Código").fill(`${raiz}11`);
  await page.getByRole("dialog").getByLabel("Conta-mãe").fill(`${raiz}1`);
  await expect(page.getByRole("dialog").getByText(`${raiz}1 é de movimento: passa a agregadora, se não tiver lançamentos.`)).toBeVisible();
  await page.getByRole("dialog").getByLabel("Descrição").fill(`${marca} filha`);
  await page.getByRole("dialog").getByRole("button", { name: "Abrir conta" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  // O balancete do mês mostra as duas contas.
  await page.goto(`/relatorios?ano=${ano}&periodo=${mes}`);
  const linha = page.getByRole("row").filter({ hasText: `${marca} caixa` });
  await expect(linha).toContainText("1 000,50 Kz");

  // Estorno com motivo.
  await page.goto(`/lancamentos/${idLancamento}`);
  await page.getByRole("button", { name: "Estornar" }).click();
  await page.getByRole("dialog").getByLabel("Motivo").fill(`${marca} estorno de teste`);
  await page.getByRole("dialog").getByRole("button", { name: "Estornar" }).click();
  await expect(page.getByText(`${marca} estorno de teste`)).toBeVisible();
  await expect(page.getByText("Estornado", { exact: true }).first()).toBeVisible();
  const lido = await ad<{ isVoided: boolean }>("GET", `/finance/ledger/entries/${idLancamento}`);
  expect(lido.corpo.isVoided).toBe(true);

  // Período de regularização: abrir, fechar (quem fecha é a conta) e reabrir com motivo.
  const reg = await ad<{ number: number }[]>("GET", `/finance/ledger/periods?fiscalYear=${ano}`);
  const livre = [13, 14, 15, 16].find((n) => !reg.corpo.some((p) => Number(p.number) === n));
  if (livre !== undefined) {
    await page.goto(`/periodos?ano=${ano}`);
    await page.getByRole("button", { name: "Abrir período" }).click();
    await page.getByRole("dialog").getByLabel("Período").selectOption(String(livre));
    await page.getByRole("dialog").getByRole("button", { name: "Abrir período" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: `Fechar o período ${livre} · Regularização` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Fechar período" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const fechado = page.getByRole("row").filter({ hasText: `${livre} · Regularização` });
    await expect(fechado.getByText("Fechado", { exact: true })).toBeVisible();
    await fechado.getByRole("button", { name: "Reabrir" }).click();
    await page.getByRole("dialog").getByLabel("Motivo").fill(`${marca} reabertura`);
    await page.getByRole("dialog").getByRole("button", { name: "Reabrir" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(fechado.getByText("Aberto", { exact: true })).toBeVisible();
    await expect(fechado).toContainText(`${marca} reabertura`);
  }

  // Classe de reporte: criar e apagar.
  await page.goto("/plano-contas?vista=reporte");
  await page.getByRole("button", { name: "Nova classe" }).click();
  await page.getByRole("dialog").getByLabel("Prefixo das contas").fill(raiz);
  await page.getByRole("dialog").getByLabel("Rubrica").fill(`${marca} rubrica`);
  await page.getByRole("dialog").getByLabel("Ordem").fill("99");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell", { name: `${marca} rubrica` })).toBeVisible();
  await page.getByRole("button", { name: `Apagar a classe do prefixo ${raiz}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apagar" }).click();
  await expect(page.getByRole("cell", { name: `${marca} rubrica` })).toHaveCount(0);

  // Versão do plano e regra contabilística (registo; nenhuma postagem as consome).
  await page.goto("/plano-contas?vista=versoes");
  await page.getByRole("button", { name: "Nova versão" }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill(`${marca} PGC`);
  await page.getByRole("dialog").getByLabel("Versão").fill(sufixo);
  await page.getByRole("dialog").getByLabel("Fonte").fill("Decreto de teste");
  // Em vigor só em 2099: uma versão nova começa vazia e, em vigor hoje, pararia a emissão (as regras usam contas do PGC).
  await page.getByRole("dialog").getByLabel("Em vigor desde").fill("2099-01-01");
  await page.getByRole("dialog").getByRole("button", { name: "Registar versão" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("cell", { name: `${marca} PGC` })).toBeVisible();

  await page.goto("/regras-contabilisticas?vista=contabilisticas");
  await page.getByRole("button", { name: "Nova regra" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Código").fill(`R${sufixo}`);
  await d.getByLabel("Descrição", { exact: true }).fill(`${marca} regra`);
  await d.getByLabel("Tipo de origem").fill("SalesInvoiceIssued");
  await d.getByLabel("Fonte").fill("Norma de teste");
  await d.getByLabel("Conta · 1").fill(`${raiz}1`);
  await d.getByLabel("Descrição · 1").fill("Cliente");
  await d.getByLabel("Conta · 2").fill(`${raiz}2`);
  await d.getByLabel("Descrição · 2").fill("Vendas");
  await d.getByLabel("Conta · 3").fill(`${raiz}2`);
  await d.getByLabel("Descrição · 3").fill("IVA");
  await d.getByRole("button", { name: "Criar regra" }).click();
  await expect(d).toHaveCount(0);
  await expect(page.getByText(`R${sufixo} · ${marca} regra`)).toBeVisible();
  await page.getByRole("button", { name: `Desactivar a regra R${sufixo}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("F6: fiscal recusa versões sobrepostas sem mudar nada; impostos e SAF-T", async ({ page, request }) => {
  test.setTimeout(180_000);
  await soLocal(page);
  const ad = await sessaoApi(request, adminEmail(), adminPass());
  const antes = await ad("GET", "/fiscal/income-tax-schedule");
  await entrar(page, adminEmail(), adminPass());

  // IRT: uma tabela nova que se cruza com a em vigor — o servidor recusa (409) e diz porquê.
  await page.goto("/fiscal?vista=irt");
  await page.getByRole("button", { name: "Nova tabela" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Instrumento legal").fill(`${marca} não deve gravar`);
  await d.getByRole("button", { name: "Registar tabela" }).click();
  await expect(d.getByText("sobrepõe-se", { exact: false })).toBeVisible();
  await d.getByRole("button", { name: "Cancelar" }).click();
  expect((await ad("GET", "/fiscal/income-tax-schedule")).corpo).toEqual(antes.corpo);

  // Pauta nova e própria desta corrida: abrir, versão, fechar a versão.
  const codigo = `T${sufixo}`.slice(0, 10);
  await page.goto("/fiscal");
  await page.getByRole("button", { name: "Nova pauta" }).click();
  await page.getByRole("dialog").getByLabel("Código").fill(codigo);
  await page.getByRole("dialog").getByLabel("Descrição").fill(`${marca} pauta`);
  await page.getByRole("dialog").getByRole("button", { name: "Abrir pauta" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: `Nova versão de ${codigo}` }).click();
  await page.getByRole("dialog").getByLabel("Taxa (%)").fill("5");
  await page.getByRole("dialog").getByLabel("Em vigor desde").fill("2020-01-01");
  await page.getByRole("dialog").getByLabel("Instrumento legal").fill(`${marca} diploma`);
  await page.getByRole("dialog").getByRole("button", { name: "Registar versão" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(`${codigo} · ${marca} pauta`)).toBeVisible();
  await page.getByRole("button", { name: `Fechar a versão de ${codigo} de 01/01/2020` }).click();
  await page.getByRole("dialog").getByLabel("Último dia em vigor").fill("2020-12-31");
  await page.getByRole("dialog").getByRole("button", { name: "Fechar versão" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const pautas = await ad<{ code: string; versions: { effectiveTo: string | null }[] }[]>("GET", "/fiscal/tax-rates?page=1&pageSize=200");
  expect(pautas.corpo.find((p) => p.code === codigo)?.versions[0]?.effectiveTo).toBe("2020-12-31");

  // Impostos: IVA do mês e SAF-T descarregado.
  await page.goto(`/impostos?ano=${ano}&periodo=${mes}`);
  await expect(page.getByText("Não é a declaração oficial.")).toBeVisible();
  await page.getByRole("link", { name: "SAF-T" }).click();
  // Sem o NIF do produtor do software configurado, o servidor recusa (400) e o front mostra o motivo.
  const descarga = page.waitForEvent("download", { timeout: 60_000 }).catch(() => null);
  await page.getByRole("button", { name: /Descarregar SAF-T/ }).click();
  const recusa = page.getByText("Falta o NIF do produtor do software", { exact: false });
  const ficheiro = await Promise.race([descarga, recusa.waitFor({ timeout: 60_000 }).then(() => null)]);
  if (ficheiro) expect(readFileSync(await ficheiro.path(), "utf8").slice(0, 200)).toContain("<?xml");
  else await expect(recusa).toBeVisible();
});

test("F6: planeamento — centro de custo, orçamento revisto e aprovado, previsão submetida e rascunho submetido depois", async ({ page, request }) => {
  test.setTimeout(180_000);
  await soLocal(page);
  const ad = await sessaoApi(request, adminEmail(), adminPass());
  // Departamento e colaborador próprios desta corrida (preparação pela API).
  const dep = await ad<{ departmentId: string }>("POST", "/hr/departments", { name: `${marca} Planeamento`, managerId: null });
  expect(dep.status).toBe(201);
  const emp = await ad<{ employeeId: string }>("POST", "/hr/employees", { fullName: `${marca} Responsável`, departmentId: dep.corpo.departmentId, userId: null, hiredOn: null });
  expect(emp.status).toBe(201);
  await entrar(page, adminEmail(), adminPass());

  const codigo = `C${sufixo}`.slice(0, 20);
  await page.goto("/centros-custo");
  await page.getByRole("button", { name: "Abrir centro" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Código").fill(codigo);
  await d.getByLabel("Nome").fill(`${marca} centro`);
  await d.getByLabel("Departamento (opcional)").selectOption({ label: `${marca} Planeamento` });
  await d.getByLabel("Responsável").selectOption({ label: `${marca} Responsável` });
  await d.getByRole("button", { name: "Abrir centro" }).click();
  await expect(d).toHaveCount(0);

  await page.goto("/orcamentos");
  await page.getByRole("button", { name: "Novo orçamento" }).click();
  await page.getByRole("dialog").getByLabel("Centro de custo").selectOption({ label: `${codigo} · ${marca} centro` });
  await page.getByRole("dialog").getByLabel("Janeiro").fill("100 000,50");
  await page.getByRole("dialog").getByLabel("Fevereiro").fill("200000");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar rascunho" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const nome = `${codigo} · ${marca} centro`;
  const linha = page.getByRole("row").filter({ hasText: nome });
  await expect(linha).toContainText("300 000,50 Kz");
  await expect(linha.getByText("Rascunho")).toBeVisible();
  await page.getByRole("button", { name: `Rever o orçamento de ${nome}` }).click();
  await page.getByRole("dialog").getByLabel("Março").fill("50 000");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(linha).toContainText("350 000,50 Kz");
  await page.getByRole("button", { name: `Aprovar o orçamento de ${nome}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(linha.getByText("Aprovado")).toBeVisible();
  await expect(page.getByRole("button", { name: `Rever o orçamento de ${nome}` })).toHaveCount(0);

  await page.goto("/previsoes-custos");
  await page.getByRole("button", { name: "Registar previsão" }).click();
  await page.getByRole("dialog").getByLabel("Departamento").selectOption({ label: `${marca} Planeamento` });
  await page.getByRole("dialog").getByLabel("Custos operacionais").fill("6 026 000");
  await page.getByRole("dialog").getByLabel("Custos fixos").fill("3 270 000");
  await page.getByRole("dialog").getByRole("button", { name: "Submeter" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const previsao = page.getByRole("row").filter({ hasText: `${marca} Planeamento` });
  await expect(previsao).toContainText("9 296 000,00 Kz");
  await expect(previsao.getByText("Submetida")).toBeVisible();
  // Segunda previsão para o mesmo departamento e mês: o servidor recusa (409) e o front mostra.
  await page.getByRole("button", { name: "Registar previsão" }).click();
  await page.getByRole("dialog").getByLabel("Departamento").selectOption({ label: `${marca} Planeamento` });
  await page.getByRole("dialog").getByLabel("Custos operacionais").fill("1");
  await page.getByRole("dialog").getByLabel("Custos fixos").fill("1");
  await page.getByRole("dialog").getByRole("button", { name: "Submeter" }).click();
  await expect(page.getByRole("dialog").getByText("Já existe previsão para este departamento", { exact: false })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();

  // B23: rascunho no mês seguinte, revisto e submetido depois.
  const mesSeguinte = (mes % 12) + 1;
  const anoSeguinte = mes === 12 ? ano + 1 : ano;
  await page.getByRole("button", { name: "Registar previsão" }).click();
  const r = page.getByRole("dialog");
  await r.getByLabel("Departamento").selectOption({ label: `${marca} Planeamento` });
  await r.getByLabel("Ano").fill(String(anoSeguinte));
  await r.getByLabel("Mês").selectOption(String(mesSeguinte));
  await r.getByLabel("Custos operacionais").fill("1 000 000");
  await r.getByLabel("Custos fixos").fill("0");
  await r.getByLabel("Submeter já").uncheck();
  await r.getByRole("button", { name: "Guardar rascunho" }).click();
  await expect(r).toHaveCount(0);
  const rascunho = page.getByRole("row").filter({ hasText: `${marca} Planeamento` }).filter({ hasText: "Rascunho" });
  await expect(rascunho).toContainText("1 000 000,00 Kz");
  await rascunho.getByRole("button", { name: /^Rever a previsão/ }).click();
  await page.getByRole("dialog").getByLabel("Custos fixos").fill("250 000,50");
  await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(rascunho).toContainText("1 250 000,50 Kz");
  await rascunho.getByRole("button", { name: /^Submeter a previsão/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submeter" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const prev = await ad<{ month: number; status: string; total: number; departmentName: string | null }[]>("GET", `/finance/planning/cost-forecasts?departmentId=${dep.corpo.departmentId}&page=1&pageSize=25`);
  expect(prev.corpo.map((x) => [x.month, x.status, Number(x.total)]).sort()).toEqual(
    [
      [mes, "Submitted", 9296000],
      [mesSeguinte, "Submitted", 1250000.5],
    ].sort(),
  );
  expect(prev.corpo.every((x) => x.departmentName === `${marca} Planeamento`)).toBe(true);
});
