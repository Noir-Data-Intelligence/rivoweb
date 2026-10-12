import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod/mini";
import { eApiError } from "@/lib/api/problem";
import { API_DISPONIVEL } from "@/lib/env";
import { email } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { usePedirRecuperacao } from "../api";
import { LayoutPublico } from "../components/LayoutPublico";

const esquema = z.object({ email });
type Dados = z.infer<typeof esquema>;

/**
 * Pedido de recuperação (ADR-065). A resposta é sempre a mesma, exista ou não
 * a conta, para não permitir enumerar contas.
 */
export default function RecuperarPassword() {
  const pedir = usePedirRecuperacao();
  const form = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { email: "" } });

  const submeter = form.handleSubmit((d) => {
    if (pedir.isPending) return;
    pedir.mutate(d.email);
  });

  const indisponivel = eApiError(pedir.error) && pedir.error.status === 501;

  return (
    <LayoutPublico titulo="Recuperar password">
      {pedir.isSuccess ? (
        <div className="flex flex-col gap-4">
          <Alert tom="sucesso" titulo="Se existir uma conta com esse endereço, a mensagem já saiu.">
            Abra a ligação do e-mail neste dispositivo. A ligação é de uso único e tem prazo.
          </Alert>
          <Link to="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">
            Voltar a entrar
          </Link>
        </div>
      ) : (
        <form onSubmit={submeter} noValidate className="flex flex-col gap-4">
          <p className="text-base text-muted-foreground">Indique o e-mail da sua conta. Enviamos uma ligação para definir uma password nova.</p>
          {indisponivel ? (
            <Alert tom="aviso" titulo="A recuperação por e-mail não está disponível.">
              Fale com quem administra a Rivo na sua empresa.
            </Alert>
          ) : pedir.error ? (
            <ErrorPanel erro={pedir.error} />
          ) : null}
          <Field rotulo="E-mail" erro={form.formState.errors.email?.message}>
            {({ id, descricao, invalido }) => (
              <Input id={id} type="email" autoComplete="username" inputMode="email" maxLength={256} aria-describedby={descricao} invalido={invalido} {...form.register("email")} />
            )}
          </Field>
          <Button type="submit" tamanho="lg" aCarregar={pedir.isPending} disabled={!API_DISPONIVEL}>
            Enviar ligação
          </Button>
          <Link to="/entrar" className="text-sm text-primary underline-offset-4 hover:underline">
            Voltar a entrar
          </Link>
        </form>
      )}
    </LayoutPublico>
  );
}
