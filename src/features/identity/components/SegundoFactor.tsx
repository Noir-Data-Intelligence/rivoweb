/**
 * Segundo factor (ADR-127): a app autenticadora (6 dígitos) e os 10 códigos de
 * recuperação. Serve «A minha conta» e a sessão restrita de quem é obrigado e
 * ainda não o ligou.
 */
import { Check, Copy, Download, ShieldCheck } from "lucide-react";
import { lazy, Suspense, useId, useState, type FormEvent } from "react";
import { eApiError } from "@/lib/api/problem";
import { descarregarTexto } from "@/lib/security/csv";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Skeleton } from "@/ui/Layout";
import { useConfirmarMfa, useDesligarMfa, useEstadoMfa, useIniciarMfa, useNovosCodigosMfa } from "../api";

// O codificador do QR só se carrega no ecrã de ligar.
const QrSegundoFactor = lazy(() => import("./QrSegundoFactor"));

/** Um código da app (6 dígitos) ou de recuperação; os espaços não contam. */
export function validarCodigoMfa(valor: string, soApp = false): { erro?: string; codigo: string } {
  const codigo = valor.replace(/\s+/g, "");
  if (codigo === "") return { erro: soApp ? "Escreva os 6 dígitos da app." : "Escreva o código da app ou um de recuperação.", codigo };
  if (soApp && !/^\d{6}$/.test(codigo)) return { erro: "Escreva os 6 dígitos da app.", codigo };
  if (codigo.length > 64) return { erro: "Este código não é válido.", codigo };
  return { codigo };
}

/** A chave em maiúsculas e em grupos de 4, para escrever à mão sem se perder (as apps aceitam-na assim). */
const agrupar = (chave: string) => chave.replace(/\s+/g, "").toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");

/** Erro do código: o 400 do servidor (código errado) vai para o campo; o resto, para o painel. */
function erroDoCodigo(e: unknown): string | undefined {
  if (!eApiError(e) || e.status !== 400) return undefined;
  const doCampo = e.errors.code ?? e.errors.Code;
  return doCampo ? doCampo.join(" ") : (e.detail ?? "O código não confere. Veja o código actual na app.");
}

function CampoCodigo({ rotulo, ajuda, valor, aoMudar, erro, soApp = false }: { rotulo: string; ajuda?: string; valor: string; aoMudar: (v: string) => void; erro?: string | undefined; soApp?: boolean }) {
  return (
    <Field rotulo={rotulo} erro={erro} {...(ajuda ? { ajuda } : {})}>
      {({ id, descricao, invalido }) => (
        <Input
          id={id}
          autoComplete="one-time-code"
          inputMode={soApp ? "numeric" : "text"}
          maxLength={soApp ? 7 : 64}
          className="font-mono tracking-wider sm:max-w-48"
          aria-describedby={descricao}
          invalido={invalido}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
      )}
    </Field>
  );
}

/** Os códigos de recuperação, mostrados uma só vez: copiar e descarregar. */
export function CodigosRecuperacao({ codigos }: { codigos: readonly string[] }) {
  const [copiado, setCopiado] = useState(false);
  const texto = codigos.join("\n");
  return (
    <div className="flex flex-col gap-3">
      <Alert tom="aviso" titulo="Guarde estes códigos agora: não voltam a aparecer.">
        Cada um serve uma vez, para entrar quando o telemóvel não estiver à mão. Guarde-os fora do computador, num sítio seguro.
      </Alert>
      <ol aria-label="Códigos de recuperação" className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-border bg-muted px-4 py-3 font-mono text-sm text-foreground">
        {codigos.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          variante="secondary"
          tamanho="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(texto).then(() => setCopiado(true));
          }}
        >
          {copiado ? <Check strokeWidth={1.75} aria-hidden /> : <Copy strokeWidth={1.75} aria-hidden />}
          {copiado ? "Copiados" : "Copiar"}
        </Button>
        <Button variante="secondary" tamanho="sm" onClick={() => descarregarTexto(`Rivo: códigos de recuperação do segundo factor\r\nCada um serve uma vez.\r\n\r\n${codigos.join("\r\n")}\r\n`, "rivo-codigos-recuperacao.txt", "text/plain;charset=utf-8")}>
          <Download strokeWidth={1.75} aria-hidden />
          Descarregar
        </Button>
      </div>
    </div>
  );
}

