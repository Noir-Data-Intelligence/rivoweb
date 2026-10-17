/** Recrutamento: vagas (abrir e fechar) e, em cada vaga, o funil de candidatos. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { Can } from "@/features/identity";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useTodosDepartamentos } from "../api";
import { useAbrirVaga, useVagas, type Vaga } from "../ciclo";
import { EstadoVaga } from "../estados";
import { errosVaga } from "../regras";

const opcional = (v: string, multilinha = false) => {
  const n = normalizarTexto(v, multilinha);
  return n === "" ? null : n;
};

function AbrirVaga() {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [vagas, setVagas] = useState("1");
  const [descricao, setDescricao] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirVaga();
  const departamentos = useTodosDepartamentos(aberto);
  const idForm = useId();
  const erros = errosVaga({ titulo, vagas, descricao, requisitos });
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      abrir.reset();
      setTentou(false);
      setTitulo("");
      setDepartamento("");
      setVagas("1");
      setDescricao("");
      setRequisitos("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir vaga
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Abrir uma vaga"
        descricao="Fica aberta a candidaturas até a fechar. Uma vaga não é um cargo: o cargo atribui-se depois de contratar."
        rotuloConfirmar="Abrir vaga"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : departamentos.error ? <ErrorPanel erro={departamentos.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || abrir.isPending) return;
            abrir.mutate(
              { title: normalizarTexto(titulo), departmentId: departamento === "" ? null : departamento, vacancies: Number(vagas), description: opcional(descricao, true), requirements: opcional(requisitos, true) },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao: d, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={d} invalido={invalido} value={titulo} onChange={(e) => setTitulo(e.target.value)} />}
          </Field>
          <Field rotulo="Departamento (opcional)">
            {({ id, descricao: d }) => (
              <Select id={id} aria-describedby={d} value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
                <option value="">Nenhum</option>
                {(departamentos.data?.items ?? []).map((x) => (
                  <option key={x.departmentId} value={x.departmentId}>
                    {x.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="N.º de vagas" erro={tentou ? erros.vagas : undefined}>
            {({ id, descricao: d, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={d} invalido={invalido} value={vagas} onChange={(e) => setVagas(e.target.value)} />}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao: d, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={d} invalido={invalido} value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
          </Field>
          <Field rotulo="Requisitos (opcional)" erro={tentou ? erros.requisitos : undefined} className="sm:col-span-2">
            {({ id, descricao: d, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={d} invalido={invalido} value={requisitos} onChange={(e) => setRequisitos(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Recrutamento() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useVagas({ pagina, tamanho });
  const departamentos = useTodosDepartamentos();
  const nomeDep = (id: string | null) => (id ? (departamentos.data?.items.find((d) => d.departmentId === id)?.name ?? "—") : "—");
  const colunas: Coluna<Vaga>[] = [
    {
      id: "titulo",
      cabecalho: "Vaga",
      celula: (v) => (
        <Link to={`/recrutamento/${v.openingId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {v.title}
        </Link>
      ),
    },
    { id: "departamento", cabecalho: "Departamento", esconderAte: "sm", celula: (v) => nomeDep(v.departmentId) },
    { id: "vagas", cabecalho: "Vagas", alinhar: "direita", celula: (v) => String(v.vacancies) },
    { id: "estado", cabecalho: "Estado", celula: (v) => <EstadoVaga estado={v.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Recrutamento"
        descricao="Vagas abertas e o funil de candidatos de cada uma."
        accao={
          <Can requer="hr.recruitment.write">
            <AbrirVaga />
          </Can>
        }
      />
      <Tabela
        rotulo="Vagas"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(v) => v.openingId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há vagas."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
