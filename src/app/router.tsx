import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RaizSessao } from "@/features/identity/components/RaizSessao";
import Entrar from "@/features/identity/pages/Entrar";
import { ErroDeRota, NaoEncontrado } from "@/features/sistema/paginas";
import { CarregandoPagina } from "@/ui/Layout";
import type { Requisito } from "@/lib/auth/permissions";
import { AreaAutenticada, Exige } from "./guardas";
import { REQUISITO_NOVA_FACTURA, REQUISITO_NOVO_ARTIGO, REQUISITO_NOVO_LANCAMENTO, REQUISITO_PAGINA as R } from "./requisitos";
import type { NomePagina } from "./paginas";
import { registarRotas } from "./rotasConhecidas";

function preguicoso(carregar: () => Promise<{ default: ComponentType }>) {
  const C = lazy(carregar);
  return (
    <Suspense fallback={<CarregandoPagina />}>
      <C />
    </Suspense>
  );
}

/** Página do backoffice atrás da guarda de permissão (§3.2). O backend decide sempre. */
function protegido(requer: Requisito, carregar: () => Promise<{ default: ComponentType }>) {
  return <Exige requer={requer}>{preguicoso(carregar)}</Exige>;
}

/**
 * Página da área autenticada, carregada por nome a partir de `paginas.ts`
 * (diferido). Os shells (Radix, menus, tooltips) ficam também fora do chunk
 * inicial, que é só o login (§1.5).
 */
const pagina = (nome: NomePagina) => () => import("./paginas").then((m) => m.PAGINAS[nome]());

/**
 * Prefixos por shell (§1.5): backoffice em `/`, colaborador em `/eu`, cliente
 * em `/cliente`. `/convite` e `/recuperar` vêm do backend e não mudam sem
 * coordenação.
 */
