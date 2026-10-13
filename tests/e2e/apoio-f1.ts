/** API simulada da F1, partilhada pelo spec e pelas capturas. */
import {
  cargos,
  colaboradores,
  dadosEmpresa,
  departamentos,
  fichaCarlos,
  governacao,
  ID,
  meAdminF1,
  ocupacoesDirector,
  perfis,
  utilizadores,
} from "../fixtures/f1";
import type { ApiSimulada } from "./apoio";

export const pagina = <T,>(itens: T[], total = itens.length) => ({
  status: 200,
  corpo: itens,
  cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(total) },
});

export function comF1(api: ApiSimulada, me = meAdminF1): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/identity/users", { status: 200, corpo: utilizadores() })
    .em("GET", "/identity/roles", { status: 200, corpo: perfis() })
    .em("GET", "/settings/overview", { status: 200, corpo: governacao() })
    .em("GET", "/fiscal/tax-entity", { status: 200, corpo: dadosEmpresa() })
    .em("GET", "/hr/departments", pagina(departamentos()))
    .em("GET", "/hr/positions", pagina(cargos()))
    .em("GET", "/hr/employees", pagina(colaboradores()))
    .em("GET", `/hr/employees/${ID.emp2}`, { status: 200, corpo: fichaCarlos(), cabecalhos: { ETag: '"3"' } })
    .em("GET", `/hr/employees/${ID.emp2}/account-history`, { status: 200, corpo: [] })
    .em("GET", `/hr/positions/${ID.cargoAprovador}/assignments`, { status: 200, corpo: ocupacoesDirector() });
}

