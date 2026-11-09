/**
 * F8 — salários, com a API simulada: folhas (totais somados em Big, abrir com
 * aviso de mês repetido e a recusa do servidor à vista), rascunho (juntar
 * colaborador com bruto e subsídios em texto, subsídios acima do bruto,
 * colaborador repetido, salário do contrato), submeter, ver decisão (ainda à
 * espera e aplicada), aprovada (recibos: ver, anexar, descarregar) e só
 * leitura sem escrita. Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { EU, painelComFicha } from "../../fixtures/f4";
import { aprovacaoPagamento, documento } from "../../fixtures/f5";
import { contratos } from "../../fixtures/f7b";
import { folha, folhas, IDF8, itemAna, itemCarlos, meLeitorSalarios, meRhF8, recibos } from "../../fixtures/f8";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });
const problema = (status: number, detail: string, erros?: Record<string, string[]>) => ({
  status,
  corpo: erros ? { status, title: "Pedido inválido", errors: erros } : { status, title: "Conflito", detail },
  cabecalhos: { "Content-Type": "application/problem+json" },
});

function comSalarios(api: ApiSimulada, me = meRhF8): ApiSimulada {
  return comF1(api, me)
    .em("GET", "/payroll/runs", pag(folhas()))
    .em("GET", `/payroll/runs/${IDF8.rascunho}`, { status: 200, corpo: folha("Draft", [itemCarlos()]) })
    .em("GET", `/payroll/runs/${IDF8.aprovada}`, { status: 200, corpo: folha("Approved", [itemCarlos(), itemAna()], IDF8.aprovada, 9) })
    .em("GET", "/hr/contracts", pag(contratos()));
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("salários", () => {
  test("folhas: totais em Big; abrir avisa o mês repetido e mostra a recusa do servidor", async ({ page, api, violacoes }) => {
    let tentativas = 0;
    await comSalarios(api)
      .em("POST", "/payroll/runs", () =>
        ++tentativas === 1
          ? problema(400, "", { folha: ["Esta conta não está associada a nenhum colaborador, e só um colaborador abre folhas."] })
          : { status: 201, corpo: { runId: IDF8.rascunho } },
      )
      .ligar();
    await entrar(page, meRhF8.email);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await menu.getByRole("link", { name: "Folhas de pagamento" }).click();
    const setembro = page.getByRole("row").filter({ hasText: "Setembro 2026" });
    // 450 000 + 900 000,50 e 380 516,50 + 700 000,25, somados sem vírgula flutuante.
    await expect(setembro).toContainText("1 350 000,50");
    await expect(setembro).toContainText("1 080 516,75");
    await expect(setembro.getByText("Aprovada")).toBeVisible();
    await verificar(page);

    await page.getByRole("button", { name: "Abrir folha" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Mês").selectOption("10");
    await d.getByLabel("Ano").fill("2026");
    await expect(d.getByText("Já existe uma folha de Outubro 2026.")).toBeVisible();
    await d.getByLabel("Mês").selectOption("11");
    await expect(d.getByText(/Já existe uma folha/)).toHaveCount(0);
    await d.getByRole("button", { name: "Abrir folha" }).click();
    await expect(d.getByText("Esta conta não está associada a nenhum colaborador", { exact: false })).toBeVisible();
    await d.getByRole("button", { name: "Abrir folha" }).click();
    await expect(page).toHaveURL(new RegExp(`/salarios/${IDF8.rascunho}$`));
    expect(api.escritas("POST", "/payroll/runs").map((p) => p.corpo)).toEqual([
      { year: 2026, month: 11, openedByEmployeeId: null },
      { year: 2026, month: 11, openedByEmployeeId: null },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("rascunho: juntar colaborador (bruto e subsídios em texto, contrato, repetido), submeter", async ({ page, api, violacoes }) => {
    let itens = [itemCarlos()];
    let estado = "Draft";
    await comSalarios(api)
      .em("GET", `/payroll/runs/${IDF8.rascunho}`, () => ({ status: 200, corpo: folha(estado, itens) }))
      .em("POST", `/payroll/runs/${IDF8.rascunho}/items`, () => {
        itens = [itemCarlos(), itemAna()];
        return { status: 201, corpo: { itemId: IDF8.itemAna } };
      })
      .em("POST", `/payroll/runs/${IDF8.rascunho}/submission`, () => {
        estado = "PendingApproval";
        return { status: 200, corpo: { approvalRequestId: IDF8.aprovacao } };
      })
      .ligar();
    await entrar(page, meRhF8.email);
    await page.goto(`/salarios/${IDF8.rascunho}`);
    await expect(page.getByRole("heading", { name: "Folha de Outubro 2026", level: 1 })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Carlos Teste" })).toContainText("380 516,50");
    await verificar(page);

    await page.getByRole("button", { name: "Juntar colaborador" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Colaborador").selectOption(ID.emp2);
    await expect(d.getByText("Este colaborador já está nesta folha.")).toBeVisible();
    // O contrato em vigor do Carlos sugere o bruto.
    await expect(d.getByText("Contrato em vigor: 450 000,00", { exact: false })).toBeVisible();
    await d.getByRole("button", { name: "Usar o do contrato" }).click();
    await expect(d.getByLabel("Salário bruto (Kz)")).toHaveValue("450000,00");
    await d.getByLabel("Colaborador").selectOption(ID.emp1);
    await d.getByLabel("Salário bruto (Kz)").fill("100 000");
    await d.getByLabel("Subsídio de alimentação (opcional)").fill("80 000");
    await d.getByLabel("Subsídio de transporte (opcional)").fill("30 000");
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d.getByText("Os subsídios fazem parte do bruto: não podem somar mais do que ele.")).toBeVisible();
    expect(api.escritas("POST", `/payroll/runs/${IDF8.rascunho}/items`)).toHaveLength(0);
    await d.getByLabel("Salário bruto (Kz)").fill("900 000,50");
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", `/payroll/runs/${IDF8.rascunho}/items`).map((p) => p.corpo)).toEqual([
      { employeeId: ID.emp1, grossSalary: "900000.50", foodAllowance: "80000.00", transportAllowance: "30000.00", vacationAllowance: null, christmasAllowance: null },
    ]);
    await expect(page.getByRole("row").filter({ hasText: "Ana Teste" })).toContainText("700 000,25");

    await page.getByRole("button", { name: "Submeter para aprovação" }).click();
    await expect(d).toContainText("2 colaboradores, 1 350 000,50");
    await d.getByRole("button", { name: "Submeter" }).click();
    await expect(d).toHaveCount(0);
    await expect(page.getByText("À espera de decisão em Aprovações.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir o pedido de aprovação" })).toHaveAttribute("href", `/aprovacoes/${IDF8.aprovacao}`);
    await expect(page.getByRole("button", { name: "Juntar colaborador" })).toHaveCount(0);
    expect(await violacoes()).toEqual([]);
  });

  test("rascunho: tirar um colaborador e anular a folha (B28); o repetido não se junta (B27)", async ({ page, api }) => {
    let itens = [itemCarlos(), itemAna()];
    let estado = "Draft";
    await comSalarios(api)
      .em("GET", `/payroll/runs/${IDF8.rascunho}`, () => ({ status: 200, corpo: folha(estado, itens) }))
      .em("DELETE", `/payroll/runs/${IDF8.rascunho}/items/${IDF8.itemAna}`, () => {
        itens = [itemCarlos()];
        return { status: 204 };
      })
      .em("POST", `/payroll/runs/${IDF8.rascunho}/cancellation`, () => {
        estado = "Cancelled";
        return { status: 204 };
      })
      .ligar();
    await entrar(page, meRhF8.email);
    await page.goto(`/salarios/${IDF8.rascunho}`);
    await page.getByRole("button", { name: "Juntar colaborador" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Colaborador").selectOption(ID.emp2);
    await d.getByLabel("Salário bruto (Kz)").fill("100 000");
    await d.getByRole("button", { name: "Juntar" }).click();
    await expect(d.getByText("Este colaborador já está nesta folha.")).toBeVisible();
    expect(api.escritas("POST", `/payroll/runs/${IDF8.rascunho}/items`)).toHaveLength(0);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Tirar Ana Teste da folha" }).click();
    await d.getByRole("button", { name: "Tirar da folha" }).click();
    await expect(d).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: "Ana Teste" })).toHaveCount(0);
    expect(api.escritas("DELETE", `/payroll/runs/${IDF8.rascunho}/items/${IDF8.itemAna}`)).toHaveLength(1);

    await page.getByRole("button", { name: "Anular folha" }).click();
    await d.getByRole("button", { name: "Anular folha" }).click();
    await expect(page.getByText("Folha anulada: não se paga nem se altera.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Juntar colaborador" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Tirar / })).toHaveCount(0);
  });

  test("por aprovar: ver decisão — ainda à espera, depois aprovada", async ({ page, api }) => {
    let estado = "PendingApproval";
    let pedidas = 0;
    await comSalarios(api)
      .em("GET", `/payroll/runs/${IDF8.porAprovar}`, () => ({ status: 200, corpo: folha(estado, [itemCarlos()], IDF8.porAprovar) }))
      .em("POST", `/payroll/runs/${IDF8.porAprovar}/decision`, () => {
        if (++pedidas === 2) estado = "Approved";
        return {
          status: 200,
          corpo: estado === "Approved" ? { status: estado, ledgerOutcome: "Blocked", journalEntryId: null, ledgerNote: "Sem taxa de INSS patronal em vigor: a folha não lançou." } : { status: estado, ledgerOutcome: null, journalEntryId: null, ledgerNote: null },
        };
      })
      .ligar();
    await entrar(page, meRhF8.email);
    await page.goto(`/salarios/${IDF8.porAprovar}`);
    await page.getByRole("button", { name: "Ver decisão" }).click();
    await expect(page.getByText("Ainda à espera de decisão em Aprovações.")).toBeVisible();
    await page.getByRole("button", { name: "Ver decisão" }).click();
    await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recibos de Carlos Teste" })).toBeVisible();
    // A decisão diz o que a folha fez no razão (ADR-097): aqui não lançou, e porquê.
    await expect(page.getByText("A folha não lançou no razão.")).toBeVisible();
    await expect(page.getByText("Sem taxa de INSS patronal em vigor: a folha não lançou.")).toBeVisible();
  });

  test("aprovada: lançar no razão (repetir não duplica); o RH não paga os salários", async ({ page, api }) => {
    await comSalarios(api)
      .em("POST", `/payroll/runs/${IDF8.aprovada}/ledger-posting`, { status: 200, corpo: { outcome: "AlreadyPosted", journalEntryId: "00000000-0000-4000-8000-000000000f31", note: null } })
      .ligar();
    await entrar(page, meRhF8.email);
    await page.goto(`/salarios/${IDF8.aprovada}`);
    await expect(page.getByText("Aprovada, a folha lança no último dia do mês", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Lançar no razão" }).click();
    await expect(page.getByText("A folha já estava lançada no razão.")).toBeVisible();
    expect(api.escritas("POST", `/payroll/runs/${IDF8.aprovada}/ledger-posting`)).toHaveLength(1);
    await expect(page.getByRole("button", { name: "Pagar salários" })).toHaveCount(0);
  });

  test("aprovada: quem paga os salários (BR-3) — nem uma conta sem ficha, nem quem decidiu a folha", async ({ page, api }) => {
    const me = { ...meRhF8, permissions: [...new Set([...meRhF8.permissions, "finance.payments.execute"])] };
    const decisao = (por: string) => ({ ...aprovacaoPagamento("Approved", por), requestId: IDF8.aprovacao, processType: "payroll.run", sourceModule: "payroll" });
    // Por omissão a conta não tem ficha de colaborador.
    await comSalarios(api, me).em("GET", `/approval/requests/${IDF8.aprovacao}`, { status: 200, corpo: decisao(EU) }).ligar();
    await entrar(page, me.email);
    await page.goto(`/salarios/${IDF8.aprovada}`);
    await expect(page.getByText("A sua conta não está ligada a uma ficha de colaborador.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagar salários" })).toHaveCount(0);

    api.em("GET", "/dashboard/me", { status: 200, corpo: painelComFicha() });
    await page.reload();
    await expect(page.getByText("Foi você que decidiu esta folha em Aprovações.")).toBeVisible();
    await expect(page.getByText("outra pessoa com a tesouraria tem de pagar os salários", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagar salários" })).toHaveCount(0);

    api.em("GET", `/approval/requests/${IDF8.aprovacao}`, { status: 200, corpo: decisao(ID.emp2) });
    await page.reload();
    await expect(page.getByRole("button", { name: "Pagar salários" })).toBeVisible();
    await expect(page.getByText("Foi você que decidiu esta folha em Aprovações.")).toHaveCount(0);
    await expect(page.getByText("A sua conta não está ligada a uma ficha de colaborador.")).toHaveCount(0);
  });

  test("aprovada: recibos do colaborador — ver, descarregar e anexar", async ({ page, api }) => {
    const anexos = recibos();
    await comSalarios(api)
      .em("GET", `/payroll/runs/${IDF8.aprovada}/items/${IDF8.itemCarlos}/documents`, () => ({ status: 200, corpo: anexos }))
      .em("GET", `/payroll/runs/${IDF8.aprovada}/items/${IDF8.itemAna}/documents`, { status: 200, corpo: [] })
      .em("GET", `/documents/${IDF8.recibo}`, { status: 200, bruto: { conteudo: "%PDF-1.4", tipo: "application/pdf" } })
      .em("POST", "/documents", { status: 201, corpo: { ...documento("recibo-ana.pdf"), documentId: "00000000-0000-4000-8000-000000000988", category: "Recibo de vencimento" } })
      .em("POST", `/payroll/runs/${IDF8.aprovada}/items/${IDF8.itemAna}/documents`, { status: 201, corpo: { linkId: "l1" } })
      .ligar();
    await entrar(page, meRhF8.email);
    await page.goto(`/salarios/${IDF8.aprovada}`);
    await expect(page.getByRole("button", { name: "Juntar colaborador" })).toHaveCount(0);
    await page.getByRole("button", { name: "Recibos de Carlos Teste" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByText("recibo-carlos-09.pdf")).toBeVisible();
    const pdf = page.waitForEvent("download");
    await d.getByRole("button", { name: "Descarregar recibo-carlos-09.pdf" }).click();
    expect((await pdf).suggestedFilename()).toBe("recibo-carlos-09.pdf");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Recibos de Ana Teste" }).click();
    await expect(d.getByText("Sem recibo anexado.")).toBeVisible();
    await d.getByLabel("Ficheiro do recibo").setInputFiles({ name: "recibo-ana.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await expect(d.getByText("recibo-ana.pdf")).toBeVisible();
    await d.getByRole("button", { name: "Anexar" }).click();
    await expect.poll(() => api.escritas("POST", `/payroll/runs/${IDF8.aprovada}/items/${IDF8.itemAna}/documents`).map((p) => p.corpo)).toEqual([
      { documentId: "00000000-0000-4000-8000-000000000988", category: "Recibo de vencimento" },
    ]);
  });

  test("sem escrita: vê as folhas e os valores, sem abrir, juntar nem anexar", async ({ page, api }) => {
    await comSalarios(api, meLeitorSalarios).ligar();
    await entrar(page, meLeitorSalarios.email);
    await page.goto("/salarios");
    await expect(page.getByRole("row").filter({ hasText: "Outubro 2026" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir folha" })).toHaveCount(0);
    await page.goto(`/salarios/${IDF8.rascunho}`);
    await expect(page.getByRole("button", { name: "Juntar colaborador" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submeter para aprovação" })).toHaveCount(0);
    await page.goto(`/salarios/${IDF8.aprovada}`);
    await expect(page.getByText("Aprovada, a folha lança no último dia do mês", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lançar no razão" })).toHaveCount(0);
  });
});
