import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RaizSessao } from "@/features/identity/components/RaizSessao";
import Entrar from "@/features/identity/pages/Entrar";
import { ErroDeRota, NaoEncontrado } from "@/features/sistema/paginas";
import { CarregandoPagina } from "@/ui/Layout";
import type { Requisito } from "@/lib/auth/permissions";
import { AreaAutenticada, Exige } from "./guardas";
import { REQUISITO_NOVA_FACTURA, REQUISITO_PAGINA as R } from "./requisitos";
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
              { path: "conta", element: preguicoso(pagina("minhaConta")) },
              { path: "notificacoes", element: preguicoso(pagina("notificacoes")) },
            ],
          },
          {
            path: "/cliente",
            element: preguicoso(pagina("shellCliente")),
            children: [
              { index: true, element: preguicoso(pagina("inicioCliente")) },
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
              { path: "a-receber", element: protegido(R["/a-receber"], pagina("aReceber")) },
              { path: "facturacao", element: protegido(R["/facturacao"], pagina("configuracaoFacturacao")) },
              // F4 — aprovações (§5.5).
              { path: "aprovacoes", element: protegido(R["/aprovacoes"], pagina("aprovacoes")) },
              { path: "aprovacoes/:requestId", element: protegido(R["/aprovacoes"], pagina("pedidoAprovacao")) },
              { path: "politicas-aprovacao", element: protegido(R["/politicas-aprovacao"], pagina("politicas")) },
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
