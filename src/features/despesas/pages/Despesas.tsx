/** Despesas de colaborador (§5.6): resumo, lista com filtros e registo em nome de alguém. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMeuPainel } from "@/features/dashboard";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { useTodosColaboradores } from "@/features/rh";
import { eApiError } from "@/lib/api/problem";
import { formatarData } from "@/lib/format/data";
import { IsoDate } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { ESTADOS, useDespesas, useRegistarDespesa, useResumoDespesas, type Despesa, type EstadoDespesa as TipoEstado } from "../api";
import { EstadoDespesa, FormularioDespesa, NOME_ESTADO, useFormularioDespesa } from "../comum";

function RegistarDespesa() {
  const navegar = useNavigate();
  const { pode } = useUtilizador();
  const leColaboradores = pode("hr.employees.read");
  const [aberto, setAberto] = useState(false);
  const colaboradores = useTodosColaboradores(aberto && leColaboradores);
  const eu = useMeuPainel().data?.employeeId ?? null;
  const [colaborador, setColaborador] = useState("");
  const [faltaColaborador, setFaltaColaborador] = useState(false);
  const estado = useFormularioDespesa();
  const registar = useRegistarDespesa();
  const [soltas, setSoltas] = useState<string[]>([]);
  const idForm = useId();
  if (!leColaboradores && !eu) return null;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      estado.limpar();
      registar.reset();
      setSoltas([]);
      setColaborador("");
      setFaltaColaborador(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar despesa
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Registar uma despesa"
        descricao="Em nome de um colaborador. O próprio também a pode submeter no portal."
        rotuloConfirmar="Registar despesa"
        aCarregar={registar.isPending}
        erro={
          soltas.length > 0 ? (
            <Alert tom="erro" titulo="Não foi possível registar.">
              {soltas.join(" ")}
            </Alert>
          ) : registar.error && !(eApiError(registar.error) && registar.error.status === 400) ? (
            <ErrorPanel erro={registar.error} />
          ) : undefined
        }
        formulario={idForm}
      >
        <FormularioDespesa
          id={idForm}
          estado={estado}
          antes={
            leColaboradores ? (
              <Field rotulo="Colaborador" erro={faltaColaborador && !colaborador ? "Escolha o colaborador." : undefined} className="sm:col-span-2">
                {({ id, descricao, invalido }) => (
                  <Select id={id} aria-describedby={descricao} invalido={invalido} aria-busy={colaboradores.isPending || undefined} value={colaborador} onChange={(e) => setColaborador(e.target.value)}>
                    <option value="">Escolha…</option>
                    {(colaboradores.data?.items ?? []).map((c) => (
                      <option key={c.employeeId} value={c.employeeId}>
                        {c.fullName}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : (
              <p className="text-sm text-muted-foreground sm:col-span-2">Fica em seu nome: este perfil não lê a lista de colaboradores.</p>
            )
          }
          aoSubmeter={(d) => {
            const employeeId = leColaboradores ? colaborador : eu;
            if (!employeeId) return setFaltaColaborador(true);
            if (registar.isPending) return;
            setSoltas([]);
            registar.mutate(
              { employeeId, spentOn: d.spentOn, description: d.description, category: d.category, amount: d.amount, currency: d.currency, projectId: null, billable: false, receiptDocumentId: d.receiptDocumentId },
              { onSuccess: (r) => void navegar(`/despesas/${r.id}`), onError: (e) => setSoltas(estado.erroServidor(e)) },
            );
          }}
        />
      </Confirmar>
    </>
  );
}

function Resumo({ de, ate }: { de: string | null; ate: string | null }) {
  const r = useResumoDespesas({ de, ate });
  if (r.isPending) return <Skeleton className="mb-6 h-24" />;
  if (r.error) return <ErrorPanel erro={r.error} tentarDeNovo={() => void r.refetch()} className="mb-6" />;
  if (r.data.length === 0) return null;
  return (
    <div className="mb-6 flex flex-col gap-3">
      {r.data.map((m) => (
        <GrelhaKpis key={m.currency}>
          <Kpi rotulo={`Por decidir (${m.currency})`} valor={moeda(m.submitted, m.currency)} />
          <Kpi rotulo={`Aprovadas, por reembolsar (${m.currency})`} valor={moeda(m.approved, m.currency)} />
          <Kpi rotulo={`Reembolsadas (${m.currency})`} valor={moeda(m.reimbursed, m.currency)} />
          <Kpi rotulo={`Rejeitadas (${m.currency})`} valor={moeda(m.rejected, m.currency)} />
        </GrelhaKpis>
      ))}
    </div>
  );
}

export default function Despesas() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const { pode } = useUtilizador();
  const idEstado = useId();
  const idDe = useId();
  const idAte = useId();
  const data = (k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);
  const de = data("de");
  const ate = data("ate");
  const estado = ESTADOS.includes(params.get("estado") as TipoEstado) ? (params.get("estado") as TipoEstado) : null;
  const despesas = useDespesas({ estado, de, ate });
  const filtrar = (k: string, v: string) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      if (v) n.set(k, v);
      else n.delete(k);
      n.delete("pagina");
      return n;
    });
  // A API devolve a lista inteira: a paginação é local.
  const todas = despesas.data ?? [];
  const pagina_ = todas.slice((pagina - 1) * tamanho, pagina * tamanho);
  const colunas: Coluna<Despesa>[] = [
    {
      id: "descricao",
      cabecalho: "Despesa",
      celula: (d) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/despesas/${d.expenseId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {d.description}
          </Link>
          <span className="text-sm text-muted-foreground">{d.category}</span>
        </div>
      ),
      className: "max-w-[18rem]",
    },
    { id: "quem", cabecalho: "Colaborador", esconderAte: "sm", celula: (d) => d.employeeName, className: "max-w-[12rem] truncate" },
    { id: "data", cabecalho: "Data", esconderAte: "md", celula: (d) => formatarData(d.spentOn) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (d) => moeda(d.amount, d.currency) },
    { id: "estado", cabecalho: "Estado", celula: (d) => <EstadoDespesa estado={d.status} /> },
  ];
  return (
    <>
      <PageHeader titulo="Despesas" descricao="Despesas dos colaboradores: aprovar ou rejeitar, e marcar o reembolso." accao={pode("finance.expenses.write") ? <RegistarDespesa /> : undefined} />
      <Resumo de={de} ate={ate} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
            Estado
          </label>
          <Select id={idEstado} value={estado ?? ""} onChange={(e) => filtrar("estado", e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {NOME_ESTADO[s]}
              </option>
            ))}
          </Select>
        </div>
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
        rotulo="Despesas"
        colunas={colunas}
        linhas={despesas.data ? pagina_ : undefined}
        chave={(d) => d.expenseId}
        aCarregar={despesas.isPending}
        erro={despesas.error ? <ErrorPanel erro={despesas.error} tentarDeNovo={() => void despesas.refetch()} /> : undefined}
        vazio={estado || de || ate ? "Nenhuma despesa com estes filtros." : "Ainda não há despesas."}
        rodape={todas.length > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={todas.length} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
