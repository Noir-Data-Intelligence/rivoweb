/** Fixtures da F10 (portal do cliente), com a forma das respostas reais de `/customer-portal/*`. Dados de teste. */
import type { components } from "@/lib/api/schema";
import { meCliente } from "./identidade";

type S = components["schemas"];

export { meCliente };

export const IDF10 = {
  cliente: "00000000-0000-4000-8000-000000000f01",
  factura1: "00000000-0000-4000-8000-000000000f11",
  factura2: "00000000-0000-4000-8000-000000000f12",
  anulada: "00000000-0000-4000-8000-000000000f13",
  comprovativo1: "00000000-0000-4000-8000-000000000f21",
  comprovativo2: "00000000-0000-4000-8000-000000000f22",
  documento: "00000000-0000-4000-8000-000000000f31",
  ficheiro: "00000000-0000-4000-8000-000000000f32",
  partilha: "00000000-0000-4000-8000-000000000f41",
  conversaAberta: "00000000-0000-4000-8000-000000000f51",
  conversaFechada: "00000000-0000-4000-8000-000000000f52",
  ticketAberto: "00000000-0000-4000-8000-000000000f61",
  ticketFechado: "00000000-0000-4000-8000-000000000f62",
  ticketAvaliado: "00000000-0000-4000-8000-000000000f63",
  artigo: "00000000-0000-4000-8000-000000000f71",
  equipa: "00000000-0000-4000-8000-000000000f81",
};

export const resumo = (de = "2026-10-01", ate = "2026-10-17"): S["MyOverviewView"] => ({
  customerId: IDF10.cliente,
  customerName: "Cliente Teste, Lda",
  from: de,
  to: ate,
  currency: "AOA",
  netRevenue: 438596.49,
  outstanding: 1250000.5,
  invoices: [
    { invoiceId: IDF10.factura1, number: "FT 2026/41", issuedOn: "2026-09-30", status: "Normal", currency: "AOA", grossTotal: 750000.5 },
    { invoiceId: IDF10.factura2, number: "FT 2026/57", issuedOn: "2026-10-10", status: "Normal", currency: "AOA", grossTotal: 500000 },
    { invoiceId: IDF10.anulada, number: "FT 2026/12", issuedOn: "2026-03-02", status: "Cancelled", currency: "AOA", grossTotal: 80000 },
  ],
});

export const extracto = (): S["CustomerStatementView"] => ({
  openingBalance: 0,
  lines: [
    { date: "2026-03-02", documentType: "Factura", documentNumber: "FT 2026/12", direction: "Debit", amount: 80000, balanceAfter: 80000 },
    { date: "2026-03-05", documentType: "NotaCredito", documentNumber: "NC 2026/3", direction: "Credit", amount: 80000, balanceAfter: 0 },
    { date: "2026-09-30", documentType: "Factura", documentNumber: "FT 2026/41", direction: "Debit", amount: 750000.5, balanceAfter: 750000.5 },
    { date: "2026-10-10", documentType: "Factura", documentNumber: "FT 2026/57", direction: "Debit", amount: 500000, balanceAfter: 1250000.5 },
  ],
  closingBalance: 1250000.5,
});

export const comprovativos = (): S["PaymentClaimView"][] => [
  { id: IDF10.comprovativo1, salesInvoiceId: IDF10.factura1, amount: 250000, paidOn: "2026-10-01", status: "Rejected", rejectionReason: "O valor não entrou na conta.", submittedAt: "2026-10-01T10:00:00Z" },
  { id: IDF10.comprovativo2, salesInvoiceId: IDF10.factura1, amount: 750000.5, paidOn: "2026-10-12", status: "Pending", rejectionReason: null, submittedAt: "2026-10-12T15:30:00Z" },
];

const msg = (id: string, sender: "Customer" | "Employee", body: string, sentAt: string): S["MessageView"] => ({ messageId: id, sender, senderUserId: sender === "Customer" ? meCliente.userId : IDF10.equipa, body, sentAt });

