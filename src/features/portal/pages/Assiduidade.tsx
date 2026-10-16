/** Portal › Assiduidade: as marcações do próprio e a justificação de faltas. */
import { useId, useState } from "react";
import { EstadoMarcacao } from "@/features/rh";
import { formatarData, formatarHora, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useJustificarFalta, useMinhaAssiduidade, type Marcacao } from "../api";
import { FiltroJanela, useJanelaUrl } from "../comum";
import { erroJanelaAssiduidade, inicioDoMes } from "../regras";

const MAXIMO_JUSTIFICACAO = 500;

function Justificar({ diaInicial, rotulo, variante = "secondary" }: { diaInicial: string; rotulo: string; variante?: "secondary" | "ghost" }) {
  const [aberto, setAberto] = useState(false);
  const [dia, setDia] = useState(diaInicial);
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const justificar = useJustificarFalta();
  const idForm = useId();
  const hoje = hojeIso();
  const t = normalizarTexto(texto, true);
  const erros = {
    dia: !dia ? "Indique o dia." : dia > hoje ? "Só se justificam dias até hoje." : undefined,
    texto: t === "" ? "Escreva a justificação." : t.length > MAXIMO_JUSTIFICACAO ? `No máximo ${MAXIMO_JUSTIFICACAO} caracteres.` : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      justificar.reset();
      setTentou(false);
      setTexto("");
      setDia(diaInicial);
    }
  };
  return (
    <>
      <Button variante={variante} tamanho={variante === "ghost" ? "sm" : "md"} onClick={() => setAberto(true)} aria-label={variante === "ghost" ? `Justificar a falta de ${formatarData(diaInicial)}` : undefined}>
        {rotulo}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Justificar uma falta"
        descricao="Se o dia não tiver marcação, fica registada uma falta já justificada."
        rotuloConfirmar="Justificar"
        aCarregar={justificar.isPending}
        erro={justificar.error ? <ErrorPanel erro={justificar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.dia || erros.texto || justificar.isPending) return;
            justificar.mutate({ day: dia, justification: t }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Dia" erro={tentou ? erros.dia : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" max={hoje} aria-describedby={descricao} invalido={invalido} value={dia} onChange={(e) => setDia(e.target.value)} />}
          </Field>
          <Field rotulo="Justificação" erro={tentou ? erros.texto : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_JUSTIFICACAO} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Assiduidade() {
  const hoje = hojeIso();
  const { de, ate, mudar } = useJanelaUrl({ de: inicioDoMes(hoje), ate: hoje });
  const erroJanela = erroJanelaAssiduidade(de, ate);
  const marcacoes = useMinhaAssiduidade(erroJanela ? null : de, erroJanela ? null : ate);
  const colunas: Coluna<Marcacao>[] = [
    { id: "dia", cabecalho: "Dia", celula: (m) => <span className="font-medium">{formatarData(m.day)}</span> },
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
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (m) => (m.status === "Absent" ? <Justificar diaInicial={m.day} rotulo="Justificar" variante="ghost" /> : null) },
  ];
  return (
    <>
      <PageHeader titulo="Assiduidade" descricao="As suas marcações de entrada e saída." accao={<Justificar diaInicial={hoje} rotulo="Justificar uma falta" />} />
      <FiltroJanela de={de} ate={ate} mudar={mudar} erro={erroJanela} />
      {erroJanela ? null : (
        <Tabela
          rotulo="Marcações"
          colunas={colunas}
          linhas={marcacoes.data}
          chave={(m) => m.recordId}
          aCarregar={marcacoes.isPending}
          erro={marcacoes.error ? <ErrorPanel erro={marcacoes.error} tentarDeNovo={() => void marcacoes.refetch()} /> : undefined}
          vazio="Sem marcações neste período."
        />
      )}
      {marcacoes.data?.some((m) => m.status === "Present" && m.checkedOutAt === null && m.day < hoje) ? (
        <Alert tom="info" className="mt-4" titulo="Há dias com entrada e sem saída registada. As horas desses dias ficam por apurar." />
      ) : null}
    </>
  );
}
