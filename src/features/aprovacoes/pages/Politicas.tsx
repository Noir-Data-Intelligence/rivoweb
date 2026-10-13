/**
 * Políticas de aprovação (§5.5): que processos passam por que cargos, por
 * ordem, e com que faixas de valor. Criar e desactivar (só Admin).
 */
import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useTodosCargos, useTodosDepartamentos } from "@/features/rh";
import { useUtilizador } from "@/features/identity";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Input } from "@/ui/Field";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { useCriarPolitica, useDesactivarPolitica, usePoliticas, type Politica } from "../api";
import { NOME_MODO, nomeProcesso, PROCESSOS } from "../comum";

type Passo = { cargo: string; modo: "AnyApprover" | "AllApprovers"; sla: string };

function NovaPolitica() {
  const [aberto, setAberto] = useState(false);
  const criar = useCriarPolitica();
  const cargos = useTodosCargos(aberto);
  const departamentos = useTodosDepartamentos(aberto);
  const [tipo, setTipo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [minimo, setMinimo] = useState("");
  const [maximo, setMaximo] = useState("");
  const [orcamento, setOrcamento] = useState(false);
  const [passos, setPassos] = useState<Passo[]>([{ cargo: "", modo: "AnyApprover", sla: "" }]);
  const [tentou, setTentou] = useState(false);
  const id = useId();
  const min = minimo.trim() === "" ? null : lerDinheiroDigitado(minimo, 2);
  const max = maximo.trim() === "" ? null : lerDinheiroDigitado(maximo, 2);
  const valoresOk = (minimo.trim() === "" || (min !== null && min.gte(0))) && (maximo.trim() === "" || max !== null) && (min === null || max === null || max.gt(min));
  const passosOk = passos.length > 0 && passos.every((p) => p.cargo !== "" && (p.sla === "" || (/^\d{1,4}$/.test(p.sla) && Number(p.sla) > 0)));
  const ok = tipo !== "" && valoresOk && passosOk;
  const repor = () => {
    setTipo("");
    setDepartamento("");
    setMinimo("");
    setMaximo("");
    setOrcamento(false);
    setPassos([{ cargo: "", modo: "AnyApprover", sla: "" }]);
    setTentou(false);
    criar.reset();
  };
  const confirmar = () => {
    setTentou(true);
    if (!ok) return;
    criar.mutate(
      {
        processType: tipo,
        departmentId: departamento || null,
        minimumAmount: min ? paraApi(min) : null,
        maximumAmount: max ? paraApi(max) : null,
        requiresBudgetCheck: orcamento,
        steps: passos.map((p) => ({ approverPositionId: p.cargo, mode: p.modo, slaHours: p.sla ? Number(p.sla) : null })),
      },
      {
        onSuccess: () => {
          setAberto(false);
          repor();
        },
      },
    );
  };
  const autoridade = (cargos.data?.items ?? []).filter((c) => c.grantsApprovalAuthority);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova política
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) repor();
        }}
        titulo="Nova política de aprovação"
        descricao="Os pedidos novos do processo passam a seguir estes passos. Os pedidos já abertos não mudam."
        rotuloConfirmar="Criar política"
        aCarregar={criar.isPending}
        erro={criar.error ? <ErrorPanel erro={criar.error} /> : undefined}
        aoConfirmar={confirmar}
      >
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-0.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-t`} className="text-sm font-medium text-foreground">
                Processo
              </label>
              <Select id={`${id}-t`} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-invalid={tentou && !tipo ? true : undefined}>
                <option value="">Escolha…</option>
                {Object.entries(PROCESSOS).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-d`} className="text-sm font-medium text-foreground">
                Departamento (opcional)
              </label>
              <Select id={`${id}-d`} value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
                <option value="">Todos</option>
                {(departamentos.data?.items ?? []).map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-min`} className="text-sm font-medium text-foreground">
                Valor mínimo (opcional)
              </label>
              <Input id={`${id}-min`} inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} aria-invalid={tentou && !valoresOk ? true : undefined} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-max`} className="text-sm font-medium text-foreground">
                Valor máximo (opcional)
              </label>
              <Input id={`${id}-max`} inputMode="decimal" value={maximo} onChange={(e) => setMaximo(e.target.value)} aria-invalid={tentou && !valoresOk ? true : undefined} />
            </div>
          </div>
          {tentou && !valoresOk ? (
            <p className="text-xs text-danger" role="alert">
              Valores válidos, até 2 casas; o máximo tem de ser maior que o mínimo.
            </p>
          ) : null}
          <Checkbox rotulo="Verificar o orçamento" ajuda="O pedido só segue se houver orçamento disponível." checked={orcamento} onChange={(e) => setOrcamento(e.target.checked)} />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium text-foreground">Passos, por ordem</legend>
            {autoridade.length === 0 && !cargos.isPending ? (
              <Alert tom="aviso" titulo="Não há cargos com autoridade para aprovar.">
                Crie-os em Cargos. Um passo aponta para um cargo, e decide quem o ocupar.
              </Alert>
            ) : null}
            {passos.map((p, i) => (
              <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-12">
                <div className="flex flex-col gap-1.5 sm:col-span-5">
                  <label htmlFor={`${id}-c${i}`} className="text-sm text-foreground">
                    Passo {i + 1}: cargo
                  </label>
                  <Select id={`${id}-c${i}`} value={p.cargo} onChange={(e) => setPassos((x) => x.map((y, j) => (j === i ? { ...y, cargo: e.target.value } : y)))} aria-invalid={tentou && !p.cargo ? true : undefined}>
                    <option value="">Escolha…</option>
                    {autoridade.map((c) => (
                      <option key={c.positionId} value={c.positionId}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-4">
                  <label htmlFor={`${id}-m${i}`} className="text-sm text-foreground">
                    Quem decide
                  </label>
                  <Select id={`${id}-m${i}`} value={p.modo} onChange={(e) => setPassos((x) => x.map((y, j) => (j === i ? { ...y, modo: e.target.value as Passo["modo"] } : y)))}>
                    <option value="AnyApprover">{NOME_MODO.AnyApprover}</option>
                    <option value="AllApprovers">{NOME_MODO.AllApprovers}</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor={`${id}-s${i}`} className="text-sm text-foreground">
                    Prazo (h)
                  </label>
                  <Input id={`${id}-s${i}`} inputMode="numeric" maxLength={4} value={p.sla} onChange={(e) => setPassos((x) => x.map((y, j) => (j === i ? { ...y, sla: e.target.value } : y)))} />
                </div>
                <div className="flex items-end sm:col-span-1">
                  <Button variante="ghost" tamanho="icone" aria-label={`Remover passo ${i + 1}`} disabled={passos.length === 1} onClick={() => setPassos((x) => x.filter((_, j) => j !== i))}>
                    <Trash2 strokeWidth={1.75} aria-hidden />
                  </Button>
                </div>
              </div>
            ))}
            {tentou && !passosOk ? (
              <p className="text-xs text-danger" role="alert">
                Cada passo precisa de cargo; o prazo, se existir, é um número de horas positivo.
              </p>
            ) : null}
            <Button variante="secondary" className="self-start" onClick={() => setPassos((x) => [...x, { cargo: "", modo: "AnyApprover", sla: "" }])}>
              <Plus strokeWidth={1.75} aria-hidden />
              Passo
            </Button>
          </fieldset>
        </div>
      </Confirmar>
    </>
  );
}

function Desactivar({ p }: { p: Politica }) {
  const [aberto, setAberto] = useState(false);
  const desactivar = useDesactivarPolitica();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        Desactivar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) desactivar.reset();
        }}
        titulo="Desactivar a política?"
        descricao="Os pedidos novos deixam de a usar. Os já abertos seguem como estão."
        rotuloConfirmar="Desactivar"
        variante="destructive"
        aCarregar={desactivar.isPending}
        erro={desactivar.error ? <ErrorPanel erro={desactivar.error} /> : undefined}
        aoConfirmar={() => desactivar.mutate(p.policyId, { onSuccess: () => setAberto(false) })}
      />
    </>
  );
}

