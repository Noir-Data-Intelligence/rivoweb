import { Plus } from "lucide-react";
import { useId } from "react";
import { Link, NavLink, useSearchParams } from "react-router";
import { useClientesActivos } from "@/features/clientes";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { IsoDate } from "@/lib/validation/text";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { cn } from "@/ui/cn";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useFacturas, useRascunhos, type Rascunho, type ResumoFactura } from "../api";
import { EstadoDocumento, moeda, NOME_TIPO } from "../comum";

function Emitidas() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const { pode } = useUtilizador();
  const clientes = useClientesActivos(pode("commercial.customers.read"));
  const idDe = useId();
  const idAte = useId();
  const idCliente = useId();
  const data = (k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);
  const de = data("de");
  const ate = data("ate");
  const cliente = /^[0-9a-f-]{36}$/i.test(params.get("cliente") ?? "") ? params.get("cliente") : null;
  const facturas = useFacturas({ pagina, tamanho, customerId: cliente, from: de, to: ate });
  const filtrar = (k: string, v: string) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      if (v) n.set(k, v);
      else n.delete(k);
      n.delete("pagina");
      return n;
    });

  const colunas: Coluna<ResumoFactura>[] = [
    {
      id: "numero",
      cabecalho: "Número",
      celula: (f) => (
        <Link to={`/facturas/${f.invoiceId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {f.number}
        </Link>
      ),
    },
    { id: "data", cabecalho: "Data", esconderAte: "sm", celula: (f) => formatarData(f.issuedOn) },
    { id: "cliente", cabecalho: "Cliente", esconderAte: "md", celula: (f) => f.customerName, className: "max-w-[14rem] truncate" },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "lg", celula: (f) => NOME_TIPO[f.documentType ?? "FT"] ?? f.documentType },
    { id: "venc", cabecalho: "Vencimento", esconderAte: "lg", celula: (f) => (f.dueDate ? formatarData(f.dueDate) : "—") },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (f) => moeda(f.grossTotal, f.currency) },
    { id: "estado", cabecalho: "Estado", celula: (f) => <EstadoDocumento estado={f.status} /> },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {pode("commercial.customers.read") ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idCliente} className="text-sm font-medium text-foreground">
              Cliente
            </label>
            <Select id={idCliente} value={cliente ?? ""} onChange={(e) => filtrar("cliente", e.target.value)}>
              <option value="">Todos</option>
              {(clientes.data?.items ?? []).map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idDe} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={idDe} type="date" value={de ?? ""} onChange={(e) => filtrar("de", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate ?? ""} onChange={(e) => filtrar("ate", e.target.value)} />
        </div>
      </div>
      <Tabela
        rotulo="Facturas emitidas"
        colunas={colunas}
        linhas={facturas.data?.items}
        chave={(f) => f.invoiceId}
        aCarregar={facturas.isPending}
        erro={facturas.error ? <ErrorPanel erro={facturas.error} tentarDeNovo={() => void facturas.refetch()} /> : undefined}
        vazio={de || ate || cliente ? "Nenhuma factura com estes filtros." : "Ainda não há facturas emitidas."}
        rodape={facturas.data && facturas.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={facturas.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}

function Rascunhos() {
  const rascunhos = useRascunhos();
  const { pode } = useUtilizador();
  const clientes = useClientesActivos(pode("commercial.customers.read"));
  const nome = (id: string | null) => (id === null ? "Consumidor final" : (clientes.data?.items.find((c) => c.customerId === id)?.name ?? "Cliente"));
  const colunas: Coluna<Rascunho>[] = [
    {
      id: "cliente",
      cabecalho: "Cliente",
      ordenar: (r) => nome(r.customerId),
      celula: (r) => (
        <Link to={`/facturas/rascunhos/${r.draftId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {nome(r.customerId)}
        </Link>
      ),
    },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "sm", celula: (r) => NOME_TIPO[r.documentType] ?? r.documentType },
    { id: "liquido", cabecalho: "Líquido", alinhar: "direita", esconderAte: "md", ordenar: (r) => Number(r.netTotal), celula: (r) => moeda(r.netTotal, r.currency) },
    {
      id: "total",
      cabecalho: "Total previsto",
      alinhar: "direita",
      ordenar: (r) => Number(r.grossTotal ?? r.netTotal),
      celula: (r) => (r.grossTotal !== null && r.grossTotal !== undefined ? moeda(r.grossTotal, r.currency) : "Sem taxa"),
    },
    { id: "act", cabecalho: "Actualizado", esconderAte: "md", ordenar: (r) => r.updatedAt, celula: (r) => formatarDataHora(r.updatedAt) },
  ];
  return (
    <Tabela
      rotulo="Rascunhos"
      colunas={colunas}
      linhas={rascunhos.data}
      chave={(r) => r.draftId}
      aCarregar={rascunhos.isPending}
      erro={rascunhos.error ? <ErrorPanel erro={rascunhos.error} tentarDeNovo={() => void rascunhos.refetch()} /> : undefined}
      vazio="Não há rascunhos por emitir."
      ordenavel
    />
  );
}

export default function Facturas() {
  const [params] = useSearchParams();
  const vista = params.get("vista") === "rascunhos" ? "rascunhos" : "emitidas";
  const sep = (a: boolean) =>
    cn("inline-flex h-9 items-center border-b-2 px-3 text-base pointer-coarse:h-11", a ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground");
  return (
    <>
      <PageHeader
        titulo="Facturas"
        descricao="Facturas, facturas-recibo e notas de débito."
        accao={
          <Can requer={{ allOf: ["finance.invoices.write", "commercial.customers.read"] }}>
            <Button asChild>
              <Link to="/facturas/rascunhos/novo">
                <Plus strokeWidth={1.75} aria-hidden />
                Nova factura
              </Link>
            </Button>
          </Can>
        }
      />
      <nav aria-label="Vistas de facturas" className="mb-4 flex gap-1 border-b border-border">
        <NavLink to="/facturas" end className={() => sep(vista === "emitidas")} aria-current={vista === "emitidas" ? "page" : undefined}>
          Emitidas
        </NavLink>
        <NavLink to="/facturas?vista=rascunhos" className={() => sep(vista === "rascunhos")} aria-current={vista === "rascunhos" ? "page" : undefined}>
          Rascunhos
        </NavLink>
      </nav>
      {vista === "emitidas" ? <Emitidas /> : <Rascunhos />}
    </>
  );
}
