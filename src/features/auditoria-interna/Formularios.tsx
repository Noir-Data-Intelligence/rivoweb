/** Formulários da auditoria interna: planear ou corrigir uma auditoria, registar ou corrigir um achado, criar ou corrigir um plano de acção. */
import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { useUtilizador } from "@/features/identity";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { useAcaoAuditoriaInterna, useOpcoesAuditoria, type Achado, type AuditoriaInterna, type PlanoAccao } from "./api";
import { ErroAchado, ESTADOS_PLANO, RISCOS } from "./comum";
import {
  achadoParaApi,
  auditoriaParaApi,
  camposAchado,
  camposAuditoria,
  camposPlano,
  errosAchado,
  errosAuditoria,
  errosPlano,
  MAXIMO_CONTROLO,
  MAXIMO_TEXTO,
  MAXIMO_TITULO,
  planoParaApi,
  temErros,
  type CamposAchado,
  type CamposAuditoria,
  type CamposPlano,
  type EstadoPlano,
  type Risco,
} from "./regras";

type Opcao = { id: string; name: string };

/** Uma escolha actual que já não vem nas opções (departamento apagado, colaborador inactivo) continua escolhida até se mudar. */
const comActual = (opcoes: readonly Opcao[], id: string | undefined, nome: string | null | undefined): readonly Opcao[] =>
  id && !opcoes.some((o) => o.id === id) ? [{ id, name: nome ?? "—" }, ...opcoes] : opcoes;

