/**
 * Oportunidades (§5.12, F11): o quadro (uma coluna por etapa aberta, com
 * «Mover para» em cada cartão, sem arrastar) e a lista com todas as etapas,
 * ganhas e perdidas incluídas. A vista e a etapa ficam no URL.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { dinheiro } from "@/lib/money/money";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { Paginacao } from "@/ui/Paginacao";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useGuardarOportunidade, useMoverOportunidade, useOportunidadesPagina, useQuadro, type Etapa, type EtapaAberta, type Oportunidade } from "../api";
import { ETAPAS, ETAPAS_ABERTAS, EtapaBadge, NomeCliente } from "../comum";
import { CamposDaOportunidade, OPORTUNIDADE_VAZIA } from "../FormularioOportunidade";
import { errosOportunidade, oportunidadeParaApi, temErros } from "../regras";

function NovaOportunidade() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(OPORTUNIDADE_VAZIA);
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarOportunidade();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosOportunidade(v, true);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(OPORTUNIDADE_VAZIA);
      setTentou(false);
      guardar.reset();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova oportunidade
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Nova oportunidade"
        descricao="Começa em Prospecção."
        rotuloConfirmar="Registar"
        aCarregar={guardar.isPending}
        erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
        formulario={idForm}
        largo
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: null, corpo: oportunidadeParaApi(v) }, { onSuccess: (id) => void navegar(`/oportunidades/${id}`) });
          }}
        >
          <CamposDaOportunidade v={v} setV={setV} erros={tentou ? erros : {}} nova />
        </form>
      </Confirmar>
    </>
  );
}

/** Somas por moeda (o valor e o ponderado). */
function totais(xs: readonly Oportunidade[]) {
  const m = new Map<string, { total: ReturnType<typeof dinheiro>; ponderado: ReturnType<typeof dinheiro> }>();
  for (const o of xs) {
    const t = m.get(o.currency) ?? { total: dinheiro(0), ponderado: dinheiro(0) };
    m.set(o.currency, { total: dinheiro(t.total.plus(dinheiro(o.estimatedValue)).toFixed(2)), ponderado: dinheiro(t.ponderado.plus(dinheiro(o.weightedValue)).toFixed(2)) });
  }
  return [...m.entries()].map(([c, t]) => `${moeda(t.total.toFixed(2), c)} (ponderado ${moeda(t.ponderado.toFixed(2), c)})`);
}

const deQuem = (o: Oportunidade) => (o.customerId ? <NomeCliente id={o.customerId} nome={o.customerName ?? null} /> : (o.leadName ?? "—"));

function Mover({ o }: { o: Oportunidade }) {
  const mover = useMoverOportunidade();
  const id = useId();
  return (
    <div className="mt-3 flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Mover para
      </label>
      <Select id={id} value={o.stage} disabled={mover.isPending} aria-label={`Mover ${o.title} para`} onChange={(e) => mover.mutate({ id: o.opportunityId, etapa: e.target.value as EtapaAberta, posicao: null })}>
        {ETAPAS_ABERTAS.map((x) => (
          <option key={x} value={x}>
            {ETAPAS[x]}
          </option>
        ))}
      </Select>
      {mover.error ? <ErrorPanel erro={mover.error} /> : null}
    </div>
  );
}

