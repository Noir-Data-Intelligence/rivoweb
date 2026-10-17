/** Fixtures da F9 (compras), com a forma das respostas reais de `/procurement/*`. Dados de teste. */
import type { components } from "@/lib/api/schema";
import { ID } from "./f1";
import { IDF5, meAdminF5, meGestorF5 } from "./f5";
import { meAdmin } from "./identidade";

type S = components["schemas"];

const COMPRAS = ["procurement.requisitions.read", "procurement.requisitions.write", "procurement.orders.read", "procurement.orders.write", "procurement.receipts.read", "procurement.receipts.write"];

export const meAdminF9: S["CurrentUserResponse"] = { ...meAdminF5, permissions: [...new Set([...meAdminF5.permissions, ...COMPRAS, "approval.requests.read", "inventory.items.read", "inventory.items.write", "finance.assets.read", "finance.assets.write"])] };
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
  permissions: ["procurement.orders.read", "procurement.receipts.read", "procurement.receipts.write", "procurement.suppliers.read", "inventory.items.read", "inventory.items.write", "finance.assets.read", "finance.assets.write"],
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
  requestedByName: "Carlos Teste",
  departmentId: ID.dep1,
  departmentName: "Operações",
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
    { lineId: "00000000-0000-4000-8000-000000000a08", position: 1, description: "Papel A4", quantity: 10, estimatedUnitPrice: 2500, estimatedTotal: 25000 },
    { lineId: "00000000-0000-4000-8000-000000000a09", position: 2, description: "Toner", quantity: 2, estimatedUnitPrice: 50000, estimatedTotal: 100000 },
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
    { lineId: IDF9.linhaPapel, position: 1, description: "Papel A4", quantity: 10, unitPrice: 2000, lineTotal: 20000, quantityReceived: recebidoPapel },
    { lineId: IDF9.linhaToner, position: 2, description: "Toner", quantity: 2, unitPrice: 50000, lineTotal: 100000, quantityReceived: 0 },
  ],
});

export const recepcoes = (): S["GoodsReceiptView"][] => [
  { goodsReceiptId: IDF9.recepcao, purchaseOrderId: IDF9.ordem, receivedOn: "2026-10-15", receivedByEmployeeId: ID.emp1, receivedByName: "Ana Teste", deliveryNote: "GR 123", status: "Registered", cancellationReason: null, lines: [{ lineId: "x", purchaseOrderLineId: IDF9.linhaPapel, quantityReceived: 4 }] },
];

export const fornecedoresActivos = (): S["SupplierReference"][] => [{ supplierId: IDF5.fornecedor, name: "Fornecedor Teste", taxId: "5000000000", iban: null, status: "Active" }];

// --- Bloco 2: inventário

export const IDF9B = {
  papel: "00000000-0000-4000-8000-000000000b01",
  inactivo: "00000000-0000-4000-8000-000000000b02",
  central: "00000000-0000-4000-8000-000000000b03",
  loja: "00000000-0000-4000-8000-000000000b04",
  fechado: "00000000-0000-4000-8000-000000000b05",
  contagem: "00000000-0000-4000-8000-000000000b06",
} as const;

export const armazens = (): S["WarehouseView"][] => [
  { warehouseId: IDF9B.central, code: "CEN", name: "Central", status: "Active" },
  { warehouseId: IDF9B.loja, code: "LOJ", name: "Loja", status: "Active" },
  { warehouseId: IDF9B.fechado, code: "ANT", name: "Antigo", status: "Inactive" },
];

export const artigo = (emMaoCentral = 10): S["InventoryItemView"] => ({
  itemId: IDF9B.papel,
  sku: "PAP-A4",
  name: "Papel A4",
  unit: "resma",
  quantityOnHand: emMaoCentral + 2,
  averageCost: 2500.5,
  totalValue: (emMaoCentral + 2) * 2500.5,
  status: "Active",
  quantitiesByWarehouse: [
    { warehouseId: IDF9B.central, quantityOnHand: emMaoCentral, value: emMaoCentral * 2500.5 },
    { warehouseId: IDF9B.loja, quantityOnHand: 2, value: 5001 },
  ],
  movements: [
    { movementId: "00000000-0000-4000-8000-000000000b07", type: "Receipt", warehouseId: IDF9B.central, relatedWarehouseId: null, quantity: 12, unitCost: 2500.5, value: 30006, reason: null, occurredOn: "2026-10-01", recordedAt: "2026-10-01T09:00:00+00:00" },
    { movementId: "00000000-0000-4000-8000-000000000b08", type: "TransferOut", warehouseId: IDF9B.central, relatedWarehouseId: IDF9B.loja, quantity: 2, unitCost: 2500.5, value: 5001, reason: "Reposição", occurredOn: "2026-10-05", recordedAt: "2026-10-05T09:00:00+00:00" },
  ],
});

