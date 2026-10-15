import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useParams } from "react-router";
import { z } from "zod/mini";
import { Can, RegrasPassword, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { novaPassword, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Select, Textarea } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import {
  useAtribuirPerfil,
  useEnviarLigacaoRecuperacao,
  useMudarEstadoConta,
  usePerfis,
  useReporPassword,
  useRetirarPerfil,
  useUtilizadores,
  type ResumoUtilizador,
} from "../api";
import { contaProtegida, nomePerfil, SUPER_ADMIN } from "../perfis";

function RetirarPerfil({ alvo, perfil, propria }: { alvo: ResumoUtilizador; perfil: string; propria: boolean }) {
  const [aberto, setAberto] = useState(false);
  const retirar = useRetirarPerfil();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        Retirar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) retirar.reset();
        }}
        titulo={`Retirar o perfil ${nomePerfil(perfil)}?`}
        descricao={
          propria
            ? "É a sua própria conta: perde já as permissões deste perfil e as suas outras sessões terminam."
            : `${alvo.email} perde as permissões deste perfil e as sessões abertas terminam.`
        }
        rotuloConfirmar="Retirar perfil"
        variante="destructive"
        aCarregar={retirar.isPending}
        erro={retirar.error ? <ErrorPanel erro={retirar.error} /> : undefined}
        aoConfirmar={() => retirar.mutate({ userId: alvo.userId, profile: perfil }, { onSuccess: () => setAberto(false) })}
      />
    </>
  );
}

function AtribuirPerfil({ alvo }: { alvo: ResumoUtilizador }) {
  const perfis = usePerfis();
  const atribuir = useAtribuirPerfil();
  const [escolhido, setEscolhido] = useState("");
  const id = useId();
  const disponiveis = (perfis.data ?? []).filter((p) => !alvo.roles.includes(p.name));
  if (perfis.error) return <ErrorPanel erro={perfis.error} tentarDeNovo={() => void perfis.refetch()} className="mt-4" />;
  if (!perfis.isPending && disponiveis.length === 0) return null;
  return (
    <>
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (escolhido === "" || atribuir.isPending) return;
        atribuir.mutate({ userId: alvo.userId, profile: escolhido }, { onSuccess: () => setEscolhido("") });
      }}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Juntar perfil
        </label>
        <Select id={id} value={escolhido} onChange={(e) => setEscolhido(e.target.value)} disabled={perfis.isPending}>
          <option value="">{perfis.isPending ? "A carregar…" : "Escolha…"}</option>
          {disponiveis.map((p) => (
            <option key={p.name} value={p.name}>
              {nomePerfil(p.name)}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variante="secondary" aCarregar={atribuir.isPending} disabled={escolhido === ""}>
        Atribuir
      </Button>
    </form>
    {atribuir.error ? <ErrorPanel erro={atribuir.error} className="mt-3" /> : null}
    </>
  );
}

function Perfis({ alvo, gerivel, propria }: { alvo: ResumoUtilizador; gerivel: boolean; propria: boolean }) {
  const { pode } = useUtilizador();
  const podeAtribuir = gerivel && pode("identity.roles.assign");
  return (
    <Card>
      <CardTitle>Perfis de acesso</CardTitle>
      {alvo.roles.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Esta conta ainda não tem perfil e não pode fazer nada na gestão.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {alvo.roles.map((r) => (
            <li key={r} className="flex min-h-11 items-center justify-between gap-3 py-1.5">
              <span className="text-base text-foreground">{nomePerfil(r)}</span>
              {podeAtribuir && r !== SUPER_ADMIN ? <RetirarPerfil alvo={alvo} perfil={r} propria={propria} /> : null}
            </li>
          ))}
        </ul>
      )}
      {podeAtribuir && pode("identity.roles.read") ? <AtribuirPerfil alvo={alvo} /> : null}
    </Card>
  );
}

const esquemaRazao = z.object({ razao: texto({ max: 500, obrigatorio: "Indique a razão: fica na trilha de auditoria." }) });

