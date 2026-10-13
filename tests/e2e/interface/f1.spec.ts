/**
 * F1 — administração de acesso e núcleo organizacional, com a API simulada.
 * Verifica o que sobe à API em cada escrita, as permissões com mais de um
 * perfil (critério 4), axe, responsividade e CSP.
 */
import { colaboradores, dadosEmpresa, ID, meAdminF1, meRh, meSuperAdminF1 } from "../../fixtures/f1";
import { entrar, expect, semScrollHorizontal, semViolacoesAxe, test } from "../apoio";
import { comF1 } from "../apoio-f1";

test.describe("administração de acesso", () => {
  test("utilizadores: lista, pesquisa, axe, responsivo, escuro e CSP", async ({ page, api, violacoes }) => {
    await comF1(api).ligar();
    await entrar(page);
    await page.getByRole("link", { name: "Utilizadores" }).first().click();
    await expect(page.getByRole("heading", { name: "Utilizadores", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "ana@teste.local" })).toBeVisible();
    await page.getByLabel("Pesquisar").fill("BRUNO");
    await expect(page.getByRole("link", { name: "bruno@teste.local" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ana@teste.local" })).toHaveCount(0);
    await page.getByLabel("Pesquisar").fill("");
    for (const largura of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width: largura, height: 800 });
      await semScrollHorizontal(page);
    }
    await semViolacoesAxe(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await semViolacoesAxe(page);
    expect(await violacoes()).toEqual([]);
  });

  test("convidar: escolhe entre os perfis da API e envia e-mail e perfil", async ({ page, api }) => {
    await comF1(api)
      .em("POST", "/identity/invitations", { status: 201, corpo: { userId: "00000000-0000-4000-8000-000000000099" } })
      .ligar();
    await entrar(page);
    await page.goto("/utilizadores");
    await page.getByRole("button", { name: "Convidar" }).click();
    const opcoes = await page.getByLabel("Perfil de acesso").locator("option").allTextContents();
    expect(opcoes).toEqual(["Escolha…", "Administração", "Recursos Humanos", "Colaborador"]);
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Escreva o e-mail.")).toBeVisible();
    await page.getByLabel("E-mail").fill("  Nova@Teste.Local ");
    await page.getByLabel("Perfil de acesso").selectOption("HR");
    await page.getByRole("button", { name: "Enviar convite" }).click();
    await expect(page.getByText("Convite enviado.")).toBeVisible();
    expect(api.escritas("POST", "/identity/invitations").map((p) => p.corpo)).toEqual([{ email: "nova@teste.local", profile: "HR" }]);
  });

  test("conta SuperAdmin vista por um Admin: só leitura", async ({ page, api }) => {
    await comF1(api).ligar();
    await entrar(page);
    await page.goto(`/utilizadores/${ID.superUser}`);
    await expect(page.getByText("Esta conta só pode ser gerida por um SuperAdmin.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Desactivar conta" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retirar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Enviar ligação de recuperação" })).toHaveCount(0);
  });

  test("desactivar exige razão; a própria conta não se desactiva", async ({ page, api }) => {
    await comF1(api).em("POST", `/identity/users/${ID.user1}/status`, { status: 204 }).ligar();
    await entrar(page);
    await page.goto(`/utilizadores/${meAdminF1.userId}`);
    await expect(page.getByText("Não pode desactivar a sua própria conta.")).toBeVisible();
    await page.goto(`/utilizadores/${ID.user1}`);
    await page.getByRole("button", { name: "Desactivar conta" }).click();
    await page.getByRole("button", { name: "Desactivar", exact: true }).click();
    await expect(page.getByText("Indique a razão: fica na trilha de auditoria.")).toBeVisible();
    await page.getByLabel("Razão").fill("Saiu da empresa");
    await page.getByRole("button", { name: "Desactivar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/identity/users/${ID.user1}/status`).map((p) => p.corpo)).toEqual([{ active: false, reason: "Saiu da empresa" }]);
  });

  test("dados da empresa por declarar: aviso e declaração com confirmação", async ({ page, api }) => {
    await comF1(api)
      .em("GET", "/fiscal/tax-entity", { status: 404, corpo: { title: "Not Found", status: 404 }, cabecalhos: { "Content-Type": "application/problem+json" } })
      .em("PUT", "/fiscal/tax-entity", { status: 201, corpo: dadosEmpresa() })
      .ligar();
    await entrar(page);
    await page.goto("/configuracoes");
    await expect(page.getByText("A empresa ainda não declarou os dados fiscais.")).toBeVisible();
    await expect(page.getByText("hr.position_assignment")).toBeVisible();
    await page.getByRole("button", { name: "Declarar" }).click();
    await page.getByLabel("Razão social").fill("Empresa Teste, Lda");
    await page.getByLabel("NIF").fill(" 5000 000 000 ");
    await page.getByLabel("Endereço").fill("Rua de Teste, 1");
    await page.getByLabel("Cidade").fill("Luanda");
    await page.getByLabel("País").fill("AO");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("dialog", { name: "Guardar os dados da empresa?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Dados da empresa guardados.")).toBeVisible();
    expect(api.escritas("PUT", "/fiscal/tax-entity").map((p) => p.corpo)).toEqual([
      {
        companyName: "Empresa Teste, Lda",
        taxRegistrationNumber: "5000000000",
        addressDetail: "Rua de Teste, 1",
        city: "Luanda",
        country: "AO",
        businessName: null,
        postalCode: null,
        email: null,
        phone: null,
        softwareValidationNumber: null,
      },
    ]);
  });
});

test.describe("permissões por perfil (critério 4)", () => {
  test("RH vê Pessoas mas não Administração, e /utilizadores fica vedado", async ({ page, api }) => {
    await comF1(api, meRh).ligar();
    await entrar(page, "rh@teste.local");
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav.getByRole("link", { name: "Colaboradores" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Utilizadores" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Configurações" })).toHaveCount(0);
    await page.goto("/utilizadores");
    await expect(page.getByText("Não tem acesso", { exact: false })).toBeVisible();
    expect(api.pedidos.some((p) => p.caminho === "/identity/users")).toBe(false);
    // Sem link_account, a ficha não mostra a conta de acesso.
    await page.goto(`/colaboradores/${ID.emp2}`);
    await expect(page.getByRole("heading", { name: "Carlos Teste" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Conta de acesso" })).toHaveCount(0);
  });
});

test.describe("núcleo organizacional", () => {
  test("colaboradores: paginação do servidor e ficha, com axe", async ({ page, api, violacoes }) => {
    await comF1(api)
      .em("GET", "/hr/employees", (route) => {
        const p = new URL(route.request().url()).searchParams;
        const n = Number(p.get("page"));
        const tamanho = Number(p.get("pageSize"));
        // A lista de apoio (200) e a tabela (25) pedem a mesma rota.
        return { status: 200, corpo: n === 2 ? [colaboradores()[1]] : colaboradores(), cabecalhos: { "X-Page": String(n), "X-Page-Size": String(tamanho), "X-Total-Count": tamanho === 200 ? "2" : "26" } };
      })
      .ligar();
    await entrar(page);
    await page.goto("/colaboradores");
    await expect(page.getByText("1–25 de 26")).toBeVisible();
    await page.getByRole("button", { name: "Página seguinte" }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(page.getByText("26–26 de 26")).toBeVisible();
    expect(api.pedidos.some((p) => p.caminho === "/hr/employees" && p.query.includes("page=2") && p.query.includes("pageSize=25"))).toBe(true);
    await semViolacoesAxe(page);
    await page.getByRole("link", { name: "Carlos Teste" }).click();
    await expect(page.getByRole("heading", { name: "Carlos Teste" })).toBeVisible();
    await expect(page.getByText("Sem cargo em vigor.")).toBeVisible();
    await semViolacoesAxe(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await semScrollHorizontal(page);
    expect(await violacoes()).toEqual([]);
  });

  test("cargo com autoridade: 202 fica pendente, nunca como sucesso", async ({ page, api }) => {
    await comF1(api)
      .em("POST", `/hr/employees/${ID.emp2}/positions`, {
        status: 202,
        corpo: { assignmentId: ID.atribuicao, estado: "PendenteAprovacao", detalhe: "Submetida para aprovação." },
      })
      .em("POST", `/hr/position-assignments/${ID.atribuicao}/approval-outcome`, { status: 202, corpo: { estado: "Pending", detalhe: "Ainda por decidir." } })
      .ligar();
    await entrar(page);
    await page.goto(`/colaboradores/${ID.emp2}`);
    await page.getByRole("button", { name: "Atribuir cargo" }).click();
    await page.getByLabel("Cargo", { exact: true }).selectOption(ID.cargoAprovador);
    await expect(page.getByText("A atribuição vai para aprovação")).toBeVisible();
    // Sem assign_direct, não há atribuição directa.
    await expect(page.getByLabel("Atribuição directa, sem aprovação")).toHaveCount(0);
    await page.getByRole("button", { name: "Enviar para aprovação" }).click();
    await expect(page.getByText("Enviado para aprovação.")).toBeVisible();
    const corpo = api.escritas("POST", `/hr/employees/${ID.emp2}/positions`)[0]?.corpo as { positionId: string; effectiveFrom: string; effectiveTo: null };
    expect(corpo.positionId).toBe(ID.cargoAprovador);
    expect(corpo.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\+01:00$/);
    expect(corpo.effectiveTo).toBeNull();
    await page.getByRole("button", { name: "Verificar decisão" }).click();
    await expect(page.getByText("Ainda sem decisão.")).toBeVisible();
  });

  test("SuperAdmin pode atribuir directamente", async ({ page, api }) => {
    await comF1(api, meSuperAdminF1).em("POST", `/hr/employees/${ID.emp2}/positions/direct`, { status: 201, corpo: { assignmentId: ID.atribuicao } }).ligar();
    await entrar(page, "super@teste.local");
    await page.goto(`/colaboradores/${ID.emp2}`);
    await page.getByRole("button", { name: "Atribuir cargo" }).click();
    await page.getByLabel("Cargo", { exact: true }).selectOption(ID.cargoAprovador);
    await page.getByLabel("Atribuição directa, sem aprovação").check();
    await page.getByRole("button", { name: "Atribuir", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", `/hr/employees/${ID.emp2}/positions/direct`)).toHaveLength(1);
    expect(api.escritas("POST", `/hr/employees/${ID.emp2}/positions`)).toHaveLength(0);
  });

  test("edição com versão: envia If-Match e o 409 oferece recarregar (ADR-080)", async ({ page, api }) => {
    await comF1(api)
      .em("PUT", `/hr/employees/${ID.emp2}`, {
        status: 409,
        corpo: { title: "Conflito de concorrência", status: 409, detail: "O registo foi alterado entretanto. Recarregue e repita a operação." },
        cabecalhos: { "Content-Type": "application/problem+json" },
      })
      .ligar();
    await entrar(page);
    await page.goto(`/colaboradores/${ID.emp2}`);
    await page.getByRole("button", { name: "Corrigir nome" }).click();
    await page.getByLabel("Nome completo").fill("Carlos Teste Corrigido");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Alguém alterou este registo entretanto.")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Recarregar" })).toBeVisible();
    const pedido = api.escritas("PUT", `/hr/employees/${ID.emp2}`)[0];
    expect(pedido?.ifMatch).toBe('"3"');
    expect(pedido?.corpo).toEqual({ fullName: "Carlos Teste Corrigido" });
  });

  test("ligar conta: só contas activas, livres e que não são a própria", async ({ page, api }) => {
    await comF1(api).em("POST", `/hr/employees/${ID.emp2}/account`, { status: 204 }).ligar();
    await entrar(page);
    await page.goto(`/colaboradores/${ID.emp2}`);
    await page.getByRole("button", { name: "Ligar conta" }).click();
    const opcoes = await page.getByLabel("Conta", { exact: true }).locator("option").allTextContents();
    // admin (a própria), ana (já ligada a emp1) e bruno (inactiva) ficam de fora.
    expect(opcoes).toEqual(["Escolha…", "bootstrap@teste.local"]);
  });

  test("departamentos: cria com responsável; cargos mostram ocupações", async ({ page, api }) => {
    await comF1(api).em("POST", "/hr/departments", { status: 201, corpo: { departmentId: "00000000-0000-4000-8000-000000000031" } }).ligar();
    await entrar(page);
    await page.goto("/departamentos");
    await expect(page.getByRole("cell", { name: "Ana Teste" })).toBeVisible();
    await page.getByRole("button", { name: "Novo departamento" }).click();
    await page.getByLabel("Nome").fill("Finanças");
    await page.getByLabel("Responsável").selectOption(ID.emp2);
    await page.getByRole("button", { name: "Criar departamento" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(api.escritas("POST", "/hr/departments").map((p) => p.corpo)).toEqual([{ name: "Finanças", managerId: ID.emp2 }]);
    await page.goto("/cargos");
    await page.getByRole("button", { name: "Ocupações de Director" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Ana Teste" })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Em vigor")).toBeVisible();
    await semViolacoesAxe(page);
  });
});
