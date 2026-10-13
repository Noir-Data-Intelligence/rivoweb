import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/mini";
import { Can, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Select } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useCorrigirDepartamento, useCriarDepartamento, useDepartamentos, useTodosColaboradores, useTodosDepartamentos, type Departamento } from "../api";
import { AvisoListaIncompleta, nomeColaborador, nomeRepetido } from "../comum";

const esquema = z.object({
  name: texto({ max: 200, obrigatorio: "Escreva o nome do departamento." }),
  managerId: z.string(),
});
type Dados = z.infer<typeof esquema>;

function FormularioDepartamento({ departamento, aberto, aoMudar }: { departamento: Departamento | null; aberto: boolean; aoMudar: (a: boolean) => void }) {
  const criar = useCriarDepartamento();
  const corrigir = useCorrigirDepartamento();
  const accao = departamento ? corrigir : criar;
  const { pode } = useUtilizador();
  const colaboradores = useTodosColaboradores(aberto && pode("hr.employees.read"));
  const existentes = useTodosDepartamentos(aberto);
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<Dados>({
    resolver: zodResolver(esquema),
    values: { name: departamento?.name ?? "", managerId: departamento?.managerId ?? "" },
  });

  const fechar = (a: boolean) => {
    aoMudar(a);
    if (!a) {
      form.reset();
      criar.reset();
      corrigir.reset();
      setSoltas([]);
    }
  };

  const submeter = form.handleSubmit((d) => {
    if (accao.isPending) return;
    setSoltas([]);
    // O nome é único (índice na base); hoje o duplicado volta como 500 (B15).
    if (nomeRepetido(existentes.data?.items.map((x) => ({ id: x.departmentId, nome: x.name })), d.name, departamento?.departmentId)) {
      form.setError("name", { message: "Já existe um departamento com este nome." }, { shouldFocus: true });
      return;
    }
    const corpo = { name: d.name, managerId: d.managerId === "" ? null : d.managerId };
    const aoErrar = (e: unknown) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["name", "managerId"]));
    if (departamento) corrigir.mutate({ departmentId: departamento.departmentId, ...corpo }, { onSuccess: () => fechar(false), onError: aoErrar });
    else criar.mutate(corpo, { onSuccess: () => fechar(false), onError: aoErrar });
  });

  const activos = (colaboradores.data?.items ?? []).filter((c) => c.status === "Active" || c.employeeId === departamento?.managerId);

  return (
    <Confirmar
      aberto={aberto}
      aoMudar={fechar}
      titulo={departamento ? "Corrigir departamento" : "Novo departamento"}
      rotuloConfirmar={departamento ? "Guardar" : "Criar departamento"}
      aCarregar={accao.isPending}
      erro={
        soltas.length > 0 ? (
          <Alert tom="erro" titulo="Não foi possível guardar.">
            {soltas.join(" ")}
          </Alert>
        ) : accao.error && !(eApiError(accao.error) && accao.error.status === 400) ? (
          <ErrorPanel erro={accao.error} />
        ) : undefined
      }
      formulario={idForm}
    >
      <form id={idForm} onSubmit={submeter} noValidate className="flex flex-col gap-4">
        <Field rotulo="Nome" erro={form.formState.errors.name?.message}>
          {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("name")} />}
        </Field>
        <Field rotulo="Responsável" erro={form.formState.errors.managerId?.message} ajuda="Opcional. Um colaborador activo.">
          {({ id, descricao, invalido }) => (
            <Select id={id} aria-describedby={descricao} invalido={invalido} disabled={colaboradores.isFetching && !colaboradores.data} {...form.register("managerId")}>
              <option value="">Sem responsável</option>
              {activos.map((c) => (
                <option key={c.employeeId} value={c.employeeId}>
                  {c.fullName}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {colaboradores.data ? <AvisoListaIncompleta pagina={colaboradores.data} oque="colaboradores" /> : null}
        {colaboradores.error ? <ErrorPanel erro={colaboradores.error} tentarDeNovo={() => void colaboradores.refetch()} /> : null}
      </form>
    </Confirmar>
  );
}

export default function Departamentos() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const departamentos = useDepartamentos({ pagina, tamanho });
  const { pode } = useUtilizador();
  const colaboradores = useTodosColaboradores(pode("hr.employees.read"));
  const [aberto, setAberto] = useState(false);
  const [aEditar, setAEditar] = useState<Departamento | null>(null);
  const podeEscrever = pode("hr.departments.write");

  const colunas: Coluna<Departamento>[] = [
    { id: "nome", cabecalho: "Nome", celula: (d) => <span className="font-medium">{d.name}</span> },
    {
      id: "responsavel",
      cabecalho: "Responsável",
      esconderAte: "sm",
      celula: (d) => (d.managerId ? nomeColaborador(colaboradores.data?.items, d.managerId) : <span className="text-muted-foreground">—</span>),
    },
    ...(podeEscrever
      ? [
          {
            id: "accoes",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (d: Departamento) => (
              <Button
                variante="ghost"
                tamanho="sm"
                aria-label={`Corrigir ${d.name}`}
                onClick={() => {
                  setAEditar(d);
                  setAberto(true);
                }}
              >
                <Pencil strokeWidth={1.75} aria-hidden />
                <span className="hidden sm:inline">Corrigir</span>
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        titulo="Departamentos"
        descricao="A estrutura da empresa. Cada colaborador pertence, no máximo, a um departamento."
        accao={
          <Can requer="hr.departments.write">
            <Button
              onClick={() => {
                setAEditar(null);
                setAberto(true);
              }}
            >
              <Plus strokeWidth={1.75} aria-hidden />
              Novo departamento
            </Button>
          </Can>
        }
      />
      <Tabela
        rotulo="Departamentos"
        colunas={colunas}
        linhas={departamentos.data?.items}
        chave={(d) => d.departmentId}
        aCarregar={departamentos.isPending}
        erro={departamentos.error ? <ErrorPanel erro={departamentos.error} tentarDeNovo={() => void departamentos.refetch()} /> : undefined}
        vazio="Ainda não há departamentos."
        rodape={departamentos.data && departamentos.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={departamentos.data.total} aoMudar={mudar} /> : undefined}
      />
      {podeEscrever ? <FormularioDepartamento departamento={aEditar} aberto={aberto} aoMudar={setAberto} /> : null}
    </>
  );
}
