/**
 * Um artigo: em mão por armazém, movimentos, e movimentar (entrada com custo,
 * saída, ajuste com motivo, transferência entre armazéns) sem deixar um
 * armazém negativo; activar ou desactivar (inactivo não se movimenta).
 */
import Big from "big.js";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useArtigo, useEstadoArtigo, useMovimentar, useTodosArmazens, type Artigo as TipoArtigo, type Movimento, type TipoMovimento } from "../api";
import { EstadoActivo, kz, qtd, TIPO_MOVIMENTO } from "../comum";
import { errosMovimento, lerComSinal, type CamposMovimento } from "../regras";

const TIPOS: Record<TipoMovimento, string> = { entrada: "Entrada", saida: "Saída", ajuste: "Ajuste", transferencia: "Transferência" };
const VAZIO = (): CamposMovimento => ({ armazem: "", destino: "", quantidade: "", custo: "", motivo: "", data: hojeIso() });

function Movimentar({ a }: { a: TipoArtigo }) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoMovimento>("entrada");
  const [v, setV] = useState<CamposMovimento>(VAZIO);
  const [tentou, setTentou] = useState(false);
  const mov = useMovimentar(a.itemId);
  const armazens = useTodosArmazens(aberto);
  const activos = (armazens.data?.items ?? []).filter((w) => w.status === "Active");
  const idForm = useId();
  const emMao = (id: string) => new Big(a.quantitiesByWarehouse.find((q) => q.warehouseId === id)?.quantityOnHand ?? 0);
  const disponivel = v.armazem === "" ? null : emMao(v.armazem);
  const erros = errosMovimento(tipo, v, disponivel);
  const campo = (k: keyof CamposMovimento, x: string) => setV((y) => ({ ...y, [k]: x }));
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      mov.reset();
      setTentou(false);
      setV(VAZIO());
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <ArrowRightLeft strokeWidth={1.75} aria-hidden />
        Movimentar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Movimentar ${a.name}`}
        descricao="A entrada recalcula o custo médio. Nenhum movimento deixa um armazém com quantidade negativa."
        rotuloConfirmar="Registar movimento"
        aCarregar={mov.isPending}
        erro={mov.error ? <ErrorPanel erro={mov.error} /> : armazens.error ? <ErrorPanel erro={armazens.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || mov.isPending) return;
            const m = normalizarTexto(v.motivo, true);
            const motivo = m === "" ? null : m;
            const q = lerDecimalDigitado(v.quantidade, 4);
            const fechar = { onSuccess: () => mudar(false) };
            if (tipo === "ajuste") {
              const d = lerComSinal(v.quantidade);
              if (!d) return;
              mov.mutate({ tipo, corpo: { warehouseId: v.armazem, quantityDelta: d.toString(), reason: m, occurredOn: v.data } }, fechar);
              return;
            }
            if (!q) return;
            if (tipo === "entrada") {
              const c = lerDecimalDigitado(v.custo, 4);
              if (!c) return;
              mov.mutate({ tipo, corpo: { warehouseId: v.armazem, quantity: decimalParaApi(q), unitCost: decimalParaApi(c), reason: motivo, occurredOn: v.data } }, fechar);
            } else if (tipo === "saida") {
              mov.mutate({ tipo, corpo: { warehouseId: v.armazem, quantity: decimalParaApi(q), reason: motivo, occurredOn: v.data } }, fechar);
            } else {
              mov.mutate({ tipo, corpo: { fromWarehouseId: v.armazem, toWarehouseId: v.destino, quantity: decimalParaApi(q), reason: motivo, occurredOn: v.data } }, fechar);
            }
          }}
        >
          <Field rotulo="Tipo" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimento)}>
                {Object.entries(TIPOS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo={tipo === "transferencia" ? "De (armazém)" : "Armazém"} erro={tentou ? erros.armazem : undefined} ajuda={disponivel ? `Em mão: ${qtd(disponivel.toString())} ${a.unit}.` : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.armazem} onChange={(e) => campo("armazem", e.target.value)}>
                <option value="">{armazens.isPending ? "A carregar…" : "Escolha…"}</option>
                {activos.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {tipo === "transferencia" ? (
            <Field rotulo="Para (armazém)" erro={tentou ? erros.destino : undefined}>
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.destino} onChange={(e) => campo("destino", e.target.value)}>
                  <option value="">Escolha…</option>
                  {activos.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.code} · {w.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field
            rotulo={tipo === "ajuste" ? `Variação (${a.unit}; negativa para tirar)` : `Quantidade (${a.unit})`}
            erro={tentou ? erros.quantidade : undefined}
          >
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.quantidade} onChange={(e) => campo("quantidade", e.target.value)} />}
          </Field>
          {tipo === "entrada" ? (
            <Field rotulo="Custo unitário (Kz)" erro={tentou ? erros.custo : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.custo} onChange={(e) => campo("custo", e.target.value)} />}
            </Field>
          ) : null}
          <Field rotulo="Data" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.data} onChange={(e) => campo("data", e.target.value)} />}
          </Field>
          <Field rotulo={tipo === "ajuste" ? "Motivo" : "Motivo (opcional)"} erro={tentou ? erros.motivo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={v.motivo} onChange={(e) => campo("motivo", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function MudarEstado({ a }: { a: TipoArtigo }) {
  const [aberto, setAberto] = useState(false);
  const mudar = useEstadoArtigo(a.itemId);
  const activo = a.status === "Active";
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        {activo ? "Desactivar" : "Activar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) mudar.reset();
        }}
        titulo={activo ? `Desactivar ${a.name}?` : `Activar ${a.name}?`}
        descricao={activo ? "Deixa de se movimentar e de se contar. O stock e o histórico ficam." : "Volta a poder movimentar-se."}
        rotuloConfirmar={activo ? "Desactivar" : "Activar"}
        variante={activo ? "destructive" : "primary"}
        aCarregar={mudar.isPending}
        erro={mudar.error ? <ErrorPanel erro={mudar.error} /> : undefined}
        aoConfirmar={() => (mudar.isPending ? undefined : mudar.mutate(!activo, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export default function Artigo() {
  const { itemId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useArtigo(itemId);
  const armazens = useTodosArmazens();
  const nomeArm = (id: string | null) => {
    if (!id) return "—";
    const w = armazens.data?.items.find((x) => x.warehouseId === id);
    return w ? `${w.code} · ${w.name}` : "Armazém";
  };
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/artigos">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Artigos
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
  const a = q.data;
  const activo = a.status === "Active";
  const colunasArm: Coluna<TipoArtigo["quantitiesByWarehouse"][number]>[] = [
    { id: "armazem", cabecalho: "Armazém", celula: (w) => nomeArm(w.warehouseId) },
    { id: "mao", cabecalho: "Em mão", alinhar: "direita", celula: (w) => `${qtd(w.quantityOnHand)} ${a.unit}` },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (w) => kz(w.value) },
  ];
  const colunasMov: Coluna<Movimento>[] = [
    { id: "data", cabecalho: "Data", celula: (m) => formatarData(m.occurredOn) },
    { id: "tipo", cabecalho: "Movimento", celula: (m) => TIPO_MOVIMENTO[m.type] ?? m.type },
    {
      id: "armazem",
      cabecalho: "Armazém",
      esconderAte: "sm",
      celula: (m) => (m.relatedWarehouseId ? `${nomeArm(m.warehouseId)} (${m.type === "TransferOut" ? "para" : "de"} ${nomeArm(m.relatedWarehouseId)})` : nomeArm(m.warehouseId)),
    },
    { id: "quantidade", cabecalho: "Quantidade", alinhar: "direita", celula: (m) => qtd(m.quantity) },
    { id: "custo", cabecalho: "Custo unit.", alinhar: "direita", esconderAte: "md", celula: (m) => kz(m.unitCost) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", esconderAte: "md", celula: (m) => kz(m.value) },
    { id: "motivo", cabecalho: "Motivo", esconderAte: "lg", celula: (m) => m.reason ?? "—" },
  ];
  const movimentos = [...a.movements].sort((x, y) => y.occurredOn.localeCompare(x.occurredOn) || y.recordedAt.localeCompare(x.recordedAt));
  return (
    <>
      {voltar}
      <PageHeader
        titulo={a.name}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoActivo estado={a.status} />
            <span>
              {a.sku} · {qtd(a.quantityOnHand)} {a.unit} em mão
            </span>
          </span>
        }
        accao={
          pode("inventory.items.write") ? (
            <div className="flex flex-wrap gap-2">
              <MudarEstado a={a} />
              {activo ? <Movimentar a={a} /> : null}
            </div>
          ) : undefined
        }
      />
      {!activo ? <Alert tom="info" className="mb-4" titulo="Artigo inactivo: não se movimenta nem se conta." /> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {(
          [
            ["Em mão", `${qtd(a.quantityOnHand)} ${a.unit}`],
            ["Custo médio", kz(a.averageCost)],
            ["Valor", kz(a.totalValue)],
          ] as const
        ).map(([r, x]) => (
          <Card key={r}>
            <p className="text-sm text-muted-foreground">{r}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{x}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 text-md font-semibold text-foreground">Por armazém</h2>
      <Tabela rotulo="Em mão por armazém" colunas={colunasArm} linhas={a.quantitiesByWarehouse} chave={(w) => w.warehouseId} aCarregar={false} vazio="Sem stock em nenhum armazém." />
      <h2 className="mb-3 mt-8 text-md font-semibold text-foreground">Movimentos</h2>
      <Tabela rotulo="Movimentos" colunas={colunasMov} linhas={movimentos} chave={(m) => m.movementId} aCarregar={false} vazio="Ainda sem movimentos." />
      {movimentos[0] ? <p className="mt-3 text-xs text-muted-foreground">Último movimento registado a {formatarDataHora(movimentos[0].recordedAt)}.</p> : null}
    </>
  );
}
