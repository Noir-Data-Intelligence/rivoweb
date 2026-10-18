/** F10 (2.º bloco) — o lado da equipa: comprovativos, conversas, base de conhecimento, portal na ficha do cliente e arquivo. */
import type { components } from "../../src/lib/api/schema";
import { ID } from "./f1";
import { IDF3 } from "./f3";
import { meAdminF9 } from "./f9";
import { meRhF7 } from "./f7b";

type S = components["schemas"];

export const IDF10B = {
  pendente: "00000000-0000-4000-8000-000000000a01",
  rejeitado: "00000000-0000-4000-8000-000000000a02",
  factura: "00000000-0000-4000-8000-000000000a11",
  recibo: "00000000-0000-4000-8000-000000000a21",
  ticket: "00000000-0000-4000-8000-000000000a31",
  conversa: "00000000-0000-4000-8000-000000000a32",
  rascunho: "00000000-0000-4000-8000-000000000a41",
  publicado: "00000000-0000-4000-8000-000000000a42",
  arquivado: "00000000-0000-4000-8000-000000000a43",
  novo: "00000000-0000-4000-8000-000000000a44",
  contaCliente: "00000000-0000-4000-8000-000000000a51",
  contaAntiga: "00000000-0000-4000-8000-000000000a52",
  partilha: "00000000-0000-4000-8000-000000000a61",
  revogada: "00000000-0000-4000-8000-000000000a62",
  documento: "00000000-0000-4000-8000-000000000a71",
  carregado: "00000000-0000-4000-8000-000000000a72",
};

const MSG = ["messaging.conversations.read", "messaging.conversations.write", "messaging.knowledge_base.write"];

export const meAdminF10: S["CurrentUserResponse"] = {
  ...meAdminF9,
  permissions: [...new Set([...meAdminF9.permissions, ...MSG, "documents.read", "documents.write", "identity.users.read", "commercial.customers.read", "commercial.customers.write"])],
};

/** Como em produção (2026-10-18): confirma comprovativos e carrega ficheiros; não lê clientes, conversas nem o arquivo. */
export const meFinancasF10: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000007",
  email: "financas@teste.local",
  displayName: "Finanças Teste",
  roles: ["Finance"],
  permissions: ["finance.invoices.read", "finance.invoices.cancel", "finance.receipts.read", "finance.receipts.write", "documents.write"],
};

/** Como em produção depois do B33: clientes, conversas, artigos e `documents.write`; lê comprovativos sem os decidir. */
export const meVendasF10: S["CurrentUserResponse"] = {
  userId: "00000000-0000-4000-8000-000000000006",
  email: "vendas@teste.local",
  displayName: "Vendas Teste",
  roles: ["Sales"],
  permissions: ["commercial.customers.read", "commercial.customers.write", "finance.invoices.read", "finance.receipts.read", "documents.write", ...MSG],
};

export const meRhF10: S["CurrentUserResponse"] = { ...meRhF7, permissions: [...meRhF7.permissions, "documents.read", "documents.write"] };

export const filaComprovativos = (): S["PaymentClaimReviewView"][] => [
  {
    id: IDF10B.pendente,
    salesInvoiceId: IDF10B.factura,
    invoiceNumber: "FT 2026/57",
    customerId: IDF3.cliente,
    customerName: "Cliente Teste, Lda",
    amount: 500000,
    currency: "AOA",
    paidOn: "2026-10-15",
    status: "Pending",
    rejectionReason: null,
    submittedAt: "2026-10-15T16:20:00Z",
    notes: '<img src=x onerror="alert(1)"> Transferência do BAI.',
    fileName: "transferencia.pdf",
  },
  {
    id: IDF10B.rejeitado,
    salesInvoiceId: IDF10B.factura,
    invoiceNumber: "FT 2026/57",
    customerId: IDF3.cliente,
    customerName: "Cliente Teste, Lda",
    amount: 120000.5,
    currency: "USD",
    paidOn: "2026-10-01",
    status: "Rejected",
    rejectionReason: "O valor não entrou na conta.",
    submittedAt: "2026-10-01T09:00:00Z",
    notes: null,
    fileName: "talao.jpg",
  },
];

