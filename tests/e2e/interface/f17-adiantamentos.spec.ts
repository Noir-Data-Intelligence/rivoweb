/**
 * F17 — adiantamentos de salário (ADR-114, ADR-123), com a API simulada: a
 * Tesouraria vê os pedidos e os pagos, pede em nome de um colaborador e paga
 * só os aprovados, e não a quem decidiu o pedido nem a uma conta sem ficha
 * (BR-3); o colaborador pede pelo portal e vê o estado. Axe e 360 px.
 */
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";
import { comF1 } from "../apoio-f1";
import { ID } from "../../fixtures/f1";
import { painelComFicha } from "../../fixtures/f4";
import { aprovacaoPagamento, contas, IDF5, meAdminF5 } from "../../fixtures/f5";
import { meColaborador } from "../../fixtures/identidade";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "200", "X-Total-Count": String(itens.length) } });
const problema = (status: number, detail: string) => ({ status, corpo: { status, title: "Conflito", detail }, cabecalhos: { "Content-Type": "application/problem+json" } });

const IDS = {
  aprovado: "00000000-0000-4000-8000-000000000a71",
  porAprovar: "00000000-0000-4000-8000-000000000a72",
  pago: "00000000-0000-4000-8000-000000000a73",
  aprovacao: "00000000-0000-4000-8000-000000000a74",
  adiantamento: "00000000-0000-4000-8000-000000000a75",
} as const;

const me: S["CurrentUserResponse"] = {
  ...meAdminF5,
  permissions: [...new Set([...meAdminF5.permissions, "finance.payables.read", "finance.payments.execute", "finance.treasury.write", "hr.employees.read", "approval.requests.read"])],
};

const pedido = (id: string, status: string, extra: Partial<S["SalaryAdvanceApplicationView"]> = {}): S["SalaryAdvanceApplicationView"] => ({
  applicationId: id,
  employeeId: ID.emp2,
  employeeName: "Carlos Teste",
  amount: 50000,
  payrollYear: 2026,
  payrollMonth: 11,
  reason: "Despesa de saúde",
  submittedAt: "2026-11-05T09:00:00Z",
  approvalRequestId: IDS.aprovacao,
  status,
  advanceId: null,
  ...extra,
});

const pedidos = () => [pedido(IDS.aprovado, "Approved"), pedido(IDS.porAprovar, "PendingApproval", { amount: 30000 }), pedido(IDS.pago, "Paid", { advanceId: IDS.adiantamento })];

const pagos = (): S["SalaryAdvanceView"][] => [
  { advanceId: IDS.adiantamento, employeeId: ID.emp2, employeeName: "Carlos Teste", amount: 80000, paidOn: "2026-10-15", bankAccountId: IDF5.conta, reference: "TRF 991", payrollYear: 2026, payrollMonth: 10, settledAmount: 50000, outstanding: 30000, applicationId: IDS.pago },
];

/** Como o Finance: pede e paga, mas não lê os colaboradores dos RH (B46). */
const meSemRh: S["CurrentUserResponse"] = { ...me, permissions: me.permissions.filter((p) => !p.startsWith("hr.")) };

function comAdiantamentos(api: ApiSimulada, decidiuPor: string = ID.emp1, quem: S["CurrentUserResponse"] = me): ApiSimulada {
  return comF1(api, quem)
    .em("GET", "/finance/treasury/salary-advance-applications/lookups", { status: 200, corpo: { employees: [{ id: ID.emp1, name: "Ana Teste" }, { id: ID.emp2, name: "Carlos Teste" }] } })
    .em("GET", "/finance/treasury/salary-advance-applications", { status: 200, corpo: pedidos() })
    .em("GET", "/finance/treasury/salary-advances", { status: 200, corpo: pagos() })
    .em("GET", `/approval/requests/${IDS.aprovacao}`, { status: 200, corpo: { ...aprovacaoPagamento("Approved", decidiuPor), requestId: IDS.aprovacao, processType: "finance.salary_advance" } })
    .em("GET", "/finance/accounts", pag(contas()));
}

