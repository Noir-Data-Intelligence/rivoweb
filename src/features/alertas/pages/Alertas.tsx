import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { NavLink, useSearchParams } from "react-router";
import { z } from "zod/mini";
import { useUtilizadores } from "@/features/administracao";
import { useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro } from "@/lib/money/money";
import { texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { cn } from "@/ui/cn";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { nomeTipo, TIPOS, useAvaliar, useCriarRegra, useEventos, useRegras, useResolver, useReverRegra, type EventoAlerta, type RegraAlerta } from "../api";

const plural = (n: number | string, um: string, varios: string) => `${String(n)} ${Number(n) === 1 ? um : varios}`;

// --- Eventos

function Resolver({ e }: { e: EventoAlerta }) {
  const [aberto, setAberto] = useState(false);
  const resolver = useResolver();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        Resolver
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) resolver.reset();
        }}
        titulo="Marcar o alerta como resolvido?"
        descricao={e.title}
        rotuloConfirmar="Resolver"
        aCarregar={resolver.isPending}
        erro={resolver.error ? <ErrorPanel erro={resolver.error} /> : undefined}
        aoConfirmar={() => (resolver.isPending ? undefined : resolver.mutate(e.alertId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Eventos() {
  const [soAbertos, setSoAbertos] = useState(true);
  const eventos = useEventos(soAbertos);
  const { pode } = useUtilizador();
  const colunas: Coluna<EventoAlerta>[] = [
    {
      id: "alerta",
      cabecalho: "Alerta",
      ordenar: (e) => e.raisedAt,
      celula: (e) => (
        <div className="min-w-0 py-1">
          <p className="font-medium">{e.title}</p>
          <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{e.detail}</p>
        </div>
      ),
    },
    { id: "tipo", cabecalho: "Tipo", esconderAte: "lg", ordenar: (e) => nomeTipo(e.kind), celula: (e) => nomeTipo(e.kind) },
    { id: "data", cabecalho: "Data", esconderAte: "md", ordenar: (e) => e.dueOn ?? "", celula: (e) => (e.dueOn ? formatarData(e.dueOn) : "—") },
    {
      id: "valor",
      cabecalho: "Valor",
      alinhar: "direita",
      esconderAte: "md",
      celula: (e) => (e.amount !== null ? formatarMoeda(dinheiro(e.amount), e.currency ?? "AOA") : "—"),
    },
    {
      id: "estado",
      cabecalho: "Estado",
      ordenar: (e) => e.status,
      celula: (e) => (e.status === "Open" ? <Badge tom="aviso">Aberto</Badge> : <Badge tom="sucesso">Resolvido {e.resolvedAt ? formatarDataHora(e.resolvedAt) : ""}</Badge>),
    },
    ...(pode("alerts.alerts.write")
      ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (e: EventoAlerta) => (e.status === "Open" ? <Resolver e={e} /> : null) }]
      : []),
  ];
  return (
    <>
      <Checkbox className="mb-4" rotulo="Só os abertos" checked={soAbertos} onChange={(e) => setSoAbertos(e.target.checked)} />
      <Tabela
        rotulo="Alertas"
        colunas={colunas}
        linhas={eventos.data}
        chave={(e) => e.alertId}
        aCarregar={eventos.isPending}
        erro={eventos.error ? <ErrorPanel erro={eventos.error} tentarDeNovo={() => void eventos.refetch()} /> : undefined}
        vazio={soAbertos ? "Não há alertas abertos." : "Ainda não houve alertas."}
        ordenavel
        rodape={eventos.data && eventos.data.length >= 200 ? <p className="text-sm text-muted-foreground">Mostram-se os 200 mais recentes.</p> : undefined}
      />
    </>
  );
}

// --- Regras

const esquema = z.object({
  name: texto({ max: 200, obrigatorio: "Dê um nome à regra." }),
  kind: z.string().check(z.minLength(1, "Escolha o que vigiar.")),
  thresholdDays: z.string().check(
    z.overwrite((v) => v.trim()),
    z.regex(/^\d{1,3}$/, "Um número de dias, de 0 a 365."),
    z.refine((v) => Number(v) <= 365, "No máximo 365 dias."),
  ),
  recipients: z.array(z.string()).check(z.minLength(1, "Escolha pelo menos uma conta a avisar.")),
  sendEmail: z.boolean(),
  active: z.boolean(),
});
type Dados = z.infer<typeof esquema>;

function FormularioRegra({ regra, aberto, aoMudar }: { regra: RegraAlerta | null; aberto: boolean; aoMudar: (a: boolean) => void }) {
  const { utilizador: eu, pode } = useUtilizador();
  const podeVerContas = pode("identity.users.read");
  const contas = useUtilizadores(aberto && podeVerContas);
  const criar = useCriarRegra();
  const rever = useReverRegra();
  const accao = regra ? rever : criar;
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<Dados>({
    resolver: zodResolver(esquema),
    values: {
      name: regra?.name ?? "",
      kind: regra?.kind ?? "",
      thresholdDays: regra ? String(regra.thresholdDays) : "30",
      recipients: regra ? [...regra.recipients] : [eu.userId],
      sendEmail: regra?.sendEmail ?? false,
      active: regra?.isActive ?? true,
    },
  });
  const fechar = (a: boolean) => {
    aoMudar(a);
    if (!a) {
      form.reset();
      criar.reset();
      rever.reset();
      setSoltas([]);
    }
  };
  const opcoesContas = podeVerContas
    ? (contas.data ?? []).filter((u) => u.isActive || (regra?.recipients ?? []).includes(u.userId))
    : [{ userId: eu.userId, email: eu.email, isActive: true, roles: [] as string[] }];
  const submeter = form.handleSubmit((d) => {
    if (accao.isPending) return;
    setSoltas([]);
    const corpo = { name: d.name, kind: d.kind, thresholdDays: Number(d.thresholdDays), recipients: d.recipients, sendEmail: d.sendEmail, active: regra ? d.active : null };
    const aoErrar = (e: unknown) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["name", "kind", "thresholdDays", "recipients"]));
    if (regra) rever.mutate({ ruleId: regra.ruleId, ...corpo }, { onSuccess: () => fechar(false), onError: aoErrar });
    else criar.mutate(corpo, { onSuccess: () => fechar(false), onError: aoErrar });
  });
  return (
    <Confirmar
      aberto={aberto}
      aoMudar={fechar}
      titulo={regra ? "Rever regra de alerta" : "Nova regra de alerta"}
      rotuloConfirmar={regra ? "Guardar" : "Criar regra"}
      aCarregar={accao.isPending}
      erro={
        soltas.length > 0 ? (
          <Alert tom="erro" titulo="Não foi possível guardar.">
            {soltas.join(" ")}
          </Alert>
        ) : accao.error && !(eApiError(accao.error) && accao.error.status === 400) ? (
          <ErrorPanel erro={accao.error} />
        ) : undefined
      }
      formulario={idForm}
    >
      <form id={idForm} onSubmit={submeter} noValidate className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-0.5">
        <Field rotulo="Nome" erro={form.formState.errors.name?.message}>
          {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("name")} />}
        </Field>
        {regra ? (
          <p className="text-sm text-muted-foreground">Vigia: {nomeTipo(regra.kind)}. O tipo de uma regra não muda.</p>
        ) : (
          <Field rotulo="O que vigiar" erro={form.formState.errors.kind?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("kind")}>
                <option value="">Escolha…</option>
                {Object.entries(TIPOS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field rotulo="Antecedência (dias)" erro={form.formState.errors.thresholdDays?.message} ajuda="De 0 a 365.">
          {({ id, descricao, invalido }) => (
            <Input id={id} inputMode="numeric" maxLength={3} className="max-w-32" aria-describedby={descricao} invalido={invalido} {...form.register("thresholdDays")} />
          )}
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Contas a avisar</legend>
          {podeVerContas && contas.isPending ? <p className="text-sm text-muted-foreground">A carregar…</p> : null}
          {contas.error ? <ErrorPanel erro={contas.error} tentarDeNovo={() => void contas.refetch()} /> : null}
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border border-border p-2">
            {opcoesContas.map((u) => (
              <Checkbox key={u.userId} rotulo={u.userId === eu.userId ? `${u.email} (a sua conta)` : u.email} value={u.userId} {...form.register("recipients")} />
            ))}
          </div>
          {form.formState.errors.recipients?.message ? (
            <p className="text-xs text-danger" role="alert">
              {form.formState.errors.recipients.message}
            </p>
          ) : null}
          {!podeVerContas ? <p className="text-xs text-muted-foreground">Sem acesso à lista de contas, só pode avisar a sua.</p> : null}
        </fieldset>
        <Checkbox rotulo="Enviar também por e-mail" {...form.register("sendEmail")} />
        {regra ? <Checkbox rotulo="Regra activa" ajuda="Uma regra inactiva não é avaliada." {...form.register("active")} /> : null}
      </form>
    </Confirmar>
  );
}

function Avaliar() {
  const [aberto, setAberto] = useState(false);
  const avaliar = useAvaliar();
  const r = avaliar.data;
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <RefreshCw strokeWidth={1.75} aria-hidden />
        Avaliar agora
      </Button>
      {r ? (
        <Alert tom={r.errors.length > 0 ? "aviso" : "sucesso"} className="mt-4" titulo={`${plural(r.rulesEvaluated, "regra avaliada", "regras avaliadas")}: ${plural(r.raised, "alerta novo", "alertas novos")}, ${plural(r.autoResolved, "resolvido sozinho", "resolvidos sozinhos")}, ${plural(r.notified, "aviso enviado", "avisos enviados")}.`}>
          {r.errors.length > 0 ? r.errors.join(" ") : null}
        </Alert>
      ) : null}
      <Confirmar
        aberto={aberto}
        aoMudar={setAberto}
        titulo="Avaliar todas as regras agora?"
        descricao="A Rivo já o faz sozinha em ciclo. Avaliar agora pode abrir alertas e avisar as contas de cada regra."
        rotuloConfirmar="Avaliar"
        aCarregar={avaliar.isPending}
        erro={avaliar.error ? <ErrorPanel erro={avaliar.error} /> : undefined}
        aoConfirmar={() => (avaliar.isPending ? undefined : avaliar.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Regras() {
  const regras = useRegras();
  const { pode } = useUtilizador();
  const podeEscrever = pode("alerts.alerts.write");
  const [aberto, setAberto] = useState(false);
  const [aEditar, setAEditar] = useState<RegraAlerta | null>(null);
  const colunas: Coluna<RegraAlerta>[] = [
    {
      id: "nome",
      cabecalho: "Regra",
      ordenar: (r) => r.name,
      celula: (r) => (
        <div className="py-1">
          <p className="font-medium">{r.name}</p>
          <p className="text-sm text-muted-foreground">{TIPOS[r.kind]?.frase(Number(r.thresholdDays)) ?? r.kind}</p>
        </div>
      ),
    },
    { id: "abertos", cabecalho: "Abertos", alinhar: "direita", ordenar: (r) => Number(r.openAlerts), celula: (r) => String(r.openAlerts) },
    { id: "avaliada", cabecalho: "Última avaliação", esconderAte: "lg", celula: (r) => (r.lastEvaluatedAt ? formatarDataHora(r.lastEvaluatedAt) : "Nunca") },
    { id: "estado", cabecalho: "Estado", celula: (r) => (r.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>) },
    ...(podeEscrever
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (r: RegraAlerta) => (
              <Button
                variante="ghost"
                tamanho="sm"
                aria-label={`Rever ${r.name}`}
                onClick={() => {
                  setAEditar(r);
                  setAberto(true);
                }}
              >
                <Pencil strokeWidth={1.75} aria-hidden />
                <span className="hidden sm:inline">Rever</span>
              </Button>
            ),
          },
        ]
      : []),
  ];
  return (
    <>
      {podeEscrever ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => {
              setAEditar(null);
              setAberto(true);
            }}
          >
            <Plus strokeWidth={1.75} aria-hidden />
            Nova regra
          </Button>
          <Avaliar />
        </div>
      ) : null}
      <Tabela
        rotulo="Regras de alerta"
        colunas={colunas}
        linhas={regras.data}
        chave={(r) => r.ruleId}
        aCarregar={regras.isPending}
        erro={regras.error ? <ErrorPanel erro={regras.error} tentarDeNovo={() => void regras.refetch()} /> : undefined}
        vazio="Ainda não há regras de alerta."
        ordenavel
      />
      {podeEscrever ? <FormularioRegra regra={aEditar} aberto={aberto} aoMudar={setAberto} /> : null}
    </>
  );
}

export default function Alertas() {
  const [params] = useSearchParams();
  const vista = params.get("vista") === "regras" ? "regras" : "eventos";
  const separador = (activo: boolean) =>
    cn(
      "inline-flex h-9 items-center border-b-2 px-3 text-base pointer-coarse:h-11",
      activo ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
    );
  return (
    <>
      <PageHeader titulo="Alertas" descricao="Prazos e vencimentos que a Rivo vigia, e a quem avisa." />
      <nav aria-label="Vistas de alertas" className="mb-4 flex gap-1 border-b border-border">
        <NavLink to="/alertas" end className={() => separador(vista === "eventos")} aria-current={vista === "eventos" ? "page" : undefined}>
          Eventos
        </NavLink>
        <NavLink to="/alertas?vista=regras" className={() => separador(vista === "regras")} aria-current={vista === "regras" ? "page" : undefined}>
          Regras
        </NavLink>
      </nav>
      {vista === "eventos" ? <Eventos /> : <Regras />}
    </>
  );
}
