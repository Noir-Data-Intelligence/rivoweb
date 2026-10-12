import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { z } from "zod/mini";
import { rotaConhecida } from "@/app/rotasConhecidas";
import { eApiError } from "@/lib/api/problem";
import { validarVoltar } from "@/lib/auth/returnTo";
import { limparMotivo, motivoUltimoFim, type MotivoFim } from "@/lib/auth/session";
import { API_DISPONIVEL } from "@/lib/env";
import { email } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { useEntrar, useSessao } from "../api";
import { LayoutPublico } from "../components/LayoutPublico";

const esquema = z.object({
  email,
  password: z.string().check(z.minLength(1, "Escreva a password."), z.maxLength(128)),
});
type Dados = z.infer<typeof esquema>;

const MENSAGEM_FIM: Readonly<Record<MotivoFim, string | null>> = {
  saiu: null,
  "outra-aba": "Saiu da Rivo noutra aba.",
  inactividade: "A sessão terminou por inactividade.",
  expirada: "A sessão chegou ao fim do prazo. Entre de novo.",
  terminada: "A sessão terminou. Entre de novo.",
};

export default function Entrar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessao = useSessao();
  const entrar = useEntrar();
  const [motivo] = useState(() => {
    const m = motivoUltimoFim();
    limparMotivo();
    return m ? MENSAGEM_FIM[m] : null;
  });
  const destino = validarVoltar(params.get("voltar"), window.location.origin, rotaConhecida);

  const form = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { email: "", password: "" } });

  if (sessao !== null && !entrar.isPending) return <Navigate to={destino} replace />;

  const submeter = form.handleSubmit((dados) => {
    if (entrar.isPending) return;
    entrar.mutate(dados, {
      onSuccess: () => navigate(destino, { replace: true }),
      onError: () => form.setValue("password", ""),
    });
  });

  const credenciaisErradas = eApiError(entrar.error) && entrar.error.status === 401;

  return (
    <LayoutPublico titulo="Entrar na Rivo">
      {motivo ? (
        <Alert tom="info" className="mb-4" titulo={motivo} />
      ) : null}
      {credenciaisErradas ? (
        <Alert tom="erro" className="mb-4" titulo="E-mail ou password incorrectos." />
      ) : entrar.error ? (
        <ErrorPanel erro={entrar.error} className="mb-4" />
      ) : null}
      <form onSubmit={submeter} noValidate className="flex flex-col gap-4">
        <Field rotulo="E-mail" erro={form.formState.errors.email?.message}>
          {({ id, descricao, invalido }) => (
            <Input
              id={id}
              type="email"
              autoComplete="username"
              inputMode="email"
              maxLength={256}
              aria-describedby={descricao}
              invalido={invalido}
              {...form.register("email")}
            />
          )}
        </Field>
        <Field rotulo="Password" erro={form.formState.errors.password?.message}>
          {({ id, descricao, invalido }) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              maxLength={128}
              aria-describedby={descricao}
              invalido={invalido}
              {...form.register("password")}
            />
          )}
        </Field>
        <Button type="submit" tamanho="lg" aCarregar={entrar.isPending} disabled={!API_DISPONIVEL}>
          Entrar
        </Button>
        <Link to="/recuperar-password" className="text-sm text-primary underline-offset-4 hover:underline">
          Esqueceu-se da password?
        </Link>
      </form>
      <p className="mt-8 text-sm text-muted-foreground">
        Não tem conta? O acesso é dado por convite de quem administra a Rivo na sua empresa.
      </p>
    </LayoutPublico>
  );
}
