/** Indicadores ESG: catálogo (definir, corrigir, desactivar) e medições mensais de cada um. */
import { useId, useState } from "react";
import { useUtilizador } from "@/features/identity";
import { hojeIso } from "@/lib/format/data";
import { nomeMes } from "@/lib/format/periodo";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { Dialog, DialogContent } from "@/ui/Dialog";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAcaoEsg, useIndicadores, useMedicoes, type Indicador, type Medicao } from "./api";
import { AGREGACOES, DIRECCOES, numeroEsg, pilarDe, PILARES } from "./comum";
import { errosIndicador, errosMedicao, indicadorParaApi, medicaoParaApi, temErros, type Agregacao, type CamposIndicador, type CamposMedicao, type Direccao, type Pilar } from "./regras";

const decimalPt = (v: number | string | null) => (v === null ? "" : String(v).replace(".", ","));
const camposDe = (i?: Indicador): CamposIndicador => ({
  codigo: i?.code ?? "",
  nome: i?.name ?? "",
  pilar: (i?.pillar as Pilar | undefined) ?? "Environmental",
  categoria: i?.category ?? "",
  unidade: i?.unit ?? "",
  agregacao: (i?.aggregation as Agregacao | undefined) ?? "Sum",
  direccao: (i?.direction as Direccao | undefined) ?? "LowerIsBetter",
  meta: decimalPt(i?.annualTarget ?? null),
  factor: decimalPt(i?.conversionFactor ?? null),
  unidadeConvertida: i?.convertedUnit ?? "",
  fonte: i?.factorSource ?? "",
  activo: i?.isActive ?? true,
});