function EstadoConta({ alvo, propria }: { alvo: ResumoUtilizador; propria: boolean }) {
  const [aberto, setAberto] = useState(false);
  const mudar = useMudarEstadoConta();
  const idForm = useId();
  const form = useForm<{ razao: string }>({ resolver: zodResolver(esquemaRazao), defaultValues: { razao: "" } });
  const activar = !alvo.isActive;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset();
      mudar.reset();
    }
  };
  const submeter = form.handleSubmit((d) => {
    if (mudar.isPending) return;
    mudar.mutate(
      { userId: alvo.userId, active: activar, reason: d.razao },
      { onSuccess: () => fechar(false), onError: (e) => {
          // O que não for de um campo fica no único campo do formulário.
          const soltas = aplicarErrosDoServidor(e, form.setError, ["razao"], { reason: "razao" });
          if (soltas.length > 0) form.setError("razao", { type: "server", message: soltas.join(" ") });
        },
      },
    );
  });
  return (
    <Card>
      <CardTitle>Estado da conta</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        {alvo.isActive ? "A conta está activa e pode entrar na Rivo." : "A conta está inactiva: não pode entrar."}
      </p>
      {propria && alvo.isActive ? (
        <p className="mt-3 text-sm text-muted-foreground">Não pode desactivar a sua própria conta.</p>
      ) : (
        <Button className="mt-4" variante={activar ? "secondary" : "destructive"} onClick={() => setAberto(true)}>
          {activar ? "Reactivar conta" : "Desactivar conta"}
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={activar ? "Reactivar a conta?" : "Desactivar a conta?"}
        descricao={activar ? `${alvo.email} volta a poder entrar.` : `${alvo.email} deixa de poder entrar e as sessões abertas terminam já.`}
        rotuloConfirmar={activar ? "Reactivar" : "Desactivar"}
        variante={activar ? "primary" : "destructive"}
        aCarregar={mudar.isPending}
        erro={mudar.error && !(eApiError(mudar.error) && mudar.error.status === 400) ? <ErrorPanel erro={mudar.error} /> : undefined}
        formulario={idForm}
      >
        <form id={idForm} onSubmit={submeter} noValidate>
          <Field rotulo="Razão" erro={form.formState.errors.razao?.message} ajuda="Fica na trilha de auditoria.">
            {({ id, descricao, invalido }) => <Textarea id={id} maxLength={500} aria-describedby={descricao} invalido={invalido} {...form.register("razao")} />}
          </Field>
        </form>
      </Confirmar>
    </Card>
  );
}

const esquemaReposicao = z
  .object({ nova: novaPassword, confirmacao: z.string() })
  .check(z.refine((d) => d.nova === d.confirmacao, { path: ["confirmacao"], error: "As passwords não coincidem." }));

function Password({ alvo }: { alvo: ResumoUtilizador }) {
  const [ligacaoAberta, setLigacaoAberta] = useState(false);
  const [reporAberto, setReporAberto] = useState(false);
  const ligacao = useEnviarLigacaoRecuperacao();
  const repor = useReporPassword();
  const idForm = useId();
  const form = useForm<{ nova: string; confirmacao: string }>({ resolver: zodResolver(esquemaReposicao), defaultValues: { nova: "", confirmacao: "" } });
  const nova = useWatch({ control: form.control, name: "nova" });
  const fecharRepor = (a: boolean) => {
    setReporAberto(a);
    if (!a) {
      form.reset();
      repor.reset();
    }
  };
  const submeter = form.handleSubmit((d) => {
    if (repor.isPending) return;
    repor.mutate(
      { userId: alvo.userId, newPassword: d.nova },
      { onSuccess: () => fecharRepor(false), onError: (e) => {
          const soltas = aplicarErrosDoServidor(e, form.setError, ["nova"], { newPassword: "nova" });
          if (soltas.length > 0) form.setError("nova", { type: "server", message: soltas.join(" ") });
        },
      },
    );
  });
  return (
    <Card>
      <CardTitle>Password</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        O caminho recomendado é a própria pessoa definir a password a partir de uma ligação enviada para o e-mail dela.
      </p>
      {ligacao.isSuccess ? <Alert tom="sucesso" className="mt-3" titulo={`Ligação enviada para ${alvo.email}.`} /> : null}
      {repor.isSuccess ? <Alert tom="sucesso" className="mt-3" titulo="Password reposta. As sessões da pessoa foram terminadas e ela foi avisada." /> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button variante="secondary" onClick={() => setLigacaoAberta(true)}>
          Enviar ligação de recuperação
        </Button>
        <Button variante="ghost" onClick={() => setReporAberto(true)}>
          Definir uma password
        </Button>
      </div>
      <Confirmar
        aberto={ligacaoAberta}
        aoMudar={(a) => {
          setLigacaoAberta(a);
          if (!a && !ligacao.isSuccess) ligacao.reset();
        }}
        titulo="Enviar ligação de recuperação?"
        descricao={`${alvo.email} recebe um e-mail com uma ligação para definir uma password nova.`}
        rotuloConfirmar="Enviar ligação"
        aCarregar={ligacao.isPending}
        erro={ligacao.error ? <ErrorPanel erro={ligacao.error} /> : undefined}
        aoConfirmar={() => ligacao.mutate(alvo.email, { onSuccess: () => setLigacaoAberta(false) })}
      />
      <Confirmar
        aberto={reporAberto}
        aoMudar={fecharRepor}
        titulo="Definir a password por esta pessoa?"
        descricao="Vai saber a password de outra pessoa, e isso fica na trilha de auditoria. Todas as sessões dela terminam e ela é avisada. Prefira a ligação de recuperação."
        rotuloConfirmar="Definir password"
        variante="destructive"
        aCarregar={repor.isPending}
        erro={repor.error && !(eApiError(repor.error) && repor.error.status === 400) ? <ErrorPanel erro={repor.error} /> : undefined}
        formulario={idForm}
      >
        <form id={idForm} onSubmit={submeter} noValidate className="flex flex-col gap-4">
          <Field rotulo="Password nova" erro={form.formState.errors.nova?.message} ajuda={<RegrasPassword valor={nova} />}>
            {({ id, descricao, invalido }) => (
              <Input id={id} type="password" autoComplete="new-password" maxLength={128} aria-describedby={descricao} invalido={invalido} {...form.register("nova")} />
            )}
          </Field>
          <Field rotulo="Repita a password nova" erro={form.formState.errors.confirmacao?.message}>
            {({ id, descricao, invalido }) => (
              <Input id={id} type="password" autoComplete="new-password" maxLength={128} aria-describedby={descricao} invalido={invalido} {...form.register("confirmacao")} />
            )}
          </Field>
        </form>
      </Confirmar>
    </Card>
  );
}

export default function Utilizador() {
  const { userId } = useParams();
  const { utilizador: eu, superAdmin } = useUtilizador();
  const utilizadores = useUtilizadores();

  if (utilizadores.isPending) return <CarregandoPagina />;
  if (utilizadores.error) return <ErrorPanel erro={utilizadores.error} tentarDeNovo={() => void utilizadores.refetch()} />;

  const alvo = utilizadores.data.find((u) => u.userId === userId);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="mb-2 -ml-2">
      <Link to="/utilizadores">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Utilizadores
      </Link>
    </Button>
  );
  if (!alvo) {
    return (
      <>
        {voltar}
        <Alert tom="info" titulo="Não encontrado, ou não tem acesso." />
      </>
    );
  }

  const protegida = contaProtegida(alvo.roles, superAdmin);
  const propria = alvo.userId === eu.userId;

  return (
    <>
      {voltar}
      <PageHeader
        titulo={alvo.email}
        descricao={
          <span className="inline-flex items-center gap-2">
            {alvo.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge tom="aviso">Inactiva</Badge>}
            {propria ? <span>A sua conta</span> : null}
          </span>
        }
      />
      {protegida ? <Alert tom="info" className="mb-6" titulo="Esta conta só pode ser gerida por um SuperAdmin." /> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Perfis alvo={alvo} gerivel={!protegida} propria={propria} />
        {!protegida ? (
          <Can requer="identity.users.write">
            <EstadoConta alvo={alvo} propria={propria} />
          </Can>
        ) : null}
        {!protegida && !propria ? (
          <Can requer="identity.users.write">
            <Password alvo={alvo} />
          </Can>
        ) : null}
      </div>
    </>
  );
}
