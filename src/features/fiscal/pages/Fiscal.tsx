/**
 * Configuração fiscal (§5.7): taxas (IVA e INSS), tabela de IRT e isenções
 * dos subsídios. Cada valor tem vigência e o instrumento legal que o fixou;
 * mudar um valor é abrir uma versão nova e fechar a anterior.
 */
import { Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Can, useUtilizador } from "@/features/identity";
import { eApiError } from "@/lib/api/problem";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarMoeda, formatarNumeroDecimal } from "@/lib/format/numero";
import { decimalParaApi, dinheiro, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas } from "@/ui/Vistas";
import {
  SUBSIDIOS,
  TIPOS_IMPOSTO,
  tipoImposto,
  useAbrirPauta,
  useDeterminarTaxa,
  useFecharVersaoIrt,
  useFecharVersaoIsencao,
  useFecharVersaoTaxa,
  useIsencao,
  useNovaVersaoIrt,
  useNovaVersaoIsencao,
  useNovaVersaoTaxa,
  useSimularIrt,
  useTabelaIrt,
  useTaxas,
  type PautaImposto,
  type TipoImposto,
  type TipoSubsidio,
  type VersaoIrt,
} from "../api";
import { ordenarVersoes, problemaEscaloes, versaoEmVigor, versaoSobreposta, type EscalaoDigitado } from "../regras";

const percentagem = (v: number | string) => `${formatarNumeroDecimal(String(v), 2)} %`;
const vigencia = (de: string, ate: string | null) => (ate ? `${formatarData(de)} a ${formatarData(ate)}` : `Desde ${formatarData(de)}`);

function EstadoVersao({ de, ate }: { de: string; ate: string | null }) {
  const hoje = hojeIso();
  if (de > hoje) return <Badge tom="info">Futura</Badge>;
  if (ate !== null && ate < hoje) return <Badge>Fechada</Badge>;
  return <Badge tom="sucesso">Em vigor</Badge>;
}

/** Campos comuns de uma versão: início, fim opcional e instrumento legal. */
function CamposVigencia({
  de,
  ate,
  instrumento,
  setDe,
  setAte,
  setInstrumento,
  erros,
}: {
  de: string;
  ate: string;
  instrumento: string;
  setDe: (v: string) => void;
  setAte: (v: string) => void;
  setInstrumento: (v: string) => void;
  erros: { de?: string | undefined; ate?: string | undefined; instrumento?: string | undefined };
}) {
  return (
    <>
      <Field rotulo="Em vigor desde" erro={erros.de}>
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={de} onChange={(e) => setDe(e.target.value)} />}
      </Field>
      <Field rotulo="Até (opcional)" erro={erros.ate} ajuda="Vazio: sem fim marcado.">
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={ate} onChange={(e) => setAte(e.target.value)} />}
      </Field>
      <Field rotulo="Instrumento legal" erro={erros.instrumento} ajuda="O diploma que fixa o valor (lei, decreto, parecer)." className="sm:col-span-2">
        {({ id, descricao, invalido }) => (
          <Input id={id} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={instrumento} onChange={(e) => setInstrumento(e.target.value)} />
        )}
      </Field>
    </>
  );
}

function errosVigencia(de: string, ate: string, instrumento: string) {
  return {
    de: IsoDate.safeParse(de).success ? undefined : "Indique a data de início.",
    ate: ate !== "" && (!IsoDate.safeParse(ate).success || ate < de) ? "O fim não pode ser antes do início." : undefined,
    instrumento: normalizarTexto(instrumento) === "" ? "Indique o instrumento legal." : undefined,
  };
}

const avisoSobreposicao = (desde: string) =>
  `Cruza-se com a versão em vigor desde ${formatarData(desde)}. Feche-a primeiro (com a data de fim), senão o servidor recusa.`;

