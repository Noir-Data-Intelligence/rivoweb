/** Formação na gestão: formações planeadas (e canceladas, a pedido) e planear uma nova. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { decimalParaApi, lerDecimalDigitado, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { errosCurso } from "../regras";
import { useCorrigirCurso, useCursos, usePlanearCurso, type Curso, type PedidoCurso } from "../tempo";

const MOEDAS = ["AOA", "USD", "EUR"] as const;
const texto = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(".", ","));
const opcional = (v: string, multilinha = false) => {
  const n = normalizarTexto(v, multilinha);
  return n === "" ? null : n;
};

export const periodoCurso = (c: Curso) => (c.endsOn && c.endsOn !== c.startsOn ? `${formatarData(c.startsOn)} a ${formatarData(c.endsOn)}` : formatarData(c.startsOn));

/** Planear (sem `c`) ou corrigir (com `c`): o `PUT` substitui tudo. */
export function EditarCurso({ c }: { c?: Curso }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({
    titulo: c?.title ?? "",
    entidade: c?.provider ?? "",
    descricao: c?.description ?? "",
    inicio: c?.startsOn ?? "",
    fim: c?.endsOn ?? "",
    horas: texto(c?.hours),
    custo: c?.cost === null || c?.cost === undefined ? "" : String(c.cost).replace(".", ","),
    moeda: c?.currency ?? "AOA",
    lotacao: texto(c?.capacity),
    validade: texto(c?.certificateValidityMonths),
  });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const planear = usePlanearCurso();
  const corrigir = useCorrigirCurso();
  const m = c ? corrigir : planear;
  const idForm = useId();
  const erros = errosCurso(v);
  const campo = (k: keyof ReturnType<typeof inicial>, valor: string) => setV((x) => ({ ...x, [k]: valor }));
  const mudar = (x: boolean) => {
    setAberto(x);
    if (!x) {
      planear.reset();
      corrigir.reset();
      setTentou(false);
      setV(inicial());
    }
  };
  return (
    <>
      {c ? (
        <Button variante="secondary" onClick={() => setAberto(true)}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Planear formação
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo={c ? "Corrigir a formação" : "Planear uma formação"}
        descricao="Sem lotação, não há limite de inscritos. A validade do certificado conta desde a conclusão de cada inscrição."
        rotuloConfirmar={c ? "Guardar" : "Planear"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || m.isPending) return;
            const horas = v.horas.trim() === "" ? null : lerDecimalDigitado(v.horas, 2);
            const custo = v.custo.trim() === "" ? null : lerDinheiroDigitado(v.custo);
            const corpo: PedidoCurso = {
              title: normalizarTexto(v.titulo),
              provider: opcional(v.entidade),
              description: opcional(v.descricao, true),
              startsOn: v.inicio,
              endsOn: v.fim === "" ? null : v.fim,
              hours: horas ? decimalParaApi(horas) : null,
              cost: custo ? paraApi(custo) : null,
              currency: custo ? v.moeda : null,
              capacity: v.lotacao.trim() === "" ? null : Number(v.lotacao),
              certificateValidityMonths: v.validade.trim() === "" ? null : Number(v.validade),
            };
            if (c) corrigir.mutate({ courseId: c.courseId, ...corpo }, { onSuccess: () => mudar(false) });
            else planear.mutate(corpo, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => campo("titulo", e.target.value)} />}
          </Field>
          <Field rotulo="Entidade formadora (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} value={v.entidade} onChange={(e) => campo("entidade", e.target.value)} />}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => campo("inicio", e.target.value)} />}
          </Field>
          <Field rotulo="Fim (opcional)" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || undefined} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => campo("fim", e.target.value)} />}
          </Field>
          <Field rotulo="Horas (opcional)" erro={tentou ? erros.horas : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.horas} onChange={(e) => campo("horas", e.target.value)} />}
          </Field>
          <Field rotulo="Lotação (opcional)" erro={tentou ? erros.lotacao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.lotacao} onChange={(e) => campo("lotacao", e.target.value)} />}
          </Field>
          <Field rotulo="Custo (opcional)" erro={tentou ? erros.custo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.custo} onChange={(e) => campo("custo", e.target.value)} />}
          </Field>
          <Field rotulo="Moeda do custo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.moeda} onChange={(e) => campo("moeda", e.target.value)}>
                {MOEDAS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Validade do certificado em meses (opcional)" erro={tentou ? erros.validade : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.validade} onChange={(e) => campo("validade", e.target.value)} />}
          </Field>
          <Field rotulo="Descrição (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} value={v.descricao} onChange={(e) => campo("descricao", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Formacao() {
  const [cancelados, setCancelados] = useState(false);
  const lista = useCursos(cancelados);
  const colunas: Coluna<Curso>[] = [
    {
      id: "titulo",
      cabecalho: "Formação",
      celula: (c) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/formacao/${c.courseId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {c.title}
          </Link>
          {c.provider ? <span className="truncate text-sm text-muted-foreground">{c.provider}</span> : null}
        </div>
      ),
      className: "max-w-[20rem]",
    },
    { id: "periodo", cabecalho: "Datas", esconderAte: "sm", celula: periodoCurso },
    { id: "horas", cabecalho: "Horas", alinhar: "direita", esconderAte: "md", celula: (c) => (c.hours === null ? "—" : texto(c.hours)) },
    { id: "custo", cabecalho: "Custo", alinhar: "direita", esconderAte: "lg", celula: (c) => (c.cost === null || !c.currency ? "—" : moeda(c.cost, c.currency)) },
    { id: "inscritos", cabecalho: "Inscritos", alinhar: "direita", celula: (c) => (c.capacity === null ? String(c.enrolled) : `${String(c.enrolled)} / ${String(c.capacity)}`) },
    { id: "concluidas", cabecalho: "Concluídas", alinhar: "direita", esconderAte: "md", celula: (c) => String(c.completed) },
    { id: "estado", cabecalho: "Estado", celula: (c) => (c.cancelled ? <Badge>Cancelada</Badge> : <Badge tom="sucesso">Planeada</Badge>) },
  ];
  const linhas = lista.data ? [...lista.data].sort((a, b) => b.startsOn.localeCompare(a.startsOn)) : undefined;
  return (
    <>
      <PageHeader
        titulo="Formação"
        descricao="Formações planeadas, inscritos e certificados."
        accao={
          <Can requer="hr.training.write">
            <EditarCurso />
          </Can>
        }
      />
      <div className="mb-4">
        <Checkbox rotulo="Mostrar as canceladas" checked={cancelados} onChange={(e) => setCancelados(e.target.checked)} />
      </div>
      <Tabela
        rotulo="Formações"
        colunas={colunas}
        linhas={linhas}
        chave={(c) => c.courseId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há formações."
      />
    </>
  );
}
