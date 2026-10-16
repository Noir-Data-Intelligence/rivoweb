/**
 * Contratos de trabalho: lista (de todos ou de um colaborador), celebrar e
 * cessar. Duas relações laborais ao mesmo tempo com a mesma pessoa são
 * recusadas pelo servidor; o motivo aparece no diálogo.
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
import { FiltroColaborador, SelectColaborador, useFiltroColaborador, useNomeColaborador } from "../escolhas";
import { nome } from "../estados";
import { useCelebrarContrato, useCessarContrato, useContratos, type Contrato } from "../gestao";
import { errosContrato, TIPO_CONTRATO } from "../regras";

const MOEDAS = ["AOA", "USD", "EUR"] as const;

export function CelebrarContrato({ colaboradorFixo }: { colaboradorFixo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? "");
  const [tipo, setTipo] = useState("Permanent");
  const [inicio, setInicio] = useState(hojeIso());
  const [fim, setFim] = useState("");
  const [salario, setSalario] = useState("");
  const [moedaContrato, setMoeda] = useState<string>("AOA");
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const celebrar = useCelebrarContrato();
  const idForm = useId();
  const erros = errosContrato({ colaborador, tipo, inicio, fim, salario });
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      celebrar.reset();
      setTentou(false);
      setSalario("");
      setFim("");
      setNotas("");
      if (!colaboradorFixo) setColaborador("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Celebrar contrato
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Celebrar um contrato de trabalho"
        descricao="Fica em vigor desde o início. O salário é a remuneração base mensal acordada."
        rotuloConfirmar="Celebrar"
        aCarregar={celebrar.isPending}
        erro={celebrar.error ? <ErrorPanel erro={celebrar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const s = lerDinheiroDigitado(salario);
            if (Object.keys(erros).length > 0 || s === null || celebrar.isPending) return;
            const n = normalizarTexto(notas, true);
            celebrar.mutate(
              { employeeId: colaborador, type: tipo, startsOn: inicio, endsOn: tipo === "Permanent" ? null : fim, monthlySalary: paraApi(s), currency: moedaContrato, notes: n === "" ? null : n },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          {colaboradorFixo ? null : (
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined} className="sm:col-span-2">
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Field rotulo="Tipo" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {Object.entries(TIPO_CONTRATO).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={inicio} onChange={(e) => setInicio(e.target.value)} />}
          </Field>
          <Field rotulo={tipo === "Permanent" ? "Fim (não se aplica)" : "Fim"} erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" disabled={tipo === "Permanent"} aria-describedby={descricao} invalido={invalido} value={tipo === "Permanent" ? "" : fim} onChange={(e) => setFim(e.target.value)} />}
          </Field>
          <Field rotulo="Salário mensal" erro={tentou ? erros.salario : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={salario} onChange={(e) => setSalario(e.target.value)} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moedaContrato} onChange={(e) => setMoeda(e.target.value)}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Notas (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Cessar({ c }: { c: Contrato }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeIso());
  const cessar = useCessarContrato();
  const erro = !data ? "Indique a data." : data < c.startsOn ? "Um contrato não pode cessar antes de começar." : undefined;
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Cessar o contrato iniciado a ${formatarData(c.startsOn)}`}>
        Cessar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) cessar.reset();
        }}
        titulo="Cessar este contrato?"
        descricao="O contrato termina na data indicada e deixa de estar em vigor. Não se desfaz."
        rotuloConfirmar="Cessar contrato"
        variante="destructive"
        aCarregar={cessar.isPending}
        erro={cessar.error ? <ErrorPanel erro={cessar.error} /> : undefined}
        aoConfirmar={() => (erro || cessar.isPending ? undefined : cessar.mutate({ contractId: c.contractId, on: data }, { onSuccess: () => setAberto(false) }))}
      >
        <Field rotulo="Último dia" erro={erro}>
          {({ id, descricao, invalido }) => <Input id={id} type="date" min={c.startsOn} aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
        </Field>
      </Confirmar>
    </>
  );
}

export function ListaContratos({ colaborador, comNome }: { colaborador: string | null; comNome: boolean }) {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useContratos({ colaborador, pagina, tamanho });
  const nomeDe = useNomeColaborador();
  const colunas: Coluna<Contrato>[] = [
    ...(comNome
      ? [
          {
            id: "colaborador",
            cabecalho: "Colaborador",
            celula: (c: Contrato) => (
              <Link to={`/colaboradores/${c.employeeId}?vista=contratos`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {nomeDe(c.employeeId)}
              </Link>
            ),
          } satisfies Coluna<Contrato>,
        ]
      : []),
    { id: "tipo", cabecalho: "Tipo", celula: (c) => nome(TIPO_CONTRATO, c.type) },
    { id: "vigencia", cabecalho: "Vigência", celula: (c) => (c.endsOn ? `${formatarData(c.startsOn)} a ${formatarData(c.endsOn)}` : `desde ${formatarData(c.startsOn)}`) },
    { id: "salario", cabecalho: "Salário mensal", alinhar: "direita", esconderAte: "sm", celula: (c) => moeda(c.monthlySalary, c.currency) },
    { id: "estado", cabecalho: "Estado", celula: (c) => (c.status === "Active" ? <Badge tom="sucesso">Em vigor</Badge> : <Badge>Cessado</Badge>) },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (c) => (c.status === "Active" ? <Can requer="hr.contracts.write"><Cessar c={c} /></Can> : null) },
  ];
  return (
    <Tabela
      rotulo="Contratos"
      colunas={colunas}
      linhas={lista.data?.items}
      chave={(c) => c.contractId}
      aCarregar={lista.isPending}
      erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
      vazio={colaborador ? "Sem contratos registados." : "Ainda não há contratos."}
      rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
    />
  );
}

export default function Contratos() {
  const { colaborador, mudar } = useFiltroColaborador();
  return (
    <>
      <PageHeader
        titulo="Contratos"
        descricao="Tipo, vigência e remuneração base acordada."
        accao={
          <Can requer="hr.contracts.write">
            <CelebrarContrato />
          </Can>
        }
      />
      <div className="mb-4">
        <FiltroColaborador colaborador={colaborador} mudar={mudar} />
      </div>
      <ListaContratos colaborador={colaborador} comNome />
    </>
  );
}
