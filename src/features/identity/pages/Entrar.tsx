import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { useEntrar, useEntrarComCodigo, useSessao, type DesafioMfa } from "../api";
import { BOTAO_ENTRADA, CAMPO_ENTRADA, LayoutPublico, LIGACAO_ENTRADA, ROTULOS_ENTRADA } from "../components/LayoutPublico";

type Dados = { email: string; password: string };
type Erros = Partial<Record<keyof Dados, string>>;

/**
 * Validação do login sem zod nem react-hook-form: o login está no chunk
 * inicial (§1.5) e essas bibliotecas só carregam com os ecrãs que as usam.
 * As regras e as mensagens são as de `lib/validation/text.ts`.
 */
function validar(valores: Dados): { erros: Erros; dados: Dados } {
  const email = normalizarTexto(valores.email).toLowerCase();
  const erros: Erros = {};
  if (email === "") erros.email = "Escreva o e-mail.";
  else if (email.length > 256) erros.email = "E-mail longo de mais.";
  else if (!pareceEmail(email)) erros.email = "Este e-mail não é válido.";
  if (valores.password === "") erros.password = "Escreva a password.";
  else if (valores.password.length > 128) erros.password = "No máximo 128 caracteres.";
  return { erros, dados: { email, password: valores.password } };
}

const MENSAGEM_FIM: Readonly<Record<MotivoFim, string | null>> = {
  saiu: null,
  "outra-aba": "Saiu da Rivo noutra aba.",
  inactividade: "A sessão terminou por inactividade.",
  expirada: "A sessão chegou ao fim do prazo. Entre de novo.",
  terminada: "A sessão terminou. Entre de novo.",
};

/** Código da app: 6 dígitos, com ou sem o espaço do meio. Código de recuperação: como vier, sem espaços. */
function validarCodigo(valor: string, recuperacao: boolean): { erro?: string; codigo: string } {
  const codigo = valor.replace(/\s+/g, "");
  if (recuperacao) return codigo === "" ? { erro: "Escreva um código de recuperação.", codigo } : codigo.length > 64 ? { erro: "Este código não é válido.", codigo } : { codigo };
  return /^\d{6}$/.test(codigo) ? { codigo } : { erro: "Escreva os 6 dígitos da app.", codigo };
}

/**
 * Segundo passo do login (ADR-127): a conta tem a app autenticadora ligada.
 * O desafio dura poucos minutos; ao acabar, volta-se ao primeiro passo.
 */
