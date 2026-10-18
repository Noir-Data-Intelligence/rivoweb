/**
 * Um activo fixo: valores, plano de amortização (registado ou previsto),
 * corrigir (só antes da primeira amortização registada), abater; manutenção
 * (agendar, concluir, cancelar), custódia (entregar, devolver) e seguros
 * (contratar, corrigir, cancelar).
 */
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { nomeMes } from "@/lib/format/periodo";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import {
  useAbater,
  useActivo,
  useEscolhasActivos,
  useActivos,
  useAgendarManutencao,
  useApolices,
  useCancelarApolice,
  useCancelarManutencao,
  useConcluirManutencao,
  useContratarApolice,
  useCorrigirActivo,
  useCorrigirApolice,
  useCustodias,
  useDevolver,
  useEntregar,
  type Activo as TipoActivo,
  type Apolice,
  type Custodia,
  type FichaActivo,
  type Manutencao,
} from "../api";
import { EstadoActivo, EstadoManutencao, TIPO_MANUTENCAO } from "../comum";
import { erroDevolucao, errosAbate, errosActivo, errosApolice, errosManutencao, METODOS, type CamposActivo, type CamposApolice } from "../regras";
import { CamposDoActivo, camposDe, corpoActivo } from "./Activos";

type LinhaPlano = FichaActivo["schedule"][number];
const opc = (v: string, multi = false) => {
  const n = normalizarTexto(v, multi);
  return n === "" ? null : n;
};
/** Já validado: vazio é `null`. */
const dinheiroOuNulo = (t: string) => {
  const v = t.trim() === "" ? null : lerDinheiroDigitado(t);
  return v ? paraApi(v) : null;
};

function Corrigir({ a }: { a: TipoActivo }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposActivo>(() => camposDe(a));
  const [centro, setCentro] = useState(a.costCentreId ?? "");
  const [fornecedor, setFornecedor] = useState(a.supplierId ?? "");
  const [tentou, setTentou] = useState(false);
  const corrigir = useCorrigirActivo(a.assetId);
  const todos = useActivos({ estado: null, categoria: null });
  const categorias = [...new Set((todos.data ?? []).map((x) => x.category).filter((c): c is string => Boolean(c)))].sort();
  const idForm = useId();
  const erros = errosActivo(v);
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        Corrigir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            corrigir.reset();
            setTentou(false);
            setV(camposDe(a));
          }
        }}
        largo
        titulo={`Corrigir ${a.code}`}
        descricao="Só antes da primeira amortização registada: depois, o plano não se altera."
        rotuloConfirmar="Guardar"
        aCarregar={corrigir.isPending}
        erro={corrigir.error ? <ErrorPanel erro={corrigir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const corpo = corpoActivo(v, { centro, fornecedor, moeda: a.currency, factura: a.purchaseInvoiceId });
            if (Object.keys(erros).length > 0 || !corpo || corrigir.isPending) return;
            corrigir.mutate(corpo, { onSuccess: () => setAberto(false) });
          }}
        >
          <CamposDoActivo v={v} mudar={(k, x) => setV((y) => ({ ...y, [k]: x }))} erros={tentou ? erros : {}} categorias={categorias} centro={centro} setCentro={setCentro} fornecedor={fornecedor} setFornecedor={setFornecedor} aberto={aberto} />
        </form>
      </Confirmar>
    </>
  );
}