async function verificar(page: Page) {
  await semViolacoesAxe(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await semScrollHorizontal(page);
  await page.setViewportSize({ width: 1280, height: 800 });
}

test.describe("adiantamentos de salário", () => {
  test("tesouraria: pedidos com estado, pagos por descontar; pagar só o aprovado, por quem não o decidiu; o 409 mostra o motivo", async ({ page, api, violacoes }) => {
    let tentativas = 0;
    // Quem paga tem ficha (o painel diz emp1) e não decidiu o pedido (decidiu o emp2).
    await comAdiantamentos(api, ID.emp2)
      .em("GET", "/dashboard/me", { status: 200, corpo: painelComFicha() })
      .em("POST", "/finance/treasury/salary-advances", () => (++tentativas === 1 ? problema(409, "A folha de 11/2026 já está lançada: o adiantamento não se paga.") : { status: 201, corpo: { id: IDS.adiantamento } }))
      .ligar();
    await entrar(page);
    const menu = page.getByRole("navigation", { name: "Principal" }).first();
    await menu.getByRole("link", { name: "Adiantamentos de salário" }).click();
    const tabela = page.getByRole("table", { name: "Pedidos de adiantamento" });
    await expect(tabela.getByRole("row").filter({ hasText: "30 000,00" })).toContainText("Por aprovar");
    await expect(tabela.getByRole("row").filter({ hasText: "Pago" })).not.toContainText("Pagar");
    await expect(tabela.getByRole("button", { name: "Pagar o adiantamento de Carlos Teste" })).toHaveCount(1);
    const pagosT = page.getByRole("table", { name: "Adiantamentos pagos" });
    await expect(pagosT.getByRole("row").filter({ hasText: "TRF 991" })).toContainText("30 000,00");
    await page.getByLabel("Só os por descontar").check();
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/finance/treasury/salary-advances" && p.query.includes("outstandingOnly=true"))).toBe(true);
    await verificar(page);

    await tabela.getByRole("button", { name: "Pagar o adiantamento de Carlos Teste" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Pagar", exact: true }).click();
    await expect(d.getByText("Escolha a conta de onde sai o dinheiro.")).toBeVisible();
    await expect(d.getByLabel("Conta").locator("option")).toHaveText(["Escolha…", "Conta à ordem BAI · 5 000 000,00 Kz"]);
    await d.getByLabel("Conta").selectOption(IDF5.conta);
    await d.getByLabel("Data").fill("2026-11-10");
    await d.getByLabel("Referência (opcional)").fill("TRF 1002");
    await d.getByRole("button", { name: "Pagar", exact: true }).click();
    await expect(d.getByText("A folha de 11/2026 já está lançada: o adiantamento não se paga.")).toBeVisible();
    await d.getByRole("button", { name: "Pagar", exact: true }).click();
    await expect(d.getByText("Adiantamento de 50 000,00 Kz pago.")).toBeVisible();
    expect(api.escritas("POST", "/finance/treasury/salary-advances").map((p) => p.corpo)).toEqual([
      { applicationId: IDS.aprovado, bankAccountId: IDF5.conta, on: "2026-11-10", reference: "TRF 1002" },
      { applicationId: IDS.aprovado, bankAccountId: IDF5.conta, on: "2026-11-10", reference: "TRF 1002" },
    ]);
    expect(await violacoes()).toEqual([]);
  });

  test("tesouraria: quem decidiu o pedido não paga, nem uma conta sem ficha (BR-3)", async ({ page, api }) => {
    // Sem ficha (o painel por omissão não tem colaborador).
    await comAdiantamentos(api, ID.emp1).ligar();
    await entrar(page);
    await page.goto("/adiantamentos");
    const tabela = page.getByRole("table", { name: "Pedidos de adiantamento" });
    await expect(tabela.getByText("Só um colaborador paga")).toBeVisible();
    await expect(tabela.getByRole("button", { name: "Pagar o adiantamento de Carlos Teste" })).toHaveCount(0);
    // Com ficha, e foi quem decidiu (o painel diz emp1, e a decisão é de emp1).
    api.em("GET", "/dashboard/me", { status: 200, corpo: painelComFicha() });
    await page.reload();
    await expect(tabela.getByText("Decidiu-o: outra pessoa paga")).toBeVisible();
    await expect(tabela.getByRole("button", { name: "Pagar o adiantamento de Carlos Teste" })).toHaveCount(0);
  });

  test("tesouraria: pedir em nome de um colaborador vai a Aprovações; a lista vem da tesouraria, sem ler os RH", async ({ page, api }) => {
    await comAdiantamentos(api, ID.emp1, meSemRh)
      .em("POST", "/finance/treasury/salary-advance-applications", { status: 201, corpo: { applicationId: "00000000-0000-4000-8000-000000000a79" } })
      .ligar();
    await entrar(page);
    await page.goto("/adiantamentos");
    await page.getByRole("button", { name: "Pedir em nome de…" }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Pedir", exact: true }).click();
    await expect(d.getByText("Escolha o colaborador.")).toBeVisible();
    await expect(d.getByText("Indique o valor, maior que zero, até 2 casas.")).toBeVisible();
    await expect(d.getByLabel("Colaborador").getByRole("option")).toHaveText(["Escolha…", "Ana Teste", "Carlos Teste"]);
    await d.getByLabel("Colaborador").selectOption(ID.emp2);
    await d.getByLabel("Valor (Kz)").fill("45 000");
    await d.getByLabel("Desconta na folha de").fill("2099-01");
    await d.getByLabel("Motivo (opcional)").fill("Renda de casa");
    await d.getByRole("button", { name: "Pedir", exact: true }).click();
    await expect(d.getByText("Pedido enviado para aprovação.")).toBeVisible();
    expect(api.escritas("POST", "/finance/treasury/salary-advance-applications").map((p) => p.corpo)).toEqual([
      { employeeId: ID.emp2, amount: "45000.00", payrollYear: 2099, payrollMonth: 1, reason: "Renda de casa" },
    ]);
  });

  test("portal: o colaborador pede, com o mês da folha; vê o estado; o pedido interno «Adiantamento» aponta para aqui", async ({ page, api, violacoes }) => {
    let lista: S["OwnSalaryAdvanceApplication"][] = [
      { applicationId: IDS.pago, amount: 80000, payrollYear: 2026, payrollMonth: 10, reason: null, submittedAt: "2026-10-10T09:00:00Z", status: "Paid" },
    ];
    await api
      .comConta(meColaborador)
      .em("GET", "/portal/me/salary-advance-applications", () => ({ status: 200, corpo: lista }))
      .em("POST", "/portal/me/salary-advance-applications", () => {
        lista = [{ applicationId: "00000000-0000-4000-8000-000000000a7a", amount: 25000, payrollYear: 2099, payrollMonth: 2, reason: "Propinas", submittedAt: "2026-11-10T09:00:00Z", status: "PendingApproval" }, ...lista];
        return { status: 201, corpo: { applicationId: "00000000-0000-4000-8000-000000000a7a" } };
      })
      .em("GET", "/portal/me/tickets", { status: 200, corpo: [] })
      .ligar();
    await entrar(page, meColaborador.email);
    await page.goto("/eu/adiantamentos");
    await expect(page.getByRole("row").filter({ hasText: "80 000,00" })).toContainText("Pago");
    await verificar(page);
    await page.getByRole("button", { name: "Pedir adiantamento" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Desconta na folha de").fill("2020-01");
    await d.getByRole("button", { name: "Pedir", exact: true }).click();
    await expect(d.getByText("Indique o valor, maior que zero, até 2 casas.")).toBeVisible();
    await expect(d.getByText("Não pode ser uma folha de um mês que já passou.")).toBeVisible();
    await d.getByLabel("Valor (Kz)").fill("25 000");
    await d.getByLabel("Desconta na folha de").fill("2099-02");
    await d.getByLabel("Motivo (opcional)").fill("Propinas");
    await d.getByRole("button", { name: "Pedir", exact: true }).click();
    await expect(d.getByText("Pedido enviado para aprovação.")).toBeVisible();
    await d.getByRole("button", { name: "Fechar", exact: true }).first().click();
    await expect(page.getByRole("row").filter({ hasText: "25 000,00" })).toContainText("Por aprovar");
    expect(api.escritas("POST", "/portal/me/salary-advance-applications").map((p) => p.corpo)).toEqual([{ amount: "25000.00", payrollYear: 2099, payrollMonth: 2, reason: "Propinas" }]);

    await page.goto("/eu/pedidos");
    await page.getByRole("button", { name: "Novo pedido" }).click();
    await page.getByLabel("Área").selectOption("SalaryAdvance");
    await expect(page.getByRole("dialog").getByRole("link", { name: "Adiantamentos de salário" })).toHaveAttribute("href", "/eu/adiantamentos");
    expect(await violacoes()).toEqual([]);
  });
});
