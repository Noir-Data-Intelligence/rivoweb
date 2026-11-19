/**
 * F4 — aprovações, com a API simulada: caixa «à minha espera», decidir
 * (aprovar, rejeitar com motivo), 403 de segregação, 409 de decisão
 * simultânea, cancelar o próprio pedido, políticas, e o perfil sem nomes.
 * K4: passo de validação com checklist (política, decisão e histórico).
 */
import { colaboradores, departamentos } from "../../fixtures/f1";
import { cargos, EU, historico, historicoValidado, IDF4, meAdminF4, meFinancasF4, meuPedido, OUTRO, painelComFicha, pedido, pedidoValidacao, politicas } from "../../fixtures/f4";
import type { components } from "@/lib/api/schema";
import type { Page } from "@playwright/test";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test, type ApiSimulada } from "../apoio";

type S = components["schemas"];

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
  test("pagamento partido: o acumulado de 30 dias aparece quando passa do valor (BR-7)", async ({ page, api }) => {
    const pagamento = { ...historico(), processType: "finance.payment_request", sourceModule: "finance", amount: 600000, currency: "AOA" };
    await comF4(api)
      .em("GET", `/approval/requests/${IDF4.pedido}/history`, { status: 200, corpo: { ...pagamento, cumulativeAmount: 1200000 } })
      .em("GET", `/approval/requests/${IDF4.meu}/history`, { status: 200, corpo: { ...pagamento, requestId: IDF4.meu, cumulativeAmount: 600000 } })
      .ligar();
    await entrar(page);
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    await expect(page.getByText("Acumulado em 30 dias (mesmo fornecedor e rubrica)")).toBeVisible();
    await expect(page.getByText(/^1\s200\s000,00/)).toBeVisible();
    await page.goto(`/aprovacoes/${IDF4.meu}`);
    await expect(page.getByText("Valor", { exact: true })).toBeVisible();
    await expect(page.getByText("Acumulado em 30 dias", { exact: false })).toHaveCount(0);
  });

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

  test("Finanças: decide com os nomes do pedido (B19) e sem aplicar no RH", async ({ page, api }) => {
    await comF4(api, meFinancasF4).em("POST", `/approval/requests/${IDF4.pedido}/decisions`, { status: 200, corpo: pedido("Approved") }).ligar();
    await entrar(page, "financas4@teste.local");
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    await expect(page.getByText("De Carlos Teste", { exact: false })).toBeVisible();
    await expect(page.getByText("Atribuição do cargo Director Financeiro", { exact: false })).toBeVisible();
    await expect(page.getByText("Aprovadores: Ana Teste (você)")).toBeVisible();
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.pedidos.some((p) => p.caminho === "/hr/employees")).toBe(false);
    expect(api.pedidos.some((p) => p.caminho.includes("approval-outcome"))).toBe(false);
  });

  test("esclarecimento pedido por mim: continua à minha espera e decido depois (ADR-138)", async ({ page, api }) => {
    const pergunta = { decidedByEmployeeId: EU, decidedByName: "Ana Teste", action: "ClarificationRequested", decidedAt: "2026-10-12T10:00:00Z", step: 1, notes: "Qual é a data de início?", checklist: [] };
    const esclarecer = { ...pedido("ClarificationRequested"), decisions: [pergunta] };
    await comF4(api)
      .em("GET", "/approval/requests", (route) => pag(new URL(route.request().url()).searchParams.get("pendingFor") === EU ? [esclarecer] : [esclarecer, meuPedido()]))
      .em("GET", `/approval/requests/${IDF4.pedido}`, { status: 200, corpo: esclarecer })
      .em("GET", `/approval/requests/${IDF4.pedido}/history`, { status: 200, corpo: { ...historico(), status: "ClarificationRequested", decisions: [pergunta] } })
      .em("POST", `/approval/requests/${IDF4.pedido}/decisions`, { status: 200, corpo: pedido("Approved") })
      .ligar();
    await entrar(page);
    await page.goto("/aprovacoes");
    await expect(page.getByRole("link", { name: "Atribuição de cargo" })).toHaveCount(1);
    await expect(page.getByText("Esclarecimento pedido")).toBeVisible();
    await page.getByRole("link", { name: "Atribuição de cargo" }).click();
    await expect(page.getByRole("heading", { name: "A sua decisão" })).toBeVisible();
    await expect(page.getByText("Qual é a data de início?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Rejeitar" })).toBeEnabled();
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`)[0]?.corpo).toMatchObject({ action: "Approved" });
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
      steps: [{ approverPositionId: "00000000-0000-4000-8000-000000000040", mode: "AnyApprover", slaHours: 72, escalationPositionId: null, kind: "Approval" }],
    });
    await page.getByRole("button", { name: "Desactivar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Desactivar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/approval/policies/${IDF4.politica}/deactivation`)).toHaveLength(1);
  });
});