function Abater({ a }: { a: TipoActivo }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ data: hojeIso(), valor: "", motivo: "" });
  const [tentou, setTentou] = useState(false);
  const abater = useAbater(a.assetId);
  const idForm = useId();
  const erros = errosAbate(v, a.acquiredOn);
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        Abater
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            abater.reset();
            setTentou(false);
          }
        }}
        titulo={`Abater ${a.code} · ${a.name}?`}
        descricao={`Valor líquido actual: ${moeda(a.netBookValue, a.currency)}. Deixa de amortizar, não recebe manutenção nem se entrega. Não se desfaz.`}
        rotuloConfirmar="Abater"
        variante="destructive"
        aCarregar={abater.isPending}
        erro={abater.error ? <ErrorPanel erro={abater.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || abater.isPending) return;
            abater.mutate({ on: v.data === "" ? null : v.data, value: dinheiroOuNulo(v.valor), reason: opc(v.motivo, true) }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Data do abate" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.data} onChange={(e) => setV((x) => ({ ...x, data: e.target.value }))} />}
          </Field>
          <Field rotulo="Valor de venda (opcional)" erro={tentou ? erros.valor : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={(e) => setV((x) => ({ ...x, valor: e.target.value }))} />}
          </Field>
          <Field rotulo="Motivo (opcional)" erro={tentou ? erros.motivo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={v.motivo} onChange={(e) => setV((x) => ({ ...x, motivo: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

// --- Manutenção

function Agendar({ a }: { a: TipoActivo }) {
  const [aberto, setAberto] = useState(false);
  const inicial = { tipo: "Preventive" as "Preventive" | "Corrective" | "Inspection", descricao: "", data: hojeIso(), fornecedor: "", custo: "" };
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const agendar = useAgendarManutencao(a.assetId);
  const idForm = useId();
  const erros = errosManutencao(v);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Agendar manutenção
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            agendar.reset();
            setTentou(false);
            setV(inicial);
          }
        }}
        titulo={`Agendar manutenção de ${a.code}`}
        rotuloConfirmar="Agendar"
        aCarregar={agendar.isPending}
        erro={agendar.error ? <ErrorPanel erro={agendar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || agendar.isPending) return;
            agendar.mutate({ kind: v.tipo, description: normalizarTexto(v.descricao), scheduledOn: v.data, provider: opc(v.fornecedor), estimatedCost: dinheiroOuNulo(v.custo) }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value as typeof v.tipo }))}>
                {Object.entries(TIPO_MANUTENCAO).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Data" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.data} onChange={(e) => setV((x) => ({ ...x, data: e.target.value }))} />}
          </Field>
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => setV((x) => ({ ...x, descricao: e.target.value }))} />}
          </Field>
          <Field rotulo="Prestador (opcional)" erro={tentou ? erros.fornecedor : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.fornecedor} onChange={(e) => setV((x) => ({ ...x, fornecedor: e.target.value }))} />}
          </Field>
          <Field rotulo={`Custo estimado em ${a.currency} (opcional)`} erro={tentou ? erros.custo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.custo} onChange={(e) => setV((x) => ({ ...x, custo: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function ConcluirManutencao({ m, moedaA }: { m: Manutencao; moedaA: string }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ data: hojeIso(), custo: m.cost === null ? "" : String(m.cost).replace(".", ","), notas: "" });
  const [tentou, setTentou] = useState(false);
  const concluir = useConcluirManutencao();
  const custo = v.custo.trim() === "" ? null : lerDinheiroDigitado(v.custo);
  const erroCusto = v.custo.trim() !== "" && (custo === null || custo.lt(0)) ? "O custo não pode ser negativo (até 2 casas)." : undefined;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Concluir a manutenção de ${formatarData(m.scheduledOn)}`}>
        Concluir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            concluir.reset();
            setTentou(false);
          }
        }}
        titulo="Concluir a manutenção"
        descricao={m.description}
        rotuloConfirmar="Concluir"
        aCarregar={concluir.isPending}
        erro={concluir.error ? <ErrorPanel erro={concluir.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erroCusto || concluir.isPending) return;
          concluir.mutate({ id: m.maintenanceId, completedOn: v.data === "" ? null : v.data, cost: custo ? paraApi(custo) : null, notes: opc(v.notas, true) }, { onSuccess: () => setAberto(false) });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field rotulo="Concluída a">
            {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={v.data} onChange={(e) => setV((x) => ({ ...x, data: e.target.value }))} />}
          </Field>
          <Field rotulo={`Custo final em ${moedaA} (opcional)`} erro={tentou ? erroCusto : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.custo} onChange={(e) => setV((x) => ({ ...x, custo: e.target.value }))} />}
          </Field>
          <Field rotulo="Notas (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={2000} aria-describedby={descricao} value={v.notas} onChange={(e) => setV((x) => ({ ...x, notas: e.target.value }))} />}
          </Field>
        </div>
      </Confirmar>
    </>
  );
}

function CancelarManutencao({ m }: { m: Manutencao }) {
  const [aberto, setAberto] = useState(false);
  const cancelar = useCancelarManutencao();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Cancelar a manutenção de ${formatarData(m.scheduledOn)}`}>
        Cancelar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) cancelar.reset();
        }}
        titulo="Cancelar esta manutenção?"
        descricao={m.description}
        rotuloConfirmar="Cancelar manutenção"
        variante="destructive"
        aCarregar={cancelar.isPending}
        erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
        aoConfirmar={() => (cancelar.isPending ? undefined : cancelar.mutate(m.maintenanceId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function ManutencaoDoActivo({ f }: { f: FichaActivo }) {
  const { pode } = useUtilizador();
  const a = f.asset;
  const escreve = pode("finance.assets.write");
  const colunas: Coluna<Manutencao>[] = [
    { id: "data", cabecalho: "Data", celula: (m) => formatarData(m.scheduledOn) },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "sm", celula: (m) => TIPO_MANUTENCAO[m.kind as keyof typeof TIPO_MANUTENCAO] ?? m.kind },
    {
      id: "descricao",
      cabecalho: "Descrição",
      celula: (m) => (
        <div className="flex min-w-0 flex-col">
          <span>{m.description}</span>
          {m.provider ? <span className="text-sm text-muted-foreground">{m.provider}</span> : null}
        </div>
      ),
    },
    { id: "custo", cabecalho: "Custo", alinhar: "direita", esconderAte: "md", celula: (m) => (m.cost === null ? "—" : moeda(m.cost, a.currency)) },
    { id: "estado", cabecalho: "Estado", celula: (m) => <EstadoManutencao estado={m.status} /> },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (m) =>
        escreve && m.status === "Scheduled" ? (
          <div className="flex justify-end gap-1">
            <ConcluirManutencao m={m} moedaA={a.currency} />
            <CancelarManutencao m={m} />
          </div>
        ) : null,
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      {escreve && a.status === "Active" ? (
        <div>
          <Agendar a={a} />
        </div>
      ) : null}
      <Tabela rotulo="Manutenção do activo" colunas={colunas} linhas={[...f.maintenance].sort((x, y) => y.scheduledOn.localeCompare(x.scheduledOn))} chave={(m) => m.maintenanceId} aCarregar={false} vazio="Sem manutenções." />
    </div>
  );
}

// --- Custódia

function Entregar({ a }: { a: TipoActivo }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ colaborador: "", data: hojeIso(), estado: "", notas: "" });
  const [tentou, setTentou] = useState(false);
  const entregar = useEntregar(a.assetId);
  const escolhas = useEscolhasActivos(aberto);
  const idForm = useId();
  const erro = v.colaborador === "" ? "Escolha o colaborador." : undefined;
  return (
    <>
      <Button onClick={() => setAberto(true)}>Entregar a um colaborador</Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            entregar.reset();
            setTentou(false);
          }
        }}
        titulo={`Entregar ${a.code} · ${a.name}`}
        descricao="O colaborador vê-o no portal, em «Bens à minha guarda»."
        rotuloConfirmar="Entregar"
        aCarregar={entregar.isPending}
        erro={entregar.error ? <ErrorPanel erro={entregar.error} /> : escolhas.error ? <ErrorPanel erro={escolhas.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erro || entregar.isPending) return;
            entregar.mutate({ employeeId: v.colaborador, on: v.data === "" ? null : v.data, condition: opc(v.estado), notes: opc(v.notas, true) }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Colaborador" erro={tentou ? erro : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.colaborador} onChange={(e) => setV((x) => ({ ...x, colaborador: e.target.value }))}>
                <option value="">{escolhas.isPending ? "A carregar…" : "Escolha…"}</option>
                {(escolhas.data?.employees ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Entregue a">
            {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={v.data} onChange={(e) => setV((x) => ({ ...x, data: e.target.value }))} />}
          </Field>
          <Field rotulo="Estado na entrega (opcional)">
            {({ id, descricao }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} value={v.estado} onChange={(e) => setV((x) => ({ ...x, estado: e.target.value }))} />}
          </Field>
          <Field rotulo="Notas (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} value={v.notas} onChange={(e) => setV((x) => ({ ...x, notas: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Devolver({ c }: { c: Custodia }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ data: hojeIso(), estado: "", notas: "" });
  const [tentou, setTentou] = useState(false);
  const devolver = useDevolver();
  const erro = erroDevolucao(v.data, c.assignedOn);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Registar a devolução de ${c.employeeName}`}>
        Devolver
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            devolver.reset();
            setTentou(false);
          }
        }}
        titulo={`${c.employeeName} devolve ${c.assetCode}`}
        rotuloConfirmar="Registar devolução"
        aCarregar={devolver.isPending}
        erro={devolver.error ? <ErrorPanel erro={devolver.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || devolver.isPending) return;
          devolver.mutate({ id: c.custodyId, on: v.data === "" ? null : v.data, condition: opc(v.estado), notes: opc(v.notas, true) }, { onSuccess: () => setAberto(false) });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field rotulo="Devolvido a" erro={tentou ? erro : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={c.assignedOn} aria-describedby={descricao} invalido={invalido} value={v.data} onChange={(e) => setV((x) => ({ ...x, data: e.target.value }))} />}
          </Field>
          <Field rotulo="Estado na devolução (opcional)">
            {({ id, descricao }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} value={v.estado} onChange={(e) => setV((x) => ({ ...x, estado: e.target.value }))} />}
          </Field>
          <Field rotulo="Notas (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} value={v.notas} onChange={(e) => setV((x) => ({ ...x, notas: e.target.value }))} />}
          </Field>
        </div>
      </Confirmar>
    </>
  );
}

function CustodiaDoActivo({ a }: { a: TipoActivo }) {
  const { pode } = useUtilizador();
  const lista = useCustodias({ activo: a.assetId, colaborador: null, abertas: false });
  const escreve = pode("finance.assets.write");
  const aberta = (lista.data ?? []).some((c) => c.open);
  const colunas: Coluna<Custodia>[] = [
    { id: "quem", cabecalho: "Colaborador", celula: (c) => <span className="font-medium">{c.employeeName}</span> },
    { id: "desde", cabecalho: "Entregue a", celula: (c) => formatarData(c.assignedOn) },
    { id: "estado", cabecalho: "Estado", esconderAte: "md", celula: (c) => [c.conditionOnAssign, c.conditionOnReturn].filter(Boolean).join(" → ") || "—" },
    { id: "devolvido", cabecalho: "Devolvido a", celula: (c) => (c.returnedOn ? formatarData(c.returnedOn) : <Badge tom="info">Em posse</Badge>) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (c: Custodia) => (c.open ? <Devolver c={c} /> : null) }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {escreve && a.status === "Active" && !aberta ? (
        <div>
          <Entregar a={a} />
        </div>
      ) : null}
      <Tabela rotulo="Custódia do activo" colunas={colunas} linhas={lista.data} chave={(c) => c.custodyId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} /> : undefined} vazio="Nunca foi entregue a ninguém." />
    </div>
  );
}

// --- Seguros

const camposApolice = (p?: Apolice): CamposApolice => ({
  seguradora: p?.insurer ?? "",
  numero: p?.policyNumber ?? "",
  cobertura: p?.coverage ?? "",
  inicio: p?.startsOn ?? hojeIso(),
  fim: p?.endsOn ?? "",
  premio: p ? String(p.premium).replace(".", ",") : "",
  capital: p?.insuredValue === null || p?.insuredValue === undefined ? "" : String(p.insuredValue).replace(".", ","),
});

function EditarApolice({ a, p }: { a: TipoActivo; p?: Apolice }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposApolice>(() => camposApolice(p));
  const [tentou, setTentou] = useState(false);
  const contratar = useContratarApolice(a.assetId);
  const corrigir = useCorrigirApolice();
  const m = p ? corrigir : contratar;
  const idForm = useId();
  const erros = errosApolice(v);
  const campo = (k: keyof CamposApolice, x: string) => setV((y) => ({ ...y, [k]: x }));
  return (
    <>
      {p ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir a apólice ${p.policyNumber}`}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Registar apólice
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            contratar.reset();
            corrigir.reset();
            setTentou(false);
            setV(camposApolice(p));
          }
        }}
        titulo={p ? `Corrigir a apólice ${p.policyNumber}` : `Seguro de ${a.code} · ${a.name}`}
        rotuloConfirmar={p ? "Guardar" : "Registar"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const premio = lerDinheiroDigitado(v.premio);
            if (Object.keys(erros).length > 0 || !premio || m.isPending) return;
            const corpo = {
              insurer: normalizarTexto(v.seguradora),
              policyNumber: normalizarTexto(v.numero),
              coverage: opc(v.cobertura, true),
              startsOn: v.inicio,
              endsOn: v.fim,
              premium: paraApi(premio),
              insuredValue: dinheiroOuNulo(v.capital),
              currency: p?.currency ?? a.currency,
            };
            if (p) corrigir.mutate({ id: p.policyId, ...corpo }, { onSuccess: () => setAberto(false) });
            else contratar.mutate(corpo, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Seguradora" erro={tentou ? erros.seguradora : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.seguradora} onChange={(e) => campo("seguradora", e.target.value)} />}
          </Field>
          <Field rotulo="N.º da apólice" erro={tentou ? erros.numero : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.numero} onChange={(e) => campo("numero", e.target.value)} />}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => campo("inicio", e.target.value)} />}
          </Field>
          <Field rotulo="Fim" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || undefined} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => campo("fim", e.target.value)} />}
          </Field>
          <Field rotulo={`Prémio em ${p?.currency ?? a.currency}`} erro={tentou ? erros.premio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.premio} onChange={(e) => campo("premio", e.target.value)} />}
          </Field>
          <Field rotulo="Capital seguro (opcional)" erro={tentou ? erros.capital : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.capital} onChange={(e) => campo("capital", e.target.value)} />}
          </Field>
          <Field rotulo="Cobertura (opcional)" erro={tentou ? erros.cobertura : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={v.cobertura} onChange={(e) => campo("cobertura", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function CancelarApolice({ p }: { p: Apolice }) {
  const [aberto, setAberto] = useState(false);
  const cancelar = useCancelarApolice();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Cancelar a apólice ${p.policyNumber}`}>
        Cancelar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) cancelar.reset();
        }}
        titulo={`Cancelar a apólice ${p.policyNumber}?`}
        descricao="Deixa de contar como seguro em vigor. Não se desfaz."
        rotuloConfirmar="Cancelar apólice"
        variante="destructive"
        aCarregar={cancelar.isPending}
        erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
        aoConfirmar={() => (cancelar.isPending ? undefined : cancelar.mutate(p.policyId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function SegurosDoActivo({ a }: { a: TipoActivo }) {
  const { pode } = useUtilizador();
  const lista = useApolices({ activo: a.assetId, dias: null });
  const escreve = pode("finance.assets.write");
  const colunas: Coluna<Apolice>[] = [
    {
      id: "apolice",
      cabecalho: "Apólice",
      celula: (p) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium">
            {p.insurer} · {p.policyNumber}
          </span>
          {p.coverage ? <span className="text-sm text-muted-foreground">{p.coverage}</span> : null}
        </div>
      ),
    },
    { id: "vigencia", cabecalho: "Vigência", esconderAte: "sm", celula: (p) => `${formatarData(p.startsOn)} a ${formatarData(p.endsOn)}` },
    { id: "premio", cabecalho: "Prémio", alinhar: "direita", esconderAte: "md", celula: (p) => moeda(p.premium, p.currency) },
    { id: "capital", cabecalho: "Capital", alinhar: "direita", esconderAte: "lg", celula: (p) => (p.insuredValue === null ? "—" : moeda(p.insuredValue, p.currency)) },
    { id: "estado", cabecalho: "Estado", celula: (p) => (p.cancelled ? <Badge>Cancelada</Badge> : p.active ? <Badge tom="sucesso">{`Em vigor · ${String(p.daysToExpiry)} dias`}</Badge> : <Badge>Fora de vigor</Badge>) },
    ...(escreve
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (p: Apolice) =>
              p.cancelled ? null : (
                <div className="flex justify-end gap-1">
                  <EditarApolice key={`${p.policyId}-${p.endsOn}-${String(p.premium)}`} a={a} p={p} />
                  <CancelarApolice p={p} />
                </div>
              ),
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {escreve ? (
        <div>
          <EditarApolice a={a} />
        </div>
      ) : null}
      <Tabela rotulo="Seguros do activo" colunas={colunas} linhas={lista.data} chave={(p) => p.policyId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} /> : undefined} vazio="Sem apólices." />
    </div>
  );
}

// --- Página

const VISTAS: readonly Vista<"plano" | "manutencao" | "custodia" | "seguros">[] = [
  { valor: "plano", texto: "Amortização" },
  { valor: "manutencao", texto: "Manutenção" },
  { valor: "custodia", texto: "Custódia" },
  { valor: "seguros", texto: "Seguros" },
];

export default function Activo() {
  const { assetId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useActivo(assetId);
  const vista = useVista(VISTAS);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/activos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Activos fixos
      </Link>
    </Button>
  );
  if (q.isPending) return <CarregandoPagina />;
  if (q.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} />
      </>
    );
  }
  const f = q.data;
  const a = f.asset;
  const emUso = a.status === "Active";
  const jaAmortizado = f.schedule.some((l) => l.recorded);
  const colunasPlano: Coluna<LinhaPlano>[] = [
    { id: "mes", cabecalho: "Mês", celula: (l) => `${nomeMes(Number(l.month.slice(5, 7)))} ${l.month.slice(0, 4)}` },
    { id: "quota", cabecalho: "Quota", alinhar: "direita", celula: (l) => moeda(l.amount, a.currency) },
    { id: "acumulada", cabecalho: "Acumulada", alinhar: "direita", esconderAte: "sm", celula: (l) => moeda(l.accumulatedAfter, a.currency) },
    { id: "liquido", cabecalho: "Valor líquido", alinhar: "direita", esconderAte: "md", celula: (l) => moeda(l.netBookValueAfter, a.currency) },
    { id: "registada", cabecalho: "", celula: (l) => (l.recorded ? <Badge tom="sucesso">Registada</Badge> : <Badge>Prevista</Badge>) },
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={a.name}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoActivo estado={a.status} />
            <span>
              {a.code}
              {a.category ? ` · ${a.category}` : ""}
              {a.location ? ` · ${a.location}` : ""}
            </span>
          </span>
        }
        accao={
          emUso ? (
            <Can requer="finance.assets.write">
              <div className="flex flex-wrap gap-2">
                <Abater a={a} />
                {!jaAmortizado ? <Corrigir key={`${a.name}-${String(a.acquisitionCost)}`} a={a} /> : null}
              </div>
            </Can>
          ) : undefined
        }
      />
      {!emUso ? <Alert tom="info" className="mb-4" titulo={`Abatido a ${a.disposedOn ? formatarData(a.disposedOn) : "—"}${a.disposalValue !== null ? ` por ${moeda(a.disposalValue, a.currency)}` : ""}${a.disposalReason ? `: ${a.disposalReason}` : "."}`} /> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Custo de aquisição", moeda(a.acquisitionCost, a.currency)],
            ["Valor residual", moeda(a.residualValue, a.currency)],
            ["Amortizado", moeda(a.accumulatedDepreciation, a.currency)],
            ["Valor líquido", moeda(a.netBookValue, a.currency)],
          ] as const
        ).map(([r, x]) => (
          <Card key={r}>
            <p className="text-sm text-muted-foreground">{r}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{x}</p>
          </Card>
        ))}
      </div>
      <Card className="mb-6">
        <CardTitle>Plano</CardTitle>
        <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[14rem_1fr]">
          <dt className="text-muted-foreground">Método</dt>
          <dd>
            {METODOS[a.method as keyof typeof METODOS] ?? a.method}
            {a.annualRate !== null ? ` · ${String(a.annualRate).replace(".", ",")} % ao ano` : ""}
            {a.totalUnits !== null ? ` · ${String(a.totalUnits).replace(".", ",")} unidades` : ""}
          </dd>
          <dt className="text-muted-foreground">Vida útil</dt>
          <dd>{String(a.usefulLifeMonths)} meses</dd>
          <dt className="text-muted-foreground">Adquirido · amortiza desde</dt>
          <dd>
            {formatarData(a.acquiredOn)} · {formatarData(a.depreciationStartsOn)}
          </dd>
          {a.serialNumber ? (
            <>
              <dt className="text-muted-foreground">N.º de série</dt>
              <dd>{a.serialNumber}</dd>
            </>
          ) : null}
        </dl>
        {jaAmortizado && emUso && pode("finance.assets.write") ? <p className="mt-3 text-xs text-muted-foreground">Já tem amortização registada: o plano não se corrige.</p> : null}
      </Card>
      <Vistas rotulo="Activo" vistas={VISTAS} actual={vista} />
      {vista === "manutencao" ? (
        <ManutencaoDoActivo f={f} />
      ) : vista === "custodia" ? (
        <CustodiaDoActivo a={a} />
      ) : vista === "seguros" ? (
        <SegurosDoActivo a={a} />
      ) : (
        <Tabela rotulo="Plano de amortização" colunas={colunasPlano} linhas={f.schedule} chave={(l) => l.month} aCarregar={false} vazio="Sem plano de amortização." />
      )}
    </>
  );
}
