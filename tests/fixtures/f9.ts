/** Fixtures da F9 (compras), com a forma das respostas reais de `/procurement/*`. Dados de teste. */
import type { components } from "@/lib/api/schema";
import { ID } from "./f1";
import { IDF5, meAdminF5, meGestorF5 } from "./f5";
import { meAdmin } from "./identidade";

type S = components["schemas"];

const COMPRAS = ["procurement.requisitions.read", "procurement.requisitions.write", "procurement.orders.read", "procurement.orders.write", "procurement.receipts.read", "procurement.receipts.write"];

export const meAdminF9: S["CurrentUserResponse"] = { ...meAdminF5, permissions: [...new Set([...meAdminF5.permissions, ...COMPRAS, "approval.requests.read"])] };
/** O Manager de produção: requisições e ordens, lê as recepções; não lê os RH. */
export const meGestorF9: S["CurrentUserResponse"] = {
  ...meGestorF5,
  permissions: [...new Set([...meGestorF5.permissions.filter((p) => !p.startsWith("hr.")), "procurement.requisitions.read", "procurement.requisitions.write", "procurement.orders.read", "procurement.orders.write", "procurement.receipts.read"])],
};
/** O AssetManager de produção: vê as ordens e regista recepções; não vê requisições nem os RH. */
export const meActivosF9: S["CurrentUserResponse"] = {
  ...meAdmin,
  userId: "00000000-0000-4000-8000-000000000009",
  email: "activos@teste.local",
  displayName: "Activos Teste",
  roles: ["AssetManager"],
  permissions: ["procurement.orders.read", "procurement.receipts.read", "procurement.receipts.write", "procurement.suppliers.read"],
};

export const IDF9 = {
  rascunho: "00000000-0000-4000-8000-000000000a01",
  aprovada: "00000000-0000-4000-8000-000000000a02",
  ordem: "00000000-0000-4000-8000-000000000a03",
  linhaPapel: "00000000-0000-4000-8000-000000000a04",
  linhaToner: "00000000-0000-4000-8000-000000000a05",
  recepcao: "00000000-0000-4000-8000-000000000a06",
  aprovacao: "00000000-0000-4000-8000-000000000a07",
} as const;

export const requisicao = (estado = "Draft", id: string = IDF9.rascunho): S["RequisitionView"] => ({
  requisitionId: id,
  requestedByEmployeeId: ID.emp2,
  departmentId: ID.dep1,
  justification: "Material de escritório do trimestre",
  currency: "AOA",
  estimatedTotal: 125000,
  requestedOn: "2026-10-10",
  status: estado,
  approvalRequestId: estado === "Draft" ? null : IDF9.aprovacao,
  submittedAt: estado === "Draft" ? null : "2026-10-11T09:00:00+00:00",
  closedAt: estado === "Approved" || estado === "Refused" || estado === "Cancelled" ? "2026-10-12T09:00:00+00:00" : null,
  closingReason: estado === "Refused" ? "Fora do orçamento." : null,
  lines: [
    { lineId: "00000000-0000-4000-8000-000000000a08", description: "Papel A4", quantity: 10, estimatedUnitPrice: 2500, estimatedTotal: 25000 },
    { lineId: "00000000-0000-4000-8000-000000000a09", description: "Toner", quantity: 2, estimatedUnitPrice: 50000, estimatedTotal: 100000 },
  ],
});

export const ordem = (recebidoPapel = 0, estado = "Issued"): S["PurchaseOrderView"] => ({
  purchaseOrderId: IDF9.ordem,
  requisitionId: IDF9.aprovada,
  supplierId: IDF5.fornecedor,
  supplierName: "Fornecedor Teste",
  currency: "AOA",
  total: 120000,
  issuedOn: "2026-10-13",
  expectedOn: "2026-10-20",
  status: estado,
  cancellationReason: estado === "Cancelled" ? "Fornecedor sem stock." : null,
  fullyReceived: false,
  lines: [
    { lineId: IDF9.linhaPapel, description: "Papel A4", quantity: 10, unitPrice: 2000, lineTotal: 20000, quantityReceived: recebidoPapel },
    { lineId: IDF9.linhaToner, description: "Toner", quantity: 2, unitPrice: 50000, lineTotal: 100000, quantityReceived: 0 },
  ],
});

export const recepcoes = (): S["GoodsReceiptView"][] => [
  { goodsReceiptId: IDF9.recepcao, purchaseOrderId: IDF9.ordem, receivedOn: "2026-10-15", receivedByEmployeeId: ID.emp1, deliveryNote: "GR 123", status: "Registered", cancellationReason: null, lines: [{ lineId: "x", purchaseOrderLineId: IDF9.linhaPapel, quantityReceived: 4 }] },
];

export const fornecedoresActivos = (): S["SupplierReference"][] => [{ supplierId: IDF5.fornecedor, name: "Fornecedor Teste", taxId: "5000000000", iban: null, status: "Active" }];
