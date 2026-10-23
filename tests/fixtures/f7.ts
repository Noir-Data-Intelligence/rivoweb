/** Fixtures da F7 (portal do colaborador), com a forma das respostas reais de `/portal/me/*`. */
import type { components } from "@/lib/api/schema";

type S = components["schemas"];

export const IDF7 = {
  marcacaoPresente: "00000000-0000-4000-8000-000000000701",
  marcacaoFalta: "00000000-0000-4000-8000-000000000702",
  ferias: "00000000-0000-4000-8000-000000000703",
  documento: "00000000-0000-4000-8000-000000000704",
  recibo: "00000000-0000-4000-8000-000000000705",
  folha: "00000000-0000-4000-8000-000000000706",
  anuncioFixo: "00000000-0000-4000-8000-000000000707",
  anuncio: "00000000-0000-4000-8000-000000000708",
  pedidoAberto: "00000000-0000-4000-8000-000000000709",
  pedidoFechado: "00000000-0000-4000-8000-000000000710",
  inscricao: "00000000-0000-4000-8000-000000000711",
  curso: "00000000-0000-4000-8000-000000000712",
  turno: "00000000-0000-4000-8000-000000000713",
  turnoTrocado: "00000000-0000-4000-8000-000000000714",
  troca: "00000000-0000-4000-8000-000000000715",
  modelo: "00000000-0000-4000-8000-000000000716",
  ciclo: "00000000-0000-4000-8000-000000000717",
  objectivo: "00000000-0000-4000-8000-000000000718",
  resultado: "00000000-0000-4000-8000-000000000719",
  objectivoFechado: "00000000-0000-4000-8000-000000000720",
  resultadoFechado: "00000000-0000-4000-8000-000000000721",
  conquista: "00000000-0000-4000-8000-000000000722",
  custodia: "00000000-0000-4000-8000-000000000723",
  activo: "00000000-0000-4000-8000-000000000724",
} as const;

export const marcacoes = (): S["OwnAttendanceRecord"][] => [
  { recordId: IDF7.marcacaoPresente, day: "2026-10-12", checkedInAt: "2026-10-12T07:58:00+00:00", checkedOutAt: "2026-10-12T16:31:00+00:00", status: "Present", justification: null, observedHours: 8.55 },
  { recordId: IDF7.marcacaoFalta, day: "2026-10-09", checkedInAt: null, checkedOutAt: null, status: "Absent", justification: null, observedHours: null },
];

export const pedidosFerias = (estado = "Pending"): S["OwnLeaveRequest"][] => [
  { leaveId: IDF7.ferias, type: "Annual", startsOn: "2026-11-22", endsOn: "2026-12-01", calendarDays: 10, status: estado, reason: "Férias de fim de ano.", approvalRequestId: "00000000-0000-4000-8000-000000000799" },
];

export const saldos = (): S["OwnLeaveBalance"][] => [{ year: 2026, type: "Annual", entitled: 22.0, carriedOver: 3.0, taken: 0, pending: 10, remaining: 25.0, configured: true }];

export const documentos = (): S["OwnEmployeeDocument"][] => [
  { documentId: IDF7.documento, category: "Contrato", fileName: "contrato-2026.pdf", contentType: "application/pdf", sizeInBytes: 182_400, attachedAt: "2026-10-13T17:54:38+00:00" },
];

export const recibos = (): S["OwnPayslip"][] => [
  {
    itemId: IDF7.recibo,
    runId: IDF7.folha,
    year: 2026,
    month: 9,
    grossSalary: 470000.0,
    foodAllowance: 35000.0,
    transportAllowance: 30000.0,
    vacationAllowance: 0,
    christmasAllowance: 0,
    netSalary: 388429.0,
    withholdingTax: 67471.0,
    socialSecurityContribution: 14100.0,
    documentId: null,
  },
];

export const anuncios = (): S["OwnAnnouncement"][] => [
  { announcementId: IDF7.anuncio, title: "Manutenção dos servidores", body: "Sábado, das 8h às 12h.", pinned: false, publishedAt: "2026-10-10T08:00:00+00:00", expiresAt: null },
  { announcementId: IDF7.anuncioFixo, title: "Jantar de fim de ano", body: "Dia 19 de Dezembro, no Talatona.", pinned: true, publishedAt: "2026-10-09T17:48:05+00:00", expiresAt: "2026-11-06T17:48:05+00:00" },
];

export const pedidosInternos = (): S["OwnTicket"][] => [
  {
    ticketId: IDF7.pedidoAberto,
    subject: "Monitor adicional",
    category: "It",
    priority: "Normal",
    status: "InProgress",
    openedAt: "2026-10-13T17:48:39+00:00",
    resolvedAt: null,
    messages: [
      { messageId: "00000000-0000-4000-8000-000000000731", fromMe: true, body: "Pedia um segundo monitor para o posto de trabalho.", sentAt: "2026-10-13T17:48:39+00:00" },
      { messageId: "00000000-0000-4000-8000-000000000732", fromMe: false, body: "Chega na próxima semana.", sentAt: "2026-10-14T09:00:00+00:00" },
    ],
  },
  {
    ticketId: IDF7.pedidoFechado,
    subject: "Declaração para o banco",
    category: "DocumentRequest",
    priority: "Low",
    status: "Closed",
    openedAt: "2026-09-01T10:00:00+00:00",
    resolvedAt: "2026-09-02T10:00:00+00:00",
    messages: [{ messageId: "00000000-0000-4000-8000-000000000733", fromMe: true, body: "Preciso de uma declaração.", sentAt: "2026-09-01T10:00:00+00:00" }],
  },
];

