/**
 * Formulário comum ao convite e à recuperação. Lê `u` e `t` do URL, guarda-os
 * em memória e apaga-os do URL de imediato (S7), para não ficarem no
 * histórico nem em capturas de ecrã.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { Check, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod/mini";
import { eApiError } from "@/lib/api/problem";
import { API_DISPONIVEL } from "@/lib/env";
import { REGRAS_PASSWORD, novaPassword, uuid } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";

type Testemunho = { readonly userId: string; readonly token: string } | null;

/**
 * Captura única por carregamento do ecrã. O render pode repetir-se antes de
 * montar (Suspense, concorrência), e a segunda leitura já encontraria o URL
 * limpo; por isso o valor fica guardado até o ecrã desmontar.
 */
let capturado: { readonly caminho: string; readonly testemunho: Testemunho } | null = null;

function lerTestemunho(): Testemunho {
  if (capturado && capturado.caminho === window.location.pathname) return capturado.testemunho;
  const params = new URLSearchParams(window.location.search);
  const u = params.get("u");
  const t = params.get("t");
  if (window.location.search !== "") {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }
  const testemunho = !u || !t || !uuid.safeParse(u).success || t.length > 4096 ? null : { userId: u, token: t };
  capturado = { caminho: window.location.pathname, testemunho };
  return testemunho;
}

export function useTestemunhoDoUrl(): Testemunho {
  const [testemunho] = useState(lerTestemunho);
  useEffect(
    () => () => {
      capturado = null;
    },
    [],
  );
  return testemunho;
}

const esquema = z
  .object({ password: novaPassword, confirmacao: z.string() })
  .check(z.refine((d) => d.password === d.confirmacao, { path: ["confirmacao"], error: "As passwords não coincidem." }));
type Dados = z.infer<typeof esquema>;

export function RegrasPassword({ valor }: { valor: string }) {
  return (
    <ul className="mt-1 flex flex-col gap-1" aria-label="Regras da password">
      {REGRAS_PASSWORD.map((r) => {
        const ok = r.ok(valor);
        return (
          <li key={r.id} className={ok ? "flex items-center gap-1.5 text-success" : "flex items-center gap-1.5 text-muted-foreground"}>
            {ok ? <Check className="size-3.5" strokeWidth={2} aria-hidden /> : <Circle className="size-3.5" strokeWidth={1.75} aria-hidden />}
            <span>{r.texto}</span>
            <span className="sr-only">{ok ? "(cumprida)" : "(por cumprir)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function DefinirPassword({
  testemunho,
  mutacao,
  textoBotao,
  sucesso,
  ligacaoInvalida,
}: {
  testemunho: Testemunho;
  mutacao: UseMutationResult<unknown, Error, { userId: string; token: string; password: string }>;
  textoBotao: string;
  sucesso: string;
  ligacaoInvalida: string;
}) {
  const [concluido, setConcluido] = useState(false);
  const form = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { password: "", confirmacao: "" } });
  const password = useWatch({ control: form.control, name: "password" });

  if (testemunho === null) {
    return (
      <Alert tom="erro" titulo="Ligação inválida ou incompleta.">
        {ligacaoInvalida}
      </Alert>
    );
  }

  if (concluido) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tom="sucesso" titulo={sucesso} />
        <Button asChild tamanho="lg">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </div>
    );
  }

  const submeter = form.handleSubmit((d) => {
    if (mutacao.isPending) return;
    mutacao.mutate(
      { userId: testemunho.userId, token: testemunho.token, password: d.password },
      { onSuccess: () => setConcluido(true) },
    );
  });

  const erroApi = eApiError(mutacao.error) ? mutacao.error : null;
  // 400 sem erros de campo = testemunho inválido, expirado ou já usado.
  const ligacaoExpirada = erroApi !== null && erroApi.status === 400 && Object.keys(erroApi.errors).length === 0;

  return (
    <form onSubmit={submeter} noValidate className="flex flex-col gap-4">
      {ligacaoExpirada ? (
        <Alert tom="erro" titulo={erroApi?.detail ?? "A ligação já não é válida."}>
          {ligacaoInvalida}
        </Alert>
      ) : mutacao.error ? (
        <ErrorPanel erro={mutacao.error} />
      ) : null}
      <Field rotulo="Nova password" erro={form.formState.errors.password?.message} ajuda={<RegrasPassword valor={password} />}>
        {({ id, descricao, invalido }) => (
          <Input id={id} type="password" autoComplete="new-password" maxLength={128} aria-describedby={descricao} invalido={invalido} {...form.register("password")} />
        )}
      </Field>
      <Field rotulo="Repita a password" erro={form.formState.errors.confirmacao?.message}>
        {({ id, descricao, invalido }) => (
          <Input id={id} type="password" autoComplete="new-password" maxLength={128} aria-describedby={descricao} invalido={invalido} {...form.register("confirmacao")} />
        )}
      </Field>
      <Button type="submit" tamanho="lg" aCarregar={mutacao.isPending} disabled={!API_DISPONIVEL}>
        {textoBotao}
      </Button>
    </form>
  );
}
