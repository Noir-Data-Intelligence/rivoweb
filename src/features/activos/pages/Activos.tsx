/**
 * Activos fixos: a lista (por estado e categoria), registar, correr a
 * amortização de um mês; e as vistas de toda a manutenção, das entregas a
 * colaboradores e dos seguros (a caducar em 30, 60 ou 90 dias).
 */
import Big from "big.js";
import { Calculator, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { useFornecedores } from "@/features/pagar";
import { useTodosCentrosCusto } from "@/features/planeamento";
import { formatarData, hojeIso } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Checkbox, Select } from "@/ui/Controlos";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useActivos, useApolices, useCorrerAmortizacao, useCustodias, useManutencoes, useRegistarActivo, type Activo, type Apolice, type Custodia, type Manutencao, type PedidoActivo } from "../api";
import { EstadoActivo, EstadoManutencao, TIPO_MANUTENCAO } from "../comum";
import { errosActivo, METODOS, type CamposActivo, type MetodoAmortizacao } from "../regras";

const opc = (v: string) => {
  const n = normalizarTexto(v);
  return n === "" ? null : n;
};
const texto = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));

export const camposDe = (a?: Activo): CamposActivo => ({
  codigo: a?.code ?? "",
  nome: a?.name ?? "",
  categoria: a?.category ?? "",
  localizacao: a?.location ?? "",
  serie: a?.serialNumber ?? "",
  aquisicao: a?.acquiredOn ?? hojeIso(),
  inicio: a?.depreciationStartsOn ?? "",
  custo: texto(a?.acquisitionCost),
  residual: texto(a?.residualValue),
  metodo: (a?.method as MetodoAmortizacao | undefined) ?? "StraightLine",
  vida: a ? String(a.usefulLifeMonths) : "",
  taxa: texto(a?.annualRate),
  unidades: texto(a?.totalUnits),
});

/** Corpo do registo/correcção (o `PUT` substitui tudo: o que não se edita aqui vem do activo). */
export function corpoActivo(v: CamposActivo, extra: { centro: string; fornecedor: string; moeda: string; factura: string | null }): PedidoActivo | null {
  const custo = lerDinheiroDigitado(v.custo);
  if (!custo) return null;
  const residual = v.residual.trim() === "" ? null : lerDinheiroDigitado(v.residual);
  const taxa = v.metodo === "DecliningBalance" ? lerDecimalDigitado(v.taxa, 4) : null;
  const unidades = v.metodo === "UnitsOfProduction" ? lerDecimalDigitado(v.unidades, 4) : null;
  return {
    code: opc(v.codigo)?.toUpperCase() ?? null,
    name: normalizarTexto(v.nome),
    category: opc(v.categoria),
    location: opc(v.localizacao),
    serialNumber: opc(v.serie),
    costCentreId: extra.centro === "" ? null : extra.centro,
    supplierId: extra.fornecedor === "" ? null : extra.fornecedor,
    purchaseInvoiceId: extra.factura,
    acquiredOn: v.aquisicao,
    depreciationStartsOn: v.inicio === "" ? null : v.inicio,
    acquisitionCost: paraApi(custo),
    residualValue: residual ? paraApi(residual) : null,
    currency: extra.moeda,
    method: v.metodo,
    usefulLifeMonths: Number(v.vida),
    annualRate: taxa ? decimalParaApi(taxa) : null,
    totalUnits: unidades ? decimalParaApi(unidades) : null,
  };
}