/** Fechar uma versão aberta: pede a data de fim. */
function FecharVersao({ rotulo, desde, aCarregar, erro, aoFechar, aoReiniciar }: { rotulo: string; desde: string; aCarregar: boolean; erro: unknown; aoFechar: (fim: string, feito: () => void) => void; aoReiniciar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [fim, setFim] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const erroFim = !IsoDate.safeParse(fim).success || fim < desde ? `A data de fim é igual ou posterior a ${formatarData(desde)}.` : undefined;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setTentou(false);
      aoReiniciar();
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={rotulo}>
        Fechar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Fechar esta versão"
        descricao="A versão deixa de valer depois da data de fim. Fica no histórico; não se apaga."
        rotuloConfirmar="Fechar versão"
        aCarregar={aCarregar}
        erro={erro ? <ErrorPanel erro={erro} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroFim || aCarregar) return;
            aoFechar(fim, () => mudar(false));
          }}
        >
          <Field rotulo="Último dia em vigor" erro={tentou ? erroFim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={fim} onChange={(e) => setFim(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

// Taxas

function NovaPauta() {
  const [aberto, setAberto] = useState(false);
  const abrir = useAbrirPauta();
  const [tipo, setTipo] = useState<TipoImposto>(0);
  const [codigo, setCodigo] = useState("");
  const [descricaoPauta, setDescricaoPauta] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const c = normalizarTexto(codigo).toUpperCase();
  const erros = {
    codigo: c === "" ? "Indique o código (por exemplo NOR, ISE)." : c.length > 10 ? "No máximo 10 caracteres." : undefined,
    descricao: normalizarTexto(descricaoPauta) === "" ? "Indique a descrição." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      abrir.reset();
      setTentou(false);
      setCodigo("");
      setDescricaoPauta("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova pauta
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Abrir uma pauta de imposto"
        descricao="A pauta é o código; a taxa entra depois, como primeira versão."
        rotuloConfirmar="Abrir pauta"
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
            if (erros.codigo || erros.descricao || abrir.isPending) return;
            abrir.mutate({ kind: tipo, code: c, description: normalizarTexto(descricaoPauta) }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Imposto">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tipo} onChange={(e) => setTipo(Number(e.target.value) as TipoImposto)}>
                {TIPOS_IMPOSTO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.texto}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={10} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={codigo} onChange={(e) => setCodigo(e.target.value)} />}
          </Field>
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={descricaoPauta} onChange={(e) => setDescricaoPauta(e.target.value)} />
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function NovaVersaoTaxa({ pauta }: { pauta: PautaImposto }) {
  const [aberto, setAberto] = useState(false);
  const nova = useNovaVersaoTaxa();
  const [taxa, setTaxa] = useState(pauta.requiresExemptionCode ? "0" : "");
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState("");
  const [instrumento, setInstrumento] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const t = lerDecimalDigitado(taxa, 4);
  const erros = {
    ...errosVigencia(de, ate, instrumento),
    taxa: !t || t.lt(0) || t.gt(100) ? "A taxa está entre 0 e 100 por cento." : pauta.requiresExemptionCode && !t.eq(0) ? "Um código de isenção tem taxa zero." : undefined,
  };
  const sobreposta = IsoDate.safeParse(de).success ? versaoSobreposta(pauta.versions, de, ate === "" ? null : ate) : undefined;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      nova.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Nova versão de ${pauta.code}`}>
        Nova versão
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Nova taxa para ${pauta.code}`}
        descricao={pauta.description}
        rotuloConfirmar="Registar versão"
        aCarregar={nova.isPending}
        erro={nova.error ? <ErrorPanel erro={nova.error} /> : undefined}
        formulario={idForm}
      >
        {sobreposta ? <Alert tom="aviso" className="mb-4" titulo={avisoSobreposicao(sobreposta.effectiveFrom)} /> : null}
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.taxa || erros.de || erros.ate || erros.instrumento || !t || nova.isPending) return;
            nova.mutate(
              { scheduleId: pauta.scheduleId, percentage: decimalParaApi(t), effectiveFrom: de, effectiveTo: ate === "" ? null : ate, legalInstrument: normalizarTexto(instrumento) },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Taxa (%)" erro={tentou ? erros.taxa : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums sm:w-40" aria-describedby={descricao} invalido={invalido} value={taxa} onChange={(e) => setTaxa(e.target.value)} />
            )}
          </Field>
          <CamposVigencia de={de} ate={ate} instrumento={instrumento} setDe={setDe} setAte={setAte} setInstrumento={setInstrumento} erros={tentou ? erros : {}} />
        </form>
      </Confirmar>
    </>
  );
}

function CartaoPauta({ pauta, escreve }: { pauta: PautaImposto; escreve: boolean }) {
  const fechar = useFecharVersaoTaxa();
  const versoes = ordenarVersoes(pauta.versions);
  const vigente = versaoEmVigor(pauta.versions, hojeIso());
  const colunas: Coluna<(typeof versoes)[number]>[] = [
    { id: "taxa", cabecalho: "Taxa", alinhar: "direita", celula: (v) => percentagem(v.percentage) },
    { id: "vigencia", cabecalho: "Vigência", celula: (v) => vigencia(v.effectiveFrom, v.effectiveTo) },
    { id: "estado", cabecalho: "Estado", celula: (v) => <EstadoVersao de={v.effectiveFrom} ate={v.effectiveTo} /> },
    { id: "instrumento", cabecalho: "Instrumento legal", esconderAte: "md", celula: (v) => v.legalInstrument },
    ...(escreve
      ? [
          {
            id: "accoes",
            cabecalho: "Acções",
            celula: (v: (typeof versoes)[number]) =>
              v.effectiveTo === null ? (
                <FecharVersao
                  rotulo={`Fechar a versão de ${pauta.code} de ${formatarData(v.effectiveFrom)}`}
                  desde={v.effectiveFrom}
                  aCarregar={fechar.isPending}
                  erro={fechar.error}
                  aoReiniciar={() => fechar.reset()}
                  aoFechar={(fim, feito) => fechar.mutate({ scheduleId: pauta.scheduleId, versionId: v.versionId, effectiveTo: fim }, { onSuccess: feito })}
                />
              ) : null,
          } satisfies Coluna<(typeof versoes)[number]>,
        ]
      : []),
  ];
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>
            {pauta.code} · {pauta.description}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {tipoImposto(pauta.kind)?.texto ?? "Imposto"}
            {pauta.requiresExemptionCode ? " · código de isenção (taxa zero)" : ""}
            {vigente ? ` · hoje: ${percentagem(vigente.percentage)}` : " · sem taxa em vigor hoje"}
          </p>
        </div>
        {escreve ? <NovaVersaoTaxa pauta={pauta} /> : null}
      </div>
      <div className="mt-3">
        <Tabela rotulo={`Versões de ${pauta.code}`} colunas={colunas} linhas={versoes} chave={(v) => v.versionId} vazio="Ainda sem taxa. Registe a primeira versão." />
      </div>
    </Card>
  );
}

function SimularTaxa({ pautas }: { pautas: readonly PautaImposto[] }) {
  const [codigo, setCodigo] = useState(pautas[0]?.code ?? "");
  const [tipo, setTipo] = useState<string>("");
  const [data, setData] = useState(hojeIso());
  const [pedido, setPedido] = useState<{ codigo: string; data: string; tipo: TipoImposto | null } | null>(null);
  const r = useDeterminarTaxa(pedido);
  const codigos = [...new Set(pautas.map((p) => p.code))];
  const naoCobre = eApiError(r.error) && r.error.status === 404;
  const naoSuportado = eApiError(r.error) && r.error.status === 501;
  return (
    <Card>
      <CardTitle>Que taxa se aplica?</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">A taxa que o servidor usa para um código numa data (data do facto gerador).</p>
      <form
        noValidate
        className="mt-3 grid gap-3 sm:grid-cols-4 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (codigo === "" || !IsoDate.safeParse(data).success) return;
          setPedido({ codigo, data, tipo: tipo === "" ? null : (Number(tipo) as TipoImposto) });
        }}
      >
        <Field rotulo="Código">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={codigo} onChange={(e) => setCodigo(e.target.value)}>
              {codigos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field rotulo="Imposto">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Qualquer</option>
              {TIPOS_IMPOSTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field rotulo="Data">
          {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={data} onChange={(e) => setData(e.target.value)} />}
        </Field>
        <Button type="submit" variante="secondary" aCarregar={r.isFetching}>
          Ver taxa
        </Button>
      </form>
      <div aria-live="polite" className="mt-3">
        {r.data ? (
          <p className="text-sm">
            <span className="text-lg font-semibold tabular-nums">{percentagem(r.data.percentage)}</span>
            <span className="block text-muted-foreground">{r.data.legalInstrument}</span>
          </p>
        ) : naoCobre ? (
          <Alert tom="aviso" titulo="Nenhuma versão desse código cobre essa data." />
        ) : naoSuportado ? (
          <Alert tom="info" titulo="O servidor ainda não determina este imposto por este caminho." />
        ) : r.error ? (
          <ErrorPanel erro={r.error} />
        ) : null}
      </div>
    </Card>
  );
}

function Taxas({ escreve }: { escreve: boolean }) {
  const taxas = useTaxas();
  if (taxas.isPending) return <Skeleton className="h-40" />;
  if (taxas.error) return <ErrorPanel erro={taxas.error} tentarDeNovo={() => void taxas.refetch()} />;
  const pautas = [...taxas.data].sort((a, b) => Number(a.kind) - Number(b.kind) || a.code.localeCompare(b.code));
  return (
    <div className="flex flex-col gap-6">
      {escreve ? (
        <div className="flex justify-end">
          <NovaPauta />
        </div>
      ) : null}
      {pautas.length === 0 ? <Alert tom="info" titulo="Ainda não há pautas de imposto." /> : <SimularTaxa pautas={pautas} />}
      {pautas.map((p) => (
        <CartaoPauta key={p.scheduleId} pauta={p} escreve={escreve} />
      ))}
    </div>
  );
}

// IRT

type LinhaEscalao = { chave: number; limiar: string; parcela: string; taxa: string };

function NovaVersaoIrt({ versoes, base }: { versoes: readonly VersaoIrt[]; base: VersaoIrt | undefined }) {
  const [aberto, setAberto] = useState(false);
  const nova = useNovaVersaoIrt();
  const inicial = (): LinhaEscalao[] =>
    base
      ? base.brackets.map((b, i) => ({ chave: i, limiar: formatarNumeroDecimal(String(b.lowerBound), 2), parcela: formatarNumeroDecimal(String(b.fixedPortion), 2), taxa: formatarNumeroDecimal(String(b.rate), 2) }))
      : [{ chave: 0, limiar: "0", parcela: "0", taxa: "0" }];
  const [linhas, setLinhas] = useState<LinhaEscalao[]>(inicial);
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState("");
  const [instrumento, setInstrumento] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const lidas = linhas.map((l) => ({ limiar: lerDinheiroDigitado(l.limiar, 2), parcela: lerDinheiroDigitado(l.parcela, 2), taxa: lerDecimalDigitado(l.taxa, 4) }));
  const erroEscaloes = problemaEscaloes(lidas satisfies EscalaoDigitado[]);
  const erros = errosVigencia(de, ate, instrumento);
  const sobreposta = IsoDate.safeParse(de).success ? versaoSobreposta(versoes, de, ate === "" ? null : ate) : undefined;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (a) setLinhas(inicial());
    else {
      nova.reset();
      setTentou(false);
    }
  };
  const alterar = (chave: number, campo: "limiar" | "parcela" | "taxa", valor: string) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  return (
    <>
      <Button onClick={() => mudar(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova tabela
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Nova tabela de IRT"
        descricao="Escalões sobre a matéria colectável mensal: imposto = parcela fixa + taxa × (matéria − limiar). Parte da tabela em vigor."
        rotuloConfirmar="Registar tabela"
        aCarregar={nova.isPending}
        erro={nova.error ? <ErrorPanel erro={nova.error} /> : undefined}
        formulario={idForm}
      >
        {sobreposta ? <Alert tom="aviso" className="mb-4" titulo={avisoSobreposicao(sobreposta.effectiveFrom)} /> : null}
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erroEscaloes || erros.de || erros.ate || erros.instrumento || nova.isPending) return;
            nova.mutate(
              {
                brackets: lidas.flatMap((l) => (l.limiar && l.parcela && l.taxa ? [{ lowerBound: paraApi(l.limiar), fixedPortion: paraApi(l.parcela), rate: decimalParaApi(l.taxa) }] : [])),
                effectiveFrom: de,
                effectiveTo: ate === "" ? null : ate,
                legalInstrument: normalizarTexto(instrumento),
              },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Escalões</legend>
            <div className="flex flex-col gap-2">
              {linhas.map((l, i) => (
                <div key={l.chave} className="grid grid-cols-[1fr_1fr_5rem_auto] items-end gap-2">
                  <Field rotulo={`Acima de (Kz) · escalão ${i + 1}`}>
                    {({ id, descricao }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} value={l.limiar} onChange={(e) => alterar(l.chave, "limiar", e.target.value)} />}
                  </Field>
                  <Field rotulo={`Parcela fixa (Kz) · escalão ${i + 1}`}>
                    {({ id, descricao }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} value={l.parcela} onChange={(e) => alterar(l.chave, "parcela", e.target.value)} />}
                  </Field>
                  <Field rotulo={`Taxa (%) · escalão ${i + 1}`}>
                    {({ id, descricao }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} value={l.taxa} onChange={(e) => alterar(l.chave, "taxa", e.target.value)} />}
                  </Field>
                  <Button type="button" variante="ghost" tamanho="sm" disabled={linhas.length === 1} onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))} aria-label={`Tirar o escalão ${i + 1}`}>
                    Tirar
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variante="secondary" tamanho="sm" className="mt-2" onClick={() => setLinhas((ls) => [...ls, { chave: Math.max(0, ...ls.map((x) => x.chave)) + 1, limiar: "", parcela: "", taxa: "" }])}>
              Acrescentar escalão
            </Button>
            {tentou && erroEscaloes ? (
              <p role="alert" className="mt-2 text-sm text-danger">
                {erroEscaloes}
              </p>
            ) : null}
          </fieldset>
          <CamposVigencia de={de} ate={ate} instrumento={instrumento} setDe={setDe} setAte={setAte} setInstrumento={setInstrumento} erros={tentou ? erros : {}} />
        </form>
      </Confirmar>
    </>
  );
}

function SimularIrt() {
  const [materia, setMateria] = useState("");
  const [data, setData] = useState(hojeIso());
  const [erro, setErro] = useState<string | null>(null);
  const [pedido, setPedido] = useState<{ materia: string; data: string } | null>(null);
  const r = useSimularIrt(pedido);
  const semTabela = eApiError(r.error) && r.error.status === 404;
  return (
    <Card>
      <CardTitle>Simular o IRT</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">O imposto que a tabela em vigor nessa data dá para uma matéria colectável mensal.</p>
      <form
        noValidate
        className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const m = lerDinheiroDigitado(materia, 2);
          if (!m || m.lt(0)) return setErro("Indique a matéria colectável.");
          setErro(null);
          setPedido({ materia: paraApi(m), data: IsoDate.safeParse(data).success ? data : hojeIso() });
        }}
      >
        <Field rotulo="Matéria colectável (Kz)" erro={erro ?? undefined}>
          {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={materia} onChange={(e) => setMateria(e.target.value)} />}
        </Field>
        <Field rotulo="Data">
          {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={data} onChange={(e) => setData(e.target.value)} />}
        </Field>
        <Button type="submit" variante="secondary" aCarregar={r.isFetching}>
          Simular
        </Button>
      </form>
      <div aria-live="polite" className="mt-3">
        {r.data ? (
          <p className="text-sm">
            <span className="text-lg font-semibold tabular-nums">{formatarMoeda(dinheiro(r.data.amount))}</span>
            <span className="block text-muted-foreground">
              Escalão acima de {formatarMoeda(dinheiro(r.data.bracketLowerBound))}: {formatarMoeda(dinheiro(r.data.fixedPortion))} + {percentagem(r.data.rate)} do excedente. {r.data.legalInstrument}
            </span>
          </p>
        ) : semTabela ? (
          <Alert tom="aviso" titulo="Nenhuma tabela de IRT cobre essa data." />
        ) : r.error ? (
          <ErrorPanel erro={r.error} />
        ) : null}
      </div>
    </Card>
  );
}

