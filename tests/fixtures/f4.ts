/** Fixtures da F4 — SÓ em tests/ (§8.2). Tipadas contra schema.d.ts. */
import type { components } from "../../src/lib/api/schema";
import { cargos, colaboradores, ID } from "./f1";
import { meAdminF3 } from "./f3";

type S = components["schemas"];

export const meAdminF4: S["CurrentUserResponse"] = {
  ...meAdminF3,
  permissions: [...meAdminF3.permissions, "approval.requests.read", "approval.requests.decide", "approval.policies.write"],
};

/** Finanças decide, mas não lê colaboradores nem atribui cargos. */
export const meFinancasF4: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000008",
  email: "financas4@teste.local",
  displayName: "Finanças Teste",
  roles: ["Finance"],
  permissions: ["approval.requests.read", "approval.requests.decide", "finance.invoices.read"],
};

/** A conta Admin está ligada à Ana (emp1); o Carlos (emp2) é quem pede. */
export const EU = ID.emp1;
export const OUTRO = ID.emp2;

const NOMES: Record<string, string> = { [ID.emp1]: "Ana Teste", [ID.emp2]: "Carlos Teste" };

export const IDF4 = {
  pedido: "00000000-0000-4000-8000-000000000801",
  meu: "00000000-0000-4000-8000-000000000802",
  atribuicao: "00000000-0000-4000-8000-000000000803",
  politica: "00000000-0000-4000-8000-000000000804",
  validacao: "00000000-0000-4000-8000-000000000806",
  item1: "00000000-0000-4000-8000-000000000811",
  item2: "00000000-0000-4000-8000-000000000812",
  item3: "00000000-0000-4000-8000-000000000813",
};

export const painelComFicha = (): S["MyDashboardView"] => ({ employeeId: EU, displayName: "Ana Teste", unreadNotifications: 0, pendingApprovals: 1, announcements: [] });

export const pedido = (estado = "InProgress"): S["ApprovalStatusView"] => ({
  requestId: IDF4.pedido,
  processType: "hr.position_assignment",
  sourceModule: "hr",
  sourceReference: IDF4.atribuicao,
  status: estado,
  currentStep: 1,
  totalSteps: 2,
  pendingApprovers: [EU],
  decisions: [],
  requestedByEmployeeId: OUTRO,
  requestedByName: "Carlos Teste",
  summary: "Atribuição do cargo Director Financeiro, que confere autoridade de aprovação.",
  submittedAt: "2026-10-12T09:00:00Z",
});

export const meuPedido = (): S["ApprovalStatusView"] => ({ ...pedido(), requestId: IDF4.meu, requestedByEmployeeId: EU, requestedByName: "Ana Teste", pendingApprovers: [OUTRO] });

export const historico = (id = IDF4.pedido, requerente = OUTRO): S["ApprovalHistoryView"] => ({
  requestId: id,
  processType: "hr.position_assignment",
  sourceModule: "hr",
  sourceReference: IDF4.atribuicao,
  requestedByEmployeeId: requerente,
  requestedByName: NOMES[requerente] ?? null,
  summary: "Atribuição do cargo Director Financeiro, que confere autoridade de aprovação.",
  amount: null,
  currency: null,
  departmentId: null,
  status: "InProgress",
  submittedAt: "2026-10-12T09:00:00Z",
  closedAt: null,
  currentStep: 1,
  totalSteps: 2,
  assignments: [
    { step: 1, mode: "AnyApprover", approverEmployeeId: requerente === EU ? OUTRO : EU, approverName: requerente === EU ? "Carlos Teste" : "Ana Teste", slaHours: 48 },
    { step: 2, mode: "AllApprovers", approverEmployeeId: ID.emp2, approverName: "Carlos Teste", slaHours: null },
  ],
  decisions: [],
});

export const politicas = (): S["PolicyView"][] => [
  {
    policyId: IDF4.politica,
    processType: "finance.payment_request",
    departmentId: null,
    minimumAmount: 100000,
    maximumAmount: null,
    requiresBudgetCheck: true,
    isActive: true,
    specificity: 1,
    steps: [
      {
        order: 1,
        approverPositionId: ID.cargoAprovador,
        mode: "AnyApprover",
        slaHours: 24,
        kind: "Validation",
        checklist: [
          { order: 1, text: "Factura original anexada", mandatory: true },
          { order: 2, text: "Três cotações comparativas", mandatory: false },
        ],
      },
      { order: 2, approverPositionId: ID.cargoAprovador, mode: "AnyApprover", slaHours: null, kind: "Approval", checklist: null },
    ],
  },
];

/** K4: o checklist do passo de validação em curso (DAF antes da Direcção). */
export const checklistValidacao = (): S["ApprovalChecklistItemView"][] => [
  { itemId: IDF4.item1, step: 1, order: 1, text: "Factura original anexada", mandatory: true },
  { itemId: IDF4.item2, step: 1, order: 2, text: "NIF do fornecedor confere com a factura", mandatory: true },
  { itemId: IDF4.item3, step: 1, order: 3, text: "Três cotações comparativas", mandatory: false },
];

export const pedidoValidacao = (): S["ApprovalStatusView"] => ({
  ...pedido(),
  requestId: IDF4.validacao,
  processType: "finance.payment_request",
  sourceModule: "finance",
  summary: "Pagamento ao fornecedor Papelaria Central.",
  currentChecklist: checklistValidacao(),
});

/** Histórico de um pedido cuja validação já foi feita (passo 1) e espera a aprovação (passo 2). */
export const historicoValidado = (): S["ApprovalHistoryView"] => ({
  ...historico(IDF4.validacao),
  processType: "finance.payment_request",
  sourceModule: "finance",
  currentStep: 2,
  checklist: checklistValidacao(),
  decisions: [
    {
      decidedByEmployeeId: OUTRO,
      decidedByName: "Carlos Teste",
      action: "Approved",
      decidedAt: "2026-10-12T10:00:00Z",
      step: 1,
      notes: "Conferido",
      checklist: [
        { itemId: IDF4.item1, response: "Compliant" },
        { itemId: IDF4.item2, response: "Compliant" },
        { itemId: IDF4.item3, response: "NotApplicable" },
      ],
    },
  ],
});

export { cargos, colaboradores };
