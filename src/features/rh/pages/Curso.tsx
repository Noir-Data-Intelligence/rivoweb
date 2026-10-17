/**
 * Uma formação: dados, corrigir, cancelar; inscrições (inscrever, concluir com
 * avaliação e certificado, cancelar). Formação cancelada ou lotada não aceita
 * inscrições; concluir e cancelar só inscrições activas.
 */
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { SelectColaborador, useNomeColaborador } from "../escolhas";
import { EstadoInscricao } from "../estados";
import { errosConclusao } from "../regras";
import { useCancelarCurso, useCancelarInscricao, useConcluirInscricao, useCursos, useInscrever, useInscricoesGestao, type Curso as TipoCurso, type InscricaoGestao } from "../tempo";
import { EditarCurso, periodoCurso } from "./Formacao";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-48 sm:shrink-0">{rotulo}</dt>
      <dd className="whitespace-pre-line break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Inscrever({ c }: { c: TipoCurso }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState("");
  const [tentou, setTentou] = useState(false);
  const inscrever = useInscrever(c.courseId);
  const lotada = c.capacity !== null && Number(c.enrolled) >= Number(c.capacity);
  const erro = colaborador === "" ? "Escolha o colaborador." : undefined;
  const id = useId();
  return (
    <>
      <Button onClick={() => setAberto(true)} disabled={lotada} title={lotada ? "A formação está lotada." : undefined}>
        <Plus strokeWidth={1.75} aria-hidden />
        Inscrever
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            inscrever.reset();
            setColaborador("");
            setTentou(false);
          }
        }}
        titulo={`Inscrever em «${c.title}»`}
        rotuloConfirmar="Inscrever"
        aCarregar={inscrever.isPending}
        erro={inscrever.error ? <ErrorPanel erro={inscrever.error} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (erro || inscrever.isPending) return;
          inscrever.mutate(colaborador, { onSuccess: () => setAberto(false) });
        }}
      >
        <Field rotulo="Colaborador" erro={tentou ? erro : undefined}>
          {({ id: i, descricao, invalido }) => <SelectColaborador id={i ?? id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
        </Field>
      </Confirmar>
    </>
  );
}

