/** Fixtures da F8 (salários), com a forma das respostas reais de `/payroll/*`. Dados de teste. */
import type { components } from "@/lib/api/schema";
import { ID } from "./f1";
import { meRhF7 } from "./f7b";

type S = components["schemas"];

/** O HR de produção tem também `payroll.runs.read` e `.write` (lido em `/identity/me`, 2026-10-17). */
export const meRhF8: S["CurrentUserResponse"] = { ...meRhF7, permissions: [...meRhF7.permissions, "payroll.runs.read", "payroll.runs.write", "approval.requests.read"] };
/** Sem escrita: vê as folhas, não as altera. */
export const meLeitorSalarios: S["CurrentUserResponse"] = { ...meRhF7, permissions: [...meRhF7.permissions, "payroll.runs.read"] };

export const IDF8 = {
  rascunho: "00000000-0000-4000-8000-000000000981",
  aprovada: "00000000-0000-4000-8000-000000000982",
  porAprovar: "00000000-0000-4000-8000-000000000983",
  itemAna: "00000000-0000-4000-8000-000000000984",
  itemCarlos: "00000000-0000-4000-8000-000000000985",
  aprovacao: "00000000-0000-4000-8000-000000000986",
  recibo: "00000000-0000-4000-8000-000000000987",
} as const;

export const itemCarlos = (): S["PayrollItemView"] => ({
  itemId: IDF8.itemCarlos,
  employeeId: ID.emp2,
  grossSalary: 450000,
  foodAllowance: 30000,
  transportAllowance: 20000,
  vacationAllowance: 0,
  christmasAllowance: 0,
  netSalary: 380516.5,
  withholdingTax: 56483.5,
  socialSecurityContribution: 13000,
});

export const itemAna = (): S["PayrollItemView"] => ({
  itemId: IDF8.itemAna,
  employeeId: ID.emp1,
  grossSalary: 900000.5,
  foodAllowance: 0,
  transportAllowance: 0,
  vacationAllowance: 0,
  christmasAllowance: 0,
  netSalary: 700000.25,
  withholdingTax: 173000.25,
  socialSecurityContribution: 27000,
});

export const folha = (estado: string, itens: S["PayrollItemView"][], id: string = IDF8.rascunho, mes = 10): S["PayrollRunView"] => ({
  runId: id,
  year: 2026,
  month: mes,
  status: estado,
  approvalRequestId: estado === "Draft" ? null : IDF8.aprovacao,
  submittedAt: estado === "Draft" ? null : "2026-10-17T10:00:00+00:00",
  closedAt: estado === "Approved" || estado === "Refused" ? "2026-10-17T12:00:00+00:00" : null,
  items: itens,
});

export const folhas = (): S["PayrollRunView"][] => [folha("Draft", [itemCarlos()]), folha("Approved", [itemCarlos(), itemAna()], IDF8.aprovada, 9)];

export const recibos = (): S["PayrollItemDocumentView"][] => [
  { documentId: IDF8.recibo, category: "Recibo de vencimento", fileName: "recibo-carlos-09.pdf", contentType: "application/pdf", sizeInBytes: 50_000, attachedAt: "2026-10-17T12:30:00+00:00" },
];
