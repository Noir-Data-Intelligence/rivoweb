/**
 * Fixtures de teste — SÓ em tests/ (§8.2). Tipadas contra schema.d.ts: quando
 * o contrato muda, os testes deixam de compilar.
 */
import type { components } from "../../src/lib/api/schema";

type S = components["schemas"];

export const loginOk = (inactividadeSegundos = 900, validadeMs = 12 * 3600_000): S["LoginResponse"] => ({
  accessToken: "token-de-teste",
  expiresAt: new Date(Date.now() + validadeMs).toISOString(),
  idleTimeoutSeconds: inactividadeSegundos,
});

export const meAdmin: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000001",
  email: "admin@teste.local",
  displayName: "Administração Teste",
  roles: ["Admin"],
  permissions: ["identity.users.read", "identity.users.write"],
};

export const meSuperAdmin: S["CurrentUserResponse"] = { ...meAdmin, roles: ["SuperAdmin"] };

export const meColaborador: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000002",
  email: "colaborador@teste.local",
  displayName: "Colaborador Teste",
  roles: ["Colaborador"],
  permissions: [],
};

export const meCliente: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000003",
  email: "cliente@teste.local",
  displayName: "Cliente Teste",
  roles: ["Cliente"],
  permissions: ["documents.write"],
};

export const fichaColaborador: S["MyProfileView"] = {
  employeeId: "00000000-0000-4000-8000-000000000010",
  displayName: "Colaborador Teste",
  status: "Active",
  departmentId: null,
  currentPosition: { name: "Técnico", grantsApprovalAuthority: false },
};

export const sessoes = (): S["SessionView"][] => [
  {
    sessionId: "00000000-0000-4000-8000-000000000100",
    ipAddress: "10.0.0.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0",
    createdAt: "2026-10-12T08:00:00Z",
    expiresAt: "2026-10-12T20:00:00Z",
    revokedAt: null,
    lastSeenAt: "2026-10-12T09:00:00Z",
    effectiveExpiry: "2026-10-12T09:30:00Z",
    isActive: true,
    isCurrent: true,
  },
  {
    sessionId: "00000000-0000-4000-8000-000000000101",
    ipAddress: "10.0.0.2",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1",
    createdAt: "2026-10-11T08:00:00Z",
    expiresAt: "2026-10-11T20:00:00Z",
    revokedAt: null,
    lastSeenAt: "2026-10-11T09:00:00Z",
    effectiveExpiry: "2026-10-11T09:30:00Z",
    isActive: true,
    isCurrent: false,
  },
];
