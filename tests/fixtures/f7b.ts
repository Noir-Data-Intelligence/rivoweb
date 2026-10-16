/** Fixtures da F7b (RH do dia-a-dia), com a forma das respostas reais de `/hr/*`. Dados de teste. */
import type { components } from "@/lib/api/schema";
import { ID } from "./f1";
import { meAdmin } from "./identidade";

type S = components["schemas"];

/** O perfil HR de produção (`/identity/me`, 2026-10-16), mais o arquivo de documentos. */
export const meRhF7: S["CurrentUserResponse"] = {
  ...meAdmin,
  userId: "00000000-0000-4000-8000-000000000004",
  email: "rh@teste.local",
  displayName: "RH Teste",
  roles: ["HR"],
  permissions: [
    "hr.achievements.write", "hr.announcements.write", "hr.attendance.read", "hr.attendance.write", "hr.benefits.read", "hr.benefits.write",
    "hr.contracts.read", "hr.contracts.write", "hr.declarations.write", "hr.departments.read", "hr.departments.write", "hr.employees.read",
    "hr.employees.write", "hr.leave.read", "hr.leave.write", "hr.lifecycle.read", "hr.lifecycle.write", "hr.performance.read", "hr.performance.write",
    "hr.personal_data.read", "hr.personal_data.write", "hr.positions.assign", "hr.positions.read", "hr.recruitment.read", "hr.recruitment.write",
    "hr.shifts.read", "hr.shifts.write", "hr.tickets.read", "hr.tickets.write", "hr.training.read", "hr.training.write", "documents.read", "documents.write",
  ],
};

/** Só lê colaboradores: a ficha mostra o resumo e os documentos, sem os outros separadores. */
export const meLeitorRh: S["CurrentUserResponse"] = { ...meRhF7, permissions: ["hr.employees.read", "hr.departments.read"] };

export const IDF7B = {
  contrato: "00000000-0000-4000-8000-000000000801",
  marcacao: "00000000-0000-4000-8000-000000000802",
  falta: "00000000-0000-4000-8000-000000000803",
  ausencia: "00000000-0000-4000-8000-000000000804",
  aprovacao: "00000000-0000-4000-8000-000000000805",
  beneficio: "00000000-0000-4000-8000-000000000806",
  beneficioAntigo: "00000000-0000-4000-8000-000000000807",
  adesao: "00000000-0000-4000-8000-000000000808",
  documento: "00000000-0000-4000-8000-000000000809",
  novoDocumento: "00000000-0000-4000-8000-000000000810",
} as const;

export const organograma = (): S["OrgChart"] => ({
  asOf: "2026-10-16T09:00:00+00:00",
  headcount: 2,
  departments: [
    {
      departmentId: ID.dep1,
      name: "Operações",
      managerEmployeeId: ID.emp1,
      managerName: "Ana Teste",
      members: [
        { employeeId: ID.emp1, fullName: "Ana Teste", employeeCode: "001", positionId: ID.cargoAprovador, positionName: "Directora", hierarchyLevel: 1, isManager: true },
      ],
    },
    { departmentId: null, name: "Sem departamento", managerEmployeeId: null, managerName: null, members: [{ employeeId: ID.emp2, fullName: "Carlos Teste", employeeCode: null, positionId: null, positionName: null, hierarchyLevel: null, isManager: false }] },
  ],
});

export const contratos = (): S["EmploymentContractView"][] => [
  { contractId: IDF7B.contrato, employeeId: ID.emp2, type: "FixedTerm", startsOn: "2026-03-01", endsOn: "2027-02-28", monthlySalary: 450000.0, currency: "AOA", status: "Active", notes: null },
];

export const marcacoes = (): S["AttendanceView"][] => [
  { recordId: IDF7B.marcacao, employeeId: ID.emp1, day: "2026-10-15", checkedInAt: "2026-10-15T07:55:00+00:00", checkedOutAt: "2026-10-15T16:10:00+00:00", status: "Present", justification: null, observedHours: 8.25 },
  { recordId: IDF7B.falta, employeeId: ID.emp2, day: "2026-10-14", checkedInAt: null, checkedOutAt: null, status: "Absent", justification: null, observedHours: null },
];

export const ausencias = (estado = "Pending"): S["LeaveView"][] => [
  { leaveId: IDF7B.ausencia, employeeId: ID.emp2, type: "Annual", startsOn: "2026-12-01", endsOn: "2026-12-05", calendarDays: 5, status: estado, reason: "Viagem", approvalRequestId: IDF7B.aprovacao },
];

export const saldos = (): S["LeaveBalanceView"][] => [
  { employeeId: ID.emp1, employeeName: "Ana Teste", year: 2026, type: "Annual", entitled: 22, carriedOver: 2, taken: 11, pending: 0, remaining: 13, configured: true },
  { employeeId: ID.emp2, employeeName: "Carlos Teste", year: 2026, type: "Annual", entitled: 0, carriedOver: 0, taken: 0, pending: 5, remaining: 0, configured: false },
];

export const beneficios = (): S["BenefitView"][] => [
  { benefitId: IDF7B.beneficio, name: "Seguro de saúde", kind: "saude", monthlyValue: 25000, currency: "AOA", description: "Plano familiar.", isActive: true },
  { benefitId: IDF7B.beneficioAntigo, name: "Ginásio", kind: "bem-estar", monthlyValue: 0, currency: "AOA", description: null, isActive: false },
];

export const adesoes = (): S["BenefitEnrolmentView"][] => [{ enrolmentId: IDF7B.adesao, employeeId: ID.emp2, benefitId: IDF7B.beneficio, startsOn: "2026-03-01", cancelledOn: null, status: "Active" }];

export const dadosPessoais = (): S["PersonalDataView"] => ({
  employeeId: ID.emp2,
  gender: "Masculino",
  birthDate: "1990-05-01",
  nationality: "Angolana",
  maritalStatus: "Solteiro",
  taxId: "004812345LA041",
  identityDocumentNumber: "004812345LA041",
  identityDocumentExpiresOn: "2030-01-01",
  socialSecurityNumber: "1234567890",
  addressDetail: "Rua do Teste, 1",
  city: "Luanda",
  country: "AO",
  bankName: "Banco de Teste",
  bankAccountNumber: "000123456789",
  iban: "AO06004000001234567890123",
  emergencyContactName: "Maria Teste",
  emergencyContactRelationship: "Mãe",
  emergencyContactPhone: "+244 900 000 000",
  updatedAt: "2026-10-01T10:00:00+00:00",
});

export const imigracao = (dias: number | null = 20): S["ImmigrationView"] => ({
  employeeId: ID.emp2,
  employeeName: "Carlos Teste",
  nationality: "Portuguesa",
  passportNumber: "CB123456",
  passportIssuingCountry: "PT",
  passportExpiresOn: "2026-11-05",
  visaType: "Trabalho",
  visaNumber: "V998877",
  visaExpiresOn: "2027-06-30",
  workPermitNumber: null,
  workPermitAuthority: null,
  workPermitExpiresOn: null,
  notes: null,
  nextExpiry: dias === null ? null : "2026-11-05",
  daysToNextExpiry: dias,
  updatedAt: "2026-10-01T10:00:00+00:00",
});

export const documentosFicha = (): S["EmployeeDocumentView"][] => [
  { documentId: IDF7B.documento, category: "Contrato", fileName: "contrato-carlos.pdf", contentType: "application/pdf", sizeInBytes: 120_000, attachedAt: "2026-03-01T10:00:00+00:00" },
];
