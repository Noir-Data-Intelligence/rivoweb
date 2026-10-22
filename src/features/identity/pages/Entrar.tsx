import { useRef, useState, type FormEvent } from "react";
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
import { useEntrar, useSessao } from "../api";
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
  const refs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) };

  if (sessao !== null && !entrar.isPending) return <Navigate to={destino} replace />;

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
    entrar.mutate(dados, {
      onSuccess: () => navigate(destino, { replace: true }),
      onError: () => setValores((v) => ({ ...v, password: "" })),
    });
  };

  const credenciaisErradas = eApiError(entrar.error) && entrar.error.status === 401;

  return (
    <LayoutPublico titulo="Entrar na Rivo" descricao="Insira as suas credenciais para aceder à plataforma.">
      {motivo ? (
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
