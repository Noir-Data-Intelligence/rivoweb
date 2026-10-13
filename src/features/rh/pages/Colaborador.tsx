import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Link2, Unlink } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useParams } from "react-router";
import { z } from "zod/mini";
import { useUtilizadores } from "@/features/administracao";
import { Can, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError, eConflitoDeVersao } from "@/lib/api/problem";
import { formatarDataHora, hojeIso, inicioDoDiaEmLuanda } from "@/lib/format/data";
import { IsoDate, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Checkbox, Select } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import {
  useAtribuirCargo,
  useColaborador,
  useCorrigirNome,
  useDesligarConta,
  useEncerrarCargo,
  useHistoricoConta,
  useLigarConta,
  useMudarContactos,
  useMudarEstadoColaborador,
  useOcupacoes,
  useTodosCargos,
  useTodosColaboradores,
  useTodosDepartamentos,
  useTransferir,
  useVerificarDecisao,
  type FichaColaborador,
  type ResultadoAtribuicao,
} from "../api";
import { AvisoListaIncompleta, EstadoColaborador, nomeDepartamento } from "../comum";
import { emailOpcional, vazioParaNull } from "../validacao";

type Ficha = { dados: FichaColaborador; versao: string | null; recarregar: () => void };

/**
 * Erro de uma escrita. Num formulário com campos, o 400 já foi para os campos
 * (`comCampos`). Só o 409 de versão oferece recarregar (ADR-080); o 409 de
 * regra de negócio mostra o motivo do servidor.
 */
function ErroEscrita({ erro, recarregar, comCampos = false }: { erro: unknown; recarregar: () => void; comCampos?: boolean }) {
  if (!erro || (comCampos && eApiError(erro) && erro.status === 400)) return null;
  if (!eConflitoDeVersao(erro)) return <ErrorPanel erro={erro} />;
  return (
    <Alert tom="erro" titulo="Alguém alterou este registo entretanto." accao={<Button variante="secondary" tamanho="sm" onClick={recarregar}>Recarregar</Button>}>
      Nada foi gravado. Recarregue, reveja os dados actuais e repita.
    </Alert>
  );
}

function Soltas({ mensagens }: { mensagens: string[] }) {
  if (mensagens.length === 0) return null;
  return (
    <Alert tom="erro" titulo="Não foi possível guardar.">
      {mensagens.join(" ")}
    </Alert>
  );
}

// --- Dados

const esquemaNome = z.object({ fullName: texto({ max: 200, obrigatorio: "Escreva o nome completo." }) });