test.describe("prazos e escalonamento (ADR-130)", () => {
  const ADMINISTRADOR = "00000000-0000-4000-8000-000000000049";

  test("política: escalar só com prazo e para outro cargo; a lista diz para onde escala", async ({ page, api }) => {
    const escalando = politicas().map((p) => ({ ...p, steps: p.steps.map((s) => ({ ...s, slaHours: 48, escalationPositionId: ADMINISTRADOR })) }));
    await comF4(api)
      .em("GET", "/hr/positions", pag([...cargos(), { positionId: ADMINISTRADOR, name: "Administrador", hierarchyLevel: 0, grantsApprovalAuthority: true, governingBody: true }]))
      .em("GET", "/approval/policies", { status: 200, corpo: escalando })
      .em("POST", "/approval/policies", { status: 201, corpo: { policyId: "00000000-0000-4000-8000-000000000808" } })
      .ligar();
    await entrar(page);
    await page.goto("/politicas-aprovacao");
    await expect(page.getByText("· 48 h · escala para Administrador", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: "Nova política" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Processo").selectOption("finance.payment_request");
    await d.getByLabel("Passo 1: cargo").selectOption({ label: "Director" });
    const escalar = d.getByLabel("Passo 1: escalar para o cargo (opcional)");
    await expect(escalar).toBeDisabled();
    await d.getByLabel("Prazo (h)").fill("24");
    await expect(escalar).toBeEnabled();
    // O cargo do próprio passo não aparece.
    await expect(escalar.locator("option")).toHaveText(["Não escalar", "Administrador"]);
    await escalar.selectOption({ label: "Administrador" });
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Criar política" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/approval/policies")[0]?.corpo).toMatchObject({
      steps: [{ approverPositionId: "00000000-0000-4000-8000-000000000040", slaHours: 24, escalationPositionId: ADMINISTRADOR }],
    });
  });

  test("caixa e ficha: o prazo, a vermelho quando passou; «Escalado»; quem entrou por escalonamento", async ({ page, api, violacoes }) => {
    const escalado = { ...pedido(), currentStepDueAt: "2026-10-13T09:00:00Z", escalatedAt: "2026-10-13T09:05:00Z" };
    const noPrazo = { ...meuPedido(), currentStepDueAt: "2099-01-02T10:30:00Z", escalatedAt: null };
    const h = historico();
    await comF4(api)
      .em("GET", "/approval/requests", pag([escalado, noPrazo]))
      .em("GET", `/approval/requests/${IDF4.pedido}`, { status: 200, corpo: escalado })
      .em("GET", `/approval/requests/${IDF4.pedido}/history`, {
        status: 200,
        corpo: { ...h, assignments: [...h.assignments, { step: 1, mode: "AnyApprover", approverEmployeeId: "00000000-0000-4000-8000-000000000099", approverName: "Rui Administrador", slaHours: 48, isEscalation: true }] },
      })
      .ligar();
    await entrar(page);
    await page.goto("/aprovacoes?vista=todos");
    const linhaEscalada = page.getByRole("row").filter({ hasText: "Escalado" });
    await expect(linhaEscalada).toContainText("Prazo: 13/10/2026 10:00 · passou");
    await expect(page.getByText("Prazo: 02/01/2099 11:30", { exact: true })).toBeVisible();
    expect(await violacoes()).toEqual([]);
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    await expect(page.getByText("Prazo: 13/10/2026 10:00 · passou")).toBeVisible();
    await expect(page.getByText("Rui Administrador (por escalonamento)", { exact: false })).toBeVisible();
  });
});

