import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { z } from "zod/mini";
import { Can, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { formatarDataDeInstante, hojeIso, inicioDoDiaEmLuanda } from "@/lib/format/data";
import { IsoDate, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Select } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { ResultadoImportacao } from "@/ui/ResultadoImportacao";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAdmitir, useColaboradores, useTodosDepartamentos, type Colaborador } from "../api";
import { AvisoListaIncompleta, EstadoColaborador, nomeDepartamento } from "../comum";
import { useImportarColaboradores } from "../talento";
import { emailOpcional, vazioParaNull } from "../validacao";

const esquema = z.object({
  fullName: texto({ max: 200, obrigatorio: "Escreva o nome completo." }),
  departmentId: z.string(),
  hiredOn: IsoDate,
  email: emailOpcional,
  phone: texto({ max: 50 }),
  employeeCode: texto({ max: 30 }),
});
type Dados = z.infer<typeof esquema>;

function Admitir() {
  const [aberto, setAberto] = useState(false);
  const admitir = useAdmitir();
  const departamentos = useTodosDepartamentos(aberto);
  const navegar = useNavigate();
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<Dados>({
    resolver: zodResolver(esquema),
    defaultValues: { fullName: "", departmentId: "", hiredOn: hojeIso(), email: "", phone: "", employeeCode: "" },
  });
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset({ fullName: "", departmentId: "", hiredOn: hojeIso(), email: "", phone: "", employeeCode: "" });
      admitir.reset();
      setSoltas([]);
    }
  };
  const submeter = form.handleSubmit((d) => {
    if (admitir.isPending) return;
    setSoltas([]);
    admitir.mutate(
      {
        fullName: d.fullName,
        departmentId: vazioParaNull(d.departmentId),
        // A admissão já não associa contas: liga-se depois, na ficha (ADR-051).
        userId: null,
        hiredOn: inicioDoDiaEmLuanda(d.hiredOn),
        email: vazioParaNull(d.email),
        phone: vazioParaNull(d.phone),
        employeeCode: vazioParaNull(d.employeeCode),
      },
      {
        onSuccess: (r) => {
          fechar(false);
          void navegar(`/colaboradores/${r.employeeId}`);
        },
        onError: (e) =>
          setSoltas(aplicarErrosDoServidor(e, form.setError, ["fullName", "departmentId", "hiredOn", "email", "phone", "employeeCode"])),
      },
    );
  });
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Admitir colaborador
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Admitir colaborador"
        descricao="A conta de acesso liga-se depois, na ficha."
        rotuloConfirmar="Admitir"
        aCarregar={admitir.isPending}
        erro={
          soltas.length > 0 ? (
            <Alert tom="erro" titulo="Não foi possível admitir.">
              {soltas.join(" ")}
            </Alert>
          ) : admitir.error && !(eApiError(admitir.error) && admitir.error.status === 400) ? (
            <ErrorPanel erro={admitir.error} />
          ) : undefined
        }
        formulario={idForm}
      >
        <form id={idForm} onSubmit={submeter} noValidate className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-0.5">
          <Field rotulo="Nome completo" erro={form.formState.errors.fullName?.message}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("fullName")} />}
          </Field>
          <Field rotulo="Departamento" erro={form.formState.errors.departmentId?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("departmentId")}>
                <option value="">Sem departamento</option>
                {(departamentos.data?.items ?? []).map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {departamentos.data ? <AvisoListaIncompleta pagina={departamentos.data} oque="departamentos" /> : null}
          {departamentos.error ? <ErrorPanel erro={departamentos.error} tentarDeNovo={() => void departamentos.refetch()} /> : null}
          <Field rotulo="Data de admissão" erro={form.formState.errors.hiredOn?.message}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} className="max-w-48" {...form.register("hiredOn")} />}
          </Field>
          <Field rotulo="E-mail" erro={form.formState.errors.email?.message} ajuda="Opcional.">
            {({ id, descricao, invalido }) => <Input id={id} type="email" maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("email")} />}
          </Field>
          <Field rotulo="Telefone" erro={form.formState.errors.phone?.message} ajuda="Opcional.">
            {({ id, descricao, invalido }) => <Input id={id} type="tel" maxLength={50} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("phone")} />}
          </Field>
          <Field rotulo="N.º mecanográfico" erro={form.formState.errors.employeeCode?.message} ajuda="Opcional. Único na empresa.">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("employeeCode")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Importar() {
  const [aberto, setAberto] = useState(false);
  const importar = useImportarColaboradores();
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [erroFicheiro, setErroFicheiro] = useState<string | null>(null);
  const id = useId();
  const r = importar.data;
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <FileUp strokeWidth={1.75} aria-hidden />
        Importar CSV
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            importar.reset();
            setFicheiro(null);
            setErroFicheiro(null);
          }
        }}
        titulo="Importar colaboradores de um CSV"
        descricao="Com cabeçalho na primeira linha, colunas por nome (qualquer ordem). Obrigatórias Nome e DataAdmissao (aaaa-mm-dd); opcional Departamento, pelo nome exacto. Separador ; ou ,. Até 5 MB. As fichas entram sem conta de acesso."
        rotuloConfirmar={r ? "Importar outro" : "Importar"}
        aCarregar={importar.isPending}
        erro={importar.error ? <ErrorPanel erro={importar.error} /> : undefined}
        aoConfirmar={() => {
          if (r) {
            importar.reset();
            setFicheiro(null);
            return;
          }
          if (!ficheiro) return setErroFicheiro("Escolha um ficheiro .csv.");
          if (ficheiro.size > 5 * 1024 * 1024) return setErroFicheiro("O ficheiro passa de 5 MB.");
          if (!/\.csv$/i.test(ficheiro.name)) return setErroFicheiro("O ficheiro tem de ser .csv.");
          if (!importar.isPending) importar.mutate(ficheiro);
        }}
      >
        {r ? (
          <ResultadoImportacao r={r} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
              Ficheiro
            </label>
            <input
              id={id}
              type="file"
              accept=".csv,text/csv"
              className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-foreground"
              onChange={(e) => {
                setFicheiro(e.target.files?.[0] ?? null);
                setErroFicheiro(null);
              }}
            />
            {erroFicheiro ? (
              <p className="text-xs text-danger" role="alert">
                {erroFicheiro}
              </p>
            ) : null}
          </div>
        )}
      </Confirmar>
    </>
  );
}

