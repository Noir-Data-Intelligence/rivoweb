/**
 * Auditoria (§5.14, F13): os registos mais recentes da trilha, filtrados por
 * tipo e id da entidade e com um limite (no URL). Só consulta: a trilha não se
 * escreve nem corrige no front. Quem fez aparece pelo e-mail da conta, para
 * quem lê as contas.
 */
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { useUtilizadores } from "@/features/administracao";
import { useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAuditoria, type RegistoAuditoria } from "../api";

const LIMITES = [50, 100, 200] as const;

/** Tipos de entidade que os módulos registam hoje, para sugerir no filtro (pode escrever-se outro). */
const TIPOS = [
  "approval.policy",
  "approval.request",
  "commercial.customer",
  "documents.document",
  "finance.bank_account",
  "finance.credit_note",
  "finance.document_series",
  "finance.journal_entry",
  "finance.ledger_account",
  "finance.payment_request",
  "finance.purchase_invoice",
  "finance.receipt",
  "finance.sales_invoice",
  "fleet.vehicle",
  "hr.employee",
  "hr.employment_contract",
  "hr.leave_request",
  "identity.user",
  "inventory.item",
  "inventory.movement",
  "payroll.run",
  "procurement.purchase_order",
  "procurement.supplier",
  "projects.project",
  "projects.task",
] as const;

export default function Auditoria() {
  const [params, setParams] = useSearchParams();
  const tipo = params.get("tipo")?.trim() || null;
  const id = params.get("id")?.trim() || null;
  const pedido = Number(params.get("limite"));
  const limite = (LIMITES as readonly number[]).includes(pedido) ? pedido : 50;
  const lista = useAuditoria({ tipo, id, limite });
  const { pode } = useUtilizador();
  const contas = useUtilizadores(pode("identity.users.read"));
  const [v, setV] = useState({ tipo: tipo ?? "", id: id ?? "", limite: String(limite) });
  const ids = { tipo: useId(), id: useId(), limite: useId(), lista: useId() };
  const aplicar = (f: { tipo: string; id: string; limite: string }) => {
    const n = new URLSearchParams();
    if (f.tipo.trim()) n.set("tipo", f.tipo.trim());
    if (f.id.trim()) n.set("id", f.id.trim());
    if (f.limite !== "50") n.set("limite", f.limite);
    setParams(n);
  };
  const quem = (r: RegistoAuditoria) => (r.actorId ? (contas.data?.find((u) => u.userId === r.actorId)?.email ?? "—") : "Sistema");
  const colunas: Coluna<RegistoAuditoria>[] = [
    { id: "quando", cabecalho: "Quando", celula: (r) => formatarDataHora(r.occurredAt) },
    { id: "accao", cabecalho: "Acção", className: "max-w-[14rem]", celula: (r) => <code className="break-all text-xs">{r.action}</code> },
    {
      id: "entidade",
      cabecalho: "Entidade",
      esconderAte: "sm",
      className: "max-w-[16rem]",
      celula: (r) => (
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <code className="break-all text-xs">{r.entityType}</code>
          <button
            type="button"
            className="break-all text-left font-mono text-xs text-muted-foreground underline-offset-4 hover:underline"
            aria-label={`Ver só os registos de ${r.entityType} ${r.entityId}`}
            onClick={() => {
              const f = { tipo: r.entityType, id: r.entityId, limite: String(limite) };
              setV(f);
              aplicar(f);
            }}
          >
            {r.entityId}
          </button>
        </span>
      ),
    },
    { id: "quem", cabecalho: "Quem", esconderAte: "md", className: "max-w-[14rem] truncate", celula: quem },
    { id: "ip", cabecalho: "IP", esconderAte: "lg", celula: (r) => r.ipAddress ?? "—" },
    { id: "corr", cabecalho: "Correlação", esconderAte: "lg", className: "max-w-[10rem]", celula: (r) => (r.correlationId ? <code className="break-all text-xs">{r.correlationId}</code> : "—") },
  ];
  return (
    <>
      <PageHeader titulo="Auditoria" descricao="Quem fez o quê e quando: os registos mais recentes, primeiro. Só consulta." />
      <form
        className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,16rem)_minmax(0,20rem)_8rem_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar(v);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.tipo} className="text-sm font-medium text-foreground">
            Tipo de entidade
          </label>
          <Input id={ids.tipo} list={ids.lista} autoComplete="off" maxLength={100} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value }))} />
          <datalist id={ids.lista}>
            {TIPOS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.id} className="text-sm font-medium text-foreground">
            Id da entidade
          </label>
          <Input id={ids.id} autoComplete="off" maxLength={100} className="font-mono" value={v.id} onChange={(e) => setV((x) => ({ ...x, id: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.limite} className="text-sm font-medium text-foreground">
            Registos
          </label>
          <Select id={ids.limite} value={v.limite} onChange={(e) => setV((x) => ({ ...x, limite: e.target.value }))}>
            {LIMITES.map((l) => (
              <option key={l} value={String(l)}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          {tipo || id || limite !== 50 ? (
            <Button
              type="button"
              variante="ghost"
              onClick={() => {
                const f = { tipo: "", id: "", limite: "50" };
                setV(f);
                aplicar(f);
              }}
            >
              Limpar
            </Button>
          ) : null}
        </div>
      </form>
      <Tabela
        rotulo="Registos de auditoria"
        colunas={colunas}
        linhas={lista.data}
        chave={(r) => r.id}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={tipo || id ? "Nenhum registo com estes filtros." : "Ainda não há registos."}
      />
      {lista.data && lista.data.length === limite ? <p className="mt-2 text-xs text-muted-foreground">{`Mostram-se os ${String(limite)} mais recentes; filtre para ver registos mais antigos.`}</p> : null}
    </>
  );
}
