/** F12 (3.º bloco) — frota: viaturas, manutenção, atribuições, viagens, despesas, documentos e seguros. */
import type { components } from "../../src/lib/api/schema";
import { ID } from "./f1";
import { meActivosF9 } from "./f9";
import { meAdminF12 } from "./f12";

type S = components["schemas"];

export const IDF12F = {
  viatura: "00000000-0000-4000-8000-000000000f01",
  inactiva: "00000000-0000-4000-8000-000000000f02",
  manutencao: "00000000-0000-4000-8000-000000000f11",
  atribuicao: "00000000-0000-4000-8000-000000000f21",
  plano: "00000000-0000-4000-8000-000000000f31",
  documento: "00000000-0000-4000-8000-000000000f41",
  apolice: "00000000-0000-4000-8000-000000000f51",
  sinistro: "00000000-0000-4000-8000-000000000f61",
};

/** O AssetManager de produção: frota e activos, sem RH nem arquivo. */
export const meFrota: S["CurrentUserResponse"] = { ...meActivosF9, permissions: [...meActivosF9.permissions, "fleet.vehicles.read", "fleet.vehicles.write", "alerts.alerts.read"] };

export const meAdminFrota: S["CurrentUserResponse"] = { ...meAdminF12, permissions: [...new Set([...meAdminF12.permissions, "fleet.vehicles.read", "fleet.vehicles.write"])] };

export const viatura = (): S["VehicleView"] => ({
  vehicleId: IDF12F.viatura,
  plateNumber: "LD-12-34-AB",
  model: "Toyota Hilux <b>4x4</b>",
  status: "Active",
  maintenances: [{ maintenanceId: IDF12F.manutencao, type: "Preventive", description: "Revisão dos 10 000 km", startedOn: "2026-02-01", endedOn: "2026-02-03", cost: 85000 }],
  assignments: [{ assignmentId: IDF12F.atribuicao, employeeId: ID.emp1, startedOn: "2026-01-10", endedOn: null }],
  plans: [
    { planId: IDF12F.plano, description: "Mudança de óleo", intervalDays: 90, nextDueOn: "2026-03-01", isActive: true, isOverdue: true },
    { planId: "p2", description: "Pneus", intervalDays: 365, nextDueOn: "2026-02-01", isActive: false, isOverdue: false },
  ],
  trips: [{ tripId: "v1", driverId: ID.emp1, startedOn: "2026-02-10", endedOn: "2026-02-10", startOdometer: 12000, endOdometer: 12140.5, distance: 140.5, purpose: "Visita ao cliente" }],
  expenses: [
    { expenseId: "d1", category: "Fuel", amount: 45000, occurredOn: "2026-02-10", description: "Gasóleo" },
    { expenseId: "d2", category: "Toll", amount: 1500.5, occurredOn: "2026-02-10", description: null },
  ],
});

export const viaturas = (): S["VehicleView"][] => [viatura(), { ...viatura(), vehicleId: IDF12F.inactiva, plateNumber: "LD-99-00-ZZ", model: "Renault Kangoo", status: "Inactive", assignments: [], plans: [] }];

export const documentosViatura = (): S["VehicleDocumentView"][] => [{ documentId: IDF12F.documento, category: "Livrete", fileName: "livrete.pdf", contentType: "application/pdf", sizeInBytes: 20480, attachedAt: "2026-01-10T10:00:00Z" }];

export const planosPrevistos = (): S["DueMaintenancePlanView"][] => [{ vehicleId: IDF12F.viatura, plateNumber: "LD-12-34-AB", planId: IDF12F.plano, description: "Mudança de óleo", nextDueOn: "2026-03-01", isOverdue: true }];

export const apolices = (): S["InsurancePolicyView"][] => [
  {
    policyId: IDF12F.apolice,
    vehicleId: IDF12F.viatura,
    plateNumber: "LD-12-34-AB",
    insurer: "ENSA",
    policyNumber: "AUTO-2026-001",
    coverage: "Danos próprios",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    premium: 250000,
    currency: "AOA",
    insuredValue: 18000000,
    notes: null,
    status: "Active",
    daysToExpiry: 70,
    openClaims: 1,
  },
];

export const sinistros = (): S["InsuranceClaimView"][] => [
  { claimId: IDF12F.sinistro, policyId: IDF12F.apolice, occurredOn: "2026-03-05", description: "Toque no pára-choques.\n<script>x</script>", claimedAmount: 80000, settledAmount: null, reference: "SIN-77", status: "Open", closedOn: null },
];
