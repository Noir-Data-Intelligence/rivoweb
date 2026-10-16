/**
 * Previsões de custos (§5.7): quanto cada departamento prevê gastar por mês,
 * em custos operacionais e fixos. Alimenta a tesouraria; não controla
 * despesa (isso é o orçamento). Uma previsão por departamento e mês; em
 * rascunho revê-se e submete-se depois (B23).
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarDataHora, hojeIso } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { usePrevisoesCustos, useRegistarPrevisaoCustos, useReverPrevisaoCustos, useSubmeterPrevisaoCustos, type PrevisaoCustos } from "../api";
import { MOEDAS, nomeOuTraco, useEscolhasOrganizacao } from "../comum";

const anoCorrente = () => Number(hojeIso().slice(0, 4));

function RegistarPrevisao() {
  const org = useEscolhasOrganizacao();
  const [aberto, setAberto] = useState(false);
  const registar = useRegistarPrevisaoCustos();
  const [departamento, setDepartamento] = useState("");
  const [ano, setAno] = useState(String(anoCorrente()));
  const [mes, setMes] = useState(String(Number(hojeIso().slice(5, 7))));
  const [moeda, setMoeda] = useState("AOA");
  const [operacionais, setOperacionais] = useState("");
  const [fixos, setFixos] = useState("");
  const [submeter, setSubmeter] = useState(true);
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const op = lerDinheiroDigitado(operacionais, 2);
  const fx = lerDinheiroDigitado(fixos, 2);
  const a = Number(ano);
  const erros = {
    departamento: departamento === "" ? "Escolha o departamento." : undefined,
    ano: !Number.isInteger(a) || a < 2000 || a > 2100 ? "Indique o ano." : undefined,
    operacionais: !op || op.lt(0) ? "Indique os custos operacionais (zero se não houver)." : undefined,
    fixos: !fx || fx.lt(0) ? "Indique os custos fixos (zero se não houver)." : undefined,
  };
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      registar.reset();
      setTentou(false);
      setOperacionais("");
      setFixos("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar previsão
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Registar uma previsão de custos"
        descricao="Uma previsão por departamento e mês."
        rotuloConfirmar={submeter ? "Submeter" : "Guardar rascunho"}
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : org.erro ? <ErrorPanel erro={org.erro} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.values(erros).some(Boolean) || !op || !fx || registar.isPending) return;
            registar.mutate(
              { departmentId: departamento, fiscalYear: a, month: Number(mes), currency: moeda, operationalCosts: paraApi(op), fixedCosts: paraApi(fx), submit: submeter },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Departamento" erro={tentou ? erros.departamento : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={departamento} onChange={(e) => setDepartamento(e.target.value)} disabled={org.aCarregar}>
                <option value="">{org.aCarregar ? "A carregar…" : "Escolha…"}</option>
                {org.departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Ano" erro={tentou ? erros.ano : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={ano} onChange={(e) => setAno(e.target.value)} />}
          </Field>
          <Field rotulo="Mês">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={mes} onChange={(e) => setMes(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {nomeMes(m)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Custos operacionais" erro={tentou ? erros.operacionais : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={operacionais} onChange={(e) => setOperacionais(e.target.value)} />}
          </Field>
          <Field rotulo="Custos fixos" erro={tentou ? erros.fixos : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={fixos} onChange={(e) => setFixos(e.target.value)} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moeda} onChange={(e) => setMoeda(e.target.value)}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              rotulo="Submeter já"
              ajuda={submeter ? "A tesouraria passa a contar com ela." : "Em rascunho a tesouraria não a conta; pode revê-la e submetê-la depois."}
              checked={submeter}
              onChange={(e) => setSubmeter(e.target.checked)}
            />
          </div>
        </form>
      </Confirmar>
    </>
  );
}

const comoTexto = (v: number | string) => dinheiro(v).toFixed(2).replace(".", ",");
const titulo = (p: PrevisaoCustos) => `${nomeOuTraco(p.departmentId, p.departmentName)}, ${nomeMes(Number(p.month))} ${p.fiscalYear}`;

function Rever({ p }: { p: PrevisaoCustos }) {
  const [aberto, setAberto] = useState(false);
  const rever = useReverPrevisaoCustos();
  const [operacionais, setOperacionais] = useState(() => comoTexto(p.operationalCosts));
  const [fixos, setFixos] = useState(() => comoTexto(p.fixedCosts));
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const op = lerDinheiroDigitado(operacionais, 2);
  const fx = lerDinheiroDigitado(fixos, 2);
  const erros = {
    operacionais: !op || op.lt(0) ? "Indique os custos operacionais (zero se não houver)." : undefined,
    fixos: !fx || fx.lt(0) ? "Indique os custos fixos (zero se não houver)." : undefined,
  };
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      rever.reset();
      setTentou(false);
      setOperacionais(comoTexto(p.operationalCosts));
      setFixos(comoTexto(p.fixedCosts));
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Rever a previsão de ${titulo(p)}`}>
        Rever
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Rever a previsão"
        descricao={`${titulo(p)}, em ${p.currency}. Continua em rascunho.`}
        rotuloConfirmar="Guardar"
        aCarregar={rever.isPending}
        erro={rever.error ? <ErrorPanel erro={rever.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.operacionais || erros.fixos || !op || !fx || rever.isPending) return;
            rever.mutate({ forecastId: p.forecastId, operationalCosts: paraApi(op), fixedCosts: paraApi(fx) }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Custos operacionais" erro={tentou ? erros.operacionais : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={operacionais} onChange={(e) => setOperacionais(e.target.value)} />}
          </Field>
          <Field rotulo="Custos fixos" erro={tentou ? erros.fixos : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={fixos} onChange={(e) => setFixos(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Submeter({ p }: { p: PrevisaoCustos }) {
  const [aberto, setAberto] = useState(false);
  const submeter = useSubmeterPrevisaoCustos();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Submeter a previsão de ${titulo(p)}`}>
        Submeter
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) submeter.reset();
        }}
        titulo="Submeter esta previsão?"
        descricao={`${titulo(p)}: ${formatarMoeda(dinheiro(p.total), p.currency)}. A tesouraria passa a contar com ela e deixa de se poder rever.`}
        rotuloConfirmar="Submeter"
        aCarregar={submeter.isPending}
        erro={submeter.error ? <ErrorPanel erro={submeter.error} /> : undefined}
        aoConfirmar={() => (submeter.isPending ? undefined : submeter.mutate(p.forecastId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export default function PrevisoesCustos() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const { pode } = useUtilizador();
  const org = useEscolhasOrganizacao();
  const departamento = params.get("departamento");
  const a = Number(params.get("ano"));
  const ano = params.get("ano") !== null && Number.isInteger(a) && a >= 2000 ? a : null;
  const lista = usePrevisoesCustos({ departamento, ano, pagina, tamanho });
  const ids = { departamento: useId(), ano: useId() };
  const filtrar = (chave: string, valor: string) =>
    setParams((x) => {
      const n = new URLSearchParams(x);
      if (valor === "") n.delete(chave);
      else n.set(chave, valor);
      n.delete("pagina");
      return n;
    });
  const colunas: Coluna<PrevisaoCustos>[] = [
    { id: "departamento", cabecalho: "Departamento", celula: (p) => <span className="font-medium">{nomeOuTraco(p.departmentId, p.departmentName)}</span> },
    { id: "mes", cabecalho: "Mês", celula: (p) => `${nomeMes(Number(p.month))} ${p.fiscalYear}` },
    { id: "op", cabecalho: "Operacionais", alinhar: "direita", esconderAte: "md", celula: (p) => formatarMoeda(dinheiro(p.operationalCosts), p.currency) },
    { id: "fixos", cabecalho: "Fixos", alinhar: "direita", esconderAte: "md", celula: (p) => formatarMoeda(dinheiro(p.fixedCosts), p.currency) },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (p) => formatarMoeda(dinheiro(p.total), p.currency) },
    { id: "estado", cabecalho: "Estado", celula: (p) => (p.status === "Submitted" ? <Badge tom="sucesso">Submetida</Badge> : <Badge tom="aviso">Rascunho</Badge>) },
    { id: "quando", cabecalho: "Submetida em", esconderAte: "lg", celula: (p) => (p.submittedAt ? formatarDataHora(p.submittedAt) : "—") },
    ...(pode("finance.planning.write")
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (p: PrevisaoCustos) =>
              p.status === "Submitted" ? null : (
                <div className="flex justify-end gap-1">
                  <Rever p={p} />
                  <Submeter p={p} />
                </div>
              ),
          },
        ]
      : []),
  ];
  return (
    <>
      <PageHeader
        titulo="Previsões de custos"
        descricao="O que cada departamento prevê gastar por mês. Entra no fluxo de caixa; não trava despesa."
        accao={
          <Can requer="finance.planning.write">
            <RegistarPrevisao />
          </Can>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        {org.temDepartamentos ? (
          <div className="flex w-64 flex-col gap-1.5">
            <label htmlFor={ids.departamento} className="text-sm font-medium text-foreground">
              Departamento
            </label>
            <Select id={ids.departamento} value={departamento ?? ""} onChange={(e) => filtrar("departamento", e.target.value)}>
              <option value="">Todos</option>
              {org.departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="flex w-32 flex-col gap-1.5">
          <label htmlFor={ids.ano} className="text-sm font-medium text-foreground">
            Ano
          </label>
          <Select id={ids.ano} value={ano ?? ""} onChange={(e) => filtrar("ano", e.target.value)}>
            <option value="">Todos</option>
            {Array.from({ length: 6 }, (_, i) => anoCorrente() + 1 - i).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Tabela
        rotulo="Previsões de custos"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(p) => p.forecastId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há previsões com estes filtros."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
