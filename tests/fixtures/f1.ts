/**
 * Fixtures da F1 — SÓ em tests/ (§8.2). Tipadas contra schema.d.ts.
 * Os nomes e e-mails são de teste (domínio .local), nunca dados reais.
 */
import type { components } from "../../src/lib/api/schema";
import { meAdmin } from "./identidade";

type S = components["schemas"];

const PERMS_ADMIN = [
  "identity.users.read",
  "identity.users.write",
  "identity.roles.read",
  "identity.roles.assign",
  "approval.policies.read",
  "fiscal.tax_entity.read",
  "fiscal.tax_entity.write",
  "hr.employees.read",
  "hr.employees.write",
  "hr.employees.link_account",
  "hr.departments.read",
  "hr.departments.write",
  "hr.positions.read",
  "hr.positions.write",
  "hr.positions.assign",
];

export const meAdminF1: S["CurrentUserResponse"] = { ...meAdmin, permissions: PERMS_ADMIN };

export const meSuperAdminF1: S["CurrentUserResponse"] = {
  ...meAdmin,
  userId: "00000000-0000-4000-8000-000000000009",
  email: "super@teste.local",
  roles: ["SuperAdmin"],
  permissions: [...PERMS_ADMIN, "hr.positions.assign_direct"],
};

/** Recursos Humanos: gere fichas, departamentos e cargos, mas não contas nem ligações. */
export const meRh: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000004",
  email: "rh@teste.local",
  displayName: "RH Teste",
  roles: ["HR"],
  permissions: ["hr.employees.read", "hr.employees.write", "hr.departments.read", "hr.departments.write", "hr.positions.read", "hr.positions.assign"],
};

export const ID = {
  superUser: "00000000-0000-4000-8000-000000000020",
  user1: "00000000-0000-4000-8000-000000000021",
  user2: "00000000-0000-4000-8000-000000000022",
  dep1: "00000000-0000-4000-8000-000000000030",
  cargoAprovador: "00000000-0000-4000-8000-000000000040",
  cargoSimples: "00000000-0000-4000-8000-000000000041",
  emp1: "00000000-0000-4000-8000-000000000050",
  emp2: "00000000-0000-4000-8000-000000000051",
  atribuicao: "00000000-0000-4000-8000-000000000060",
};

export const utilizadores = (): S["UserSummary"][] => [
  { userId: meAdmin.userId, email: meAdmin.email, isActive: true, roles: ["Admin"] },
  { userId: ID.superUser, email: "bootstrap@teste.local", isActive: true, roles: ["SuperAdmin"] },
  { userId: ID.user1, email: "ana@teste.local", isActive: true, roles: ["HR", "Colaborador"] },
  { userId: ID.user2, email: "bruno@teste.local", isActive: false, roles: [] },
];

export const perfis = (): S["AccessProfileView"][] => [
  { name: "Admin", permissions: PERMS_ADMIN },
  { name: "HR", permissions: meRh.permissions },
  { name: "Colaborador", permissions: ["documents.write"] },
];

export const governacao = (): S["AdministrationOverview"] => ({
  accessProfiles: perfis(),
  approvalRulesByModule: [
    {
      module: "hr",
      rules: [{ policyId: "00000000-0000-4000-8000-000000000070", processType: "hr.position_assignment", isActive: true, stepCount: 1, requiresBudgetCheck: false }],
    },
  ],
});

export const departamentos = (): S["DepartmentView"][] => [{ departmentId: ID.dep1, name: "Operações", managerId: ID.emp1 }];

export const cargos = (): S["PositionView"][] => [
  { positionId: ID.cargoAprovador, name: "Director", hierarchyLevel: 1, grantsApprovalAuthority: true },
  { positionId: ID.cargoSimples, name: "Técnico", hierarchyLevel: 5, grantsApprovalAuthority: false },
];

export const colaboradores = (): S["EmployeeView"][] => [
  {
    employeeId: ID.emp1,
    fullName: "Ana Teste",
    status: "Active",
    departmentId: ID.dep1,
    userId: ID.user1,
    hiredOn: "2026-01-05T00:00:00+01:00",
    email: "ana@teste.local",
    phone: null,
    employeeCode: "001",
  },
  {
    employeeId: ID.emp2,
    fullName: "Carlos Teste",
    status: "Active",
    departmentId: null,
    userId: null,
    hiredOn: "2026-03-01T00:00:00+01:00",
    email: null,
    phone: null,
    employeeCode: null,
  },
];

export const fichaCarlos = (): S["EmployeeDetailView"] => ({
  employeeId: ID.emp2,
  fullName: "Carlos Teste",
  status: "Active",
  departmentId: null,
  currentPosition: null,
  userId: null,
  email: null,
  phone: null,
  employeeCode: null,
});

export const ocupacoesDirector = (): S["PositionAssignmentView"][] => [
  { assignmentId: ID.atribuicao, employeeId: ID.emp1, effectiveFrom: "2026-02-01T00:00:00+01:00", effectiveTo: null, status: "Effective" },
];

export const dadosEmpresa = (): S["TaxEntityProfileView"] => ({
  companyName: "Empresa Teste, Lda",
  businessName: null,
  taxRegistrationNumber: "5000000000",
  addressDetail: "Rua de Teste, 1",
  city: "Luanda",
  postalCode: null,
  country: "AO",
  email: null,
  phone: null,
  softwareValidationNumber: null,
});
