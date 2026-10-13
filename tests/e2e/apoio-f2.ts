/** API simulada da F2, partilhada pelo spec e pelas capturas. */
import { utilizadores } from "../fixtures/f1";
import { eventos, kpisCompletos, meAdminF2, meuPainel, notificacoes, regras, visaoExecutiva } from "../fixtures/f2";
import type { ApiSimulada } from "./apoio";

const paginaDe = <T,>(itens: T[], total = itens.length) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(total) } });

export function comF2(api: ApiSimulada, me = meAdminF2): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/dashboard/me", { status: 200, corpo: meuPainel() })
    .em("GET", "/dashboard/kpis", { status: 200, corpo: kpisCompletos() })
    .em("GET", "/dashboard/overview", { status: 200, corpo: visaoExecutiva() })
    .em("GET", "/identity/users", { status: 200, corpo: utilizadores() })
    .em("GET", "/notifications/me", (route) => {
      const q = new URL(route.request().url()).searchParams;
      const lista = q.get("unreadOnly") === "true" ? notificacoes().filter((n) => !n.read) : notificacoes();
      return paginaDe(q.get("pageSize") === "1" ? lista.slice(0, 1) : lista, lista.length);
    })
    .em("GET", "/notifications/me/preferences", { status: 200, corpo: { emailEnabled: true, inAppAlwaysOn: true, alwaysByEmail: ["UserInvited", "PasswordRecovery"] } })
    .em("GET", "/alerts/rules", { status: 200, corpo: regras() })
    .em("GET", "/alerts/events", { status: 200, corpo: eventos() });
}

