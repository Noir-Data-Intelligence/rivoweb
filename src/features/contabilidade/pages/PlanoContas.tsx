/**
 * Plano de contas (§5.7): as contas (categorias do SAF-T AO), as versões do
 * plano e as classes de reporte que levam cada conta ao balanço ou aos
 * resultados.
 */
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas } from "@/ui/Vistas";
import {
  useAbrirContaRazao,
  useApagarClasseReporte,
  useClassesReporte,
  useContasRazao,
  useCriarVersaoPlano,
  useDesactivarContaRazao,
  useGuardarClasseReporte,
  useVersoesPlano,
  type ClasseReporte,
  type ContaRazao,
  type PedidoContaRazao,
  type VersaoPlano,
} from "../api";
import { CATEGORIAS_CONTA, CLASSES_REPORTE, textoDe } from "../comum";

// Contas

/** As regras do servidor (`LedgerAccount`) para a conta-mãe. Uma mãe que não está na lista, o servidor confirma. */
function problemaContaMae(categoria: string, pai: string, contas: readonly ContaRazao[]): string | undefined {
  if (categoria === "GR" || categoria === "AR") return undefined;
  if (pai === "") return "Uma conta abaixo do 1.º grau tem conta-mãe.";
  const mae = contas.find((x) => x.code === pai);
  if (!mae) return undefined;
  if (mae.acceptsPostings) return `${mae.code} é conta de movimento e não agrega outras.`;
  if (mae.isAnalytic !== categoria.startsWith("A")) return "A conta e a mãe são de contabilidades diferentes (geral e analítica).";
  return undefined;
}

