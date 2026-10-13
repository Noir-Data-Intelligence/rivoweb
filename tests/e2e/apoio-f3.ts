/** API simulada da F3 (clientes e facturação). */
import { clientes, factura, fichaCliente, IDF3, meAdminF3, pautas, proforma, resumoFactura, saldo, series, vencidas } from "../fixtures/f3";
import type { ApiSimulada } from "./apoio";

const pag = <T,>(itens: T[]) => ({ status: 200, corpo: itens, cabecalhos: { "X-Page": "1", "X-Page-Size": "25", "X-Total-Count": String(itens.length) } });

export function comF3(api: ApiSimulada, me = meAdminF3): ApiSimulada {
  return api
    .comConta(me)
    .em("GET", "/commercial/customers", pag(clientes()))
    .em("GET", `/commercial/customers/${IDF3.cliente}`, { status: 200, corpo: fichaCliente(), cabecalhos: { ETag: '"2"' } })
    .em("GET", `/commercial/customers/${IDF3.cliente}/contacts`, { status: 200, corpo: [] })
    .em("GET", "/fiscal/tax-rates", pag(pautas()))
    .em("GET", "/finance/series", pag(series()))
    .em("GET", "/finance/payment-channels", { status: 200, corpo: [] })
    .em("GET", "/finance/invoice-drafts", { status: 200, corpo: [] })
    .em("GET", "/finance/sales-invoices", pag([resumoFactura()]))
    .em("GET", `/finance/sales-invoices/${IDF3.factura}`, { status: 200, corpo: factura() })
    .em("GET", `/finance/sales-invoices/${IDF3.factura}/balance`, { status: 200, corpo: saldo() })
    .em("GET", "/finance/credit-notes", pag([]))
    .em("GET", "/finance/receipts", pag([]))
    .em("GET", "/finance/proformas", { status: 200, corpo: [proforma()] })
    .em("GET", "/finance/receivables/overdue", { status: 200, corpo: vencidas() });
}