/**
 * Ligar o segundo factor: começa a inscrição (a chave e o `otpauth://`),
 * pede um código da app e mostra os códigos de recuperação. `aoTerminar`
 * corre quando a pessoa diz que os guardou.
 */
export function LigarSegundoFactor({ aoTerminar, rotuloTerminar = "Já os guardei" }: { aoTerminar: () => void; rotuloTerminar?: string }) {
  const iniciar = useIniciarMfa();
  const confirmar = useConfirmarMfa();
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const idForm = useId();

  if (confirmar.data) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tom="sucesso" titulo="Segundo factor ligado.">
          A partir de agora, ao entrar, a Rivo pede o código da app.
        </Alert>
        <CodigosRecuperacao codigos={confirmar.data.recoveryCodes} />
        <div>
          <Button onClick={aoTerminar}>{rotuloTerminar}</Button>
        </div>
      </div>
    );
  }

  if (!iniciar.data) {
    return (
      <div className="flex flex-col gap-3">
        {iniciar.error ? <ErrorPanel erro={iniciar.error} /> : null}
        <p className="text-sm text-muted-foreground">
          Precisa de uma app autenticadora no telemóvel (Google Authenticator, Microsoft Authenticator ou outra). A Rivo mostra uma chave para a app; depois, ao entrar, pede o código de 6 dígitos que a app gera.
        </p>
        <div>
          <Button aCarregar={iniciar.isPending} onClick={() => iniciar.mutate()}>
            <ShieldCheck strokeWidth={1.75} aria-hidden />
            Ligar o segundo factor
          </Button>
        </div>
      </div>
    );
  }

  const { sharedKey, authenticatorUri } = iniciar.data;
  const submeter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { erro: encontrado, codigo } = validarCodigoMfa(valor, true);
    setErro(encontrado);
    if (encontrado || confirmar.isPending) return;
    confirmar.mutate(codigo, { onError: (x) => setErro(erroDoCodigo(x)) });
  };

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-foreground">
        <li>
          Na app autenticadora, acrescente uma conta e leia este QR:
          <div className="mt-2">
            <Suspense fallback={<Skeleton className="h-44 w-44" />}>
              <QrSegundoFactor uri={authenticatorUri} />
            </Suspense>
          </div>
          <p className="mt-3">
            Ou escreva esta chave (no telemóvel,{" "}
            <a href={authenticatorUri} className="font-medium text-primary underline-offset-4 hover:underline">
              abra-a directamente na app
            </a>
            ):
          </p>
          <p className="mt-2 break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm tracking-wider" aria-label="Chave para a app">
            {agrupar(sharedKey)}
          </p>
        </li>
        <li>Escreva o código de 6 dígitos que a app mostra.</li>
      </ol>
      {confirmar.error && !erroDoCodigo(confirmar.error) ? <ErrorPanel erro={confirmar.error} /> : null}
      <form id={idForm} noValidate onSubmit={submeter} className="flex flex-col gap-3">
        <CampoCodigo rotulo="Código da app" soApp valor={valor} aoMudar={(v) => { setValor(v); if (erro) setErro(validarCodigoMfa(v, true).erro); }} erro={erro} />
        <div>
          <Button type="submit" aCarregar={confirmar.isPending}>
            Confirmar e ligar
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Diálogo com um código: gerar códigos novos ou desligar. */
function AccaoComCodigo({ tipo }: { tipo: "codigos" | "desligar" }) {
  const novos = useNovosCodigosMfa();
  const desligar = useDesligarMfa();
  const m = tipo === "codigos" ? novos : desligar;
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const idForm = useId();
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      novos.reset();
      desligar.reset();
      setValor("");
      setErro(undefined);
    }
  };
  const submeter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { erro: encontrado, codigo } = validarCodigoMfa(valor);
    setErro(encontrado);
    if (encontrado || m.isPending) return;
    const aoErrar = (x: unknown) => setErro(erroDoCodigo(x));
    if (tipo === "codigos") novos.mutate(codigo, { onError: aoErrar });
    else desligar.mutate(codigo, { onSuccess: () => mudar(false), onError: aoErrar });
  };
  const erroPainel = m.error && !erroDoCodigo(m.error) ? <ErrorPanel erro={m.error} /> : undefined;
  return (
    <>
      <Button variante={tipo === "desligar" ? "destructive" : "secondary"} onClick={() => setAberto(true)}>
        {tipo === "codigos" ? "Gerar códigos novos" : "Desligar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={tipo === "codigos" ? "Gerar códigos de recuperação novos" : "Desligar o segundo factor"}
        descricao={tipo === "codigos" ? "Os códigos que tem deixam de servir." : "Ao entrar, a Rivo deixa de pedir o código da app."}
        rotuloConfirmar={novos.data ? "Fechar" : tipo === "codigos" ? "Gerar" : "Desligar"}
        variante={tipo === "desligar" ? "destructive" : "primary"}
        aCarregar={m.isPending}
        erro={erroPainel}
        {...(novos.data ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {novos.data ? (
          <CodigosRecuperacao codigos={novos.data.recoveryCodes} />
        ) : (
          <form id={idForm} noValidate onSubmit={submeter}>
            <CampoCodigo rotulo="Código da app ou de recuperação" ajuda="Os 6 dígitos que a app mostra agora, ou um código de recuperação." valor={valor} aoMudar={(v) => { setValor(v); if (erro) setErro(validarCodigoMfa(v).erro); }} erro={erro} />
          </form>
        )}
      </Confirmar>
    </>
  );
}

/** «A minha conta» → «Segundo factor». */
export function CartaoSegundoFactor() {
  const estado = useEstadoMfa();
  const e = estado.data;
  return (
    <Card>
      <CardTitle>Segundo factor</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Ao entrar, além da password, o código de uma app autenticadora no telemóvel.</p>
      <div className="mt-4">
        {estado.isPending ? (
          <Skeleton className="h-12" />
        ) : estado.error ? (
          <ErrorPanel erro={estado.error} tentarDeNovo={() => void estado.refetch()} />
        ) : e?.enabled ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              <span className="mr-2 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Ligado</span>
              {Number(e.recoveryCodesLeft) === 1 ? "Resta 1 código de recuperação por usar." : `Restam ${Number(e.recoveryCodesLeft)} códigos de recuperação por usar.`}
            </p>
            {Number(e.recoveryCodesLeft) <= 2 ? <Alert tom="aviso" titulo="Restam poucos códigos de recuperação. Gere códigos novos." /> : null}
            {e.required && e.enforced ? <p className="text-sm text-muted-foreground">O seu perfil é obrigado ao segundo factor: não se desliga.</p> : null}
            <div className="flex flex-wrap gap-2">
              <AccaoComCodigo tipo="codigos" />
              {e.required && e.enforced ? null : <AccaoComCodigo tipo="desligar" />}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {e?.required ? (
              <Alert tom="info" titulo={e.enforced ? "O seu perfil é obrigado ao segundo factor." : "O seu perfil vai ser obrigado ao segundo factor."}>
                Quem decide ou movimenta fundos entra com a password e o código da app.
              </Alert>
            ) : null}
            <LigarSegundoFactor aoTerminar={() => void estado.refetch()} />
          </div>
        )}
      </div>
    </Card>
  );
}