function CorrigirNome({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const corrigir = useCorrigirNome(ficha.dados.employeeId, ficha.versao);
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<{ fullName: string }>({ resolver: zodResolver(esquemaNome), values: { fullName: ficha.dados.fullName } });
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset();
      corrigir.reset();
      setSoltas([]);
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        Corrigir nome
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Corrigir o nome"
        descricao="Para corrigir um erro de escrita. Fica na trilha de auditoria."
        rotuloConfirmar="Guardar"
        aCarregar={corrigir.isPending}
        erro={soltas.length > 0 ? <Soltas mensagens={soltas} /> : corrigir.error ? <ErroEscrita erro={corrigir.error} recarregar={ficha.recarregar} comCampos /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          onSubmit={form.handleSubmit((d) => {
            if (corrigir.isPending) return;
            setSoltas([]);
            corrigir.mutate(d.fullName, { onSuccess: () => fechar(false), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["fullName"])) });
          })}
        >
          <Field rotulo="Nome completo" erro={form.formState.errors.fullName?.message}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("fullName")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

const esquemaContactos = z.object({ email: emailOpcional, phone: texto({ max: 50 }), employeeCode: texto({ max: 30 }) });
type DadosContactos = z.infer<typeof esquemaContactos>;

function MudarContactos({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const mudar = useMudarContactos(ficha.dados.employeeId, ficha.versao);
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<DadosContactos>({
    resolver: zodResolver(esquemaContactos),
    values: { email: ficha.dados.email ?? "", phone: ficha.dados.phone ?? "", employeeCode: ficha.dados.employeeCode ?? "" },
  });
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset();
      mudar.reset();
      setSoltas([]);
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)}>
        Mudar contactos
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Contactos e n.º mecanográfico"
        descricao="Um campo vazio apaga o valor."
        rotuloConfirmar="Guardar"
        aCarregar={mudar.isPending}
        erro={soltas.length > 0 ? <Soltas mensagens={soltas} /> : mudar.error ? <ErroEscrita erro={mudar.error} recarregar={ficha.recarregar} comCampos /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((d) => {
            if (mudar.isPending) return;
            setSoltas([]);
            mudar.mutate(
              { email: vazioParaNull(d.email), phone: vazioParaNull(d.phone), employeeCode: vazioParaNull(d.employeeCode) },
              { onSuccess: () => fechar(false), onError: (e) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["email", "phone", "employeeCode"])) },
            );
          })}
        >
          <Field rotulo="E-mail" erro={form.formState.errors.email?.message}>
            {({ id, descricao, invalido }) => <Input id={id} type="email" maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("email")} />}
          </Field>
          <Field rotulo="Telefone" erro={form.formState.errors.phone?.message}>
            {({ id, descricao, invalido }) => <Input id={id} type="tel" maxLength={50} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("phone")} />}
          </Field>
          <Field rotulo="N.º mecanográfico" erro={form.formState.errors.employeeCode?.message} ajuda="Único na empresa.">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("employeeCode")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Transferir({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const departamentos = useTodosDepartamentos(aberto);
  const transferir = useTransferir(ficha.dados.employeeId, ficha.versao);
  const [destino, setDestino] = useState(ficha.dados.departmentId ?? "");
  const id = useId();
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) transferir.reset();
    else setDestino(ficha.dados.departmentId ?? "");
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)}>
        Mudar departamento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Mudar de departamento"
        rotuloConfirmar="Mudar"
        aCarregar={transferir.isPending}
        erro={transferir.error ? <ErroEscrita erro={transferir.error} recarregar={ficha.recarregar} /> : undefined}
        aoConfirmar={() => {
          if (transferir.isPending) return;
          transferir.mutate(vazioParaNull(destino), { onSuccess: () => fechar(false) });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Departamento
          </label>
          <Select id={id} value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Sem departamento</option>
            {(departamentos.data?.items ?? []).map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        {departamentos.data ? <AvisoListaIncompleta pagina={departamentos.data} oque="departamentos" /> : null}
        {departamentos.error ? <ErrorPanel erro={departamentos.error} tentarDeNovo={() => void departamentos.refetch()} className="mt-3" /> : null}
      </Confirmar>
    </>
  );
}

function MudarEstado({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const mudar = useMudarEstadoColaborador(ficha.dados.employeeId, ficha.versao);
  const activar = ficha.dados.status !== "Active";
  return (
    <>
      <Button variante={activar ? "secondary" : "ghost"} tamanho="sm" onClick={() => setAberto(true)}>
        {activar ? "Reactivar" : "Desactivar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) mudar.reset();
        }}
        titulo={activar ? "Reactivar o colaborador?" : "Desactivar o colaborador?"}
        descricao={
          activar
            ? "A ficha volta a contar como activa."
            : "A ficha deixa de contar como activa. Isto não desactiva a conta de acesso: isso faz-se em Utilizadores."
        }
        rotuloConfirmar={activar ? "Reactivar" : "Desactivar"}
        variante={activar ? "primary" : "destructive"}
        aCarregar={mudar.isPending}
        erro={mudar.error ? <ErroEscrita erro={mudar.error} recarregar={ficha.recarregar} /> : undefined}
        aoConfirmar={() => (mudar.isPending ? undefined : mudar.mutate(activar, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="break-words text-base text-foreground">{children}</dd>
    </div>
  );
}

function Dados({ ficha }: { ficha: Ficha }) {
  const { pode } = useUtilizador();
  const departamentos = useTodosDepartamentos(pode("hr.departments.read"));
  const d = ficha.dados;
  return (
    <Card>
      <CardTitle>Dados</CardTitle>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <Linha rotulo="Nome completo">{d.fullName}</Linha>
        <Linha rotulo="N.º mecanográfico">{d.employeeCode ?? "—"}</Linha>
        <Linha rotulo="E-mail">{d.email ?? "—"}</Linha>
        <Linha rotulo="Telefone">{d.phone ?? "—"}</Linha>
        <Linha rotulo="Departamento">{pode("hr.departments.read") ? nomeDepartamento(departamentos.data?.items, d.departmentId) : "—"}</Linha>
        <Linha rotulo="Estado">
          <EstadoColaborador estado={d.status} />
        </Linha>
      </dl>
      <Can requer="hr.employees.write">
        <div className="mt-4 flex flex-wrap gap-1 border-t border-border pt-3">
          <CorrigirNome ficha={ficha} />
          <MudarContactos ficha={ficha} />
          {pode("hr.departments.read") ? <Transferir ficha={ficha} /> : null}
          <MudarEstado ficha={ficha} />
        </div>
      </Can>
    </Card>
  );
}

// --- Cargo

const esquemaAtribuicao = z
  .object({
    positionId: z.string().check(z.minLength(1, "Escolha o cargo.")),
    effectiveFrom: IsoDate,
    effectiveTo: z.string(),
    directa: z.boolean(),
  })
  .check(
    z.refine((d) => d.effectiveTo === "" || /^\d{4}-\d{2}-\d{2}$/.test(d.effectiveTo), { path: ["effectiveTo"], error: "Data inválida." }),
    z.refine((d) => d.effectiveTo === "" || d.effectiveTo > d.effectiveFrom, { path: ["effectiveTo"], error: "Tem de ser depois do início." }),
  );
type DadosAtribuicao = z.infer<typeof esquemaAtribuicao>;

function AtribuirCargo({ ficha, aoResultado }: { ficha: Ficha; aoResultado: (r: ResultadoAtribuicao & { positionId: string }) => void }) {
  const [aberto, setAberto] = useState(false);
  const { pode } = useUtilizador();
  const podeDirecta = pode("hr.positions.assign_direct");
  const cargos = useTodosCargos(aberto);
  const atribuir = useAtribuirCargo(ficha.dados.employeeId);
  const idForm = useId();
  const form = useForm<DadosAtribuicao>({
    resolver: zodResolver(esquemaAtribuicao),
    defaultValues: { positionId: "", effectiveFrom: hojeIso(), effectiveTo: "", directa: false },
  });
  const positionId = useWatch({ control: form.control, name: "positionId" });
  const directa = useWatch({ control: form.control, name: "directa" });
  const escolhido = (cargos.data?.items ?? []).find((c) => c.positionId === positionId);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset({ positionId: "", effectiveFrom: hojeIso(), effectiveTo: "", directa: false });
      atribuir.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        {ficha.dados.currentPosition ? "Atribuir outro cargo" : "Atribuir cargo"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Atribuir cargo"
        descricao={`A ${ficha.dados.fullName}.`}
        rotuloConfirmar={escolhido?.grantsApprovalAuthority && !directa ? "Enviar para aprovação" : "Atribuir"}
        variante={directa ? "destructive" : "primary"}
        aCarregar={atribuir.isPending}
        erro={atribuir.error ? <ErrorPanel erro={atribuir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((d) => {
            if (atribuir.isPending) return;
            atribuir.mutate(
              {
                directa: podeDirecta && d.directa,
                positionId: d.positionId,
                effectiveFrom: inicioDoDiaEmLuanda(d.effectiveFrom),
                effectiveTo: d.effectiveTo === "" ? null : inicioDoDiaEmLuanda(d.effectiveTo),
              },
              {
                onSuccess: (r) => {
                  aoResultado({ ...r, positionId: d.positionId });
                  fechar(false);
                },
              },
            );
          })}
        >
          <Field rotulo="Cargo" erro={form.formState.errors.positionId?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("positionId")}>
                <option value="">{cargos.isPending ? "A carregar…" : "Escolha…"}</option>
                {(cargos.data?.items ?? []).map((c) => (
                  <option key={c.positionId} value={c.positionId}>
                    {c.name}
                    {c.grantsApprovalAuthority ? " (com autoridade)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {cargos.data ? <AvisoListaIncompleta pagina={cargos.data} oque="cargos" /> : null}
          {cargos.error ? <ErrorPanel erro={cargos.error} tentarDeNovo={() => void cargos.refetch()} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field rotulo="Início" erro={form.formState.errors.effectiveFrom?.message}>
              {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} {...form.register("effectiveFrom")} />}
            </Field>
            <Field rotulo="Fim" erro={form.formState.errors.effectiveTo?.message} ajuda="Opcional.">
              {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} {...form.register("effectiveTo")} />}
            </Field>
          </div>
          {escolhido?.grantsApprovalAuthority && !directa ? (
            <Alert tom="info" titulo="Este cargo dá autoridade para aprovar.">
              A atribuição vai para aprovação e só fica em vigor depois de decidida.
            </Alert>
          ) : null}
          {podeDirecta ? (
            <Checkbox
              rotulo="Atribuição directa, sem aprovação"
              ajuda="Só SuperAdmin. Para o primeiro cargo aprovador, quando ainda ninguém pode decidir. Fica na trilha de auditoria."
              {...form.register("directa")}
            />
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function Pendente({ ficha, assignmentId, positionId, detalhe, aoResolver }: { ficha: Ficha; assignmentId: string; positionId: string; detalhe: string | null; aoResolver: () => void }) {
  const verificar = useVerificarDecisao(ficha.dados.employeeId);
  const r = verificar.data;
  if (r && !r.pendente) {
    return (
      <Alert tom="info" className="mt-4" titulo={`Decisão aplicada: ${r.estado}.`} accao={<Button variante="ghost" tamanho="sm" onClick={aoResolver}>Fechar</Button>}>
        {r.detalhe}
      </Alert>
    );
  }
  return (
    <Alert
      tom="aviso"
      className="mt-4"
      titulo="Enviado para aprovação."
      accao={
        <Button variante="secondary" tamanho="sm" aCarregar={verificar.isPending} onClick={() => verificar.mutate({ assignmentId, positionId })}>
          Verificar decisão
        </Button>
      }
    >
      {r?.pendente ? "Ainda sem decisão." : (detalhe ?? "O cargo só fica em vigor depois de aprovado.")} A Rivo verifica sozinha a cada minuto.
      {verificar.error ? <ErrorPanel erro={verificar.error} className="mt-2" /> : null}
    </Alert>
  );
}

function EncerrarCargo({ ficha, positionId }: { ficha: Ficha; positionId: string }) {
  const [aberto, setAberto] = useState(false);
  const ocupacoes = useOcupacoes(aberto ? positionId : null);
  const encerrar = useEncerrarCargo(ficha.dados.employeeId);
  const [fim, setFim] = useState(hojeIso());
  const id = useId();
  const agora = new Date().toISOString();
  const actual = (ocupacoes.data ?? []).find(
    (o) => o.employeeId === ficha.dados.employeeId && o.status === "Effective" && (o.effectiveTo === null || o.effectiveTo > agora),
  );
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        Encerrar cargo actual
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) encerrar.reset();
        }}
        titulo="Encerrar o cargo actual?"
        descricao={`${ficha.dados.fullName} deixa de ocupar ${ficha.dados.currentPosition?.name ?? "o cargo"} a partir da data indicada.`}
        rotuloConfirmar="Encerrar"
        variante="destructive"
        aCarregar={encerrar.isPending || ocupacoes.isPending}
        erro={encerrar.error ? <ErrorPanel erro={encerrar.error} /> : ocupacoes.error ? <ErrorPanel erro={ocupacoes.error} tentarDeNovo={() => void ocupacoes.refetch()} /> : undefined}
        aoConfirmar={() => {
          if (!actual || encerrar.isPending || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return;
          encerrar.mutate({ assignmentId: actual.assignmentId, positionId, endedOn: inicioDoDiaEmLuanda(fim) }, { onSuccess: () => setAberto(false) });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Último dia
          </label>
          <Input id={id} type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="max-w-48" />
        </div>
        {ocupacoes.data && !actual ? <Alert tom="aviso" className="mt-3" titulo="Não se encontrou a ocupação em vigor deste cargo." /> : null}
      </Confirmar>
    </>
  );
}

function CargoActual({ ficha }: { ficha: Ficha }) {
  const { pode } = useUtilizador();
  const [pendente, setPendente] = useState<{ assignmentId: string; positionId: string; detalhe: string | null } | null>(null);
  const cargo = ficha.dados.currentPosition;
  const podeAtribuir = pode({ allOf: ["hr.positions.assign", "hr.positions.read"] });
  return (
    <Card>
      <CardTitle>Cargo</CardTitle>
      {cargo ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-base text-foreground">
          {cargo.name}
          {cargo.grantsApprovalAuthority ? <Badge tom="info">Com autoridade para aprovar</Badge> : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Sem cargo em vigor.</p>
      )}
      {pendente ? <Pendente ficha={ficha} {...pendente} aoResolver={() => setPendente(null)} /> : null}
      {podeAtribuir ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <AtribuirCargo
            ficha={ficha}
            aoResultado={(r) => setPendente(r.tipo === "pendente" ? { assignmentId: r.assignmentId, positionId: r.positionId, detalhe: r.detalhe } : null)}
          />
          {cargo ? <EncerrarCargo ficha={ficha} positionId={cargo.positionId} /> : null}
        </div>
      ) : null}
    </Card>
  );
}

// --- Conta de acesso

function LigarConta({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const { utilizador: eu } = useUtilizador();
  const utilizadores = useUtilizadores(aberto);
  const colaboradores = useTodosColaboradores(aberto);
  const ligar = useLigarConta(ficha.dados.employeeId, ficha.versao);
  const [escolhida, setEscolhida] = useState("");
  const id = useId();
  const ligadas = new Set((colaboradores.data?.items ?? []).map((c) => c.userId).filter((u): u is string => u !== null));
  const disponiveis = (utilizadores.data ?? []).filter((u) => u.isActive && !ligadas.has(u.userId) && u.userId !== eu.userId && !u.roles.includes("Cliente"));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setEscolhida("");
      ligar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Link2 strokeWidth={1.75} aria-hidden />
        Ligar conta
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Ligar uma conta de acesso"
        descricao="A pessoa passa a ver o portal do colaborador e, se o cargo der autoridade, a decidir aprovações."
        rotuloConfirmar="Ligar"
        aCarregar={ligar.isPending}
        erro={ligar.error ? <ErroEscrita erro={ligar.error} recarregar={ficha.recarregar} /> : undefined}
        aoConfirmar={() => (escolhida === "" || ligar.isPending ? undefined : ligar.mutate(escolhida, { onSuccess: () => fechar(false) }))}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Conta
          </label>
          <Select id={id} value={escolhida} onChange={(e) => setEscolhida(e.target.value)} disabled={utilizadores.isPending || colaboradores.isPending}>
            <option value="">{utilizadores.isPending || colaboradores.isPending ? "A carregar…" : disponiveis.length === 0 ? "Nenhuma conta livre" : "Escolha…"}</option>
            {disponiveis.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.email}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Só contas activas, sem ficha ligada, e nunca a sua.</p>
        </div>
        {colaboradores.data ? <AvisoListaIncompleta pagina={colaboradores.data} oque="colaboradores" /> : null}
        {utilizadores.error ? <ErrorPanel erro={utilizadores.error} tentarDeNovo={() => void utilizadores.refetch()} className="mt-3" /> : null}
      </Confirmar>
    </>
  );
}

function DesligarConta({ ficha, email }: { ficha: Ficha; email: string | null }) {
  const [aberto, setAberto] = useState(false);
  const desligar = useDesligarConta(ficha.dados.employeeId, ficha.versao);
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        <Unlink strokeWidth={1.75} aria-hidden />
        Desligar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) desligar.reset();
        }}
        titulo="Desligar a conta desta ficha?"
        descricao={`${email ?? "A conta"} deixa de ver o portal do colaborador e de decidir aprovações por este cargo. A conta continua activa.`}
        rotuloConfirmar="Desligar"
        variante="destructive"
        aCarregar={desligar.isPending}
        erro={desligar.error ? <ErroEscrita erro={desligar.error} recarregar={ficha.recarregar} /> : undefined}
        aoConfirmar={() => (desligar.isPending ? undefined : desligar.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function ContaDeAcesso({ ficha }: { ficha: Ficha }) {
  const { pode } = useUtilizador();
  const podeLerContas = pode("identity.users.read");
  const utilizadores = useUtilizadores(podeLerContas);
  const historico = useHistoricoConta(ficha.dados.employeeId);
  const emailDe = (id: string | null) => (id === null ? null : (utilizadores.data?.find((u) => u.userId === id)?.email ?? null));
  const ligada = ficha.dados.userId;
  return (
    <Card>
      <CardTitle>Conta de acesso</CardTitle>
      {ligada ? (
        <p className="mt-2 text-base text-foreground">{podeLerContas ? (emailDe(ligada) ?? "…") : "Conta ligada"}</p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Sem conta ligada. Sem ela, a pessoa não vê o portal do colaborador nem decide aprovações.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {ligada ? <DesligarConta ficha={ficha} email={emailDe(ligada)} /> : podeLerContas ? <LigarConta ficha={ficha} /> : null}
      </div>
      <h3 className="mt-5 text-sm font-medium text-foreground">Histórico</h3>
      {historico.isPending ? (
        <Skeleton className="mt-2 h-10" />
      ) : historico.error ? (
        <ErrorPanel erro={historico.error} tentarDeNovo={() => void historico.refetch()} className="mt-2" />
      ) : historico.data.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">Nunca teve conta ligada.</p>
      ) : (
        <ul className="mt-1 divide-y divide-border text-sm">
          {historico.data.map((h) => (
            <li key={`${h.userId}-${h.linkedOn}`} className="py-2">
              <p className="text-foreground">{podeLerContas ? (emailDe(h.userId) ?? "Conta") : "Conta"}</p>
              <p className="text-muted-foreground">
                Ligada {formatarDataHora(h.linkedOn)}
                {h.unlinkedOn ? ` · desligada ${formatarDataHora(h.unlinkedOn)}` : " · em vigor"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Colaborador() {
  const { employeeId = "" } = useParams();
  const colaborador = useColaborador(employeeId);
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/colaboradores">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Colaboradores
      </Link>
    </Button>
  );
  if (colaborador.isPending) return <CarregandoPagina />;
  if (colaborador.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={colaborador.error} tentarDeNovo={() => void colaborador.refetch()} />
      </>
    );
  }
  const ficha: Ficha = { dados: colaborador.data.dados, versao: colaborador.data.versao, recarregar: () => void colaborador.refetch() };
  return (
    <>
      {voltar}
      <PageHeader
        titulo={ficha.dados.fullName}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoColaborador estado={ficha.dados.status} />
            {ficha.dados.employeeCode ? <span>N.º {ficha.dados.employeeCode}</span> : null}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Dados ficha={ficha} />
        </div>
        <CargoActual ficha={ficha} />
        <Can requer="hr.employees.link_account">
          <ContaDeAcesso ficha={ficha} />
        </Can>
      </div>
    </>
  );
}
