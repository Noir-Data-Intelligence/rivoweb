import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod/mini";
import { Can } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { email, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Select } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useConvidar, usePerfis, useUtilizadores, type ResumoUtilizador } from "../api";
import { nomePerfil } from "../perfis";

const esquemaConvite = z.object({
  email,
  profile: z.string().check(z.minLength(1, "Escolha o perfil.")),
});
type DadosConvite = z.infer<typeof esquemaConvite>;

function Convidar() {
  const [aberto, setAberto] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const perfis = usePerfis(aberto);
  const convidar = useConvidar();
  const idForm = useId();
  const form = useForm<DadosConvite>({ resolver: zodResolver(esquemaConvite), defaultValues: { email: "", profile: "" } });
  const [soltas, setSoltas] = useState<string[]>([]);

  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset();
      convidar.reset();
      setSoltas([]);
    }
  };

  const submeter = form.handleSubmit((d) => {
    if (convidar.isPending) return;
    setSoltas([]);
    convidar.mutate(d, {
      onSuccess: () => {
        setEnviadoPara(d.email);
        mudar(false);
      },
      onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["email", "profile"])),
    });
  });

  const erro =
    soltas.length > 0 ? (
      <Alert tom="erro" titulo="Não foi possível convidar.">
        {soltas.join(" ")}
      </Alert>
    ) : convidar.error && !(eApiError(convidar.error) && convidar.error.status === 400) ? (
      <ErrorPanel erro={convidar.error} />
    ) : null;

  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Convidar
      </Button>
      {enviadoPara ? (
        <div className="fixed inset-x-4 bottom-4 z-40 sm:left-auto sm:w-96">
          <Alert tom="sucesso" titulo="Convite enviado." accao={<Button variante="ghost" tamanho="sm" onClick={() => setEnviadoPara(null)}>Fechar</Button>}>
            {enviadoPara} recebe um e-mail para definir a password.
          </Alert>
        </div>
      ) : null}
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Convidar utilizador"
        descricao="A pessoa recebe um e-mail com uma ligação para definir a password. Uma conta criada não se apaga; pode ser desactivada."
        rotuloConfirmar="Enviar convite"
        aCarregar={convidar.isPending}
        erro={erro}
        formulario={idForm}
      >
        <form id={idForm} onSubmit={submeter} noValidate className="flex flex-col gap-4">
          <Field rotulo="E-mail" erro={form.formState.errors.email?.message}>
            {({ id, descricao, invalido }) => (
              <Input id={id} type="email" autoComplete="off" maxLength={256} aria-describedby={descricao} invalido={invalido} {...form.register("email")} />
            )}
          </Field>
          <Field
            rotulo="Perfil de acesso"
            erro={form.formState.errors.profile?.message}
            ajuda="Define o que a pessoa pode fazer. Pode juntar outros perfis depois."
          >
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} disabled={perfis.isPending} {...form.register("profile")}>
                <option value="">{perfis.isPending ? "A carregar…" : "Escolha…"}</option>
                {(perfis.data ?? []).map((p) => (
                  <option key={p.name} value={p.name}>
                    {nomePerfil(p.name)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {perfis.error ? <ErrorPanel erro={perfis.error} tentarDeNovo={() => void perfis.refetch()} /> : null}
        </form>
      </Confirmar>
    </>
  );
}

type FiltroEstado = "todos" | "activos" | "inactivos";

export default function Utilizadores() {
  const utilizadores = useUtilizadores();
  const [pesquisa, setPesquisa] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const idPesquisa = useId();
  const idEstado = useId();

  const filtrados = useMemo(() => {
    const termo = normalizarTexto(pesquisa).toLowerCase();
    return (utilizadores.data ?? []).filter(
      (u) =>
        (termo === "" || u.email.toLowerCase().includes(termo)) &&
        (estado === "todos" || (estado === "activos") === u.isActive),
    );
  }, [utilizadores.data, pesquisa, estado]);

  const colunas: Coluna<ResumoUtilizador>[] = [
    {
      id: "email",
      cabecalho: "E-mail",
      ordenar: (u) => u.email,
      celula: (u) => (
        <Link to={`/utilizadores/${u.userId}`} className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {u.email}
        </Link>
      ),
      className: "max-w-[16rem] truncate",
    },
    {
      id: "perfis",
      cabecalho: "Perfis",
      esconderAte: "md",
      celula: (u) =>
        u.roles.length === 0 ? (
          <span className="text-muted-foreground">Sem perfil</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {u.roles.map((r) => (
              <Badge key={r}>{nomePerfil(r)}</Badge>
            ))}
          </span>
        ),
    },
    {
      id: "estado",
      cabecalho: "Estado",
      ordenar: (u) => (u.isActive ? 0 : 1),
      celula: (u) => (u.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge tom="aviso">Inactiva</Badge>),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Utilizadores"
        descricao="Contas com acesso à Rivo e os perfis de cada uma."
        accao={
          <Can requer={{ allOf: ["identity.users.write", "identity.roles.read"] }}>
            <Convidar />
          </Can>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={idPesquisa} className="text-sm font-medium text-foreground">
            Pesquisar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <Input id={idPesquisa} type="search" placeholder="E-mail" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} className="pl-9" maxLength={256} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:w-48">
          <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
            Estado
          </label>
          <Select id={idEstado} value={estado} onChange={(e) => setEstado(e.target.value as FiltroEstado)}>
            <option value="todos">Todos</option>
            <option value="activos">Activas</option>
            <option value="inactivos">Inactivas</option>
          </Select>
        </div>
      </div>
      <Tabela
        rotulo="Utilizadores"
        colunas={colunas}
        linhas={filtrados}
        chave={(u) => u.userId}
        aCarregar={utilizadores.isPending}
        erro={utilizadores.error ? <ErrorPanel erro={utilizadores.error} tentarDeNovo={() => void utilizadores.refetch()} /> : undefined}
        vazio={(utilizadores.data ?? []).length === 0 ? "Ainda não há utilizadores." : "Nenhum utilizador corresponde à pesquisa."}
        ordenavel
        rodape={
          utilizadores.data ? (
            <p className="text-sm text-muted-foreground">
              {filtrados.length} de {utilizadores.data.length}
            </p>
          ) : undefined
        }
      />
    </>
  );
}