function Quadro() {
  const quadro = useQuadro();
  const { pode } = useUtilizador();
  const escreve = pode("commercial.crm.write");
  if (quadro.isPending) return <Skeleton className="h-64" />;
  if (quadro.error) return <ErrorPanel erro={quadro.error} tentarDeNovo={() => void quadro.refetch()} />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {ETAPAS_ABERTAS.map((etapa) => {
        const itens = quadro.data.find((c) => c.stage === etapa)?.items ?? [];
        return (
          <section key={etapa} aria-label={`${ETAPAS[etapa]} (${String(itens.length)})`} className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-muted/40 p-3">
            <header>
              <h2 className="text-sm font-semibold text-foreground">
                {ETAPAS[etapa]} <span className="font-normal text-muted-foreground">· {itens.length}</span>
              </h2>
              {itens.length > 0 ? (
                <ul className="mt-1 text-xs text-muted-foreground">
                  {totais(itens).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
            </header>
            {itens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : null}
            <ul className="flex flex-col gap-3">
              {itens.map((o) => (
                <li key={o.opportunityId}>
                  <Card className="p-3">
                    <Link to={`/oportunidades/${o.opportunityId}`} className="block break-words font-medium text-foreground underline-offset-4 hover:underline">
                      {o.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{deQuem(o)}</p>
                    <p className="mt-1 text-sm tabular-nums text-foreground">
                      {moeda(o.estimatedValue, o.currency)} · {String(o.probability)}%
                    </p>
                    {o.expectedCloseDate ? <p className="text-xs text-muted-foreground">Fecho previsto {formatarData(o.expectedCloseDate)}</p> : null}
                    {escreve ? <Mover o={o} /> : null}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Lista() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const idEtapa = useId();
  const e = params.get("etapa");
  const etapa = e !== null && e in ETAPAS ? (e as Etapa) : null;
  const lista = useOportunidadesPagina({ etapa, pagina, tamanho });
  const filtrar = (x: string) => {
    const n = new URLSearchParams(window.location.search);
    if (x) n.set("etapa", x);
    else n.delete("etapa");
    n.delete("pagina");
    setParams(n);
  };
  const linhas = lista.data?.items;
  const colunas: Coluna<Oportunidade>[] = [
    {
      id: "titulo",
      cabecalho: "Oportunidade",
      className: "max-w-[18rem]",
      celula: (o) => (
        <span className="flex flex-col">
          <Link to={`/oportunidades/${o.opportunityId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {o.title}
          </Link>
          <span className="truncate text-xs text-muted-foreground">{deQuem(o)}</span>
        </span>
      ),
    },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (o) => moeda(o.estimatedValue, o.currency) },
    { id: "prob", cabecalho: "Prob.", alinhar: "direita", esconderAte: "sm", celula: (o) => `${String(o.probability)}%` },
    { id: "fecho", cabecalho: "Fecho previsto", esconderAte: "md", celula: (o) => (o.expectedCloseDate ? formatarData(o.expectedCloseDate) : "—") },
    { id: "etapa", cabecalho: "Etapa", celula: (o) => <EtapaBadge etapa={o.stage} /> },
  ];
  return (
    <>
      <div className="mb-4 flex flex-col gap-1.5 sm:w-64">
        <label htmlFor={idEtapa} className="text-sm font-medium text-foreground">
          Etapa
        </label>
        <Select id={idEtapa} value={etapa ?? ""} onChange={(x) => filtrar(x.target.value)}>
          <option value="">Todas</option>
          {Object.entries(ETAPAS).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      {linhas && linhas.length > 0 ? <p className="mb-3 text-sm text-muted-foreground">Nesta página: {totais(linhas).join(" · ")}</p> : null}
      <Tabela
        rotulo="Oportunidades"
        colunas={colunas}
        linhas={linhas}
        chave={(o) => o.opportunityId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={etapa ? "Nenhuma oportunidade nesta etapa." : "Ainda não há oportunidades."}
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}

const VISTAS: readonly Vista<"quadro" | "lista">[] = [
  { valor: "quadro", texto: "Quadro" },
  { valor: "lista", texto: "Lista" },
];

export default function Oportunidades() {
  const vista = useVista(VISTAS);
  return (
    <>
      <PageHeader
        titulo="Oportunidades"
        descricao="O funil de vendas: cada oportunidade passa pelas etapas até ser ganha ou perdida."
        accao={
          <Can requer="commercial.crm.write">
            <NovaOportunidade />
          </Can>
        }
      />
      <Vistas rotulo="Oportunidades" vistas={VISTAS} actual={vista} />
      {vista === "lista" ? <Lista /> : <Quadro />}
    </>
  );
}