export default function Colaboradores() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const colaboradores = useColaboradores({ pagina, tamanho });
  const { pode } = useUtilizador();
  const departamentos = useTodosDepartamentos(pode("hr.departments.read"));

  const colunas: Coluna<Colaborador>[] = [
    {
      id: "nome",
      cabecalho: "Nome",
      celula: (c) => (
        <Link to={`/colaboradores/${c.employeeId}`} className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {c.fullName}
        </Link>
      ),
    },
    { id: "codigo", cabecalho: "N.º", esconderAte: "lg", celula: (c) => c.employeeCode ?? <span className="text-muted-foreground">—</span> },
    {
      id: "departamento",
      cabecalho: "Departamento",
      esconderAte: "md",
      celula: (c) => (pode("hr.departments.read") ? nomeDepartamento(departamentos.data?.items, c.departmentId) : "—"),
    },
    { id: "admissao", cabecalho: "Admissão", esconderAte: "lg", celula: (c) => formatarDataDeInstante(c.hiredOn) },
    { id: "conta", cabecalho: "Conta", esconderAte: "sm", celula: (c) => (c.userId ? "Ligada" : <span className="text-muted-foreground">—</span>) },
    { id: "estado", cabecalho: "Estado", celula: (c) => <EstadoColaborador estado={c.status} /> },
  ];

  return (
    <>
      <PageHeader
        titulo="Colaboradores"
        descricao="Fichas dos colaboradores. Ligar a conta de acesso e atribuir o cargo faz-se em cada ficha."
        accao={
          <div className="flex flex-wrap gap-2">
            <Can requer="hr.employees.write">
              <Importar />
            </Can>
            <Can requer={{ allOf: ["hr.employees.write", "hr.departments.read"] }}>
              <Admitir />
            </Can>
          </div>
        }
      />
      <Tabela
        rotulo="Colaboradores"
        colunas={colunas}
        linhas={colaboradores.data?.items}
        chave={(c) => c.employeeId}
        aCarregar={colaboradores.isPending}
        erro={colaboradores.error ? <ErrorPanel erro={colaboradores.error} tentarDeNovo={() => void colaboradores.refetch()} /> : undefined}
        vazio="Ainda não há colaboradores."
        rodape={
          colaboradores.data && colaboradores.data.total > 0 ? (
            <Paginacao pagina={pagina} tamanho={tamanho} total={colaboradores.data.total} aoMudar={mudar} />
          ) : undefined
        }
      />
    </>
  );
}
