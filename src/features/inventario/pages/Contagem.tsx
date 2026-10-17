/**
 * Uma contagem: o contado contra o esperado por artigo; contar um artigo (uma
 * vez por contagem); fechar (sem divergências fecha; com divergências pode ir
 * a aprovação, e o stock só muda depois; sem política, aplica os ajustes);
 * ver a decisão; cancelar com motivo.
 */
import Big from "big.js";
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useCancelarContagem, useContagem, useContarItem, useFecharContagem, useTodosArmazens, useTodosArtigos, useVerDecisaoContagem, type Contagem as TipoContagem } from "../api";
import { EstadoContagem, kz, qtd } from "../comum";
import { erroContado } from "../regras";

type Linha = TipoContagem["lines"][number];

function ContarArtigo({ c }: { c: TipoContagem }) {
  const [aberto, setAberto] = useState(false);
  const [artigo, setArtigo] = useState("");
  const [contado, setContado] = useState("");
  const [tentou, setTentou] = useState(false);
  const contar = useContarItem(c.countId);
  const artigos = useTodosArtigos(aberto);
  const jaContados = new Set(c.lines.map((l) => l.itemId));
  const opcoes = (artigos.data?.items ?? []).filter((a) => a.status === "Active" && !jaContados.has(a.itemId));
  const escolhido = opcoes.find((a) => a.itemId === artigo);
  const idForm = useId();
  const erros = { artigo: artigo === "" ? "Escolha o artigo." : undefined, contado: erroContado(contado) };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      contar.reset();
      setTentou(false);
      setArtigo("");
      setContado("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Contar artigo
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Contar um artigo"
        descricao="Cada artigo conta-se uma vez nesta contagem. O sistema regista o que esperava e a diferença."
        rotuloConfirmar="Registar contagem"
        aCarregar={contar.isPending}
        erro={contar.error ? <ErrorPanel erro={contar.error} /> : artigos.error ? <ErrorPanel erro={artigos.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const q = lerDecimalDigitado(contado, 4);
            if (erros.artigo || erros.contado || !q || contar.isPending) return;
            contar.mutate({ itemId: artigo, countedQuantity: decimalParaApi(q) }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Artigo" erro={tentou ? erros.artigo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={artigo} onChange={(e) => setArtigo(e.target.value)}>
                <option value="">{artigos.isPending ? "A carregar…" : "Escolha…"}</option>
                {opcoes.map((a) => (
                  <option key={a.itemId} value={a.itemId}>
                    {a.sku} · {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo={`Quantidade contada${escolhido ? ` (${escolhido.unit})` : ""}`} erro={tentou ? erros.contado : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={contado} onChange={(e) => setContado(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Fechar({ c }: { c: TipoContagem }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useFecharContagem(c.countId);
  const divergencias = c.lines.filter((l) => Number(l.variance) !== 0).length;
  return (
    <>
      <Button variante="secondary" disabled={c.lines.length === 0} title={c.lines.length === 0 ? "Uma contagem sem linhas não tem o que confirmar." : undefined} onClick={() => setAberto(true)}>
        Fechar contagem
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) fechar.reset();
        }}
        titulo="Fechar esta contagem?"
        descricao={
          divergencias === 0
            ? "Sem divergências: fecha e o stock não muda."
            : `${divergencias} ${divergencias === 1 ? "divergência" : "divergências"}. Se houver política de aprovação que as cubra, fica por aprovar e o stock só muda depois da decisão; se não, fecha e aplica os ajustes já.`
        }
        rotuloConfirmar="Fechar contagem"
        aCarregar={fechar.isPending}
        erro={fechar.error ? <ErrorPanel erro={fechar.error} /> : undefined}
        aoConfirmar={() => (fechar.isPending ? undefined : fechar.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function VerDecisao({ c }: { c: TipoContagem }) {
  const ver = useVerDecisaoContagem(c.countId);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variante="secondary" aCarregar={ver.isPending} onClick={() => (ver.isPending ? undefined : ver.mutate())}>
        Ver decisão
      </Button>
      {ver.data?.estado === "PendingApproval" ? <p className="text-sm text-muted-foreground">Ainda à espera de decisão em Aprovações.</p> : null}
      {ver.error ? <ErrorPanel erro={ver.error} /> : null}
    </div>
  );
}

function Cancelar({ c }: { c: TipoContagem }) {
  const cancelar = useCancelarContagem(c.countId);
  return (
    <ConfirmarComMotivo
      rotuloBotao="Cancelar contagem"
      varianteBotao="secondary"
      titulo="Cancelar esta contagem?"
      descricao="Não se aplica e não reabre. Para tentar de novo, abre-se outra."
      rotuloConfirmar="Cancelar contagem"
      maximo={500}
      aCarregar={cancelar.isPending}
      erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
      aoConfirmar={(motivo, fechar) => cancelar.mutate(motivo, { onSuccess: fechar })}
    />
  );
}

export default function Contagem() {
  const { countId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useContagem(countId);
  const armazens = useTodosArmazens();
  const artigos = useTodosArtigos();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/contagens">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Contagens
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
  const c = q.data;
  const w = armazens.data?.items.find((x) => x.warehouseId === c.warehouseId);
  const artigo = (id: string) => artigos.data?.items.find((a) => a.itemId === id);
  const escreve = pode("inventory.items.write");
  const colunas: Coluna<Linha>[] = [
    {
      id: "artigo",
      cabecalho: "Artigo",
      celula: (l) => {
        const a = artigo(l.itemId);
        return (
          <Link to={`/artigos/${l.itemId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {a ? `${a.sku} · ${a.name}` : "Artigo"}
          </Link>
        );
      },
    },
    { id: "esperado", cabecalho: "Esperado", alinhar: "direita", celula: (l) => qtd(l.expectedQuantity) },
    { id: "contado", cabecalho: "Contado", alinhar: "direita", celula: (l) => qtd(l.countedQuantity) },
    {
      id: "variancia",
      cabecalho: "Diferença",
      alinhar: "direita",
      celula: (l) => {
        const v = Number(l.variance);
        return <span className={v === 0 ? "text-muted-foreground" : v < 0 ? "font-medium text-danger" : "font-medium"}>{v > 0 ? `+${qtd(l.variance)}` : qtd(l.variance)}</span>;
      },
    },
    {
      id: "valor",
      cabecalho: "Valor da diferença",
      alinhar: "direita",
      esconderAte: "md",
      celula: (l) => {
        const a = artigo(l.itemId);
        return a ? kz(new Big(l.variance).times(new Big(a.averageCost))) : "—";
      },
    },
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={`Contagem de ${formatarData(c.occurredOn)}`}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoContagem estado={c.status} />
            <span>{w ? `${w.code} · ${w.name}` : "Armazém"}</span>
          </span>
        }
        accao={
          escreve && c.status === "Open" ? (
            <div className="flex flex-wrap items-start gap-2">
              <Cancelar c={c} />
              <Fechar c={c} />
              <ContarArtigo c={c} />
            </div>
          ) : escreve && c.status === "PendingApproval" ? (
            <div className="flex flex-wrap items-start gap-2">
              <Cancelar c={c} />
              <VerDecisao c={c} />
            </div>
          ) : undefined
        }
      />
      {c.status === "PendingApproval" ? (
        <Alert tom="info" className="mb-4" titulo="À espera de decisão em Aprovações: o stock ainda não mudou.">
          <Can requer="approval.requests.read">
            <Link to="/aprovacoes" className="underline underline-offset-4">
              Ir para Aprovações
            </Link>
          </Can>
        </Alert>
      ) : null}
      {c.status === "Closed" ? <Alert tom="sucesso" className="mb-4" titulo="Contagem fechada: as diferenças foram aplicadas ao stock como ajustes." /> : null}
      {c.status === "Refused" ? <Alert tom="erro" className="mb-4" titulo="Divergências recusadas em Aprovações: o stock não mudou. Para tentar de novo, abra outra contagem." /> : null}
      {c.status === "Cancelled" ? <Alert tom="info" className="mb-4" titulo={`Contagem cancelada${c.cancellationReason ? `: ${c.cancellationReason}` : "."}`} /> : null}
      <Tabela rotulo="Artigos contados" colunas={colunas} linhas={c.lines} chave={(l) => l.lineId} aCarregar={false} vazio="Ainda nenhum artigo contado." />
    </>
  );
}
