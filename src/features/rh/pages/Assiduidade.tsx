/**
 * Assiduidade na gestão: marcações de um período (por omissão, os últimos 30
 * dias), de todos ou de um colaborador, só as anomalias se quiser; marcar o
 * ponto (entrada na primeira vez, saída na segunda, à hora do servidor) e
 * registar uma falta.
 */
import { Clock, UserX } from "lucide-react";
import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Can } from "@/features/identity";
import { formatarData, formatarHora, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { FiltroColaborador, SelectColaborador, useFiltroColaborador, useNomeColaborador } from "../escolhas";
import { EstadoMarcacao } from "../estados";
import { useAssiduidade, useMarcarPonto, useRegistarFalta, type Marcacao } from "../gestao";

function MarcarPonto({ colaboradorFixo }: { colaboradorFixo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? "");
  const [atraso, setAtraso] = useState(false);
  const [tentou, setTentou] = useState(false);
  const marcar = useMarcarPonto();
  const nomeDe = useNomeColaborador();
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setTentou(false);
      setAtraso(false);
      if (!colaboradorFixo) setColaborador("");
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => mudar(true)}>
        <Clock strokeWidth={1.75} aria-hidden />
        Marcar ponto
      </Button>
      {marcar.data && !aberto ? (
        <Alert tom="sucesso" className="w-full" titulo={`${marcar.data.movimento === "entrada" ? "Entrada" : "Saída"} registada às ${formatarHora(marcar.data.at)}.`} />
      ) : null}
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Marcar o ponto de hoje"
        descricao="Na primeira marcação do dia fica a entrada; na segunda, a saída. A hora é a do servidor."
        rotuloConfirmar="Marcar"
        aCarregar={marcar.isPending}
        erro={marcar.error ? <ErrorPanel erro={marcar.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (!colaborador || marcar.isPending) return;
          marcar.mutate({ employeeId: colaborador, day: null, late: atraso }, { onSuccess: () => mudar(false) });
        }}
      >
        <div className="flex flex-col gap-4">
          {colaboradorFixo ? (
            <p className="text-sm text-foreground">{nomeDe(colaboradorFixo)}</p>
          ) : (
            <Field rotulo="Colaborador" erro={tentou && !colaborador ? "Escolha o colaborador." : undefined}>
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Checkbox rotulo="Chegou atrasado" ajuda="Só conta na entrada." checked={atraso} onChange={(e) => setAtraso(e.target.checked)} />
        </div>
      </Confirmar>
    </>
  );
}

function RegistarFalta({ colaboradorFixo }: { colaboradorFixo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? "");
  const [dia, setDia] = useState(hojeIso());
  const [justificacao, setJustificacao] = useState("");
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarFalta();
  const idForm = useId();
  const j = normalizarTexto(justificacao, true);
  const erros = {
    colaborador: colaborador ? undefined : "Escolha o colaborador.",
    dia: !dia ? "Indique o dia." : dia > hojeIso() ? "Só dias até hoje." : undefined,
    justificacao: j.length > 500 ? "No máximo 500 caracteres." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      registar.reset();
      setTentou(false);
      setJustificacao("");
      if (!colaboradorFixo) setColaborador("");
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <UserX strokeWidth={1.75} aria-hidden />
        Registar falta
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Registar uma falta"
        descricao="Com justificação, fica como falta justificada."
        rotuloConfirmar="Registar"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.colaborador || erros.dia || erros.justificacao || registar.isPending) return;
            registar.mutate({ employeeId: colaborador, day: dia, justification: j === "" ? null : j }, { onSuccess: () => mudar(false) });
          }}
        >
          {colaboradorFixo ? null : (
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined}>
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Field rotulo="Dia" erro={tentou ? erros.dia : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} value={dia} onChange={(e) => setDia(e.target.value)} />}
          </Field>
          <Field rotulo="Justificação (opcional)" erro={tentou ? erros.justificacao : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={500} aria-describedby={descricao} invalido={invalido} value={justificacao} onChange={(e) => setJustificacao(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export function AccoesAssiduidade({ colaboradorFixo }: { colaboradorFixo?: string }) {
  return (
    <Can requer="hr.attendance.write">
      <div className="flex flex-wrap gap-2">
        <MarcarPonto {...(colaboradorFixo ? { colaboradorFixo } : {})} />
        <RegistarFalta {...(colaboradorFixo ? { colaboradorFixo } : {})} />
      </div>
    </Can>
  );
}

export function ListaAssiduidade({ colaborador, comNome }: { colaborador: string | null; comNome: boolean }) {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const data = (k: string) => (IsoDate.safeParse(params.get(k) ?? "").success ? (params.get(k) as string) : null);
  const de = data("de");
  const ate = data("ate");
  const anomalias = params.get("anomalias") === "1";
  const idDe = useId();
  const idAte = useId();
  const invertida = de !== null && ate !== null && ate < de;
  const lista = useAssiduidade({ de: invertida ? null : de, ate: invertida ? null : ate, colaborador, anomalias, pagina, tamanho });
  const nomeDe = useNomeColaborador();
  const filtrar = (k: string, v: string) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      if (v) n.set(k, v);
      else n.delete(k);
      n.delete("pagina");
      return n;
    });
  const colunas: Coluna<Marcacao>[] = [
    ...(comNome
      ? [
          {
            id: "colaborador",
            cabecalho: "Colaborador",
            celula: (m: Marcacao) => (
              <Link to={`/colaboradores/${m.employeeId}?vista=assiduidade`} className="font-medium text-foreground underline-offset-4 hover:underline">
                {nomeDe(m.employeeId)}
              </Link>
            ),
          } satisfies Coluna<Marcacao>,
        ]
      : []),
    { id: "dia", cabecalho: "Dia", celula: (m) => formatarData(m.day) },
    { id: "entrada", cabecalho: "Entrada", esconderAte: "sm", celula: (m) => (m.checkedInAt ? formatarHora(m.checkedInAt) : "—") },
    { id: "saida", cabecalho: "Saída", esconderAte: "sm", celula: (m) => (m.checkedOutAt ? formatarHora(m.checkedOutAt) : "—") },
    { id: "horas", cabecalho: "Horas", alinhar: "direita", esconderAte: "md", celula: (m) => (m.observedHours === null ? "—" : formatarNumeroDecimal(String(m.observedHours), 2)) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (m) => (
        <div className="flex flex-col items-start gap-1">
          <EstadoMarcacao estado={m.status} />
          {m.justification ? <span className="whitespace-pre-line text-sm text-muted-foreground">«{m.justification}»</span> : null}
        </div>
      ),
    },
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idDe} className="text-sm font-medium text-foreground">
            De
          </label>
          <Input id={idDe} type="date" value={de ?? ""} onChange={(e) => filtrar("de", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idAte} className="text-sm font-medium text-foreground">
            Até
          </label>
          <Input id={idAte} type="date" value={ate ?? ""} onChange={(e) => filtrar("ate", e.target.value)} />
        </div>
        <div className="pb-2">
          <Checkbox rotulo="Só anomalias" ajuda="Faltas por justificar e atrasos." checked={anomalias} onChange={(e) => filtrar("anomalias", e.target.checked ? "1" : "")} />
        </div>
      </div>
      {invertida ? (
        <Alert tom="erro" titulo="A data final não pode ser anterior à inicial." />
      ) : (
        <>
          {de === null && ate === null ? <p className="mb-2 text-sm text-muted-foreground">Os últimos 30 dias.</p> : null}
          <Tabela
            rotulo="Marcações"
            colunas={colunas}
            linhas={lista.data?.items}
            chave={(m) => m.recordId}
            aCarregar={lista.isPending}
            erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
            vazio="Sem marcações neste período."
            rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
          />
        </>
      )}
    </>
  );
}

export default function Assiduidade() {
  const { colaborador, mudar } = useFiltroColaborador();
  return (
    <>
      <PageHeader titulo="Assiduidade" descricao="Marcações de entrada e saída, faltas e atrasos." accao={<AccoesAssiduidade />} />
      <div className="mb-4">
        <FiltroColaborador colaborador={colaborador} mudar={mudar} />
      </div>
      <ListaAssiduidade colaborador={colaborador} comNome />
    </>
  );
}