export const conversasEquipa = (): S["ConversationSummaryView"][] => [
  { conversationId: IDF10B.ticket, customerId: IDF3.cliente, customerName: "Cliente Teste, Lda", assignedToEmployeeId: null, kind: "Ticket", subject: "Factura em duplicado", status: "Open", openedAt: "2026-10-16T08:00:00Z", messageCount: 2 },
  { conversationId: IDF10B.conversa, customerId: IDF3.cliente, customerName: "Cliente Teste, Lda", assignedToEmployeeId: null, kind: "Message", subject: null, status: "Open", openedAt: "2026-10-17T10:00:00Z", messageCount: 1 },
];

export const ticketEquipa = (estado: "Open" | "Closed" = "Open"): S["ConversationView"] => ({
  conversationId: IDF10B.ticket,
  kind: "Ticket",
  subject: "Factura em duplicado",
  status: estado,
  openedAt: "2026-10-16T08:00:00Z",
  closedAt: estado === "Closed" ? "2026-10-17T12:00:00Z" : null,
  messages: [
    { messageId: "t1", sender: "Customer", senderUserId: IDF10B.contaCliente, body: "Recebi a FT 2026/57 duas vezes.\n<script>alert(1)</script>", sentAt: "2026-10-16T08:00:00Z" },
    { messageId: "t2", sender: "Employee", senderUserId: meVendasF10.userId, body: "Vamos verificar.", sentAt: "2026-10-16T09:00:00Z" },
  ],
});

const artigoBase = (id: string, titulo: string, estado: string, extra: Partial<S["KnowledgeArticleView"]> = {}): S["KnowledgeArticleView"] => ({
  articleId: id,
  title: titulo,
  slug: titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  body: "Texto do artigo.",
  category: "Pagamentos",
  audience: "Customers",
  status: estado,
  views: 0,
  helpfulVotes: 0,
  notHelpfulVotes: 0,
  createdAt: "2026-10-01T10:00:00Z",
  publishedAt: null,
  ...extra,
});

export const artigosEquipa = (): S["KnowledgeArticleView"][] => [
  artigoBase(IDF10B.publicado, "Como enviar um comprovativo", "Published", {
    body: "Abra Pagamentos.\nEscolha a factura.\n<img src=x onerror=alert(1)>",
    views: 42,
    helpfulVotes: 7,
    notHelpfulVotes: 1,
    publishedAt: "2026-10-02T09:00:00Z",
  }),
  artigoBase(IDF10B.rascunho, "Prazos de pagamento", "Draft", { category: "Facturação", audience: "Internal" }),
  artigoBase(IDF10B.arquivado, "Tabela antiga", "Archived", { category: null }),
];

export const historicoConta = (ligada = true): S["CustomerAccountLinkView"][] => [
  { userId: IDF10B.contaAntiga, linkedOn: "2026-02-01T10:00:00Z", linkedByUserId: null, unlinkedOn: "2026-03-01T10:00:00Z", unlinkedByUserId: null },
  ...(ligada ? [{ userId: IDF10B.contaCliente, linkedOn: "2026-04-01T10:00:00Z", linkedByUserId: null, unlinkedOn: null, unlinkedByUserId: null }] : []),
];

export const candidatas = (): S["CustomerAccountCandidate"][] => [{ userId: IDF10B.contaCliente, email: "compras@cliente.ao" }];

export const partilhas = (): S["SharedDocumentView"][] => [
  { shareId: IDF10B.partilha, documentId: IDF10B.documento, title: "Contrato 2026", category: "Contratos", fileName: "contrato-2026.pdf", sharedAt: "2026-10-05T14:00:00Z", active: true },
  { shareId: IDF10B.revogada, documentId: IDF10B.documento, title: "Proposta antiga", category: null, fileName: "proposta.pdf", sharedAt: "2026-05-05T14:00:00Z", active: false },
];

export const arquivo = (): S["DocumentDescriptor"][] => [
  { documentId: IDF10B.documento, fileName: "contrato-2026.pdf", contentType: "application/pdf", sizeInBytes: 245760, category: "Partilhado com cliente", contentHash: "ab", uploadedBy: ID.user1, uploadedAt: "2026-10-05T13:59:00Z" },
  { documentId: IDF10B.carregado, fileName: "transferencia.pdf", contentType: "application/pdf", sizeInBytes: 102400, category: "Comprovativo de pagamento", contentHash: "cd", uploadedBy: null, uploadedAt: "2026-10-15T16:19:00Z" },
];