function PassoCodigo({ desafio, aoExpirar, aoVoltar, aoEntrar }: { desafio: DesafioMfa; aoExpirar: () => void; aoVoltar: () => void; aoEntrar: () => void }) {
  const entrar = useEntrarComCodigo();
  const [recuperacao, setRecuperacao] = useState(false);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(aoExpirar, Math.max(0, desafio.expiraEm - Date.now()));
    return () => window.clearTimeout(t);
  }, [desafio, aoExpirar]);

  useEffect(() => ref.current?.focus(), [recuperacao]);

  const submeter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { erro: encontrado, codigo } = validarCodigo(valor, recuperacao);
    setErro(encontrado);
    if (encontrado) {
      ref.current?.focus();
      return;
    }
    if (entrar.isPending) return;
    if (Date.now() >= desafio.expiraEm) {
      aoExpirar();
      return;
    }
    entrar.mutate({ challenge: desafio.desafio, code: codigo }, { onSuccess: aoEntrar, onError: () => setValor("") });
  };

  const codigoErrado = eApiError(entrar.error) && entrar.error.status === 401;

  return (
    <>
      {codigoErrado ? (
        <Alert tom="erro" className="mb-4" titulo="Código errado. Tente de novo." />
      ) : entrar.error ? (
        <ErrorPanel erro={entrar.error} className="mb-4" />
      ) : null}
      <form onSubmit={submeter} noValidate className={`flex flex-col gap-5 ${ROTULOS_ENTRADA}`}>
        <Field
          rotulo={recuperacao ? "Código de recuperação" : "Código da app"}
          erro={erro}
          ajuda={recuperacao ? "Um dos códigos que guardou ao ligar o segundo factor. Cada um serve uma vez." : "Os 6 dígitos que a app autenticadora mostra agora para a Rivo."}
        >
          {({ id, descricao, invalido }) => (
            <Input
              key={recuperacao ? "recuperacao" : "app"}
              id={id}
              ref={ref}
              name="code"
              className={CAMPO_ENTRADA}
              autoComplete={recuperacao ? "off" : "one-time-code"}
              inputMode={recuperacao ? "text" : "numeric"}
              maxLength={recuperacao ? 64 : 7}
              aria-describedby={descricao}
              invalido={invalido}
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                if (erro) setErro(validarCodigo(e.target.value, recuperacao).erro);
              }}
            />
          )}
        </Field>
        <button
          type="button"
          className={`-mt-2 self-end text-xs ${LIGACAO_ENTRADA}`}
          onClick={() => {
            setRecuperacao((r) => !r);
            setValor("");
            setErro(undefined);
            entrar.reset();
          }}
        >
          {recuperacao ? "Usar o código da app" : "Usar um código de recuperação"}
        </button>
        <Button type="submit" tamanho="lg" className={BOTAO_ENTRADA} aCarregar={entrar.isPending}>
          Entrar
        </Button>
        <Button type="button" variante="secondary" onClick={aoVoltar}>
          Voltar
        </Button>
      </form>
    </>
  );
}

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

  const [valores, setValores] = useState<Dados>({ email: "", password: "" });
  const [erros, setErros] = useState<Erros>({});
  // Como no resto dos formulários: valida ao submeter e, a partir daí, a cada alteração.
  const [submetido, setSubmetido] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [desafio, setDesafio] = useState<DesafioMfa | null>(null);
  const [expirou, setExpirou] = useState(false);
  const refs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) };

  if (sessao !== null && !entrar.isPending) return <Navigate to={destino} replace />;

  if (desafio !== null) {
    return (
      <LayoutPublico titulo="Segundo factor" descricao="A sua conta pede o código da app autenticadora.">
        <PassoCodigo
          desafio={desafio}
          aoExpirar={() => {
            setDesafio(null);
            setExpirou(true);
          }}
          aoVoltar={() => setDesafio(null)}
          aoEntrar={() => navigate(destino, { replace: true })}
        />
      </LayoutPublico>
    );
  }

  const mudar = (campo: keyof Dados, valor: string) => {
    const novos = { ...valores, [campo]: valor };
    setValores(novos);
    if (submetido) setErros(validar(novos).erros);
  };

  const submeter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmetido(true);
    const { erros: encontrados, dados } = validar(valores);
    setErros(encontrados);
    const primeiro = (["email", "password"] as const).find((c) => encontrados[c] !== undefined);
    if (primeiro) {
      refs[primeiro].current?.focus();
      return;
    }
    if (entrar.isPending) return;
    setExpirou(false);
    entrar.mutate(dados, {
      onSuccess: (d) => {
        // Com o segundo factor, a password não fica no ecrã do passo seguinte.
        setValores((v) => ({ ...v, password: "" }));
        if (d === null) navigate(destino, { replace: true });
        else setDesafio(d);
      },
      onError: () => setValores((v) => ({ ...v, password: "" })),
    });
  };

  const credenciaisErradas = eApiError(entrar.error) && entrar.error.status === 401;

  return (
    <LayoutPublico titulo="Entrar na Rivo" descricao="Insira as suas credenciais para aceder à plataforma.">
      {expirou ? (
        <Alert tom="info" className="mb-4" titulo="O tempo para o código acabou. Entre de novo." />
      ) : motivo ? (
        <Alert tom="info" className="mb-4" titulo={motivo} />
      ) : null}
      {credenciaisErradas ? (
        <Alert tom="erro" className="mb-4" titulo="E-mail ou password incorrectos." />
      ) : entrar.error ? (
        <ErrorPanel erro={entrar.error} className="mb-4" />
      ) : null}
      <form onSubmit={submeter} noValidate className={`flex flex-col gap-5 ${ROTULOS_ENTRADA}`}>
        <Field rotulo="E-mail" erro={erros.email}>
          {({ id, descricao, invalido }) => (
            <Input
              id={id}
              type="email"
              autoComplete="username"
              className={CAMPO_ENTRADA}
              inputMode="email"
              maxLength={256}
              aria-describedby={descricao}
              invalido={invalido}
              ref={refs.email}
              name="email"
              value={valores.email}
              onChange={(e) => mudar("email", e.target.value)}
            />
          )}
        </Field>
        <Field rotulo="Password" erro={erros.password}>
          {({ id, descricao, invalido }) => (
            <div className="relative">
              <Input
                id={id}
                type={verPassword ? "text" : "password"}
                autoComplete="current-password"
                maxLength={128}
                aria-describedby={descricao}
                invalido={invalido}
                ref={refs.password}
                name="password"
                className={`${CAMPO_ENTRADA} pr-10`}
                value={valores.password}
                onChange={(e) => mudar("password", e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--entrada-destaque)]"
                aria-label={verPassword ? "Ocultar os caracteres" : "Mostrar os caracteres"}
                aria-pressed={verPassword}
                onClick={() => setVerPassword((v) => !v)}
              >
                {verPassword ? <EyeOff className="size-4" strokeWidth={1.75} aria-hidden /> : <Eye className="size-4" strokeWidth={1.75} aria-hidden />}
              </button>
            </div>
          )}
        </Field>
        <Link to="/recuperar-password" className={`-mt-2 self-end text-xs ${LIGACAO_ENTRADA}`}>
          Esqueceu-se da password?
        </Link>
        <Button type="submit" tamanho="lg" className={BOTAO_ENTRADA} aCarregar={entrar.isPending} disabled={!API_DISPONIVEL}>
          Entrar
        </Button>
      </form>
      <p className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Não tem conta? O acesso é dado por convite de quem administra a Rivo na sua empresa.
      </p>
    </LayoutPublico>
  );
}