/** Os campos do activo (registar e corrigir). */
export function CamposDoActivo({ v, mudar, erros, categorias, centro, setCentro, fornecedor, setFornecedor, aberto }: {
  v: CamposActivo;
  mudar: (k: keyof CamposActivo, x: string) => void;
  erros: Partial<Record<keyof CamposActivo, string>>;
  categorias: string[];
  centro: string;
  setCentro: (x: string) => void;
  fornecedor: string;
  setFornecedor: (x: string) => void;
  aberto: boolean;
}) {
  const { pode } = useUtilizador();
  const centros = useTodosCentrosCusto(aberto && pode("finance.planning.read"));
  const fornecedores = useFornecedores({ pagina: 1, tamanho: 200, inactivos: false }, aberto && pode("procurement.suppliers.read"));
  const idLista = useId();
  return (
    <>
      <Field rotulo="Nome" erro={erros.nome} className="sm:col-span-2">
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => mudar("nome", e.target.value)} />}
      </Field>
      <Field rotulo="Código (opcional)" erro={erros.codigo} ajuda="Vazio: o servidor gera um.">
        {({ id, descricao, invalido }) => <Input id={id} maxLength={40} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.codigo} onChange={(e) => mudar("codigo", e.target.value)} />}
      </Field>
      <Field rotulo="Categoria (opcional)" erro={erros.categoria}>
        {({ id, descricao, invalido }) => (
          <>
            <Input id={id} list={idLista} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.categoria} onChange={(e) => mudar("categoria", e.target.value)} />
            <datalist id={idLista}>
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field rotulo="Localização (opcional)" erro={erros.localizacao}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.localizacao} onChange={(e) => mudar("localizacao", e.target.value)} />}
      </Field>
      <Field rotulo="N.º de série (opcional)" erro={erros.serie}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.serie} onChange={(e) => mudar("serie", e.target.value)} />}
      </Field>
      {pode("finance.planning.read") ? (
        <Field rotulo="Centro de custo (opcional)">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={centro} onChange={(e) => setCentro(e.target.value)}>
              <option value="">Nenhum</option>
              {(centros.data?.items ?? []).map((c) => (
                <option key={c.costCentreId} value={c.costCentreId}>
                  {c.code} · {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      {pode("procurement.suppliers.read") ? (
        <Field rotulo="Fornecedor (opcional)">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)}>
              <option value="">Nenhum</option>
              {(fornecedores.data?.items ?? []).map((f) => (
                <option key={f.supplierId} value={f.supplierId}>
                  {f.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      <Field rotulo="Adquirido a" erro={erros.aquisicao}>
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.aquisicao} onChange={(e) => mudar("aquisicao", e.target.value)} />}
      </Field>
      <Field rotulo="Amortização começa a (opcional)" erro={erros.inicio} ajuda="Vazio: o mês seguinte ao da aquisição.">
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => mudar("inicio", e.target.value)} />}
      </Field>
      <Field rotulo="Custo de aquisição" erro={erros.custo}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.custo} onChange={(e) => mudar("custo", e.target.value)} />}
      </Field>
      <Field rotulo="Valor residual (opcional)" erro={erros.residual}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.residual} onChange={(e) => mudar("residual", e.target.value)} />}
      </Field>
      <Field rotulo="Método de amortização">
        {({ id, descricao }) => (
          <Select id={id} aria-describedby={descricao} value={v.metodo} onChange={(e) => mudar("metodo", e.target.value)}>
            {Object.entries(METODOS).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field rotulo="Vida útil (meses)" erro={erros.vida}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.vida} onChange={(e) => mudar("vida", e.target.value)} />}
      </Field>
      {v.metodo === "DecliningBalance" ? (
        <Field rotulo="Taxa anual (%)" erro={erros.taxa}>
          {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.taxa} onChange={(e) => mudar("taxa", e.target.value)} />}
        </Field>
      ) : null}
      {v.metodo === "UnitsOfProduction" ? (
        <Field rotulo="Total de unidades esperado" erro={erros.unidades}>
          {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.unidades} onChange={(e) => mudar("unidades", e.target.value)} />}
        </Field>
      ) : null}
    </>
  );
}