function Irt({ escreve }: { escreve: boolean }) {
  const tabela = useTabelaIrt();
  const fechar = useFecharVersaoIrt();
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const idVersao = useId();
  if (tabela.isPending) return <Skeleton className="h-40" />;
  if (tabela.error) return <ErrorPanel erro={tabela.error} tentarDeNovo={() => void tabela.refetch()} />;
  const versoes = ordenarVersoes(tabela.data?.versions ?? []);
  const vigente = versaoEmVigor(versoes, hojeIso());
  const versao = versoes.find((v) => v.versionId === escolhida) ?? vigente ?? versoes[0];
  const colunas: Coluna<VersaoIrt["brackets"][number]>[] = [
    { id: "limiar", cabecalho: "Acima de", alinhar: "direita", celula: (b) => formatarMoeda(dinheiro(b.lowerBound)) },
    { id: "parcela", cabecalho: "Parcela fixa", alinhar: "direita", celula: (b) => formatarMoeda(dinheiro(b.fixedPortion)) },
    { id: "taxa", cabecalho: "Taxa sobre o excedente", alinhar: "direita", celula: (b) => percentagem(b.rate) },
  ];
  return (
    <div className="flex flex-col gap-6">
      {escreve ? (
        <div className="flex justify-end">
          <NovaVersaoIrt versoes={versoes} base={vigente ?? versoes[0]} />
        </div>
      ) : null}
      {versoes.length === 0 ? (
        <Alert tom="info" titulo="Ainda não há tabela de IRT.">
          {escreve ? "Registe a primeira tabela; os salários precisam dela para calcular o imposto." : "Quem configura a fiscalidade regista-a."}
        </Alert>
      ) : (
        <>
          <SimularIrt />
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1.5 sm:w-80">
                <label htmlFor={idVersao} className="text-sm font-medium text-foreground">
                  Tabela
                </label>
                <Select id={idVersao} value={versao?.versionId ?? ""} onChange={(e) => setEscolhida(e.target.value)}>
                  {versoes.map((v) => (
                    <option key={v.versionId} value={v.versionId}>
                      {vigencia(v.effectiveFrom, v.effectiveTo)}
                      {v === vigente ? " (em vigor)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
              {versao && escreve && versao.effectiveTo === null ? (
                <FecharVersao
                  rotulo={`Fechar a tabela de ${formatarData(versao.effectiveFrom)}`}
                  desde={versao.effectiveFrom}
                  aCarregar={fechar.isPending}
                  erro={fechar.error}
                  aoReiniciar={() => fechar.reset()}
                  aoFechar={(fim, feito) => fechar.mutate({ versionId: versao.versionId, effectiveTo: fim }, { onSuccess: feito })}
                />
              ) : null}
            </div>
            {versao ? (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  <EstadoVersao de={versao.effectiveFrom} ate={versao.effectiveTo} /> {versao.legalInstrument}
                </p>
                <div className="mt-3">
                  <Tabela rotulo="Escalões do IRT" colunas={colunas} linhas={versao.brackets} chave={(b) => String(b.lowerBound)} vazio="Sem escalões." />
                </div>
              </>
            ) : null}
          </Card>
        </>
      )}
    </div>
  );
}

// Subsídios

function NovaVersaoIsencao({ tipo, versoes }: { tipo: TipoSubsidio; versoes: readonly { effectiveFrom: string; effectiveTo: string | null }[] }) {
  const [aberto, setAberto] = useState(false);
  const nova = useNovaVersaoIsencao();
  const [valor, setValor] = useState("");
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState("");
  const [instrumento, setInstrumento] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const erros = { ...errosVigencia(de, ate, instrumento), valor: !v || v.lt(0) ? "Indique o valor isento por mês." : undefined };
  const sobreposta = IsoDate.safeParse(de).success ? versaoSobreposta(versoes, de, ate === "" ? null : ate) : undefined;
  const nome = SUBSIDIOS.find((s) => s.valor === tipo)?.texto ?? "Subsídio";
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      nova.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Nova versão: ${nome}`}>
        Nova versão
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={nome}
        descricao="Quanto do subsídio fica isento de IRT por mês; o excesso soma-se à matéria colectável."
        rotuloConfirmar="Registar versão"
        aCarregar={nova.isPending}
        erro={nova.error ? <ErrorPanel erro={nova.error} /> : undefined}
        formulario={idForm}
      >
        {sobreposta ? <Alert tom="aviso" className="mb-4" titulo={avisoSobreposicao(sobreposta.effectiveFrom)} /> : null}
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.valor || erros.de || erros.ate || erros.instrumento || !v || nova.isPending) return;
            nova.mutate({ kind: tipo, amount: paraApi(v), effectiveFrom: de, effectiveTo: ate === "" ? null : ate, legalInstrument: normalizarTexto(instrumento) }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Isento até (Kz por mês)" erro={tentou ? erros.valor : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums sm:w-48" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />
            )}
          </Field>
          <CamposVigencia de={de} ate={ate} instrumento={instrumento} setDe={setDe} setAte={setAte} setInstrumento={setInstrumento} erros={tentou ? erros : {}} />
        </form>
      </Confirmar>
    </>
  );
}

function CartaoIsencao({ tipo, texto, escreve }: { tipo: TipoSubsidio; texto: string; escreve: boolean }) {
  const isencao = useIsencao(tipo);
  const fechar = useFecharVersaoIsencao();
  const versoes = ordenarVersoes(isencao.data?.versions ?? []);
  const vigente = versaoEmVigor(versoes, hojeIso());
  const colunas: Coluna<(typeof versoes)[number]>[] = [
    { id: "valor", cabecalho: "Isento até", alinhar: "direita", celula: (v) => formatarMoeda(dinheiro(v.amount)) },
    { id: "vigencia", cabecalho: "Vigência", celula: (v) => vigencia(v.effectiveFrom, v.effectiveTo) },
    { id: "estado", cabecalho: "Estado", celula: (v) => <EstadoVersao de={v.effectiveFrom} ate={v.effectiveTo} /> },
    { id: "instrumento", cabecalho: "Instrumento legal", esconderAte: "md", celula: (v) => v.legalInstrument },
    ...(escreve
      ? [
          {
            id: "accoes",
            cabecalho: "Acções",
            celula: (v: (typeof versoes)[number]) =>
              v.effectiveTo === null ? (
                <FecharVersao
                  rotulo={`Fechar a versão de ${texto} de ${formatarData(v.effectiveFrom)}`}
                  desde={v.effectiveFrom}
                  aCarregar={fechar.isPending}
                  erro={fechar.error}
                  aoReiniciar={() => fechar.reset()}
                  aoFechar={(fim, feito) => fechar.mutate({ versionId: v.versionId, kind: tipo, effectiveTo: fim }, { onSuccess: feito })}
                />
              ) : null,
          } satisfies Coluna<(typeof versoes)[number]>,
        ]
      : []),
  ];
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{texto}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{vigente ? `Hoje: isento até ${formatarMoeda(dinheiro(vigente.amount))} por mês.` : "Sem limiar em vigor hoje: o subsídio conta todo para o IRT."}</p>
        </div>
        {escreve && !isencao.isPending && !isencao.error ? <NovaVersaoIsencao tipo={tipo} versoes={versoes} /> : null}
      </div>
      <div className="mt-3">
        <Tabela
          rotulo={`Versões: ${texto}`}
          colunas={colunas}
          linhas={versoes}
          chave={(v) => v.versionId}
          aCarregar={isencao.isPending}
          erro={isencao.error ? <ErrorPanel erro={isencao.error} tentarDeNovo={() => void isencao.refetch()} /> : undefined}
          vazio="Ainda sem limiar registado."
        />
      </div>
    </Card>
  );
}

function Subsidios({ escreve }: { escreve: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {SUBSIDIOS.map((s) => (
        <CartaoIsencao key={s.valor} tipo={s.valor} texto={s.texto} escreve={escreve} />
      ))}
    </div>
  );
}

const VISTAS = [
  { valor: "taxas", texto: "Taxas" },
  { valor: "irt", texto: "IRT" },
  { valor: "subsidios", texto: "Subsídios" },
] as const;

export default function Fiscal() {
  const { pode } = useUtilizador();
  const escreve = pode("fiscal.rates.write");
  const vista = useVista(VISTAS);
  const conteudo: Record<(typeof VISTAS)[number]["valor"], ReactNode> = {
    taxas: <Taxas escreve={escreve} />,
    irt: <Irt escreve={escreve} />,
    subsidios: <Subsidios escreve={escreve} />,
  };
  return (
    <>
      <PageHeader titulo="Fiscal" descricao="Taxas de IVA e de INSS, tabela de IRT e isenções dos subsídios, com vigência e instrumento legal." />
      <Can requer="fiscal.rates.write" senao={<Alert tom="info" className="mb-4" titulo="Só consulta: este perfil não altera a configuração fiscal." />}>
        <Alert tom="aviso" className="mb-4" titulo="Configuração fiscal de produção.">
          Uma versão nova muda o imposto das facturas e dos salários a partir da data de início. Confirme o valor e o diploma antes de registar.
        </Alert>
      </Can>
      <Vistas rotulo="Partes da configuração fiscal" vistas={VISTAS} actual={vista} />
      {vista ? conteudo[vista] : null}
    </>
  );
}