function AbrirConta({ contas }: { contas: readonly ContaRazao[] }) {
  const [aberto, setAberto] = useState(false);
  const abrir = useAbrirContaRazao();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<PedidoContaRazao["category"]>("GM");
  const [pai, setPai] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const idLista = useId();
  const c = normalizarTexto(codigo).toUpperCase();
  const p = normalizarTexto(pai).toUpperCase();
  const agregadoras = contas.filter((x) => x.isActive && !x.acceptsPostings);
  const erros = {
    codigo: c === "" ? "Indique o código da conta." : c.length > 30 ? "No máximo 30 caracteres." : contas.some((x) => x.code === c) ? "Já existe uma conta com este código." : undefined,
    nome: normalizarTexto(nome) === "" ? "Indique a descrição." : undefined,
    pai: problemaContaMae(categoria, p, contas),
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      abrir.reset();
      setTentou(false);
      setCodigo("");
      setNome("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir conta
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Abrir uma conta"
        descricao="Só as contas de movimento (GM, AM) recebem lançamentos; as outras agregam."
        rotuloConfirmar="Abrir conta"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        formulario={idForm}
      >
        <datalist id={idLista}>
          {agregadoras.map((x) => (
            <option key={x.accountId} value={x.code}>
              {x.name}
            </option>
          ))}
        </datalist>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.codigo || erros.nome || erros.pai || abrir.isPending) return;
            abrir.mutate({ code: c, name: normalizarTexto(nome), category: categoria, parentCode: categoria === "GR" || categoria === "AR" ? null : p }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Categoria" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={categoria} onChange={(e) => setCategoria(e.target.value as PedidoContaRazao["category"])}>
                {CATEGORIAS_CONTA.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.valor} · {x.texto}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={codigo} onChange={(e) => setCodigo(e.target.value)} />}
          </Field>
          {categoria === "GR" || categoria === "AR" ? null : (
            <Field rotulo="Conta-mãe" erro={tentou ? erros.pai : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} list={idLista} maxLength={30} autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={pai} onChange={(e) => setPai(e.target.value)} />}
            </Field>
          )}
          <Field rotulo="Descrição" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function DesactivarConta({ conta }: { conta: ContaRazao }) {
  const [aberto, setAberto] = useState(false);
  const desactivar = useDesactivarContaRazao();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Desactivar a conta ${conta.code}`}>
        Desactivar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (setAberto(a), a ? undefined : desactivar.reset())}
        titulo={`Desactivar a conta ${conta.code}`}
        descricao="A conta deixa de aceitar lançamentos novos. O histórico fica."
        rotuloConfirmar="Desactivar"
        variante="destructive"
        aCarregar={desactivar.isPending}
        erro={desactivar.error ? <ErrorPanel erro={desactivar.error} /> : undefined}
        aoConfirmar={() => desactivar.mutate(conta.accountId, { onSuccess: () => setAberto(false) })}
      />
    </>
  );
}

function Contas() {
  const { pode } = useUtilizador();
  const [inactivas, setInactivas] = useState(false);
  const [filtro, setFiltro] = useState("");
  const contas = useContasRazao(inactivas);
  const escreve = pode("finance.ledger.write");
  const f = normalizarTexto(filtro).toLowerCase();
  const visiveis = (contas.data ?? []).filter((c) => f === "" || c.code.toLowerCase().startsWith(f) || c.name.toLowerCase().includes(f));
  const colunas: Coluna<ContaRazao>[] = [
    { id: "codigo", cabecalho: "Código", celula: (c) => <span className="font-medium tabular-nums">{c.code}</span> },
    { id: "nome", cabecalho: "Descrição", celula: (c) => c.name },
    { id: "categoria", cabecalho: "Categoria", esconderAte: "md", celula: (c) => <span title={textoDe(CATEGORIAS_CONTA, c.category)}>{c.category}</span> },
    { id: "mae", cabecalho: "Conta-mãe", esconderAte: "lg", celula: (c) => c.parentCode ?? "—" },
    { id: "movimento", cabecalho: "Movimento", esconderAte: "sm", celula: (c) => (c.acceptsPostings ? "Sim" : "Não") },
    { id: "estado", cabecalho: "Estado", celula: (c) => (c.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>) },
    ...(escreve ? [{ id: "accoes", cabecalho: "Acções", celula: (c: ContaRazao) => (c.isActive ? <DesactivarConta conta={c} /> : null) } satisfies Coluna<ContaRazao>] : []),
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <Field rotulo="Procurar" className="w-64">
            {({ id, descricao }) => <Input id={id} type="search" autoComplete="off" placeholder="Código ou descrição" aria-describedby={descricao} value={filtro} onChange={(e) => setFiltro(e.target.value)} />}
          </Field>
          <Checkbox rotulo="Mostrar as inactivas" checked={inactivas} onChange={(e) => setInactivas(e.target.checked)} />
        </div>
        {escreve && contas.data ? <AbrirConta contas={contas.data} /> : null}
      </div>
      {contas.data && contas.data.length === 0 ? (
        <Alert tom="info" className="mb-4" titulo="O plano de contas ainda não foi carregado.">
          Sem contas não há lançamentos, balancete nem balanço. O plano é o do contabilista (PGC de Angola); entra conta a conta, da classe para o movimento.
        </Alert>
      ) : null}
      <Tabela
        rotulo="Plano de contas"
        colunas={colunas}
        linhas={visiveis}
        chave={(c) => c.accountId}
        aCarregar={contas.isPending}
        erro={contas.error ? <ErrorPanel erro={contas.error} tentarDeNovo={() => void contas.refetch()} /> : undefined}
        vazio={f ? "Nenhuma conta com esse código ou descrição." : "Ainda não há contas."}
      />
    </>
  );
}

// Versões do plano

function NovaVersaoPlano() {
  const [aberto, setAberto] = useState(false);
  const criar = useCriarVersaoPlano();
  const [nome, setNome] = useState("");
  const [versao, setVersao] = useState("");
  const [fonte, setFonte] = useState("");
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const erros = {
    nome: normalizarTexto(nome) === "" ? "Indique o nome." : undefined,
    versao: normalizarTexto(versao) === "" ? "Indique a versão." : undefined,
    fonte: normalizarTexto(fonte) === "" ? "Indique a fonte (diploma ou documento)." : undefined,
    de: IsoDate.safeParse(de).success ? undefined : "Indique a data de início.",
    ate: ate !== "" && (!IsoDate.safeParse(ate).success || ate < de) ? "O fim não pode ser antes do início." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      criar.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova versão
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Registar uma versão do plano de contas"
        descricao="Identifica o plano em vigor (por exemplo, PGC de Angola) e de onde veio."
        rotuloConfirmar="Registar versão"
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
            if (Object.values(erros).some(Boolean) || criar.isPending) return;
            criar.mutate(
              { jurisdiction: "AO", name: normalizarTexto(nome), version: normalizarTexto(versao), source: normalizarTexto(fonte), effectiveFrom: de, effectiveTo: ate === "" ? null : ate },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Field>
          <Field rotulo="Versão" erro={tentou ? erros.versao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={50} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={versao} onChange={(e) => setVersao(e.target.value)} />}
          </Field>
          <Field rotulo="Fonte" erro={tentou ? erros.fonte : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={fonte} onChange={(e) => setFonte(e.target.value)} />}
          </Field>
          <Field rotulo="Em vigor desde" erro={tentou ? erros.de : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={de} onChange={(e) => setDe(e.target.value)} />}
          </Field>
          <Field rotulo="Até (opcional)" erro={tentou ? erros.ate : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={ate} onChange={(e) => setAte(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Versoes() {
  const versoes = useVersoesPlano();
  const colunas: Coluna<VersaoPlano>[] = [
    { id: "nome", cabecalho: "Plano", celula: (v) => <span className="font-medium">{v.name}</span> },
    { id: "versao", cabecalho: "Versão", celula: (v) => v.version },
    { id: "jur", cabecalho: "País", esconderAte: "md", celula: (v) => v.jurisdiction },
    { id: "vigencia", cabecalho: "Vigência", esconderAte: "sm", celula: (v) => (v.effectiveTo ? `${formatarData(v.effectiveFrom)} a ${formatarData(v.effectiveTo)}` : `Desde ${formatarData(v.effectiveFrom)}`) },
    { id: "contas", cabecalho: "Contas", alinhar: "direita", celula: (v) => String(v.accountCount) },
    { id: "fonte", cabecalho: "Fonte", esconderAte: "lg", celula: (v) => v.source },
    { id: "estado", cabecalho: "Estado", celula: (v) => (v.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>) },
  ];
  return (
    <>
      <Can requer="finance.ledger.close">
        <div className="mb-4 flex justify-end">
          <NovaVersaoPlano />
        </div>
      </Can>
      <Tabela
        rotulo="Versões do plano de contas"
        colunas={colunas}
        linhas={versoes.data}
        chave={(v) => v.chartVersionId}
        aCarregar={versoes.isPending}
        erro={versoes.error ? <ErrorPanel erro={versoes.error} tentarDeNovo={() => void versoes.refetch()} /> : undefined}
        vazio="Ainda não há versões do plano."
      />
    </>
  );
}

// Classes de reporte

function GuardarClasse({ classe }: { classe: ClasseReporte | null }) {
  const [aberto, setAberto] = useState(false);
  const guardar = useGuardarClasseReporte();
  const [prefixo, setPrefixo] = useState(classe?.codePrefix ?? "");
  const [tipo, setTipo] = useState<string>(classe?.class ?? "Asset");
  const [seccao, setSeccao] = useState(classe?.section ?? "");
  const [ordem, setOrdem] = useState(classe ? String(classe.order) : "");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const p = normalizarTexto(prefixo).toUpperCase();
  const o = Number(ordem);
  const erros = {
    prefixo: p === "" ? "Indique o prefixo das contas (por exemplo 11, 43)." : undefined,
    seccao: normalizarTexto(seccao) === "" ? "Indique a rubrica." : undefined,
    ordem: ordem.trim() === "" || !Number.isInteger(o) || o < 0 ? "Indique a ordem (número inteiro)." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      guardar.reset();
      setTentou(false);
    }
  };
  return (
    <>
      {classe ? (
        <Button variante="ghost" tamanho="icone" onClick={() => setAberto(true)} aria-label={`Rever a classe do prefixo ${classe.codePrefix}`}>
          <Pencil strokeWidth={1.75} aria-hidden />
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Nova classe
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={classe ? `Prefixo ${classe.codePrefix}` : "Nova classe de reporte"}
        descricao="As contas que começam pelo prefixo entram nesta rubrica. Ganha o prefixo mais longo."
        rotuloConfirmar="Guardar"
        aCarregar={guardar.isPending}
        erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.prefixo || erros.seccao || erros.ordem || guardar.isPending) return;
            guardar.mutate(
              { ruleId: classe?.ruleId ?? null, codePrefix: p, class: tipo as PedidoClasse, section: normalizarTexto(seccao), order: o },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Prefixo das contas" erro={tentou ? erros.prefixo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={prefixo} onChange={(e) => setPrefixo(e.target.value)} />}
          </Field>
          <Field rotulo="Classe">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {CLASSES_REPORTE.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.texto}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Rubrica" erro={tentou ? erros.seccao : undefined} ajuda="O título da linha no relatório (por exemplo «Meios monetários»).">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={seccao} onChange={(e) => setSeccao(e.target.value)} />}
          </Field>
          <Field rotulo="Ordem" erro={tentou ? erros.ordem : undefined} ajuda="Posição da rubrica dentro da classe.">
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={ordem} onChange={(e) => setOrdem(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

type PedidoClasse = "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";

function ApagarClasse({ classe }: { classe: ClasseReporte }) {
  const [aberto, setAberto] = useState(false);
  const apagar = useApagarClasseReporte();
  return (
    <>
      <Button variante="ghost" tamanho="icone" onClick={() => setAberto(true)} aria-label={`Apagar a classe do prefixo ${classe.codePrefix}`}>
        <Trash2 strokeWidth={1.75} aria-hidden />
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (setAberto(a), a ? undefined : apagar.reset())}
        titulo={`Apagar a classe do prefixo ${classe.codePrefix}`}
        descricao="As contas com este prefixo passam a outro prefixo mais curto ou ficam sem classe no balanço e nos resultados."
        rotuloConfirmar="Apagar"
        variante="destructive"
        aCarregar={apagar.isPending}
        erro={apagar.error ? <ErrorPanel erro={apagar.error} /> : undefined}
        aoConfirmar={() => apagar.mutate(classe.ruleId, { onSuccess: () => setAberto(false) })}
      />
    </>
  );
}

function Reporte() {
  const { pode } = useUtilizador();
  const classes = useClassesReporte();
  const escreve = pode("finance.ledger.write");
  const ordemClasse = (c: string) => CLASSES_REPORTE.findIndex((x) => x.valor === c);
  const linhas = [...(classes.data ?? [])].sort((a, b) => ordemClasse(a.class) - ordemClasse(b.class) || Number(a.order) - Number(b.order) || a.codePrefix.localeCompare(b.codePrefix));
  const colunas: Coluna<ClasseReporte>[] = [
    { id: "prefixo", cabecalho: "Prefixo", celula: (c) => <span className="font-medium tabular-nums">{c.codePrefix}</span> },
    { id: "classe", cabecalho: "Classe", celula: (c) => textoDe(CLASSES_REPORTE, c.class) },
    { id: "rubrica", cabecalho: "Rubrica", celula: (c) => c.section },
    { id: "ordem", cabecalho: "Ordem", alinhar: "direita", esconderAte: "sm", celula: (c) => String(c.order) },
    ...(escreve
      ? [
          {
            id: "accoes",
            cabecalho: "Acções",
            celula: (c: ClasseReporte) => (
              <div className="flex gap-1">
                <GuardarClasse classe={c} />
                <ApagarClasse classe={c} />
              </div>
            ),
          } satisfies Coluna<ClasseReporte>,
        ]
      : []),
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">Cada conta entra no balanço ou nos resultados pela classe do prefixo mais longo que lhe corresponde. Contas sem classe aparecem à parte nos relatórios.</p>
        {escreve ? <GuardarClasse classe={null} /> : null}
      </div>
      <Tabela
        rotulo="Classes de reporte"
        colunas={colunas}
        linhas={linhas}
        chave={(c) => c.ruleId}
        aCarregar={classes.isPending}
        erro={classes.error ? <ErrorPanel erro={classes.error} tentarDeNovo={() => void classes.refetch()} /> : undefined}
        vazio="Ainda não há classes de reporte. Sem elas, o balanço e os resultados ficam com as contas todas «sem classe»."
      />
    </>
  );
}

const VISTAS = [
  { valor: "contas", texto: "Contas" },
  { valor: "versoes", texto: "Versões do plano" },
  { valor: "reporte", texto: "Classes de reporte" },
] as const;

export default function PlanoContas() {
  const vista = useVista(VISTAS);
  const conteudo: Record<(typeof VISTAS)[number]["valor"], ReactNode> = { contas: <Contas />, versoes: <Versoes />, reporte: <Reporte /> };
  return (
    <>
      <PageHeader titulo="Plano de contas" descricao="As contas da contabilidade geral e analítica, as versões do plano e como cada conta chega aos relatórios." />
      <Vistas rotulo="Plano de contas" vistas={VISTAS} actual={vista} />
      {vista ? conteudo[vista] : null}
    </>
  );
}
