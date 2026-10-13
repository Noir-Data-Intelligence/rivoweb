/**
 * F4 — aprovações, com a API simulada: caixa «à minha espera», decidir
 * (aprovar, rejeitar com motivo), 403 de segregação, 409 de decisão
 * simultânea, cancelar o próprio pedido, políticas, e o perfil sem nomes.
 */
import { colaboradores, departamentos } from "../../fixtures/f1";
import { cargos, EU, historico, IDF4, meAdminF4, meFinancasF4, meuPedido, painelComFicha, pedido, politicas } from "../../fixtures/f4";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });

function comF4(api: ApiSimulada, me = meAdminF4): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/dashboard/me", { status: 200, corpo: painelComFicha() })
    .em("GET", "/hr/employees", pag(colaboradores()))
    .em("GET", "/hr/positions", pag(cargos()))
    .em("GET", "/hr/departments", pag(departamentos()))
    .em("GET", "/approval/requests", (route) => {
      const q = new URL(route.request().url()).searchParams;
      return pag(q.get("pendingFor") === EU ? [pedido()] : [pedido(), meuPedido()]);
    })
    .em("GET", `/approval/requests/${IDF4.pedido}`, { status: 200, corpo: pedido() })
    .em("GET", `/approval/requests/${IDF4.pedido}/history`, { status: 200, corpo: historico() })
    .em("GET", `/approval/requests/${IDF4.meu}`, { status: 200, corpo: meuPedido() })
    .em("GET", `/approval/requests/${IDF4.meu}/history`, { status: 200, corpo: historico(IDF4.meu, EU) })
    .em("GET", "/approval/policies", { status: 200, corpo: politicas() });
}

test.describe("caixa e decisão", () => {
  test("à minha espera: aprovar e antecipar a aplicação no RH; axe, responsivo, CSP", async ({ page, api, violacoes }) => {
    await comF4(api)
      .em("POST", `/approval/requests/${IDF4.pedido}/decisions`, { status: 200, corpo: { ...pedido("Approved"), pendingApprovers: [], currentStep: 2 } })
      .em("POST", `/hr/position-assignments/${IDF4.atribuicao}/approval-outcome`, { status: 200, corpo: { estado: "Effective", detalhe: null } })
      .ligar();
    await entrar(page);
    await page.getByRole("link", { name: /Aprovações à sua espera/ }).click();
    await expect(page).toHaveURL(/\/aprovacoes$/);
    await expect.poll(() => api.pedidos.some((p) => p.caminho === "/approval/requests" && p.query.includes(`pendingFor=${EU}`))).toBe(true);
    await expect(page.getByRole("cell", { name: "Carlos Teste" })).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Atribuição de cargo" }).click();
    await expect(page.getByText("Aprovadores: Ana Teste (você)")).toBeVisible();
    await expect(page.getByText("prazo 48 h")).toBeVisible();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`).map((p) => p.corpo)).toEqual([{ action: "Approved", notes: null }]);
    await expect.poll(() => api.escritas("POST", `/hr/position-assignments/${IDF4.atribuicao}/approval-outcome`).length).toBe(1);
    expect(await violacoes()).toEqual([]);
  });

  test("rejeitar exige motivo; 403 de segregação mostra o motivo do servidor", async ({ page, api }) => {
    await comF4(api)
      .em("POST", `/approval/requests/${IDF4.pedido}/decisions`, {
        status: 403,
        corpo: { title: "Forbidden", status: 403, detail: "Esta pessoa já interveio neste processo e não pode decidir outra vez (BR-4)." },
        cabecalhos: { "Content-Type": "application/problem+json" },
      })
      .ligar();
    await entrar(page);
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    await page.getByRole("button", { name: "Rejeitar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(page.getByText("Explique o motivo")).toBeVisible();
    expect(api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`)).toHaveLength(0);
    await page.getByLabel("Notas").fill("Sem orçamento este trimestre");
    await page.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(page.getByText("(BR-4)", { exact: false })).toBeVisible();
    expect(api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`)[0]?.corpo).toEqual({ action: "Rejected", notes: "Sem orçamento este trimestre" });
  });

  test("409: outra pessoa decidiu primeiro, e a ficha recarrega", async ({ page, api }) => {
    await comF4(api)
      .em("POST", `/approval/requests/${IDF4.pedido}/decisions`, { status: 409, corpo: { erro: "Este processo já está fechado." } })
      .ligar();
    await entrar(page);
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    const leituras = () => api.pedidos.filter((p) => p.metodo === "GET" && p.caminho === `/approval/requests/${IDF4.pedido}`).length;
    const antes = leituras();
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByText("Outra pessoa decidiu primeiro.")).toBeVisible();
    await expect(page.getByText("Este processo já está fechado.", { exact: false })).toBeVisible();
    await expect.poll(leituras).toBeGreaterThan(antes);
  });

  test("o próprio pedido: sem decidir, com cancelar", async ({ page, api }) => {
    await comF4(api).em("POST", `/approval/requests/${IDF4.meu}/cancellation`, { status: 204 }).ligar();
    await entrar(page);
    await page.goto(`/aprovacoes/${IDF4.meu}`);
    await expect(page.getByText("É o seu pedido.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
    await page.getByRole("button", { name: "Cancelar o pedido" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar pedido" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/approval/requests/${IDF4.meu}/cancellation`)).toHaveLength(1);
  });

  test("Finanças: decide sem nomes de colaboradores e sem aplicar no RH", async ({ page, api }) => {
    await comF4(api, meFinancasF4).em("POST", `/approval/requests/${IDF4.pedido}/decisions`, { status: 200, corpo: pedido("Approved") }).ligar();
    await entrar(page, "financas4@teste.local");
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    await expect(page.getByText("De Colaborador", { exact: false })).toBeVisible();
    await expect(page.getByText("Aprovadores: Você")).toBeVisible();
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.pedidos.some((p) => p.caminho === "/hr/employees")).toBe(false);
    expect(api.pedidos.some((p) => p.caminho.includes("approval-outcome"))).toBe(false);
  });

  test("sem ficha de colaborador: a caixa própria explica porquê", async ({ page, api }) => {
    await comF4(api).em("GET", "/dashboard/me", { status: 200, corpo: { ...painelComFicha(), employeeId: null } }).ligar();
    await entrar(page);
    await page.goto("/aprovacoes");
    await expect(page.getByText("A sua conta não está ligada a uma ficha de colaborador.")).toBeVisible();
    await page.getByRole("link", { name: "Todos" }).click();
    await expect(page.getByRole("link", { name: "Atribuição de cargo" }).first()).toBeVisible();
  });
});