function RegistarActivo({ categorias }: { categorias: string[] }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposActivo>(camposDe);
  const [centro, setCentro] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [moedaA, setMoeda] = useState("AOA");
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarActivo();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosActivo(v);
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      registar.reset();
      setTentou(false);
      setV(camposDe());
      setCentro("");
      setFornecedor("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar activo
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Registar um activo fixo"
        descricao="O plano de amortização calcula-se a partir do custo, do residual, do método e da vida útil. Depois da primeira amortização registada, o plano não se altera."
        rotuloConfirmar="Registar"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const corpo = corpoActivo(v, { centro, fornecedor, moeda: moedaA, factura: null });
            if (Object.keys(erros).length > 0 || !corpo || registar.isPending) return;
            registar.mutate(corpo, { onSuccess: (r) => void navegar(`/activos/${r.id}`) });
          }}
        >
          <CamposDoActivo v={v} mudar={(k, x) => setV((y) => ({ ...y, [k]: x }))} erros={tentou ? erros : {}} categorias={categorias} centro={centro} setCentro={setCentro} fornecedor={fornecedor} setFornecedor={setFornecedor} aberto={aberto} />
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moedaA} onChange={(e) => setMoeda(e.target.value)}>
                {["AOA", "USD", "EUR"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function CorrerAmortizacao({ activos }: { activos: Activo[] }) {
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(hojeIso().slice(0, 7));
  const [unidades, setUnidades] = useState<Record<string, string>>({});
  const [tentou, setTentou] = useState(false);
  const correr = useCorrerAmortizacao();
  const idForm = useId();
  const porUnidades = activos.filter((a) => a.status === "Active" && a.method === "UnitsOfProduction");
  const errosUn = Object.fromEntries(porUnidades.map((a) => [a.assetId, (() => { const q = lerDecimalDigitado(unidades[a.assetId] ?? "", 4); return q === null || q.lt(0) ? "Unidades usadas no mês (até 4 casas)." : undefined; })()]));
  const erroMes = /^\d{4}-\d{2}$/.test(mes) ? undefined : "Escolha o mês.";
  const r = correr.data;
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Calculator strokeWidth={1.75} aria-hidden />
        Correr amortização
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            correr.reset();
            setTentou(false);
          }
        }}
        titulo="Correr a amortização de um mês"
        descricao="Regista a quota do mês para todos os activos em uso. Correr outra vez o mesmo mês não duplica nada."
        rotuloConfirmar={r ? "Fechar" : "Correr"}
        aCarregar={correr.isPending}
        erro={correr.error ? <ErrorPanel erro={correr.error} /> : undefined}
        {...(r ? { aoConfirmar: () => setAberto(false) } : { formulario: idForm })}
      >
        {r ? (
          <Alert tom={r.skipped.length > 0 ? "aviso" : "sucesso"} titulo={`${String(r.recorded)} ${Number(r.recorded) === 1 ? "activo amortizado" : "activos amortizados"}, ${String(r.alreadyRecorded)} já registados; total de ${moeda(r.total, "AOA")}.`}>
            {r.skipped.length > 0 ? `Saltados: ${r.skipped.join("; ")}` : null}
          </Alert>
        ) : (
          <form
            id={idForm}
            noValidate
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              if (erroMes || Object.values(errosUn).some(Boolean) || correr.isPending) return;
              correr.mutate({
                month: `${mes}-01`,
                unitsUsed: porUnidades.length === 0 ? null : porUnidades.map((a) => ({ assetId: a.assetId, units: decimalParaApi(lerDecimalDigitado(unidades[a.assetId] ?? "", 4) ?? new Big(0)) })),
              });
            }}
          >
            <Field rotulo="Mês" erro={tentou ? erroMes : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} type="month" aria-describedby={descricao} invalido={invalido} value={mes} onChange={(e) => setMes(e.target.value)} />}
            </Field>
            {porUnidades.map((a) => (
              <Field key={a.assetId} rotulo={`Unidades usadas: ${a.code} · ${a.name}`} erro={tentou ? errosUn[a.assetId] : undefined}>
                {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={unidades[a.assetId] ?? ""} onChange={(e) => setUnidades((u) => ({ ...u, [a.assetId]: e.target.value }))} />}
              </Field>
            ))}
          </form>
        )}
      </Confirmar>
    </>
  );
}