export const rotas: RouteObject[] = [
  {
    element: <RaizSessao />,
    errorElement: <ErroDeRota />,
    children: [
      { path: "/entrar", element: <Entrar /> },
      { path: "/convite", element: preguicoso(() => import("@/features/identity/pages/Convite")) },
      { path: "/recuperar", element: preguicoso(() => import("@/features/identity/pages/Recuperar")) },
      { path: "/recuperar-password", element: preguicoso(() => import("@/features/identity/pages/RecuperarPassword")) },
      {
        element: <AreaAutenticada />,
        children: [
          {
            path: "/eu",
            element: preguicoso(pagina("shellColaborador")),
            children: [
              { index: true, element: preguicoso(pagina("inicioColaborador")) },
              { path: "despesas", element: preguicoso(pagina("minhasDespesas")) },
              // F7 — portal do colaborador (§5.8): o próprio, pelo token.
              { path: "assiduidade", element: preguicoso(pagina("minhaAssiduidade")) },
              { path: "ferias", element: preguicoso(pagina("minhasFerias")) },
              { path: "turnos", element: preguicoso(pagina("meusTurnos")) },
              { path: "recibos", element: preguicoso(pagina("meusRecibos")) },
              { path: "documentos", element: preguicoso(pagina("meusDocumentos")) },
              { path: "pedidos", element: preguicoso(pagina("meusPedidos")) },
              { path: "pedidos/:ticketId", element: preguicoso(pagina("meuPedido")) },
              { path: "formacao", element: preguicoso(pagina("minhaFormacao")) },
              { path: "objectivos", element: preguicoso(pagina("meusObjectivos")) },
              { path: "anuncios", element: preguicoso(pagina("anuncios")) },
              { path: "bens", element: preguicoso(pagina("meusBens")) },
              { path: "conta", element: preguicoso(pagina("minhaConta")) },
              { path: "notificacoes", element: preguicoso(pagina("notificacoes")) },
            ],
          },
          {
            path: "/cliente",
            element: preguicoso(pagina("shellCliente")),
            children: [
              { index: true, element: preguicoso(pagina("inicioCliente")) },
              // F10 — portal do cliente (§5.11).
              { path: "extracto", element: preguicoso(pagina("extractoCliente")) },
              { path: "pagamentos", element: preguicoso(pagina("pagamentosCliente")) },
              { path: "documentos", element: preguicoso(pagina("documentosCliente")) },
              { path: "mensagens", element: preguicoso(pagina("mensagensCliente")) },
              { path: "suporte", element: preguicoso(pagina("suporteCliente")) },
              { path: "suporte/:conversationId", element: preguicoso(pagina("pedidoSuporteCliente")) },
              { path: "ajuda", element: preguicoso(pagina("ajudaCliente")) },
              { path: "ajuda/:slug", element: preguicoso(pagina("artigoAjudaCliente")) },
              { path: "conta", element: preguicoso(pagina("minhaConta")) },
              { path: "notificacoes", element: preguicoso(pagina("notificacoes")) },
            ],
          },
          {
            path: "/",
            element: preguicoso(pagina("shellBackoffice")),
            children: [
              // F2 — o painel pessoal é a entrada do backoffice (§5.3).
              { index: true, element: preguicoso(pagina("painel")) },
              { path: "conta", element: preguicoso(pagina("minhaConta")) },
              { path: "notificacoes", element: preguicoso(pagina("notificacoes")) },
              { path: "dashboard", element: protegido(R["/dashboard"], pagina("executivo")) },
              { path: "alertas", element: protegido(R["/alertas"], pagina("alertas")) },
              // F1 — administração de acesso e núcleo organizacional (§5.1, §5.2).
              { path: "utilizadores", element: protegido(R["/utilizadores"], pagina("utilizadores")) },
              { path: "utilizadores/:userId", element: protegido(R["/utilizadores"], pagina("utilizador")) },
              { path: "configuracoes", element: protegido(R["/configuracoes"], pagina("configuracoes")) },
              { path: "colaboradores", element: protegido(R["/colaboradores"], pagina("colaboradores")) },
              { path: "colaboradores/:employeeId", element: protegido(R["/colaboradores"], pagina("colaborador")) },
              { path: "departamentos", element: protegido(R["/departamentos"], pagina("departamentos")) },
              { path: "cargos", element: protegido(R["/cargos"], pagina("cargos")) },
              // F3 — clientes e facturação (§5.4).
              { path: "clientes", element: protegido(R["/clientes"], pagina("clientes")) },
              { path: "clientes/:customerId", element: protegido(R["/clientes"], pagina("cliente")) },
              { path: "facturas", element: protegido(R["/facturas"], pagina("facturas")) },
              { path: "facturas/rascunhos/novo", element: protegido(REQUISITO_NOVA_FACTURA, pagina("rascunho")) },
              { path: "facturas/rascunhos/:draftId", element: protegido(REQUISITO_NOVA_FACTURA, pagina("rascunho")) },
              { path: "facturas/:invoiceId", element: protegido(R["/facturas"], pagina("factura")) },
              { path: "proformas", element: protegido(R["/proformas"], pagina("proformas")) },
              { path: "proformas/nova", element: protegido(REQUISITO_NOVA_FACTURA, pagina("novaProforma")) },
              { path: "notas-credito", element: protegido(R["/notas-credito"], pagina("notasCredito")) },
              { path: "notas-credito/:creditNoteId", element: protegido(R["/notas-credito"], pagina("notaCredito")) },
              { path: "recibos", element: protegido(R["/recibos"], pagina("recibos")) },
              { path: "recibos/:receiptId", element: protegido(R["/recibos"], pagina("recibo")) },
              { path: "comprovativos", element: protegido(R["/comprovativos"], pagina("comprovativos")) },
              // F10 — apoio ao cliente e arquivo (§5.13).
              { path: "conversas", element: protegido(R["/conversas"], pagina("conversas")) },
              { path: "conversas/:conversationId", element: protegido(R["/conversas"], pagina("conversa")) },
              { path: "base-conhecimento", element: protegido(R["/base-conhecimento"], pagina("baseConhecimento")) },
              { path: "base-conhecimento/novo", element: protegido(REQUISITO_NOVO_ARTIGO, pagina("novoArtigo")) },
              { path: "base-conhecimento/:articleId", element: protegido(R["/base-conhecimento"], pagina("artigoBase")) },
              { path: "documentos", element: protegido(R["/documentos"], pagina("arquivo")) },
              // F11 — CRM (§5.12).
              { path: "leads", element: protegido(R["/leads"], pagina("leads")) },
              { path: "leads/:leadId", element: protegido(R["/leads"], pagina("lead")) },
              { path: "oportunidades", element: protegido(R["/oportunidades"], pagina("oportunidades")) },
              { path: "oportunidades/:opportunityId", element: protegido(R["/oportunidades"], pagina("oportunidade")) },
              { path: "actividades", element: protegido(R["/actividades"], pagina("actividades")) },
              { path: "relatorio-comercial", element: protegido(R["/relatorio-comercial"], pagina("relatorioComercial")) },
              { path: "tipos-servico", element: protegido(R["/tipos-servico"], pagina("tiposServico")) },
              { path: "propostas", element: protegido(R["/propostas"], pagina("propostas")) },
              { path: "propostas/:proposalId", element: protegido(R["/propostas"], pagina("proposta")) },
              { path: "modelos-proposta", element: protegido(R["/modelos-proposta"], pagina("modelosProposta")) },
              { path: "contratos-clientes", element: protegido(R["/contratos-clientes"], pagina("contratosClientes")) },
              { path: "contratos-clientes/:contractId", element: protegido(R["/contratos-clientes"], pagina("contratoCliente")) },
              { path: "cobrancas", element: protegido(R["/cobrancas"], pagina("cobrancas")) },
              { path: "a-receber", element: protegido(R["/a-receber"], pagina("aReceber")) },
              { path: "facturacao", element: protegido(R["/facturacao"], pagina("configuracaoFacturacao")) },
              // F4 — aprovações (§5.5).
              { path: "aprovacoes", element: protegido(R["/aprovacoes"], pagina("aprovacoes")) },
              { path: "aprovacoes/:requestId", element: protegido(R["/aprovacoes"], pagina("pedidoAprovacao")) },
              { path: "politicas-aprovacao", element: protegido(R["/politicas-aprovacao"], pagina("politicas")) },
              // F5 — contas a pagar, despesas e tesouraria (§5.6).
              { path: "fornecedores", element: protegido(R["/fornecedores"], pagina("fornecedores")) },
              { path: "fornecedores/:supplierId", element: protegido(R["/fornecedores"], pagina("fornecedor")) },
              { path: "facturas-compra", element: protegido(R["/facturas-compra"], pagina("facturasCompra")) },
              { path: "facturas-compra/:purchaseInvoiceId", element: protegido(R["/facturas-compra"], pagina("facturaCompra")) },
              { path: "pedidos-pagamento", element: protegido(R["/pedidos-pagamento"], pagina("pedidosPagamento")) },
              { path: "pedidos-pagamento/:paymentRequestId", element: protegido(R["/pedidos-pagamento"], pagina("pedidoPagamento")) },
              { path: "despesas", element: protegido(R["/despesas"], pagina("despesas")) },
              { path: "despesas/:expenseId", element: protegido(R["/despesas"], pagina("despesa")) },
              { path: "contas", element: protegido(R["/contas"], pagina("contas")) },
              { path: "contas/:accountId", element: protegido(R["/contas"], pagina("conta")) },
              { path: "caixa-pequena", element: protegido(R["/caixa-pequena"], pagina("caixaPequena")) },
              { path: "caixa-pequena/:fundId", element: protegido(R["/caixa-pequena"], pagina("fundoCaixa")) },
              { path: "letras", element: protegido(R["/letras"], pagina("letras")) },
              { path: "letras/:billId", element: protegido(R["/letras"], pagina("letra")) },
              { path: "cambios", element: protegido(R["/cambios"], pagina("cambios")) },
              { path: "fluxo-caixa", element: protegido(R["/fluxo-caixa"], pagina("fluxoCaixa")) },
              // F6 — fiscal, contabilidade e planeamento (§5.7).
              { path: "fiscal", element: protegido(R["/fiscal"], pagina("fiscal")) },
              { path: "relatorios", element: protegido(R["/relatorios"], pagina("relatorios")) },
              { path: "impostos", element: protegido(R["/impostos"], pagina("impostos")) },
              { path: "lancamentos", element: protegido(R["/lancamentos"], pagina("lancamentos")) },
              { path: "lancamentos/novo", element: protegido(REQUISITO_NOVO_LANCAMENTO, pagina("novoLancamento")) },
              { path: "lancamentos/:entryId", element: protegido(R["/lancamentos"], pagina("lancamento")) },
              { path: "plano-contas", element: protegido(R["/plano-contas"], pagina("planoContas")) },
              { path: "periodos", element: protegido(R["/periodos"], pagina("periodos")) },
              { path: "regras-contabilisticas", element: protegido(R["/regras-contabilisticas"], pagina("regras")) },
              { path: "centros-custo", element: protegido(R["/centros-custo"], pagina("centrosCusto")) },
              { path: "orcamentos", element: protegido(R["/orcamentos"], pagina("orcamentos")) },
              { path: "previsoes-custos", element: protegido(R["/previsoes-custos"], pagina("previsoesCustos")) },
              // F7b — RH do dia-a-dia (§5.8).
              { path: "organograma", element: protegido(R["/organograma"], pagina("organograma")) },
              { path: "contratos", element: protegido(R["/contratos"], pagina("contratos")) },
              { path: "assiduidade", element: protegido(R["/assiduidade"], pagina("assiduidade")) },
              { path: "ferias", element: protegido(R["/ferias"], pagina("ferias")) },
              { path: "beneficios", element: protegido(R["/beneficios"], pagina("beneficios")) },
              { path: "imigracao", element: protegido(R["/imigracao"], pagina("imigracao")) },
              { path: "recrutamento", element: protegido(R["/recrutamento"], pagina("recrutamento")) },
              { path: "recrutamento/:openingId", element: protegido(R["/recrutamento"], pagina("vaga")) },
              { path: "entradas-saidas", element: protegido(R["/entradas-saidas"], pagina("entradasSaidas")) },
              { path: "anuncios", element: protegido(R["/anuncios"], pagina("anunciosGestao")) },
              { path: "pedidos-internos", element: protegido(R["/pedidos-internos"], pagina("pedidosInternos")) },
              { path: "pedidos-internos/:ticketId", element: protegido(R["/pedidos-internos"], pagina("pedidoInterno")) },
              { path: "formacao", element: protegido(R["/formacao"], pagina("formacao")) },
              { path: "formacao/:courseId", element: protegido(R["/formacao"], pagina("curso")) },
              { path: "turnos", element: protegido(R["/turnos"], pagina("turnosGestao")) },
              { path: "declaracoes", element: protegido(R["/declaracoes"], pagina("declaracoes")) },
              { path: "desempenho", element: protegido(R["/desempenho"], pagina("desempenho")) },
              { path: "conquistas", element: protegido(R["/conquistas"], pagina("conquistas")) },
              { path: "salarios", element: protegido(R["/salarios"], pagina("folhas")) },
              { path: "salarios/:runId", element: protegido(R["/salarios"], pagina("folha")) },
              { path: "requisicoes", element: protegido(R["/requisicoes"], pagina("requisicoes")) },
              { path: "requisicoes/:requisitionId", element: protegido(R["/requisicoes"], pagina("requisicao")) },
              { path: "encomendas", element: protegido(R["/encomendas"], pagina("ordens")) },
              { path: "encomendas/:purchaseOrderId", element: protegido(R["/encomendas"], pagina("ordem")) },
              { path: "recepcoes", element: protegido(R["/recepcoes"], pagina("recepcoes")) },
              { path: "artigos", element: protegido(R["/artigos"], pagina("artigos")) },
              { path: "artigos/:itemId", element: protegido(R["/artigos"], pagina("artigo")) },
              { path: "armazens", element: protegido(R["/armazens"], pagina("armazens")) },
              { path: "contagens", element: protegido(R["/contagens"], pagina("contagens")) },
              { path: "contagens/:countId", element: protegido(R["/contagens"], pagina("contagem")) },
              { path: "valorizacao", element: protegido(R["/valorizacao"], pagina("valorizacao")) },
              { path: "activos", element: protegido(R["/activos"], pagina("activos")) },
              { path: "activos/:assetId", element: protegido(R["/activos"], pagina("activo")) },
            ],
          },
        ],
      },
      { path: "*", element: <NaoEncontrado /> },
    ],
  },
];

registarRotas(rotas);

export const router = createBrowserRouter(rotas);
