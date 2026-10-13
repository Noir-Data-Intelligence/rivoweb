import { lazy, Suspense, type ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RaizSessao } from "@/features/identity/components/RaizSessao";
import Entrar from "@/features/identity/pages/Entrar";
import { ErroDeRota, NaoEncontrado } from "@/features/sistema/paginas";
import { CarregandoPagina } from "@/ui/Layout";
import type { Requisito } from "@/lib/auth/permissions";
import { AreaAutenticada, Exige } from "./guardas";
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

const minhaConta = () => import("@/features/identity/pages/MinhaConta");
// Os shells (Radix, menus, tooltips) ficam fora do chunk inicial, que é só o login (§1.5).
const shells = () => import("./shells");
const inicio = () => import("@/features/inicio/paginas");

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
            element: preguicoso(() => shells().then((m) => ({ default: m.ShellColaborador }))),
            children: [
              { index: true, element: preguicoso(() => inicio().then((m) => ({ default: m.InicioColaborador }))) },
              { path: "conta", element: preguicoso(minhaConta) },
            ],
          },
          {
            path: "/cliente",
            element: preguicoso(() => shells().then((m) => ({ default: m.ShellCliente }))),
            children: [
              { index: true, element: preguicoso(() => inicio().then((m) => ({ default: m.InicioCliente }))) },
              { path: "conta", element: preguicoso(minhaConta) },
            ],
          },
          {
            path: "/",
            element: preguicoso(() => shells().then((m) => ({ default: m.ShellBackoffice }))),
            children: [
              { index: true, element: preguicoso(() => inicio().then((m) => ({ default: m.InicioBackoffice }))) },
              { path: "conta", element: preguicoso(minhaConta) },
              // F1 — administração de acesso e núcleo organizacional (§5.1, §5.2).
              { path: "utilizadores", element: protegido("identity.users.read", () => import("@/features/administracao/pages/Utilizadores")) },
              { path: "utilizadores/:userId", element: protegido("identity.users.read", () => import("@/features/administracao/pages/Utilizador")) },
              {
                path: "configuracoes",
                element: protegido(
                  { anyOf: ["fiscal.tax_entity.read", "identity.users.write", "approval.policies.read"] },
                  () => import("@/features/administracao/pages/Configuracoes"),
                ),
              },
              { path: "colaboradores", element: protegido("hr.employees.read", () => import("@/features/rh/pages/Colaboradores")) },
              { path: "colaboradores/:employeeId", element: protegido("hr.employees.read", () => import("@/features/rh/pages/Colaborador")) },
              { path: "departamentos", element: protegido("hr.departments.read", () => import("@/features/rh/pages/Departamentos")) },
              { path: "cargos", element: protegido("hr.positions.read", () => import("@/features/rh/pages/Cargos")) },
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