export const formacao = (): S["OwnTraining"][] => [
  {
    enrolmentId: IDF7.inscricao,
    courseId: IDF7.curso,
    title: "Atendimento ao cliente",
    provider: "Centro de Formação Kwanza",
    startsOn: "2026-05-18",
    endsOn: "2026-05-19",
    hours: 16.0,
    status: "Completed",
    completedOn: "2026-05-19",
    score: 17.5,
    certificateNumber: "CFK-2026-118",
    certificateExpiresOn: "2028-05-19",
  },
];

/** Turnos a partir de uma data base (hoje, no teste), para o «próximo turno». */
export const turnos = (hoje: string, amanha: string): S["OwnShift"][] => [
  { assignmentId: IDF7.turno, day: hoje, shiftCode: "M", shiftName: "Manhã", startsAt: "06:00:00", endsAt: "14:00:00", notes: null },
  { assignmentId: IDF7.turnoTrocado, day: amanha, shiftCode: "T", shiftName: "Tarde", startsAt: "14:00:00", endsAt: "22:00:00", notes: "Cobertura do armazém" },
];

export const trocas = (amanha: string, estado = "Pending"): S["OwnShiftChange"][] => [
  { requestId: IDF7.troca, assignmentId: IDF7.turnoTrocado, day: amanha, proposedEmployeeId: null, reason: "Consulta médica.", status: estado, requestedAt: "2026-10-14T12:00:00+00:00", decisionNotes: null },
];

export const modelos = (): S["OwnDeclarationTemplate"][] => [{ templateId: IDF7.modelo, name: "Declaração de vínculo", title: "DECLARAÇÃO" }];

export const objectivos = (): S["OwnObjective"][] => [
  {
    objectiveId: IDF7.objectivo,
    cycleId: IDF7.ciclo,
    cycleName: "Avaliação 2026",
    cycleStatus: "Active",
    title: "Concluir a certificação profissional",
    description: null,
    weight: 50,
    progress: 35.0,
    keyResults: [{ keyResultId: IDF7.resultado, title: "Grau de cumprimento", unit: "%", startValue: 0, targetValue: 100.0, currentValue: 35.0, progress: 35.0 }],
  },
  {
    objectiveId: IDF7.objectivoFechado,
    cycleId: "00000000-0000-4000-8000-000000000725",
    cycleName: "Avaliação 2025",
    cycleStatus: "Closed",
    title: "Reduzir o tempo de resposta",
    description: "Pedidos de suporte.",
    weight: 30,
    progress: 100.0,
    keyResults: [{ keyResultId: IDF7.resultadoFechado, title: "Horas até à primeira resposta", unit: "h", startValue: 8, targetValue: 2, currentValue: 2, progress: 100 }],
  },
];

export const conquistas = (): S["OwnAchievement"][] => [{ achievementId: IDF7.conquista, code: "PONTUAL", name: "Pontualidade exemplar", icon: null, points: 50, awardedAt: "2026-09-30T10:00:00+00:00", note: "Três meses sem atrasos." }];

export const bens = (): S["OwnAssetInCustody"][] => [{ custodyId: IDF7.custodia, assetId: IDF7.activo, assetCode: "AF-0018", assetName: "Portátil HP EliteBook", assignedOn: "2026-09-01", conditionOnAssign: "Novo" }];

export const beneficios = (): S["OwnBenefit"][] => [
  { enrolmentId: "00000000-0000-4000-8000-000000000741", benefitId: "00000000-0000-4000-8000-000000000742", name: "Seguro de saúde", kind: "Health", monthlyValue: 15000, currency: "AOA", description: "Cobertura do próprio e do agregado.", startsOn: "2026-01-01", cancelledOn: null, status: "Active" },
  { enrolmentId: "00000000-0000-4000-8000-000000000743", benefitId: "00000000-0000-4000-8000-000000000744", name: "Subsídio de transporte", kind: "Transport", monthlyValue: "8000.00", currency: "AOA", description: null, startsOn: "2025-03-01", cancelledOn: "2025-12-31", status: "Cancelled" },
];

export const contratos = (): S["OwnEmploymentContract"][] => [
  { contractId: "00000000-0000-4000-8000-000000000745", type: "Permanent", startsOn: "2026-01-01", endsOn: null, monthlySalary: 350000, currency: "AOA", status: "Active" },
  { contractId: "00000000-0000-4000-8000-000000000746", type: "FixedTerm", startsOn: "2025-01-01", endsOn: "2025-12-31", monthlySalary: "280000.00", currency: "AOA", status: "Terminated" },
];

/** O BI caducou em 2025; morada e contacto de emergência por preencher. */
export const dadosPessoais = (): S["OwnPersonalData"] => ({
  email: "colaborador@teste.local",
  phone: "+244 923 000 000",
  gender: "Feminino",
  birthDate: "1990-04-12",
  nationality: "Angolana",
  maritalStatus: null,
  taxId: "000111222LA033",
  identityDocumentNumber: "000111222LA033",
  identityDocumentExpiresOn: "2025-06-30",
  socialSecurityNumber: null,
  addressDetail: null,
  city: "Luanda",
  country: "AO",
  bankName: "Banco Teste",
  bankAccountNumber: "123456789",
  iban: "AO06004000000123456789012",
  emergencyContactName: null,
  emergencyContactRelationship: null,
  emergencyContactPhone: null,
  updatedAt: "2026-10-20T09:30:00Z",
});