export const mensagens = (): S["ConversationView"][] => [
  {
    conversationId: IDF10.conversaFechada,
    kind: "Message",
    subject: null,
    status: "Closed",
    openedAt: "2026-08-01T09:00:00Z",
    closedAt: "2026-08-02T09:00:00Z",
    messages: [msg("m1", "Customer", "Bom dia, recebi a factura.", "2026-08-01T09:00:00Z"), msg("m2", "Employee", "Obrigado pela confirmação.", "2026-08-01T11:00:00Z")],
  },
  {
    conversationId: IDF10.conversaAberta,
    kind: "Message",
    subject: null,
    status: "Open",
    openedAt: "2026-10-15T08:00:00Z",
    closedAt: null,
    messages: [msg("m3", "Customer", "Podem enviar o extracto de Setembro?", "2026-10-15T08:00:00Z"), msg("m4", "Employee", "Já está nos documentos partilhados.", "2026-10-15T09:30:00Z")],
  },
];

export const tickets = (): S["ConversationView"][] => [
  {
    conversationId: IDF10.ticketAberto,
    kind: "Ticket",
    subject: "Factura FT 2026/57 com NIF errado",
    status: "Open",
    openedAt: "2026-10-16T10:00:00Z",
    closedAt: null,
    messages: [msg("t1", "Customer", "O NIF da factura não é o nosso.", "2026-10-16T10:00:00Z")],
    rating: null,
  },
  {
    conversationId: IDF10.ticketFechado,
    kind: "Ticket",
    subject: "Acesso ao portal",
    status: "Closed",
    openedAt: "2026-09-01T10:00:00Z",
    closedAt: "2026-09-02T10:00:00Z",
    messages: [msg("t2", "Customer", "Não consigo entrar.", "2026-09-01T10:00:00Z"), msg("t3", "Employee", "Já pode entrar.", "2026-09-01T12:00:00Z")],
    rating: null,
  },
  {
    conversationId: IDF10.ticketAvaliado,
    kind: "Ticket",
    subject: "Segunda via de recibo",
    status: "Closed",
    openedAt: "2026-07-01T10:00:00Z",
    closedAt: "2026-07-01T15:00:00Z",
    messages: [msg("t4", "Customer", "Preciso da segunda via.", "2026-07-01T10:00:00Z")],
    rating: { rating: 5, netPromoterScore: 9, comment: "Muito rápido.", ratedAt: "2026-07-02T08:00:00Z" },
  },
];

export const partilhados = (): S["CustomerDocumentShare"][] => [
  { shareId: IDF10.partilha, documentId: IDF10.documento, title: "Contrato de prestação de serviços", category: "Contratos", fileName: "contrato-2026.pdf", contentType: "application/pdf", sizeInBytes: 245760, sharedAt: "2026-10-05T14:00:00Z" },
];

export const ficheiros = (): S["DocumentDescriptor"][] => [
  { documentId: IDF10.ficheiro, fileName: "transferencia-outubro.pdf", contentType: "application/pdf", sizeInBytes: 102400, category: "Comprovativo de pagamento", contentHash: "ab12", uploadedBy: meCliente.userId, uploadedAt: "2026-10-12T15:29:00Z" },
];

export const artigos = (): S["KnowledgeArticleSummary"][] => [
  { articleId: IDF10.artigo, title: "Como enviar um comprovativo", slug: "como-enviar-um-comprovativo", category: "Pagamentos", views: 12, helpfulVotes: 4, publishedAt: "2026-09-01T10:00:00Z" },
  { articleId: "00000000-0000-4000-8000-000000000f72", title: "Alterar os dados de facturação", slug: "alterar-os-dados-de-facturacao", category: "Facturação", views: 3, helpfulVotes: 1, publishedAt: "2026-09-10T10:00:00Z" },
];

export const artigo = (body = "Abra Pagamentos e carregue o ficheiro.\nA equipa confirma em 2 dias úteis."): S["KnowledgeArticleView"] => ({
  articleId: IDF10.artigo,
  title: "Como enviar um comprovativo",
  slug: "como-enviar-um-comprovativo",
  body,
  category: "Pagamentos",
  audience: "Customers",
  status: "Published",
  views: 13,
  helpfulVotes: 4,
  notHelpfulVotes: 0,
  createdAt: "2026-08-30T10:00:00Z",
  publishedAt: "2026-09-01T10:00:00Z",
});
