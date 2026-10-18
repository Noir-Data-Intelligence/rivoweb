/**
 * Projectos (§5.13, F12): lista por nome, paginada, com ou sem os fechados
 * (no URL); abrir um projecto.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { BarraProgresso } from "@/ui/BarraProgresso";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAbrirProjecto, useProjectos, type Projecto } from "../api";
import { EstadoProjecto } from "../comum";
import { errosProjecto, temErros } from "../regras";

function NovoProjecto() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ nome: "", inicio: hojeIso() });
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirProjecto();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosProjecto(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV({ nome: "", inicio: hojeIso() });
      setTentou(false);
      abrir.reset();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo projecto
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo="Novo projecto" descricao="Os marcos, as tarefas e o orçamento juntam-se na ficha." rotuloConfirmar="Abrir projecto" aCarregar={abrir.isPending} erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || abrir.isPending) return;
            abrir.mutate({ name: normalizarTexto(v.nome), startDate: v.inicio }, { onSuccess: (r) => void navegar(`/projectos/${r.projectId}`) });
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
          <Field rotulo="Início" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => setV((x) => ({ ...x, inicio: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Projectos() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const fechados = params.get("fechados") === "sim";
  const lista = useProjectos({ fechados, pagina, tamanho });
  const alternar = (sim: boolean) => {
    const n = new URLSearchParams(window.location.search);
    if (sim) n.set("fechados", "sim");
    else n.delete("fechados");
    n.delete("pagina");
    setParams(n);
  };
  const colunas: Coluna<Projecto>[] = [
    {
      id: "nome",
      cabecalho: "Projecto",
      className: "max-w-[18rem]",
      celula: (p) => (
        <Link to={`/projectos/${p.projectId}`} className="block truncate font-medium text-foreground underline-offset-4 hover:underline">
          {p.name}
        </Link>
      ),
    },
    { id: "datas", cabecalho: "Período", esconderAte: "md", celula: (p) => `${formatarData(p.startDate)} → ${p.endDate ? formatarData(p.endDate) : "em curso"}` },
    {
      id: "feito",
      cabecalho: "Feito",
      className: "min-w-[8rem]",
      celula: (p) => <BarraProgresso valor={Number(p.completionPercent ?? 0)} rotulo={`${p.name}: ${String(p.completionPercent ?? 0)}% feito`} />,
    },
    { id: "tarefas", cabecalho: "Tarefas", alinhar: "direita", esconderAte: "sm", celula: (p) => `${String(p.tasks.filter((t) => t.status === "Done").length)}/${String(p.tasks.filter((t) => t.status !== "Cancelled").length)}` },
    { id: "orc", cabecalho: "Orçamento", alinhar: "direita", esconderAte: "lg", celula: (p) => (p.budget ? moeda(p.budget.amount, p.budget.currency) : "—") },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoProjecto estado={p.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Projectos"
        descricao="Projectos com marcos, tarefas, quadro e Gantt."
        accao={
          <Can requer="projects.projects.write">
            <NovoProjecto />
          </Can>
        }
      />
      <div className="mb-4">
        <Checkbox rotulo="Mostrar também os fechados" checked={fechados} onChange={(e) => alternar(e.target.checked)} />
      </div>
      <Tabela
        rotulo="Projectos"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(p) => p.projectId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={fechados ? "Ainda não há projectos." : "Nenhum projecto activo."}
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