export const artigos = (): S["InventoryItemView"][] => [
  artigo(),
  { ...artigo(), itemId: IDF9B.inactivo, sku: "TON-01", name: "Toner antigo", unit: "un", quantityOnHand: 0, averageCost: 0, totalValue: 0, status: "Inactive", quantitiesByWarehouse: [], movements: [] },
];

export const contagem = (estado = "Open", contados = true): S["InventoryCountView"] => ({
  countId: IDF9B.contagem,
  warehouseId: IDF9B.central,
  occurredOn: "2026-10-17",
  status: estado,
  cancellationReason: null,
  lines: contados ? [{ lineId: "00000000-0000-4000-8000-000000000b09", itemId: IDF9B.papel, expectedQuantity: 10, countedQuantity: 9, variance: -1 }] : [],
});

/** `/procurement/lookups` (B29). */
export const escolhasCompras = (): S["ProcurementLookups"] => ({ departments: [{ id: ID.dep1, name: "Operações" }] });

// --- Bloco 3: activos fixos

export const IDF9C = {
  portatil: "00000000-0000-4000-8000-000000000c01",
  abatido: "00000000-0000-4000-8000-000000000c02",
  manutencao: "00000000-0000-4000-8000-000000000c03",
  custodia: "00000000-0000-4000-8000-000000000c04",
  apolice: "00000000-0000-4000-8000-000000000c05",
} as const;

export const activo = (amortizado = false): S["FixedAssetView"] => ({
  assetId: IDF9C.portatil,
  code: "AF-001",
  name: "Portátil Dell",
  category: "Equipamento informático",
  location: "Sede",
  serialNumber: "SN123",
  costCentreId: null,
  supplierId: null,
  purchaseInvoiceId: null,
  acquiredOn: "2026-03-10",
  depreciationStartsOn: "2026-03-01",
  acquisitionCost: 850000,
  residualValue: 50000,
  currency: "AOA",
  method: "StraightLine",
  usefulLifeMonths: 36,
  annualRate: null,
  totalUnits: null,
  accumulatedDepreciation: amortizado ? 22222.22 : 0,
  netBookValue: amortizado ? 827777.78 : 850000,
  status: "Active",
  disposedOn: null,
  disposalValue: null,
  disposalReason: null,
});

export const activos = (): S["FixedAssetView"][] => [
  activo(true),
  { ...activo(true), assetId: IDF9C.abatido, code: "AF-002", name: "Cadeira antiga", category: "Mobiliário", status: "Disposed", disposedOn: "2026-09-30", disposalValue: 5000, disposalReason: "Partida" },
];

export const fichaActivo = (amortizado = true): S["FixedAssetDetailView"] => ({
  asset: activo(amortizado),
  schedule: [
    { month: "2026-03-01", amount: 22222.22, accumulatedAfter: 22222.22, netBookValueAfter: 827777.78, recorded: amortizado, unitsUsed: null },
    { month: "2026-04-01", amount: 22222.22, accumulatedAfter: 44444.44, netBookValueAfter: 805555.56, recorded: false, unitsUsed: null },
  ],
  maintenance: [{ maintenanceId: IDF9C.manutencao, assetId: IDF9C.portatil, kind: "Preventive", description: "Limpeza interna", scheduledOn: "2026-11-05", completedOn: null, cost: null, provider: "TecLuanda", notes: null, status: "Scheduled" }],
});

export const custodias = (aberta = true): S["AssetCustodyView"][] => [
  { custodyId: IDF9C.custodia, assetId: IDF9C.portatil, assetCode: "AF-001", assetName: "Portátil Dell", employeeId: ID.emp2, employeeName: "Carlos Teste", assignedOn: "2026-03-15", conditionOnAssign: "Novo", returnedOn: aberta ? null : "2026-10-17", conditionOnReturn: null, notes: null, open: aberta },
];

export const apolices = (): S["AssetInsuranceView"][] => [
  { policyId: IDF9C.apolice, assetId: IDF9C.portatil, insurer: "ENSA", policyNumber: "AP-77", coverage: "Danos e roubo", startsOn: "2026-01-01", endsOn: "2026-12-31", premium: 45000, insuredValue: 850000, currency: "AOA", cancelled: false, active: true, daysToExpiry: 75 },
];
