import { useState } from "react";
import { useForm, type FieldErrors, type Resolver, type ResolverResult } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { rotaConhecida } from "@/app/rotasConhecidas";
import { eApiError } from "@/lib/api/problem";
import { validarVoltar } from "@/lib/auth/returnTo";
import { limparMotivo, motivoUltimoFim, type MotivoFim } from "@/lib/auth/session";
import { API_DISPONIVEL } from "@/lib/env";
import { normalizarTexto, pareceEmail } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { useEntrar, useSessao } from "../api";
import { LayoutPublico } from "../components/LayoutPublico";

type Dados = { email: string; password: string };

/**
 * Validação do login sem zod: o login está no chunk inicial (§1.5) e o zod só
 * carrega com os ecrãs que o usam. As regras e as mensagens são as de
 * `lib/validation/text.ts`.
 */
const resolver: Resolver<Dados> = (valores): ResolverResult<Dados> => {
  const email = normalizarTexto(valores.email).toLowerCase();
  const errors: FieldErrors<Dados> = {};
  if (email === "") errors.email = { type: "required", message: "Escreva o e-mail." };
  else if (email.length > 256) errors.email = { type: "maxLength", message: "E-mail longo de mais." };
  else if (!pareceEmail(email)) errors.email = { type: "pattern", message: "Este e-mail não é válido." };
  if (valores.password === "") errors.password = { type: "required", message: "Escreva a password." };
  else if (valores.password.length > 128) errors.password = { type: "maxLength", message: "No máximo 128 caracteres." };
  if (Object.keys(errors).length > 0) return { values: {} as Record<string, never>, errors };
  return { values: { email, password: valores.password }, errors: {} };
};

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

  const form = useForm<Dados>({ resolver, defaultValues: { email: "", password: "" } });

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