test.describe("políticas", () => {
  test("lista e criação com valores em texto; desactivar", async ({ page, api }) => {
    await comF4(api)
      .em("POST", "/approval/policies", { status: 201, corpo: { policyId: "00000000-0000-4000-8000-000000000805" } })
      .em("POST", `/approval/policies/${IDF4.politica}/deactivation`, { status: 204 })
      .ligar();
    await entrar(page);
    await page.goto("/politicas-aprovacao");
    await expect(page.getByText("Pedido de pagamento")).toBeVisible();
    await expect(page.getByText("a partir de 100 000,00 Kz", { exact: false })).toBeVisible();
    await expect(page.getByText("1. Director")).toBeVisible();
    await semViolacoesAxe(page);
    await page.getByRole("button", { name: "Nova política" }).click();
    await page.getByRole("button", { name: "Criar política" }).click();
    await expect(page.getByText("Cada passo precisa de cargo", { exact: false })).toBeVisible();
    await page.getByLabel("Processo").selectOption("hr.leave_request");
    await page.getByLabel("Valor mínimo (opcional)").fill("1 000,50");
    await page.getByLabel("Passo 1: cargo").selectOption({ label: "Director" });
    await page.getByLabel("Prazo (h)").fill("72");
    await page.getByRole("button", { name: "Criar política" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/approval/policies")[0]?.corpo).toEqual({
      processType: "hr.leave_request", departmentId: null, minimumAmount: "1000.50", maximumAmount: null, requiresBudgetCheck: false,
      steps: [{ approverPositionId: "00000000-0000-4000-8000-000000000040", mode: "AnyApprover", slaHours: 72 }],
    });
    await page.getByRole("button", { name: "Desactivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/approval/policies/${IDF4.politica}/deactivation`)).toHaveLength(1);
  });
});