test.describe("delegações (ADR-129)", () => {
  const RUI = "00000000-0000-4000-8000-000000000098";
  const delegacao = (id: string, de: string, deNome: string, em: string, emNome: string, activa = true): S["ApprovalDelegationView"] => ({
    delegationId: id,
    delegatorEmployeeId: de,
    delegatorName: deNome,
    delegateEmployeeId: em,
    delegateName: emNome,
    startsAt: "2026-11-10T08:00:00+01:00",
    endsAt: "2099-11-20T18:00:00+01:00",
    reason: "Férias",
    active: activa,
    createdAt: "2026-11-09T10:00:00Z",
  });
  const candidatos = [
    { employeeId: EU, name: "Ana Teste" },
    { employeeId: OUTRO, name: "Carlos Teste" },
    { employeeId: RUI, name: "Rui Teste" },
  ];

  test("quem decide: as suas delegações, delegar (validação no cliente, 409 do servidor) e revogar", async ({ page, api, violacoes }) => {
    let tentativas = 0;
    await comF4(api, meFinancasF4)
      .em("GET", "/approval/delegations", { status: 200, corpo: [delegacao("00000000-0000-4000-8000-000000000901", EU, "Ana Teste", OUTRO, "Carlos Teste", false)] })
      .em("GET", "/approval/delegations/candidates", { status: 200, corpo: candidatos })
      .em("POST", "/approval/delegations", () =>
        ++tentativas === 1
          ? { status: 409, corpo: { status: 409, title: "Conflito", detail: "Já tem uma delegação para parte deste período." }, cabecalhos: { "Content-Type": "application/problem+json" } }
          : { status: 201, corpo: delegacao("00000000-0000-4000-8000-000000000902", EU, "Ana Teste", RUI, "Rui Teste") },
      )
      .em("POST", "/approval/delegations/00000000-0000-4000-8000-000000000901/revocation", { status: 204 })
      .ligar();
    await entrar(page, "financas4@teste.local");
    await page.goto("/aprovacoes");
    await page.getByRole("link", { name: "Delegações" }).click();
    await expect(page).toHaveURL(/\/aprovacoes\/delegacoes$/);
    const linha = page.getByRole("row").filter({ hasText: "Carlos Teste" });
    await expect(linha).toContainText("Ana Teste (você)");
    await expect(linha).toContainText("Por começar");
    expect(api.pedidos.some((p) => p.caminho === "/approval/delegations" && p.query.includes("scope=all"))).toBe(false);
    await page.getByRole("button", { name: "Delegar" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Quem delega")).toHaveCount(0);
    // Não se delega em si próprio: a própria pessoa não aparece.
    await expect(d.getByLabel("Colega").locator("option")).toHaveText(["Escolha…", "Carlos Teste", "Rui Teste"]);
    await d.getByRole("button", { name: "Delegar" }).click();
    await expect(d.getByText("Escolha o colega.")).toBeVisible();
    await expect(d.getByText("Indique até quando.")).toBeVisible();
    await d.getByLabel("Colega").selectOption({ label: "Rui Teste" });
    await d.getByLabel("Início (opcional)").fill("2099-11-21T08:00");
    await d.getByLabel("Fim").fill("2099-11-20T18:00");
    await d.getByRole("button", { name: "Delegar" }).click();
    await expect(d.getByText("O fim tem de ser depois do início.")).toBeVisible();
    await d.getByLabel("Fim").fill("2020-01-01T18:00");
    await d.getByLabel("Início (opcional)").fill("");
    await d.getByRole("button", { name: "Delegar" }).click();
    await expect(d.getByText("O fim tem de ser depois de agora.")).toBeVisible();
    expect(api.escritas("POST", "/approval/delegations")).toHaveLength(0);
    await d.getByLabel("Fim").fill("2099-11-30T18:00");
    await d.getByLabel("Motivo (opcional)").fill("  Férias ");
    expect(await violacoes()).toEqual([]);
    await d.getByRole("button", { name: "Delegar" }).click();
    await expect(d.getByText("Já tem uma delegação para parte deste período.")).toBeVisible();
    await d.getByRole("button", { name: "Delegar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/approval/delegations").map((p) => p.corpo)).toEqual([
      { delegateEmployeeId: RUI, endsAt: "2099-11-30T18:00:00+01:00", reason: "Férias" },
      { delegateEmployeeId: RUI, endsAt: "2099-11-30T18:00:00+01:00", reason: "Férias" },
    ]);
    await page.getByRole("button", { name: "Revogar a delegação de Ana Teste em Carlos Teste" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Revogar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/approval/delegations/00000000-0000-4000-8000-000000000901/revocation")).toHaveLength(1);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
  });

  test("o admin vê todas e delega por quem está ausente", async ({ page, api }) => {
    await comF4(api)
      .em("GET", "/approval/delegations", (route) =>
        new URL(route.request().url()).searchParams.get("scope") === "all"
          ? { status: 200, corpo: [delegacao("00000000-0000-4000-8000-000000000903", OUTRO, "Carlos Teste", RUI, "Rui Teste")] }
          : { status: 200, corpo: [] },
      )
      .em("GET", "/approval/delegations/candidates", { status: 200, corpo: candidatos })
      .em("POST", "/approval/delegations", { status: 201, corpo: delegacao("00000000-0000-4000-8000-000000000904", OUTRO, "Carlos Teste", EU, "Ana Teste") })
      .ligar();
    await entrar(page);
    await page.goto("/aprovacoes/delegacoes");
    await expect(page.getByRole("row").filter({ hasText: "Rui Teste" })).toContainText("Em vigor");
    await expect(page.getByRole("button", { name: "Revogar a delegação de Carlos Teste em Rui Teste" })).toBeVisible();
    await page.getByRole("button", { name: "Delegar" }).click();
    const d = page.getByRole("dialog");
    await expect(d.getByLabel("Quem delega")).toHaveValue(EU);
    await d.getByLabel("Quem delega").selectOption({ label: "Carlos Teste" });
    await d.getByLabel("Colega").selectOption({ label: "Ana Teste" });
    await d.getByLabel("Fim").fill("2099-12-01T18:00");
    await d.getByRole("button", { name: "Delegar" }).click();
    await expect(d).toHaveCount(0);
    expect(api.escritas("POST", "/approval/delegations").map((p) => p.corpo)).toEqual([{ delegateEmployeeId: EU, endsAt: "2099-12-01T18:00:00+01:00", delegatorEmployeeId: OUTRO }]);
  });

  test("decidir por delegação: a caixa diz de quem; com um delegante vai em nome dele; a decisão mostra os dois", async ({ page, api }) => {
    const doCarlos = { ...pedido(), pendingApprovers: [OUTRO], requestedByEmployeeId: RUI, requestedByName: "Rui Teste" };
    const h = { ...historico(IDF4.pedido, RUI), decisions: [{ decidedByEmployeeId: EU, decidedByName: "Ana Teste", onBehalfOfEmployeeId: RUI, onBehalfOfName: "Rui Teste", action: "Approved", decidedAt: "2026-11-12T10:00:00Z", step: 1, notes: null, checklist: null }] };
    await comF4(api, meFinancasF4)
      .em("GET", "/approval/delegations", { status: 200, corpo: [delegacao("00000000-0000-4000-8000-000000000905", OUTRO, "Carlos Teste", EU, "Ana Teste")] })
      .em("GET", "/approval/requests", pag([doCarlos]))
      .em("GET", `/approval/requests/${IDF4.pedido}`, { status: 200, corpo: doCarlos })
      .em("GET", `/approval/requests/${IDF4.pedido}/history`, { status: 200, corpo: h })
      .em("POST", `/approval/requests/${IDF4.pedido}/decisions`, { status: 200, corpo: { ...doCarlos, status: "Approved" } })
      .ligar();
    await entrar(page, "financas4@teste.local");
    await page.goto("/aprovacoes");
    await expect(page.getByRole("row").filter({ hasText: "Rui Teste" })).toContainText("Por delegação de Carlos Teste");
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    await expect(page.getByText("Em nome de Carlos Teste, que lhe delegou as aprovações.")).toBeVisible();
    await expect(page.getByText("Ana Teste (você), em nome de Rui Teste,", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByRole("dialog")).toContainText("Em nome de Carlos Teste.");
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect.poll(() => api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`).length).toBe(1);
    expect(api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`)[0]?.corpo).toEqual({ action: "Approved", notes: null, onBehalfOfEmployeeId: OUTRO });
  });

  test("com dois delegantes no mesmo passo, pergunta em nome de quem", async ({ page, api }) => {
    const deDois = { ...pedido(), pendingApprovers: [OUTRO, RUI], requestedByEmployeeId: "00000000-0000-4000-8000-000000000097", requestedByName: "Joana Teste" };
    await comF4(api, meFinancasF4)
      .em("GET", "/approval/delegations", {
        status: 200,
        corpo: [delegacao("00000000-0000-4000-8000-000000000906", OUTRO, "Carlos Teste", EU, "Ana Teste"), delegacao("00000000-0000-4000-8000-000000000907", RUI, "Rui Teste", EU, "Ana Teste")],
      })
      .em("GET", `/approval/requests/${IDF4.pedido}`, { status: 200, corpo: deDois })
      .em("POST", `/approval/requests/${IDF4.pedido}/decisions`, { status: 200, corpo: { ...deDois, status: "Approved" } })
      .ligar();
    await entrar(page, "financas4@teste.local");
    await page.goto(`/aprovacoes/${IDF4.pedido}`);
    await page.getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByText("Vários colegas lhe delegaram este passo: escolha em nome de quem decide.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Em nome de").selectOption({ label: "Rui Teste" });
    await page.getByRole("button", { name: "Aprovar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expect.poll(() => api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`).length).toBe(1);
    expect(api.escritas("POST", `/approval/requests/${IDF4.pedido}/decisions`)[0]?.corpo).toMatchObject({ onBehalfOfEmployeeId: RUI });
  });
});

test.describe("validação de conformidade (K4)", () => {
  const comValidacao = (api: ApiSimulada) =>
    comF4(api)
      .em("GET", "/approval/requests", pag([pedidoValidacao()]))
      .em("GET", `/approval/requests/${IDF4.validacao}`, { status: 200, corpo: pedidoValidacao() })
      .em("GET", `/approval/requests/${IDF4.validacao}/history`, { status: 200, corpo: { ...historico(IDF4.validacao), checklist: pedidoValidacao().currentChecklist ?? null } })
      .em("POST", `/approval/requests/${IDF4.validacao}/decisions`, { status: 200, corpo: { ...pedidoValidacao(), currentStep: 2, currentChecklist: null } });
  /** Clica na opção como uma pessoa: no rótulo (o rádio está só para leitores de ecrã). */
  const responder = (page: Page, item: string, resposta: string) =>
    page.getByRole("group", { name: item }).locator("label").filter({ has: page.getByRole("radio", { name: resposta, exact: true }) }).click();

  test("política com passo de validação: checklist com obrigatórios e opcionais; a lista mostra «Validação · N itens»", async ({ page, api }) => {
    await comF4(api).em("POST", "/approval/policies", { status: 201, corpo: { policyId: "00000000-0000-4000-8000-000000000807" } }).ligar();
    await entrar(page);
    await page.goto("/politicas-aprovacao");
    await expect(page.getByText("Validação · 2 itens", { exact: false })).toBeVisible();
    await page.getByText("Ver o checklist").click();
    await expect(page.getByText("Três cotações comparativas")).toBeVisible();
    await page.getByRole("button", { name: "Nova política" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Processo").selectOption("finance.payment_request");
    await d.getByLabel("Passo 1: tipo").selectOption("Validation");
    await d.getByLabel("Passo 1: cargo").selectOption({ label: "Director" });
    await d.getByRole("button", { name: "Criar política" }).click();
    await expect(d.getByText("um passo de validação precisa de 1 a 30", { exact: false })).toBeVisible();
    expect(api.escritas("POST", "/approval/policies")).toHaveLength(0);
    await d.getByLabel("Passo 1: item 1", { exact: true }).fill("  Factura original anexada ");
    await d.getByRole("button", { name: "Item", exact: true }).click();
    await d.getByLabel("Passo 1: item 2", { exact: true }).fill("Três cotações comparativas");
    await d.getByLabel("Passo 1: item 2 obrigatório").uncheck();
    await d.getByRole("button", { name: "Passo", exact: true }).click();
    await d.getByLabel("Passo 2: cargo").selectOption({ label: "Director" });
    await semViolacoesAxe(page);
    await d.getByRole("button", { name: "Criar política" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/approval/policies")[0]?.corpo).toEqual({
      processType: "finance.payment_request", departmentId: null, minimumAmount: null, maximumAmount: null, requiresBudgetCheck: false,
      steps: [
        {
          approverPositionId: "00000000-0000-4000-8000-000000000040", mode: "AnyApprover", slaHours: null, escalationPositionId: null, kind: "Validation",
          checklist: [{ text: "Factura original anexada", mandatory: true }, { text: "Três cotações comparativas", mandatory: false }],
        },
        { approverPositionId: "00000000-0000-4000-8000-000000000040", mode: "AnyApprover", slaHours: null, escalationPositionId: null, kind: "Approval" },
      ],
    });
  });

  test("«não conforme» bloqueia «Validar»; rejeitar leva o checklist com N/A só no opcional; axe e 360 px", async ({ page, api, violacoes }) => {
    await comValidacao(api).ligar();
    await entrar(page);
    await page.goto("/aprovacoes");
    await expect(page.getByRole("row").filter({ hasText: "Pedido de pagamento" }).getByText("Validação")).toBeVisible();
    await page.getByRole("link", { name: "Pedido de pagamento" }).click();
    await expect(page.getByRole("heading", { name: "A sua validação" })).toBeVisible();
    const validar = page.getByRole("button", { name: "Validar" });
    await expect(validar).toBeDisabled();
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(0);
    const item = (texto: string) => page.getByRole("group", { name: texto });
    await expect(item("Factura original anexada").getByRole("radio", { name: "N/A" })).toBeDisabled();
    await expect(item("Três cotações comparativas").getByRole("radio", { name: "N/A" })).toBeEnabled();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    await page.setViewportSize({ width: 1280, height: 800 });

    await responder(page, "Factura original anexada", "Conforme");
    await responder(page, "NIF do fornecedor confere com a factura", "Não conforme");
    await expect(page.getByText("Há itens não conformes.")).toBeVisible();
    await responder(page, "Três cotações comparativas", "N/A");
    await expect(validar).toBeDisabled();
    await page.getByRole("button", { name: "Rejeitar" }).click();
    await page.getByLabel("Notas").fill("O NIF da factura não é o do fornecedor");
    await page.getByRole("dialog").getByRole("button", { name: "Rejeitar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/approval/requests/${IDF4.validacao}/decisions`)[0]?.corpo).toEqual({
      action: "Rejected",
      notes: "O NIF da factura não é o do fornecedor",
      checklist: [
        { itemId: IDF4.item1, response: "Compliant" },
        { itemId: IDF4.item2, response: "NonCompliant" },
        { itemId: IDF4.item3, response: "NotApplicable" },
      ],
    });
    expect(await violacoes()).toEqual([]);
  });

  test("validar com tudo conforme envia o checklist completo; o histórico mostra as respostas", async ({ page, api }) => {
    await comValidacao(api).ligar();
    await entrar(page);
    await page.goto(`/aprovacoes/${IDF4.validacao}`);
    await responder(page, "Factura original anexada", "Conforme");
    await responder(page, "NIF do fornecedor confere com a factura", "Conforme");
    await expect(page.getByRole("button", { name: "Validar" })).toBeDisabled();
    await responder(page, "Três cotações comparativas", "Conforme");
    await page.getByRole("button", { name: "Validar" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Validar a conformidade?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Validar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/approval/requests/${IDF4.validacao}/decisions`)[0]?.corpo).toEqual({
      action: "Approved",
      notes: null,
      checklist: [
        { itemId: IDF4.item1, response: "Compliant" },
        { itemId: IDF4.item2, response: "Compliant" },
        { itemId: IDF4.item3, response: "Compliant" },
      ],
    });

    // Validado: o passo 2 é de aprovação (sem checklist) e o histórico traz as respostas.
    api
      .em("GET", `/approval/requests/${IDF4.validacao}`, { status: 200, corpo: { ...pedidoValidacao(), currentStep: 2, currentChecklist: null } })
      .em("GET", `/approval/requests/${IDF4.validacao}/history`, { status: 200, corpo: historicoValidado() });
    await page.reload();
    const respostas = page.getByRole("list", { name: "Respostas ao checklist" });
    await expect(respostas.getByRole("listitem")).toHaveText(["✓Factura original anexada: Conforme", "✓NIF do fornecedor confere com a factura: Conforme", "—Três cotações comparativas: N/A"]);
    await expect(page.getByRole("heading", { name: "A sua decisão" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar" })).toBeVisible();
  });
});
