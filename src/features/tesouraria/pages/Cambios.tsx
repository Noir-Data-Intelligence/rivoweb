/** Câmbios (§5.6): taxas registadas, registo de uma taxa e conversor. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { Can } from "@/features/identity";
import { eApiError } from "@/lib/api/problem";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarMoeda, formatarNumeroDecimal } from "@/lib/format/numero";
import { decimalParaApi, dinheiro, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useCambios, useConversao, useRegistarCambio, type Cambio } from "../api";

/** Moedas estrangeiras face ao kwanza (a base). */
const ESTRANGEIRAS = ["USD", "EUR", "GBP", "ZAR", "CNY", "BRL"] as const;
const TODAS = ["AOA", ...ESTRANGEIRAS] as const;

function RegistarCambio() {
  const [aberto, setAberto] = useState(false);
  const registar = useRegistarCambio();
  const [moedaTaxa, setMoedaTaxa] = useState<string>("USD");
  const [data, setData] = useState(hojeIso());
  const [taxa, setTaxa] = useState("");
  const [fonte, setFonte] = useState("BNA");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const t = lerDecimalDigitado(taxa, 6);
  const erros = {
    data: !IsoDate.safeParse(data).success ? "Indique a data." : undefined,
    taxa: !t || t.lte(0) ? "Indique a taxa (até 6 casas decimais)." : undefined,
  };
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      registar.reset();
      setTentou(false);
      setTaxa("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar câmbio
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Registar uma taxa de câmbio"
        descricao="Quantos kwanzas vale uma unidade da moeda, nessa data. As conversões passam a usá-la; não se apaga."
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
            if (erros.data || erros.taxa || !t || registar.isPending) return;
            const f = normalizarTexto(fonte);
            registar.mutate({ currency: moedaTaxa, on: data, rate: decimalParaApi(t), source: f === "" ? null : f }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moedaTaxa} onChange={(e) => setMoedaTaxa(e.target.value)}>
                {ESTRANGEIRAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Data" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
          <Field rotulo={`Taxa (AOA por 1 ${moedaTaxa})`} erro={tentou ? erros.taxa : undefined}>
            {({ id, descricao, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={taxa} onChange={(e) => setTaxa(e.target.value)} />
            )}
          </Field>
          <Field rotulo="Fonte (opcional)">
            {({ id, descricao }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} value={fonte} onChange={(e) => setFonte(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Conversor() {
  const [valor, setValor] = useState("");
  const [de, setDe] = useState<string>("USD");
  const [para, setPara] = useState<string>("AOA");
  const [data, setData] = useState("");
  const [pedido, setPedido] = useState<{ valor: string; de: string; para: string; em: string | null } | null>(null);
  const [erroValor, setErroValor] = useState<string | null>(null);
  const r = useConversao(pedido);
  const idForm = useId();
  const semTaxa = eApiError(r.error) && r.error.status === 404;
  return (
    <Card>
      <CardTitle>Converter</CardTitle>
      <form
        id={idForm}
        noValidate
        className="mt-3 grid gap-3 sm:grid-cols-5 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const v = lerDinheiroDigitado(valor, 2);
          if (!v || v.lte(0)) return setErroValor("Indique um valor.");
          setErroValor(null);
          setPedido({ valor: paraApi(v), de, para, em: IsoDate.safeParse(data).success ? data : null });
        }}
      >
        <Field rotulo="Valor" erro={erroValor ?? undefined}>
          {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
        </Field>
        <Field rotulo="De">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={de} onChange={(e) => setDe(e.target.value)}>
              {TODAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field rotulo="Para">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={para} onChange={(e) => setPara(e.target.value)}>
              {TODAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field rotulo="Data (opcional)">
          {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={data} onChange={(e) => setData(e.target.value)} />}
        </Field>
        <Button type="submit" variante="secondary" aCarregar={r.isFetching}>
          Converter
        </Button>
      </form>
      <div aria-live="polite" className="mt-3">
        {r.data ? (
          <p className="text-sm text-foreground">
            <span className="text-lg font-semibold tabular-nums">{formatarMoeda(dinheiro(r.data.converted), r.data.to)}</span>
            <span className="block text-muted-foreground">
              Taxa {formatarNumeroDecimal(String(r.data.rate), 6)} de {formatarData(r.data.rateDate)}
            </span>
          </p>
        ) : semTaxa ? (
          <Alert tom="aviso" titulo="Não há câmbio registado para essa moeda até essa data." />
        ) : r.error ? (
          <ErrorPanel erro={r.error} />
        ) : null}
      </div>
    </Card>
  );
}

export default function Cambios() {
  const [params, setParams] = useSearchParams();
  const idMoeda = useId();
  const moedaFiltro = (ESTRANGEIRAS as readonly string[]).includes(params.get("moeda") ?? "") ? params.get("moeda") : null;
  const cambios = useCambios({ moeda: moedaFiltro, de: null, ate: null });
  const colunas: Coluna<Cambio>[] = [
    { id: "data", cabecalho: "Data", celula: (c) => formatarData(c.on) },
    { id: "moeda", cabecalho: "Moeda", celula: (c) => `1 ${c.currency}` },
    { id: "taxa", cabecalho: "Taxa", alinhar: "direita", celula: (c) => `${formatarNumeroDecimal(String(c.rate), 6)} ${c.baseCurrency}` },
    { id: "fonte", cabecalho: "Fonte", esconderAte: "sm", celula: (c) => c.source ?? "—" },
  ];
  return (
    <>
      <PageHeader
        titulo="Câmbios"
        descricao="As taxas que convertem moeda estrangeira em kwanzas, por data."
        accao={
          <Can requer="finance.treasury.write">
            <RegistarCambio />
          </Can>
        }
      />
      <div className="flex flex-col gap-6">
        <Conversor />
        <div>
          <div className="mb-4 flex flex-col gap-1.5 sm:w-60">
            <label htmlFor={idMoeda} className="text-sm font-medium text-foreground">
              Moeda
            </label>
            <Select
              id={idMoeda}
              value={moedaFiltro ?? ""}
              onChange={(e) =>
                setParams((a) => {
                  const n = new URLSearchParams(a);
                  if (e.target.value) n.set("moeda", e.target.value);
                  else n.delete("moeda");
                  return n;
                })
              }
            >
              <option value="">Todas</option>
              {ESTRANGEIRAS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
          <Tabela
            rotulo="Taxas de câmbio"
            colunas={colunas}
            linhas={cambios.data}
            chave={(c) => c.rateId}
            aCarregar={cambios.isPending}
            erro={cambios.error ? <ErrorPanel erro={cambios.error} tentarDeNovo={() => void cambios.refetch()} /> : undefined}
            vazio="Ainda não há câmbios registados."
          />
        </div>
      </div>
    </>
  );
}