function Escolha({ rotulo, erro, valor, opcoes, vazio, aoMudar }: { rotulo: string; erro?: string | undefined; valor: string; opcoes: readonly Opcao[]; vazio: string; aoMudar: (v: string) => void }) {
  return (
    <Field rotulo={rotulo} erro={erro}>
      {({ id, descricao, invalido }) => (
        <Select id={id} aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => aoMudar(e.target.value)}>
          <option value="">{vazio}</option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

function EscolhaRisco({ rotulo, valor, aoMudar }: { rotulo: string; valor: Risco; aoMudar: (v: Risco) => void }) {
  return (
    <Field rotulo={rotulo}>
      {({ id, descricao }) => (
        <Select id={id} aria-describedby={descricao} value={valor} onChange={(e) => aoMudar(e.target.value as Risco)}>
          {Object.entries(RISCOS).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

/** Planear (sem `a`) ou corrigir (com `a`) uma auditoria. Planeada, abre o detalhe. */
export function EditarAuditoria({ a }: { a?: AuditoriaInterna }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposAuditoria>(() => camposAuditoria(a));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoAuditoriaInterna();
  const opcoes = useOpcoesAuditoria(aberto);
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosAuditoria(v);
  const campo = <K extends keyof CamposAuditoria>(k: K, y: CamposAuditoria[K]) => setV((z) => ({ ...z, [k]: y }));
  const fechar = (x: boolean) => {
    setAberto(x);
    if (x) setV(camposAuditoria(a));
    else {
      setTentou(false);
      accao.reset();
    }
  };
  const departamentos = comActual(opcoes.data?.departments ?? [], a?.departmentId, a?.departmentName);
  const pessoas = comActual(opcoes.data?.employees ?? [], a?.ownerEmployeeId, a?.ownerName);
  return (
    <>
      {a ? (
        <Button variante="secondary" onClick={() => fechar(true)}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => fechar(true)}>Nova auditoria</Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        largo
        titulo={a ? `Corrigir ${a.auditNumber}` : "Nova auditoria"}
        descricao={a ? undefined : "Nasce planeada, com o número do ano (AUD-AAAA-NNN)."}
        rotuloConfirmar={a ? "Guardar" : "Planear"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : opcoes.error ? <ErrorPanel erro={opcoes.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            if (a) accao.mutate({ acto: "rever", auditoria: a.auditId, corpo: auditoriaParaApi(v, a) }, { onSuccess: () => fechar(false) });
            else
              accao.mutate(
                { acto: "planear", corpo: auditoriaParaApi(v) },
                {
                  onSuccess: (r) => {
                    fechar(false);
                    const id = (r as { id?: string } | undefined)?.id;
                    if (id) void navegar(`/auditoria-interna/${id}`);
                  },
                },
              );
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={MAXIMO_TITULO} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => campo("titulo", e.target.value)} />}
          </Field>
          <Escolha rotulo="Departamento auditado" erro={tentou ? erros.departamento : undefined} valor={v.departamento} opcoes={departamentos} vazio={opcoes.isPending && aberto ? "A carregar…" : "Escolha"} aoMudar={(x) => campo("departamento", x)} />
          <Escolha rotulo="Responsável" erro={tentou ? erros.responsavel : undefined} valor={v.responsavel} opcoes={pessoas} vazio={opcoes.isPending && aberto ? "A carregar…" : "Escolha"} aoMudar={(x) => campo("responsavel", x)} />
          <Field rotulo="Início previsto" erro={tentou ? erros.inicio : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={(e) => campo("inicio", e.target.value)} />}
          </Field>
          <Field rotulo="Fim previsto" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || undefined} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => campo("fim", e.target.value)} />}
          </Field>
          <EscolhaRisco rotulo="Risco" valor={v.risco} aoMudar={(x) => campo("risco", x)} />
          <Field rotulo="Objectivos (opcional)" erro={tentou ? erros.objectivos : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_TEXTO} aria-describedby={descricao} invalido={invalido} value={v.objectivos} onChange={(e) => campo("objectivos", e.target.value)} />}
          </Field>
          <Field rotulo="Âmbito (opcional)" erro={tentou ? erros.ambito : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_TEXTO} aria-describedby={descricao} invalido={invalido} value={v.ambito} onChange={(e) => campo("ambito", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/** Registar (sem `f`) ou corrigir (com `f`) um achado da auditoria `auditoria`. */
export function EditarAchado({ auditoria, f }: { auditoria: string; f?: Achado }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposAchado>(() => camposAchado(f));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoAuditoriaInterna();
  const idForm = useId();
  const erros = errosAchado(v);
  const campo = <K extends keyof CamposAchado>(k: K, y: CamposAchado[K]) => setV((z) => ({ ...z, [k]: y }));
  const fechar = (x: boolean) => {
    setAberto(x);
    if (x) setV(camposAchado(f));
    else {
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      {f ? (
        <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)} aria-label="Corrigir o achado">
          Corrigir
        </Button>
      ) : (
        <Button tamanho="sm" onClick={() => fechar(true)}>
          Novo achado
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        largo
        titulo={f ? "Corrigir o achado" : "Novo achado"}
        descricao={f ? undefined : "Nasce aberto; com o primeiro plano de acção passa a «em correcção»."}
        rotuloConfirmar={f ? "Guardar" : "Registar"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErroAchado erro={accao.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            if (f) accao.mutate({ acto: "reverAchado", achado: f.findingId, corpo: achadoParaApi(v, f) }, { onSuccess: () => fechar(false) });
            else accao.mutate({ acto: "achado", auditoria, corpo: achadoParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_TEXTO} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => campo("descricao", e.target.value)} />}
          </Field>
          <EscolhaRisco rotulo="Gravidade" valor={v.gravidade} aoMudar={(x) => campo("gravidade", x)} />
          <Field rotulo="Controlo (opcional)" ajuda="Referência de controlo interno, por exemplo CP-04." erro={tentou ? erros.controlo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={MAXIMO_CONTROLO} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.controlo} onChange={(e) => campo("controlo", e.target.value)} />}
          </Field>
          <Field rotulo="Recomendação (opcional)" erro={tentou ? erros.recomendacao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_TEXTO} aria-describedby={descricao} invalido={invalido} value={v.recomendacao} onChange={(e) => campo("recomendacao", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/** Criar (sem `p`) ou corrigir (com `p`, estado incluído) um plano de acção do achado `achado`. */
export function EditarPlano({ achado, p }: { achado: string; p?: PlanoAccao }) {
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposPlano>(() => camposPlano(p));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoAuditoriaInterna();
  // Os colaboradores vêm de `/internal-audit/lookups`, que exige a escrita de auditorias.
  const opcoes = useOpcoesAuditoria(aberto && pode("internalaudit.audits.write"));
  const idForm = useId();
  const erros = errosPlano(v);
  const campo = <K extends keyof CamposPlano>(k: K, y: CamposPlano[K]) => setV((z) => ({ ...z, [k]: y }));
  const fechar = (x: boolean) => {
    setAberto(x);
    if (x) setV(camposPlano(p));
    else {
      setTentou(false);
      accao.reset();
    }
  };
  const pessoas = comActual(opcoes.data?.employees ?? [], p?.ownerEmployeeId, p?.ownerName);
  return (
    <>
      {p ? (
        <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)} aria-label={`Corrigir o plano ${p.action}`}>
          Corrigir
        </Button>
      ) : (
        <Button variante="secondary" tamanho="sm" onClick={() => fechar(true)}>
          Novo plano
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        largo
        titulo={p ? "Corrigir o plano de acção" : "Novo plano de acção"}
        descricao={p ? undefined : "Nasce pendente. O responsável pelo plano não pode depois fechar o achado."}
        rotuloConfirmar={p ? "Guardar" : "Criar plano"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : opcoes.error ? <ErrorPanel erro={opcoes.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || accao.isPending) return;
            if (p) accao.mutate({ acto: "reverPlano", plano: p.actionPlanId, corpo: planoParaApi(v, false) }, { onSuccess: () => fechar(false) });
            else accao.mutate({ acto: "plano", achado, corpo: planoParaApi(v, true) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Acção" erro={tentou ? erros.accao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_TEXTO} aria-describedby={descricao} invalido={invalido} value={v.accao} onChange={(e) => campo("accao", e.target.value)} />}
          </Field>
          <Escolha rotulo="Responsável" erro={tentou ? erros.responsavel : undefined} valor={v.responsavel} opcoes={pessoas} vazio={opcoes.isFetching ? "A carregar…" : "Escolha"} aoMudar={(x) => campo("responsavel", x)} />
          <Field rotulo="Prazo" erro={tentou ? erros.prazo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.prazo} onChange={(e) => campo("prazo", e.target.value)} />}
          </Field>
          {p ? (
            <Field rotulo="Estado">
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={v.estado} onChange={(e) => campo("estado", e.target.value as EstadoPlano)}>
                  {Object.entries(ESTADOS_PLANO).map(([k, t]) => (
                    <option key={k} value={k}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}
