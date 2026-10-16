/** Lançamentos e diários (§5.7): o razão por diário, ano e período. */
import { Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/text";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useVista, Vistas } from "@/ui/Vistas";
import { useAbrirDiario, useDiarios, useLancamentos, type Diario, type Lancamento } from "../api";
import { anosEscolha, textoDe, TIPOS_LANCAMENTO } from "../comum";

function ListaLancamentos() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar: mudarPagina } = usePaginacaoUrl();
  const diarios = useDiarios(true);
  const diario = params.get("diario");
  const a = Number(params.get("ano"));
  const ano = params.get("ano") !== null && Number.isInteger(a) && a >= 2000 ? a : null;
  const p = Number(params.get("periodo"));
  const periodo = ano !== null && params.get("periodo") !== null && Number.isInteger(p) && p >= 1 && p <= 16 ? p : null;
  const lista = useLancamentos({ diario, ano, periodo, pagina, tamanho });
  const ids = { diario: useId(), ano: useId(), periodo: useId() };
  const mudar = (chave: string, valor: string) =>
    setParams((x) => {
      const n = new URLSearchParams(x);
      if (valor === "") n.delete(chave);
      else n.set(chave, valor);
      if (chave === "ano" && valor === "") n.delete("periodo");
      n.delete("pagina");
      return n;
    });
  const colunas: Coluna<Lancamento>[] = [
    { id: "data", cabecalho: "Data", celula: (l) => formatarData(l.transactionDate) },
    {
      id: "numero",
      cabecalho: "Lançamento",
      celula: (l) => (
        <Link to={`/lancamentos/${l.entryId}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {l.journalCode} {l.archivalNumber}
        </Link>
      ),
    },
    { id: "descricao", cabecalho: "Descrição", esconderAte: "md", celula: (l) => l.description },
    { id: "periodo", cabecalho: "Período", esconderAte: "lg", celula: (l) => String(l.period) },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "lg", celula: (l) => textoDe(TIPOS_LANCAMENTO, l.type) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (l) => formatarMoeda(dinheiro(l.totalDebit)) },
    { id: "estado", cabecalho: "Estado", celula: (l) => (l.isVoided ? <Badge tom="erro">Estornado</Badge> : <Badge tom="sucesso">Lançado</Badge>) },
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex w-56 flex-col gap-1.5">
          <label htmlFor={ids.diario} className="text-sm font-medium text-foreground">
            Diário
          </label>
          <Select id={ids.diario} value={diario ?? ""} onChange={(e) => mudar("diario", e.target.value)} aria-busy={diarios.isPending || undefined}>
            <option value="">Todos</option>
            {(diarios.data ?? []).map((d) => (
              <option key={d.journalId} value={d.journalId}>
                {d.code} · {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex w-32 flex-col gap-1.5">
          <label htmlFor={ids.ano} className="text-sm font-medium text-foreground">
            Ano
          </label>
          <Select id={ids.ano} value={ano ?? ""} onChange={(e) => mudar("ano", e.target.value)}>
            <option value="">Todos</option>
            {anosEscolha().map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </div>
        {ano !== null ? (
          <div className="flex w-44 flex-col gap-1.5">
            <label htmlFor={ids.periodo} className="text-sm font-medium text-foreground">
              Período
            </label>
            <Select id={ids.periodo} value={periodo ?? ""} onChange={(e) => mudar("periodo", e.target.value)}>
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} · {nomeMes(m)}
                </option>
              ))}
              {[13, 14, 15, 16].map((m) => (
                <option key={m} value={m}>
                  {m} · Regularização
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
      <Tabela
        rotulo="Lançamentos"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(l) => l.entryId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há lançamentos com estes filtros."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudarPagina} /> : undefined}
      />
    </>
  );
}

function AbrirDiario() {
  const [aberto, setAberto] = useState(false);
  const abrir = useAbrirDiario();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const c = normalizarTexto(codigo).toUpperCase();
  const erros = {
    codigo: c === "" ? "Indique o código do diário." : c.length > 30 ? "No máximo 30 caracteres." : undefined,
    nome: normalizarTexto(nome) === "" ? "Indique o nome." : undefined,
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
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir diário
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Abrir um diário"
        descricao="Agrupa os lançamentos (vendas, compras, bancos, operações diversas). O código entra no número de cada lançamento."
        rotuloConfirmar="Abrir diário"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.codigo || erros.nome || abrir.isPending) return;
            abrir.mutate({ code: c, name: normalizarTexto(nome) }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={codigo} onChange={(e) => setCodigo(e.target.value)} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function ListaDiarios() {
  const diarios = useDiarios(true);
  const colunas: Coluna<Diario>[] = [
    { id: "codigo", cabecalho: "Código", celula: (d) => <span className="font-medium">{d.code}</span>, ordenar: (d) => d.code },
    { id: "nome", cabecalho: "Nome", celula: (d) => d.name, ordenar: (d) => d.name },
    { id: "estado", cabecalho: "Estado", celula: (d) => (d.isActive ? <Badge tom="sucesso">Activo</Badge> : <Badge>Inactivo</Badge>) },
  ];
  return (
    <>
      <Can requer="finance.ledger.write">
        <div className="mb-4 flex justify-end">
          <AbrirDiario />
        </div>
      </Can>
      <Tabela
        rotulo="Diários"
        colunas={colunas}
        linhas={diarios.data}
        chave={(d) => d.journalId}
        aCarregar={diarios.isPending}
        erro={diarios.error ? <ErrorPanel erro={diarios.error} tentarDeNovo={() => void diarios.refetch()} /> : undefined}
        vazio="Ainda não há diários. Abra o primeiro antes de lançar."
        ordenavel
      />
    </>
  );
}

const VISTAS = [
  { valor: "lancamentos", texto: "Lançamentos" },
  { valor: "diarios", texto: "Diários" },
] as const;

export default function Lancamentos() {
  const { pode } = useUtilizador();
  const vista = useVista(VISTAS);
  const conteudo: Record<(typeof VISTAS)[number]["valor"], ReactNode> = { lancamentos: <ListaLancamentos />, diarios: <ListaDiarios /> };
  return (
    <>
      <PageHeader
        titulo="Lançamentos"
        descricao="O razão: cada lançamento com as suas linhas a débito e a crédito."
        accao={
          pode("finance.ledger.write") ? (
            <Button asChild>
              <Link to="/lancamentos/novo">
                <Plus strokeWidth={1.75} aria-hidden />
                Novo lançamento
              </Link>
            </Button>
          ) : null
        }
      />
      <Vistas rotulo="Razão" vistas={VISTAS} actual={vista} />
      {vista ? conteudo[vista] : null}
    </>
  );
}