export default function Politicas() {
  const politicas = usePoliticas();
  const { pode } = useUtilizador();
  const podeEscrever = pode("approval.policies.write");
  const cargos = useTodosCargos(pode("hr.positions.read"));
  const departamentos = useTodosDepartamentos(pode("hr.departments.read"));
  const nomeCargo = (id: string) => cargos.data?.items.find((c) => c.positionId === id)?.name ?? "Cargo";
  const nomeDep = (id: string | null) => (id === null ? "Todos os departamentos" : (departamentos.data?.items.find((d) => d.departmentId === id)?.name ?? "Departamento"));
  const faixa = (p: Politica) => {
    const m = (v: number | string) => formatarMoeda(dinheiro(v));
    if (p.minimumAmount !== null && p.maximumAmount !== null) return `de ${m(p.minimumAmount)} a ${m(p.maximumAmount)}`;
    if (p.minimumAmount !== null) return `a partir de ${m(p.minimumAmount)}`;
    if (p.maximumAmount !== null) return `até ${m(p.maximumAmount)}`;
    return "qualquer valor";
  };
  const lista = [...(politicas.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.processType.localeCompare(b.processType));
  return (
    <>
      <PageHeader titulo="Políticas de aprovação" descricao="Que processos passam por que cargos, por ordem. A mais específica que se aplica é a usada." accao={podeEscrever ? <NovaPolitica /> : undefined} />
      {politicas.isPending ? (
        <Skeleton className="h-32" />
      ) : politicas.error ? (
        <ErrorPanel erro={politicas.error} tentarDeNovo={() => void politicas.refetch()} />
      ) : lista.length === 0 ? (
        <Card>
          <EmptyState frase="Ainda não há políticas de aprovação." />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((p) => (
            <li key={p.policyId}>
              <Card>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {nomeProcesso(p.processType)} <span className="font-normal text-muted-foreground">· {nomeDep(p.departmentId)} · {faixa(p)}</span>
                    </p>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {p.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>}
                      {p.requiresBudgetCheck ? <Badge tom="info">Verifica orçamento</Badge> : null}
                    </span>
                  </div>
                  {podeEscrever && p.isActive ? <Desactivar p={p} /> : null}
                </div>
                <ol className="mt-3 flex flex-col gap-1 text-sm text-foreground">
                  {p.steps.map((s) => (
                    <li key={String(s.order)}>
                      {String(s.order)}. {nomeCargo(s.approverPositionId)} <span className="text-muted-foreground">· {NOME_MODO[s.mode] ?? s.mode}{s.slaHours ? ` · ${String(s.slaHours)} h` : ""}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