/** Definir (sem `i`) ou corrigir (com `i`) um indicador. */
export function EditarIndicador({ i }: { i?: Indicador }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposIndicador>(() => camposDe(i));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoEsg();
  const idForm = useId();
  const erros = errosIndicador(v);
  const campo = <K extends keyof CamposIndicador>(k: K, x: CamposIndicador[K]) => setV((y) => ({ ...y, [k]: x }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(camposDe(i));
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      {i ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir o indicador ${i.code}`}>
          Corrigir
        </Button>
      ) : (
        <Button tamanho="sm" onClick={() => setAberto(true)}>
          Novo indicador
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        largo
        titulo={i ? `Corrigir ${i.code}` : "Novo indicador"}
        descricao="A meta e o factor de conversão (com a fonte) são seus: o sistema não traz valores de referência."
        rotuloConfirmar={i ? "Guardar" : "Definir"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            const corpo = indicadorParaApi(v);
            if (i) accao.mutate({ acto: "corrigirIndicador", indicador: i.indicatorId, corpo }, { onSuccess: () => setAberto(false) });
            else accao.mutate({ acto: "indicador", corpo }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Código" ajuda={i ? "Não muda depois de definido." : "Único; fica em maiúsculas."} erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" className="uppercase" disabled={Boolean(i)} aria-describedby={descricao} invalido={invalido} value={v.codigo} onChange={(e) => campo("codigo", e.target.value)} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => campo("nome", e.target.value)} />}
          </Field>
          <Field rotulo="Pilar">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.pilar} onChange={(e) => campo("pilar", e.target.value as Pilar)}>
                {Object.entries(PILARES).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Categoria (opcional)" erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.categoria} onChange={(e) => campo("categoria", e.target.value)} />}
          </Field>
          <Field rotulo="Unidade" erro={tentou ? erros.unidade : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.unidade} onChange={(e) => campo("unidade", e.target.value)} />}
          </Field>
          <Field rotulo="No ano conta">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.agregacao} onChange={(e) => campo("agregacao", e.target.value as Agregacao)}>
                {Object.entries(AGREGACOES).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Direcção">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.direccao} onChange={(e) => campo("direccao", e.target.value as Direccao)}>
                {Object.entries(DIRECCOES).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Meta anual (opcional)" ajuda="Na unidade do relatório (a convertida, se houver factor)." erro={tentou ? erros.meta : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.meta} onChange={(e) => campo("meta", e.target.value)} />}
          </Field>
          <Field rotulo="Factor de conversão (opcional)" erro={tentou ? erros.factor : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.factor} onChange={(e) => campo("factor", e.target.value)} />}
          </Field>
          {v.factor.trim() !== "" ? (
            <>
              <Field rotulo="Unidade convertida" erro={tentou ? erros.unidadeConvertida : undefined}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.unidadeConvertida} onChange={(e) => campo("unidadeConvertida", e.target.value)} />}
              </Field>
              <Field rotulo="Fonte do factor" erro={tentou ? erros.fonte : undefined} className="sm:col-span-2">
                {({ id, descricao, invalido }) => <Input id={id} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.fonte} onChange={(e) => campo("fonte", e.target.value)} />}
              </Field>
            </>
          ) : null}
          {i ? (
            <div className="sm:col-span-2">
              <Checkbox rotulo="Activo (recebe medições)" checked={v.activo} onChange={(e) => campo("activo", e.target.checked)} />
            </div>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function RegistarMedicao({ i, aoRegistar }: { i: Indicador; aoRegistar: () => void }) {
  const hoje = hojeIso();
  const vazio = (): CamposMedicao => ({ mes: String(Number(hoje.slice(5, 7))), ano: hoje.slice(0, 4), valor: "", fonte: "", notas: "" });
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoEsg();
  const erros = errosMedicao(v);
  const campo = (k: keyof CamposMedicao) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      noValidate
      className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        setTentou(true);
        if (temErros(erros) || accao.isPending) return;
        accao.mutate(
          { acto: "medicao", indicador: i.indicatorId, corpo: medicaoParaApi(v) },
          {
            onSuccess: () => {
              setV(vazio());
              setTentou(false);
              aoRegistar();
            },
          },
        );
      }}
    >
      <p className="text-sm font-medium text-foreground sm:col-span-3">Registar o valor de um mês (repetir o mês corrige-o)</p>
      <Field rotulo="Mês" erro={tentou ? erros.mes : undefined}>
        {({ id, descricao, invalido }) => (
          <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.mes} onChange={campo("mes")}>
            {Array.from({ length: 12 }, (_, k) => (
              <option key={k} value={String(k + 1)}>
                {nomeMes(k + 1)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field rotulo="Ano" erro={tentou ? erros.ano : undefined}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" maxLength={4} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.ano} onChange={campo("ano")} />}
      </Field>
      <Field rotulo={`Valor em ${i.unit}`} erro={tentou ? erros.valor : undefined}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={campo("valor")} />}
      </Field>
      <Field rotulo="Fonte (opcional)" erro={tentou ? erros.fonte : undefined}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.fonte} onChange={campo("fonte")} />}
      </Field>
      <Field rotulo="Notas (opcional)" erro={tentou ? erros.notas : undefined} className="sm:col-span-2">
        {({ id, descricao, invalido }) => <Textarea id={id} rows={1} maxLength={1000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={campo("notas")} />}
      </Field>
      <div className="flex justify-end sm:col-span-3">
        <Button type="submit" aCarregar={accao.isPending}>
          Registar
        </Button>
      </div>
      {accao.error ? <ErrorPanel erro={accao.error} className="sm:col-span-3" /> : null}
    </form>
  );
}

function MedicoesDoIndicador({ i, escreve }: { i: Indicador; escreve: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [ano, setAno] = useState(hojeIso().slice(0, 4));
  const anoValido = /^\d{4}$/.test(ano) ? ano : hojeIso().slice(0, 4);
  const lista = useMedicoes({ indicador: i.indicatorId, de: `${anoValido}-01-01`, ate: `${anoValido}-12-31` }, aberto);
  const idAno = useId();
  const convertido = i.conversionFactor !== null;
  const colunas: Coluna<Medicao>[] = [
    { id: "mes", cabecalho: "Mês", celula: (m) => `${nomeMes(Number(m.period.slice(5, 7)))} ${m.period.slice(0, 4)}` },
    { id: "valor", cabecalho: `Valor (${i.unit})`, alinhar: "direita", celula: (m) => numeroEsg(m.value) },
    ...(convertido ? [{ id: "conv", cabecalho: `Convertido (${i.convertedUnit ?? ""})`, alinhar: "direita" as const, celula: (m: Medicao) => numeroEsg(m.reportedValue) }] : []),
    { id: "fonte", cabecalho: "Fonte", esconderAte: "sm", className: "max-w-[10rem] truncate", celula: (m) => m.source ?? "—" },
    { id: "notas", cabecalho: "Notas", esconderAte: "md", className: "max-w-[12rem] truncate", celula: (m) => m.notes ?? "—" },
  ];
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Medições de ${i.code}`}>
        Medições
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent titulo={`Medições · ${i.code} ${i.name}`} descricao={convertido ? `Convertidas com o factor ${numeroEsg(i.conversionFactor ?? 0)} (${i.factorSource ?? ""}).` : undefined} className="max-w-3xl">
          <div className="mb-3 flex max-w-[8rem] flex-col gap-1.5">
            <label htmlFor={idAno} className="text-sm font-medium text-foreground">
              Ano
            </label>
            <Input id={idAno} inputMode="numeric" maxLength={4} value={ano} onChange={(e) => setAno(e.target.value)} />
          </div>
          <Tabela rotulo="Medições" colunas={colunas} linhas={lista.data} chave={(m) => m.measurementId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} /> : undefined} vazio={`Sem medições em ${anoValido}.`} />
          {escreve && i.isActive ? <RegistarMedicao i={i} aoRegistar={() => void lista.refetch()} /> : null}
          {escreve && !i.isActive ? <p className="mt-3 text-sm text-muted-foreground">Desactivado: não recebe medições.</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function IndicadoresEsg() {
  const { pode } = useUtilizador();
  const escreve = pode("esg.esg.write");
  const lista = useIndicadores(true);
  const colunas: Coluna<Indicador>[] = [
    {
      id: "ind",
      cabecalho: "Indicador",
      className: "max-w-[18rem]",
      celula: (i) => (
        <span className="flex min-w-0 flex-col">
          <span className="break-words font-medium">
            {i.code} · {i.name}
          </span>
          {i.category ? <span className="text-xs text-muted-foreground">{i.category}</span> : null}
        </span>
      ),
    },
    { id: "pilar", cabecalho: "Pilar", esconderAte: "sm", celula: (i) => pilarDe(i.pillar) },
    {
      id: "unidade",
      cabecalho: "Unidade",
      esconderAte: "md",
      celula: (i) => (i.convertedUnit ? `${i.unit} → ${i.convertedUnit}` : i.unit),
    },
    {
      id: "meta",
      cabecalho: "Meta anual",
      alinhar: "direita",
      esconderAte: "lg",
      celula: (i) => (i.annualTarget === null ? "—" : `${numeroEsg(i.annualTarget)} · ${i.direction === "LowerIsBetter" ? "no máximo" : "no mínimo"}`),
    },
    { id: "estado", cabecalho: "Estado", celula: (i) => (i.isActive ? <Badge tom="sucesso">Activo</Badge> : <Badge>Desactivado</Badge>) },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (i) => (
        <span className="inline-flex flex-wrap justify-end gap-1">
          <MedicoesDoIndicador i={i} escreve={escreve} />
          {escreve ? <EditarIndicador key={`${i.indicatorId}-${i.name}-${String(i.isActive)}-${String(i.annualTarget)}`} i={i} /> : null}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      {escreve ? (
        <div>
          <EditarIndicador />
        </div>
      ) : null}
      <Tabela rotulo="Indicadores" colunas={colunas} linhas={lista.data} chave={(i) => i.indicatorId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined} vazio="Ainda não há indicadores: defina o primeiro." />
    </div>
  );
}

/** «CÓDIGO · Nome» de um indicador do catálogo, ou «—». */
export function nomeIndicador(lista: readonly Indicador[] | undefined, id: string | null): string {
  const i = id ? lista?.find((x) => x.indicatorId === id) : undefined;
  return i ? `${i.code} · ${i.name}` : "—";
}
