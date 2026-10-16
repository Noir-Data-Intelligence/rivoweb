/**
 * Benefícios: o catálogo (criar) e as adesões (aderir, cancelar). Um benefício
 * descontinuado não aceita adesões novas, mas mantém as existentes. Valor
 * mensal zero é válido (nem todo o benefício tem valor monetário).
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { FiltroColaborador, SelectColaborador, useFiltroColaborador, useNomeColaborador } from "../escolhas";
import { useAderir, useAdesoes, useBeneficios, useCancelarAdesao, useCriarBeneficio, useTodosBeneficios, type Adesao, type Beneficio } from "../gestao";

const MOEDAS = ["AOA", "USD", "EUR"] as const;

function CriarBeneficio() {
  const [aberto, setAberto] = useState(false);
  const [nomeB, setNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [valor, setValor] = useState("");
  const [moedaB, setMoeda] = useState<string>("AOA");
  const [descricao, setDescricao] = useState("");
  const [tentou, setTentou] = useState(false);
  const criar = useCriarBeneficio();
  const idForm = useId();
  const n = normalizarTexto(nomeB);
  const t = normalizarTexto(tipo).toLowerCase();
  const v = lerDinheiroDigitado(valor.trim() === "" ? "0" : valor);
  const erros = {
    nome: n === "" ? "Indique o nome." : undefined,
    tipo: t === "" ? "Indique o tipo (saúde, transporte…)." : undefined,
    valor: v === null ? "Valor inválido (até 2 casas decimais)." : v.lt(0) ? "Não pode ser negativo." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      criar.reset();
      setTentou(false);
      setNome("");
      setTipo("");
      setValor("");
      setDescricao("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo benefício
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Novo benefício"
        descricao="Entra no catálogo e fica disponível para adesões."
        rotuloConfirmar="Criar"
        aCarregar={criar.isPending}
        erro={criar.error ? <ErrorPanel erro={criar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.nome || erros.tipo || erros.valor || v === null || criar.isPending) return;
            const d = normalizarTexto(descricao, true);
            criar.mutate({ name: n, kind: t, monthlyValue: paraApi(v), currency: moedaB, description: d === "" ? null : d }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao: d, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={d} invalido={invalido} value={nomeB} onChange={(e) => setNome(e.target.value)} />}
          </Field>
          <Field rotulo="Tipo" erro={tentou ? erros.tipo : undefined} ajuda="Texto livre: saúde, transporte, alimentação…">
            {({ id, descricao: d, invalido }) => <Input id={id} maxLength={50} autoComplete="off" aria-describedby={d} invalido={invalido} value={tipo} onChange={(e) => setTipo(e.target.value)} />}
          </Field>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field rotulo="Valor mensal" erro={tentou ? erros.valor : undefined}>
              {({ id, descricao: d, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" placeholder="0" aria-describedby={d} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
            </Field>
            <Field rotulo="Moeda">
              {({ id, descricao: d }) => (
                <Select id={id} aria-describedby={d} value={moedaB} onChange={(e) => setMoeda(e.target.value)}>
                  {MOEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Field rotulo="Descrição (opcional)" className="sm:col-span-2">
            {({ id, descricao: d }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={d} value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export function Aderir({ colaboradorFixo }: { colaboradorFixo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? "");
  const [beneficio, setBeneficio] = useState("");
  const [inicio, setInicio] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const aderir = useAderir();
  const catalogo = useTodosBeneficios();
  const idForm = useId();
  const erros = { colaborador: colaborador ? undefined : "Escolha o colaborador.", beneficio: beneficio ? undefined : "Escolha o benefício." };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      aderir.reset();
      setTentou(false);
      setBeneficio("");
      if (!colaboradorFixo) setColaborador("");
    }
  };
  return (
    <>
      <Button variante={colaboradorFixo ? "primary" : "secondary"} onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Aderir a um benefício
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Aderir a um benefício"
        descricao="Só os benefícios activos aceitam adesões."
        rotuloConfirmar="Aderir"
        aCarregar={aderir.isPending}
        erro={aderir.error ? <ErrorPanel erro={aderir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.colaborador || erros.beneficio || aderir.isPending) return;
            aderir.mutate({ employeeId: colaborador, benefitId: beneficio, startsOn: inicio || null }, { onSuccess: () => mudar(false) });
          }}
        >
          {colaboradorFixo ? null : (
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined}>
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Field rotulo="Benefício" erro={tentou ? erros.beneficio : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={beneficio} onChange={(e) => setBeneficio(e.target.value)}>
                <option value="">Escolha…</option>
                {(catalogo.data?.items ?? [])
                  .filter((b) => b.isActive)
                  .map((b) => (
                    <option key={b.benefitId} value={b.benefitId}>
                      {b.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Início">
            {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={inicio} onChange={(e) => setInicio(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function CancelarAdesao({ a, nomeBeneficio }: { a: Adesao; nomeBeneficio: string }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeIso());
  const cancelar = useCancelarAdesao();
  const erro = !data ? "Indique a data." : data < a.startsOn ? "O cancelamento não pode ser anterior ao início da adesão." : undefined;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Cancelar a adesão a ${nomeBeneficio}`}>
        Cancelar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(v) => {
          setAberto(v);
          if (!v) cancelar.reset();
        }}
        titulo={`Cancelar a adesão a ${nomeBeneficio}?`}
        descricao="A adesão termina na data indicada."
        rotuloConfirmar="Cancelar adesão"
        variante="destructive"
        aCarregar={cancelar.isPending}
        erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
        aoConfirmar={() => (erro || cancelar.isPending ? undefined : cancelar.mutate({ enrolmentId: a.enrolmentId, on: data }, { onSuccess: () => setAberto(false) }))}
      >
        <Field rotulo="Data de fim" erro={erro}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" min={a.startsOn} aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

export function ListaAdesoes({ colaborador, comNome }: { colaborador: string | null; comNome: boolean }) {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useAdesoes({ colaborador, pagina, tamanho });
  const catalogo = useTodosBeneficios();
  const nomeDe = useNomeColaborador();
  const beneficio = (id: string): Beneficio | undefined => catalogo.data?.items.find((b) => b.benefitId === id);
  const nomeBeneficio = (id: string) => beneficio(id)?.name ?? (catalogo.data ? "Benefício fora da lista" : "…");
  const colunas: Coluna<Adesao>[] = [
    ...(comNome
      ? [
          {
            id: "colaborador",
            cabecalho: "Colaborador",
            celula: (a: Adesao) => (
              <Link to={`/colaboradores/${a.employeeId}?vista=beneficios`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {nomeDe(a.employeeId)}
              </Link>
            ),
          } satisfies Coluna<Adesao>,
        ]
      : []),
    { id: "beneficio", cabecalho: "Benefício", celula: (a) => nomeBeneficio(a.benefitId) },
    { id: "valor", cabecalho: "Valor mensal", alinhar: "direita", esconderAte: "md", celula: (a) => { const b = beneficio(a.benefitId); return b ? moeda(b.monthlyValue, b.currency) : "—"; } },
    { id: "desde", cabecalho: "Desde", esconderAte: "sm", celula: (a) => formatarData(a.startsOn) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (a) => (a.status === "Active" ? <Badge tom="sucesso">Activa</Badge> : <Badge>{a.cancelledOn ? `Cancelada a ${formatarData(a.cancelledOn)}` : "Cancelada"}</Badge>),
    },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (a) => (a.status === "Active" ? <Can requer="hr.benefits.write"><CancelarAdesao a={a} nomeBeneficio={nomeBeneficio(a.benefitId)} /></Can> : null) },
  ];
  return (
    <Tabela
      rotulo="Adesões"
      colunas={colunas}
      linhas={lista.data?.items}
      chave={(a) => a.enrolmentId}
      aCarregar={lista.isPending}
      erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
      vazio="Sem adesões."
      rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
    />
  );
}

function Catalogo() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useBeneficios({ pagina, tamanho });
  const colunas: Coluna<Beneficio>[] = [
    {
      id: "nome",
      cabecalho: "Benefício",
      celula: (b) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{b.name}</span>
          {b.description ? <span className="truncate text-sm text-muted-foreground">{b.description}</span> : null}
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "sm", celula: (b) => b.kind },
    { id: "valor", cabecalho: "Valor mensal", alinhar: "direita", celula: (b) => moeda(b.monthlyValue, b.currency) },
    { id: "estado", cabecalho: "Estado", celula: (b) => (b.isActive ? <Badge tom="sucesso">Activo</Badge> : <Badge>Descontinuado</Badge>) },
  ];
  return (
    <Tabela
      rotulo="Catálogo de benefícios"
      colunas={colunas}
      linhas={lista.data?.items}
      chave={(b) => b.benefitId}
      aCarregar={lista.isPending}
      erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
      vazio="Ainda não há benefícios."
      rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
    />
  );
}

const VISTAS: readonly Vista<"adesoes" | "catalogo">[] = [
  { valor: "adesoes", texto: "Adesões" },
  { valor: "catalogo", texto: "Catálogo" },
];

export default function Beneficios() {
  const vista = useVista(VISTAS);
  const { colaborador, mudar } = useFiltroColaborador();
  return (
    <>
      <PageHeader
        titulo="Benefícios"
        descricao="O catálogo da empresa e quem aderiu a quê."
        accao={<Can requer="hr.benefits.write">{vista === "catalogo" ? <CriarBeneficio /> : <Aderir />}</Can>}
      />
      <Vistas rotulo="Benefícios" vistas={VISTAS} actual={vista} />
      {vista === "catalogo" ? (
        <Catalogo />
      ) : (
        <>
          <div className="mb-4">
            <FiltroColaborador colaborador={colaborador} mudar={mudar} />
          </div>
          <ListaAdesoes colaborador={colaborador} comNome />
        </>
      )}
    </>
  );
}