function Concluir({ i, quem }: { i: InscricaoGestao; quem: string }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hojeIso());
  const [avaliacao, setAvaliacao] = useState("");
  const [certificado, setCertificado] = useState("");
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const concluir = useConcluirInscricao();
  const idForm = useId();
  const erros = errosConclusao({ data, avaliacao, certificado });
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Concluir a formação de ${quem}`}>
        Concluir
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            concluir.reset();
            setTentou(false);
          }
        }}
        titulo={`Concluir a formação de ${quem}`}
        descricao="Se a formação tiver validade de certificado, a data de expiração conta desde a conclusão."
        rotuloConfirmar="Concluir"
        aCarregar={concluir.isPending}
        erro={concluir.error ? <ErrorPanel erro={concluir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || concluir.isPending) return;
            const a = avaliacao.trim() === "" ? null : lerDecimalDigitado(avaliacao, 2);
            const n = normalizarTexto(notas, true);
            const cert = normalizarTexto(certificado);
            concluir.mutate(
              { enrolmentId: i.enrolmentId, completedOn: data === "" ? null : data, score: a ? decimalParaApi(a) : null, notes: n === "" ? null : n, certificateNumber: cert === "" ? null : cert },
              { onSuccess: () => setAberto(false) },
            );
          }}
        >
          <Field rotulo="Concluída a" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
          <Field rotulo="Avaliação de 0 a 100 (opcional)" erro={tentou ? erros.avaliacao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} />}
          </Field>
          <Field rotulo="N.º do certificado (opcional)" erro={tentou ? erros.certificado : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={certificado} onChange={(e) => setCertificado(e.target.value)} />}
          </Field>
          <Field rotulo="Notas (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function CancelarInscricao({ i, quem }: { i: InscricaoGestao; quem: string }) {
  const [aberto, setAberto] = useState(false);
  const cancelar = useCancelarInscricao();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Cancelar a inscrição de ${quem}`}>
        Cancelar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) cancelar.reset();
        }}
        titulo={`Cancelar a inscrição de ${quem}?`}
        descricao="Liberta o lugar. Não se desfaz: para voltar, inscreve-se de novo."
        rotuloConfirmar="Cancelar inscrição"
        variante="destructive"
        aCarregar={cancelar.isPending}
        erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
        aoConfirmar={() => (cancelar.isPending ? undefined : cancelar.mutate(i.enrolmentId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function CancelarCurso({ c }: { c: TipoCurso }) {
  const [aberto, setAberto] = useState(false);
  const cancelar = useCancelarCurso();
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        Cancelar formação
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) cancelar.reset();
        }}
        titulo="Cancelar esta formação?"
        descricao={`«${c.title}» deixa de aceitar inscrições. Não se desfaz.`}
        rotuloConfirmar="Cancelar formação"
        variante="destructive"
        aCarregar={cancelar.isPending}
        erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
        aoConfirmar={() => (cancelar.isPending ? undefined : cancelar.mutate(c.courseId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Inscricoes({ c }: { c: TipoCurso }) {
  const { pode } = useUtilizador();
  const lista = useInscricoesGestao({ curso: c.courseId, colaborador: null });
  const nomeDe = useNomeColaborador();
  const escreve = pode("hr.training.write");
  const colunas: Coluna<InscricaoGestao>[] = [
    {
      id: "colaborador",
      cabecalho: "Colaborador",
      celula: (i) => (
        <Link to={`/colaboradores/${i.employeeId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {nomeDe(i.employeeId)}
        </Link>
      ),
    },
    { id: "estado", cabecalho: "Estado", celula: (i) => <EstadoInscricao estado={i.status} /> },
    { id: "concluida", cabecalho: "Concluída a", esconderAte: "sm", celula: (i) => (i.completedOn ? formatarData(i.completedOn) : "—") },
    { id: "avaliacao", cabecalho: "Avaliação", alinhar: "direita", esconderAte: "md", celula: (i) => (i.score === null ? "—" : String(i.score).replace(".", ",")) },
    {
      id: "certificado",
      cabecalho: "Certificado",
      esconderAte: "lg",
      celula: (i) => (i.certificateNumber ? `${i.certificateNumber}${i.certificateExpiresOn ? ` · válido até ${formatarData(i.certificateExpiresOn)}` : ""}` : i.certificateExpiresOn ? `válido até ${formatarData(i.certificateExpiresOn)}` : "—"),
    },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (i) =>
        escreve && i.status === "Enrolled" ? (
          <div className="flex justify-end gap-1">
            <Concluir i={i} quem={nomeDe(i.employeeId)} />
            <CancelarInscricao i={i} quem={nomeDe(i.employeeId)} />
          </div>
        ) : null,
    },
  ];
  return (
    <Tabela
      rotulo="Inscrições"
      colunas={colunas}
      linhas={lista.data}
      chave={(i) => i.enrolmentId}
      aCarregar={lista.isPending}
      erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
      vazio="Ainda ninguém se inscreveu."
    />
  );
}

export default function Curso() {
  const { courseId = "" } = useParams();
  const cursos = useCursos(true);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/formacao">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Formação
      </Link>
    </Button>
  );
  if (cursos.isPending) return <CarregandoPagina />;
  if (cursos.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={cursos.error} tentarDeNovo={() => void cursos.refetch()} />
      </>
    );
  }
  const c = cursos.data.find((x) => x.courseId === courseId);
  if (!c) {
    return (
      <>
        {voltar}
        <Alert tom="aviso" titulo="Formação não encontrada." />
      </>
    );
  }
  return (
    <>
      {voltar}
      <PageHeader
        titulo={c.title}
        descricao={`${periodoCurso(c)}${c.provider ? ` · ${c.provider}` : ""}`}
        accao={
          c.cancelled ? undefined : (
            <Can requer="hr.training.write">
              <div className="flex flex-wrap gap-2">
                <CancelarCurso c={c} />
                <EditarCurso c={c} />
                <Inscrever c={c} />
              </div>
            </Can>
          )
        }
      />
      {c.cancelled ? <Alert tom="info" className="mb-4" titulo="Formação cancelada: não aceita inscrições." /> : null}
      <Card className="mb-6">
        <CardTitle>A formação</CardTitle>
        <dl className="mt-3 flex flex-col gap-2">
          <Linha rotulo="Horas">{c.hours === null ? "—" : String(c.hours).replace(".", ",")}</Linha>
          <Linha rotulo="Custo">{c.cost === null || !c.currency ? "—" : moeda(c.cost, c.currency)}</Linha>
          <Linha rotulo="Inscritos">{c.capacity === null ? `${String(c.enrolled)} (sem limite)` : `${String(c.enrolled)} de ${String(c.capacity)}`}</Linha>
          <Linha rotulo="Concluídas">{String(c.completed)}</Linha>
          <Linha rotulo="Validade do certificado">{c.certificateValidityMonths ? `${String(c.certificateValidityMonths)} meses` : "—"}</Linha>
          {c.description ? <Linha rotulo="Descrição">{c.description}</Linha> : null}
        </dl>
      </Card>
      <h2 className="mb-3 text-md font-semibold text-foreground">Inscrições</h2>
      <Inscricoes c={c} />
    </>
  );
}
