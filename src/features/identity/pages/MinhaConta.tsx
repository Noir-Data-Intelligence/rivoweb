import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Monitor } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod/mini";
import { eApiError } from "@/lib/api/problem";
import { formatarDataHora } from "@/lib/format/data";
import { novaPassword } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Dialog, DialogClose, DialogContent } from "@/ui/Dialog";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { PreferenciasNotificacoes } from "@/features/notificacoes";
import { chaves, sair, useMudarPassword, useSessoesActivas, useTerminarSessao, type SessaoActiva } from "../api";
import { RegrasPassword } from "../components/DefinirPassword";
import { useUtilizador } from "../utilizador";

const esquema = z
  .object({
    actual: z.string().check(z.minLength(1, "Escreva a password actual."), z.maxLength(128)),
    nova: novaPassword,
    confirmacao: z.string(),
  })
  .check(
    z.refine((d) => d.nova === d.confirmacao, { path: ["confirmacao"], error: "As passwords não coincidem." }),
    z.refine((d) => d.nova !== d.actual, { path: ["nova"], error: "A password nova tem de ser diferente da actual." }),
  );
type Dados = z.infer<typeof esquema>;

function MudarPassword() {
  const qc = useQueryClient();
  const mudar = useMudarPassword();
  const form = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { actual: "", nova: "", confirmacao: "" } });
  const nova = useWatch({ control: form.control, name: "nova" });

  const submeter = form.handleSubmit((d) => {
    if (mudar.isPending) return;
    mudar.mutate(
      { currentPassword: d.actual, newPassword: d.nova },
      {
        onSuccess: () => {
          form.reset();
          void qc.invalidateQueries({ queryKey: chaves.sessoes });
        },
        onError: (e) => {
          if (!eApiError(e)) return;
          // 401 com Problem Details = password actual errada (não é fim de sessão).
          if (e.status === 401) form.setError("actual", { message: e.detail ?? "A password actual não confere." });
          const nova = e.errors.newPassword ?? e.errors.NewPassword;
          if (e.status === 400 && nova) form.setError("nova", { message: nova.join(" ") });
        },
      },
    );
  });

  return (
    <Card>
      <CardTitle>Mudar password</CardTitle>
      <form onSubmit={submeter} noValidate className="mt-4 flex max-w-sm flex-col gap-4">
        {mudar.isSuccess ? <Alert tom="sucesso" titulo="Password alterada. As sessões noutros dispositivos foram terminadas." /> : null}
        {mudar.error && !(eApiError(mudar.error) && [400, 401].includes(mudar.error.status)) ? <ErrorPanel erro={mudar.error} /> : null}
        <Field rotulo="Password actual" erro={form.formState.errors.actual?.message}>
          {({ id, descricao, invalido }) => (
            <Input id={id} type="password" autoComplete="current-password" maxLength={128} aria-describedby={descricao} invalido={invalido} {...form.register("actual")} />
          )}
        </Field>
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
        <div>
          <Button type="submit" aCarregar={mudar.isPending}>
            Mudar password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function descreverDispositivo(ua: string | null): string {
  if (!ua) return "Dispositivo desconhecido";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const so = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null;
  return so ? `${browser} em ${so}` : browser;
}

function LinhaSessao({ s }: { s: SessaoActiva }) {
  const terminar = useTerminarSessao();
  const [aberto, setAberto] = useState(false);
  const confirmar = () => {
    if (s.isCurrent) {
      setAberto(false);
      sair();
      return;
    }
    terminar.mutate(s.sessionId, { onSuccess: () => setAberto(false) });
  };
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-medium text-foreground">
            {descreverDispositivo(s.userAgent)}
            {s.isCurrent ? <span className="ml-2 rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">Esta sessão</span> : null}
          </p>
          <p className="text-muted-foreground">
            IP <span className="font-mono">{s.ipAddress}</span> · início {formatarDataHora(s.createdAt)}
          </p>
          <p className="text-muted-foreground">
            Última actividade {formatarDataHora(s.lastSeenAt)} · termina até {formatarDataHora(s.effectiveExpiry)}
          </p>
        </div>
      </div>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)}>
          Terminar sessão
        </Button>
        <DialogContent
          titulo={s.isCurrent ? "Terminar esta sessão?" : "Terminar a sessão neste dispositivo?"}
          descricao={s.isCurrent ? "Vai sair da Rivo neste browser." : "Quem estiver a usar a Rivo nesse dispositivo terá de entrar de novo."}
        >
          {terminar.error ? <ErrorPanel erro={terminar.error} className="mb-4" /> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variante="secondary">Cancelar</Button>
            </DialogClose>
            <Button variante="destructive" aCarregar={terminar.isPending} onClick={confirmar}>
              Terminar sessão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function SessoesActivas() {
  const sessoes = useSessoesActivas();
  const activas = (sessoes.data ?? []).filter((s) => s.isActive);
  return (
    <Card>
      <CardTitle>Sessões activas</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Dispositivos onde a sua conta tem sessão aberta.</p>
      {sessoes.isPending ? (
        <div className="mt-4 flex flex-col gap-3" aria-label="A carregar sessões">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : sessoes.error ? (
        <ErrorPanel erro={sessoes.error} tentarDeNovo={() => void sessoes.refetch()} className="mt-4" />
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {activas.map((s) => (
            <LinhaSessao key={s.sessionId} s={s} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function MinhaConta() {
  const { utilizador } = useUtilizador();
  return (
    <>
      <PageHeader titulo="A minha conta" descricao={utilizador.email} />
      <div className="flex flex-col gap-6">
        <MudarPassword />
        <SessoesActivas />
        <PreferenciasNotificacoes />
      </div>
    </>
  );
}