function ListaActivos() {
  const [params, setParams] = useSearchParams();
  const e = params.get("estado");
  const estado = e === "Active" || e === "Disposed" ? e : null;
  const categoria = params.get("categoria");
  const lista = useActivos({ estado, categoria });
  const todos = useActivos({ estado: null, categoria: null });
  const categorias = [...new Set((todos.data ?? []).map((a) => a.category).filter((c): c is string => Boolean(c)))].sort();
  const ids = { estado: useId(), categoria: useId() };
  const filtrar = (k: string, v: string) => {
    const n = new URLSearchParams(window.location.search);
    if (v === "") n.delete(k);
    else n.set(k, v);
    setParams(n);
  };
  const colunas: Coluna<Activo>[] = [
    {
      id: "nome",
      cabecalho: "Activo",
      celula: (a) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/activos/${a.assetId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {a.name}
          </Link>
          <span className="truncate text-sm text-muted-foreground">
            {a.code}
            {a.category ? ` · ${a.category}` : ""}
          </span>
        </div>
      ),
      className: "max-w-[20rem]",
    },
    { id: "aquisicao", cabecalho: "Adquirido a", esconderAte: "md", celula: (a) => formatarData(a.acquiredOn) },
    { id: "custo", cabecalho: "Custo", alinhar: "direita", esconderAte: "sm", celula: (a) => moeda(a.acquisitionCost, a.currency) },
    { id: "amortizado", cabecalho: "Amortizado", alinhar: "direita", esconderAte: "lg", celula: (a) => moeda(a.accumulatedDepreciation, a.currency) },
    { id: "liquido", cabecalho: "Valor líquido", alinhar: "direita", celula: (a) => moeda(a.netBookValue, a.currency) },
    { id: "estado", cabecalho: "Estado", celula: (a) => <EstadoActivo estado={a.status} /> },
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex w-40 flex-col gap-1.5">
            <label htmlFor={ids.estado} className="text-sm font-medium text-foreground">
              Estado
            </label>
            <Select id={ids.estado} value={estado ?? ""} onChange={(ev) => filtrar("estado", ev.target.value)}>
              <option value="">Todos</option>
              <option value="Active">Em uso</option>
              <option value="Disposed">Abatidos</option>
            </Select>
          </div>
          <div className="flex w-64 flex-col gap-1.5">
            <label htmlFor={ids.categoria} className="text-sm font-medium text-foreground">
              Categoria
            </label>
            <Select id={ids.categoria} value={categoria ?? ""} onChange={(ev) => filtrar("categoria", ev.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Can requer="finance.assets.write">
          <div className="flex flex-wrap gap-2">
            <CorrerAmortizacao activos={todos.data ?? []} />
            <RegistarActivo categorias={categorias} />
          </div>
        </Can>
      </div>
      <Tabela
        rotulo="Activos fixos"
        colunas={colunas}
        linhas={lista.data}
        chave={(a) => a.assetId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Sem activos com estes filtros."
      />
    </>
  );
}

function TodasManutencoes() {
  const [estado, setEstado] = useState<"Scheduled" | "Completed" | "Cancelled" | null>("Scheduled");
  const lista = useManutencoes({ activo: null, estado });
  const todos = useActivos({ estado: null, categoria: null });
  const nomeA = (id: string) => todos.data?.find((a) => a.assetId === id);
  const id = useId();
  const colunas: Coluna<Manutencao>[] = [
    { id: "data", cabecalho: "Data", celula: (m) => formatarData(m.scheduledOn) },
    {
      id: "activo",
      cabecalho: "Activo",
      celula: (m) => (
        <Link to={`/activos/${m.assetId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {nomeA(m.assetId)?.name ?? "Activo"}
        </Link>
      ),
    },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "sm", celula: (m) => TIPO_MANUTENCAO[m.kind as keyof typeof TIPO_MANUTENCAO] ?? m.kind },
    { id: "descricao", cabecalho: "Descrição", esconderAte: "md", celula: (m) => m.description },
    { id: "estado", cabecalho: "Estado", celula: (m) => <EstadoManutencao estado={m.status} /> },
  ];
  return (
    <>
      <div className="mb-4 flex w-48 flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Estado
        </label>
        <Select id={id} value={estado ?? ""} onChange={(e) => setEstado(e.target.value === "" ? null : (e.target.value as "Scheduled"))}>
          <option value="">Todas</option>
          <option value="Scheduled">Agendadas</option>
          <option value="Completed">Concluídas</option>
          <option value="Cancelled">Canceladas</option>
        </Select>
      </div>
      <Tabela rotulo="Manutenção" colunas={colunas} linhas={lista.data ? [...lista.data].sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn)) : undefined} chave={(m) => m.maintenanceId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} /> : undefined} vazio="Sem manutenções." />
    </>
  );
}

function TodasCustodias() {
  const [abertas, setAbertas] = useState(true);
  const lista = useCustodias({ activo: null, colaborador: null, abertas });
  const colunas: Coluna<Custodia>[] = [
    {
      id: "activo",
      cabecalho: "Activo",
      celula: (c) => (
        <Link to={`/activos/${c.assetId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {c.assetCode} · {c.assetName}
        </Link>
      ),
    },
    { id: "quem", cabecalho: "Com", celula: (c) => c.employeeName },
    { id: "desde", cabecalho: "Desde", esconderAte: "sm", celula: (c) => formatarData(c.assignedOn) },
    { id: "devolvido", cabecalho: "Devolvido", esconderAte: "md", celula: (c) => (c.returnedOn ? formatarData(c.returnedOn) : "—") },
  ];
  return (
    <>
      <div className="mb-4">
        <Checkbox rotulo="Só os que estão com alguém" checked={abertas} onChange={(e) => setAbertas(e.target.checked)} />
      </div>
      <Tabela rotulo="Custódia" colunas={colunas} linhas={lista.data} chave={(c) => c.custodyId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} /> : undefined} vazio="Sem entregas." />
    </>
  );
}

function TodosSeguros() {
  const [dias, setDias] = useState<number | null>(90);
  const lista = useApolices({ activo: null, dias });
  const id = useId();
  const colunas: Coluna<Apolice>[] = [
    {
      id: "apolice",
      cabecalho: "Apólice",
      celula: (p) => (
        <Link to={`/activos/${p.assetId}?vista=seguros`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {p.insurer} · {p.policyNumber}
        </Link>
      ),
    },
    { id: "periodo", cabecalho: "Vigência", esconderAte: "sm", celula: (p) => `${formatarData(p.startsOn)} a ${formatarData(p.endsOn)}` },
    { id: "premio", cabecalho: "Prémio", alinhar: "direita", esconderAte: "md", celula: (p) => moeda(p.premium, p.currency) },
    { id: "prazo", cabecalho: "Caduca", celula: (p) => (p.cancelled ? <Badge>Cancelada</Badge> : Number(p.daysToExpiry) < 0 ? <Badge>Caducada</Badge> : <Badge tom={Number(p.daysToExpiry) <= 30 ? "aviso" : "info"}>{`em ${String(p.daysToExpiry)} dias`}</Badge>) },
  ];
  return (
    <>
      <div className="mb-4 flex w-48 flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          A caducar
        </label>
        <Select id={id} value={dias === null ? "" : String(dias)} onChange={(e) => setDias(e.target.value === "" ? null : Number(e.target.value))}>
          <option value="30">Em 30 dias</option>
          <option value="60">Em 60 dias</option>
          <option value="90">Em 90 dias</option>
          <option value="">Todas</option>
        </Select>
      </div>
      <Tabela rotulo="Seguros" colunas={colunas} linhas={lista.data} chave={(p) => p.policyId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} /> : undefined} vazio="Sem apólices neste prazo." />
    </>
  );
}

const VISTAS: readonly Vista<"activos" | "manutencao" | "custodia" | "seguros">[] = [
  { valor: "activos", texto: "Activos" },
  { valor: "manutencao", texto: "Manutenção" },
  { valor: "custodia", texto: "Custódia" },
  { valor: "seguros", texto: "Seguros" },
];

export default function Activos() {
  const vista = useVista(VISTAS);
  return (
    <>
      <PageHeader titulo="Activos fixos" descricao="Equipamento, mobiliário e instalações: amortização, manutenção, a quem estão entregues e seguros." />
      <Vistas rotulo="Activos fixos" vistas={VISTAS} actual={vista} />
      {vista === "manutencao" ? <TodasManutencoes /> : vista === "custodia" ? <TodasCustodias /> : vista === "seguros" ? <TodosSeguros /> : <ListaActivos />}
    </>
  );
}
