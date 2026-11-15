/**
 * Aprovações › Delegações (ADR-129): quem aprova e se ausenta delega num
 * colega por um período, e o colega decide em nome dele os passos que esperam
 * por ele. A segregação vale para os dois (BR-2, BR-3, BR-4). Quem administra
 * as políticas vê todas e delega por quem está ausente.
 */
import { Plus, UserRoundX } from "lucide-react";
import { useId, useState } from "react";
import { useUtilizador } from "@/features/identity";
import { erroDoCampo } from "@/lib/api/problem";
import { formatarDataHora, instanteDeDataHoraLocal } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useCandidatosDelegacao, useDelegacoes, useDelegar, useRevogarDelegacao, type Delegacao } from "../api";
import { useEuColaborador, useNomeColaborador, VistasAprovacoes } from "../comum";

/** `escolheDelegante`: quem administra as políticas escolhe também quem delega (por omissão, a própria pessoa). */
function Delegar({ escolheDelegante, eu }: { escolheDelegante: boolean; eu: string | null }) {
  const [aberto, setAberto] = useState(false);
  const candidatos = useCandidatosDelegacao(aberto);
  const delegar = useDelegar();
  const [delegante, setDelegante] = useState(eu ?? "");
  const [colega, setColega] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  // Comparado com o relógio só ao submeter: a página não lê a hora ao pintar.
  const [fimPassado, setFimPassado] = useState(false);
  const idForm = useId();
  const quem = escolheDelegante ? delegante : (eu ?? "");
  const porOutrem = escolheDelegante && delegante !== eu;
  const instanteInicio = inicio === "" ? null : instanteDeDataHoraLocal(inicio);
  const instanteFim = fim === "" ? null : instanteDeDataHoraLocal(fim);
  const erros = {
    delegante: escolheDelegante && delegante === "" ? "Escolha quem delega." : undefined,
    colega: colega === "" ? "Escolha o colega." : colega === quem ? "Escolha outra pessoa: não se delega em si próprio." : undefined,
    inicio: inicio !== "" && !instanteInicio ? "Indique a data e a hora." : undefined,
    fim: !instanteFim
      ? "Indique até quando."
      : fimPassado
        ? "O fim tem de ser depois de agora."
        : instanteInicio && new Date(instanteFim).getTime() <= new Date(instanteInicio).getTime()
          ? "O fim tem de ser depois do início."
          : undefined,
  };
  const doServidor = {
    delegante: erroDoCampo(delegar.error, "delegatorEmployeeId"),
    colega: erroDoCampo(delegar.error, "delegateEmployeeId"),
    inicio: erroDoCampo(delegar.error, "startsAt"),
    fim: erroDoCampo(delegar.error, "endsAt"),
  };
  const deCampo = Object.values(doServidor).some(Boolean);
  const lista = (candidatos.data ?? []).filter((c) => c.employeeId !== quem);
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      delegar.reset();
      setDelegante(eu ?? "");
      setColega("");
      setInicio("");
      setFim("");
      setMotivo("");
      setTentou(false);
      setFimPassado(false);
    }
  };
  const opcoes = (excluir: string | null) => (
    <>
      <option value="">{candidatos.isPending ? "A carregar…" : "Escolha…"}</option>
      {(excluir ? lista : (candidatos.data ?? [])).map((c) => (
        <option key={c.employeeId} value={c.employeeId}>
          {c.name}
        </option>
      ))}
    </>
  );
  return (
    <>
      <Button
        onClick={() => {
          // O colaborador da conta pode chegar depois da primeira pintura: lê-se ao abrir.
          setDelegante(eu ?? "");
          setAberto(true);
        }}
      >
        <Plus strokeWidth={1.75} aria-hidden />
        Delegar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={escolheDelegante ? "Delegar aprovações" : "Delegar as minhas aprovações"}
        descricao="Durante o período, o colega decide em nome do delegante os passos que esperam por ele. Nenhum dos dois decide um pedido que submeteu, nem intervém duas vezes no mesmo processo, nem paga o que aprovou."
        rotuloConfirmar="Delegar"
        aCarregar={delegar.isPending}
        erro={delegar.error && !deCampo ? <ErrorPanel erro={delegar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const passado = instanteFim !== null && new Date(instanteFim).getTime() <= Date.now();
            setFimPassado(passado);
            if (passado || Object.values(erros).some(Boolean) || !instanteFim || delegar.isPending) return;
            const m = normalizarTexto(motivo);
            delegar.mutate(
              {
                delegateEmployeeId: colega,
                endsAt: instanteFim,
                ...(instanteInicio ? { startsAt: instanteInicio } : {}),
                ...(m !== "" ? { reason: m } : {}),
                ...(porOutrem ? { delegatorEmployeeId: delegante } : {}),
              },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          {candidatos.error ? <ErrorPanel erro={candidatos.error} tentarDeNovo={() => void candidatos.refetch()} className="sm:col-span-2" /> : null}
          {escolheDelegante ? (
            <Field rotulo="Quem delega" erro={(tentou ? erros.delegante : undefined) ?? doServidor.delegante} className="sm:col-span-2" ajuda="Quem está ausente: os passos à espera dele passam a poder ser decididos pelo colega. Pode ser você.">
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} aria-busy={candidatos.isPending || undefined} value={delegante} onChange={(e) => setDelegante(e.target.value)}>
                  {opcoes(null)}
                </Select>
              )}
            </Field>
          ) : null}
          <Field
            rotulo="Colega"
            erro={(tentou ? erros.colega : undefined) ?? doServidor.colega}
            className="sm:col-span-2"
            ajuda="Escolha quem já decide aprovações: o colega só decide se o perfil o deixar (decidir aprovações) e tiver ficha de colaborador."
          >
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} aria-busy={candidatos.isPending || undefined} value={colega} onChange={(e) => setColega(e.target.value)}>
                {opcoes(quem)}
              </Select>
            )}
          </Field>
          <Field rotulo="Início (opcional)" erro={(tentou ? erros.inicio : undefined) ?? doServidor.inicio} ajuda="Vazio: a partir de agora. Hora de Luanda.">
            {({ id, descricao, invalido }) => <Input id={id} type="datetime-local" aria-describedby={descricao} invalido={invalido} value={inicio} onChange={(e) => setInicio(e.target.value)} />}
          </Field>
          <Field rotulo="Fim" erro={(tentou ? erros.fim : undefined) ?? doServidor.fim} ajuda="Hora de Luanda.">
            {({ id, descricao, invalido }) => (
              <Input
                id={id}
                type="datetime-local"
                aria-describedby={descricao}
                invalido={invalido}
                value={fim}
                onChange={(e) => {
                  setFim(e.target.value);
                  setFimPassado(false);
                }}
              />
            )}
          </Field>
          <Field rotulo="Motivo (opcional)" className="sm:col-span-2" ajuda="Por exemplo, férias ou baixa. O colega e o admin vêem-no.">
            {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Revogar({ d }: { d: Delegacao }) {
  const [aberto, setAberto] = useState(false);
  const revogar = useRevogarDelegacao();
  const de = d.delegatorName ?? "colaborador";
  const em = d.delegateName ?? "colaborador";
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Revogar a delegação de ${de} em ${em}`}>
        <UserRoundX strokeWidth={1.75} aria-hidden />
        Revogar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) revogar.reset();
        }}
        titulo="Revogar a delegação?"
        descricao={`${em} deixa de decidir em nome de ${de}. As decisões já tomadas ficam.`}
        rotuloConfirmar="Revogar"
        variante="destructive"
        aCarregar={revogar.isPending}
        erro={revogar.error ? <ErrorPanel erro={revogar.error} /> : undefined}
        aoConfirmar={() => revogar.mutate(d.delegationId, { onSuccess: () => setAberto(false) })}
      />
    </>
  );
}

export default function Delegacoes() {
  const { pode } = useUtilizador();
  const eu = useEuColaborador();
  const nome = useNomeColaborador();
  const admin = pode("approval.policies.write");
  const delegacoes = useDelegacoes(admin);
  const paraMim = pode("approval.requests.decide") && eu !== null;
  const colunas: Coluna<Delegacao>[] = [
    { id: "delegante", cabecalho: "Delega", celula: (d) => <span className="font-medium">{nome(d.delegatorEmployeeId, d.delegatorName)}</span> },
    { id: "delegado", cabecalho: "Em", celula: (d) => nome(d.delegateEmployeeId, d.delegateName) },
    {
      id: "periodo",
      cabecalho: "Período",
      esconderAte: "sm",
      celula: (d) => (
        <span className="tabular-nums">
          {formatarDataHora(d.startsAt)} – {formatarDataHora(d.endsAt)}
        </span>
      ),
    },
    { id: "motivo", cabecalho: "Motivo", esconderAte: "lg", celula: (d) => d.reason ?? "—" },
    { id: "estado", cabecalho: "Estado", celula: (d) => (d.active ? <Badge tom="sucesso">Em vigor</Badge> : <Badge tom="info">Por começar</Badge>) },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (d) => (admin || d.delegatorEmployeeId === eu || d.delegateEmployeeId === eu ? <Revogar d={d} /> : null),
    },
  ];
  return (
    <>
      <PageHeader
        titulo="Aprovações"
        descricao="Pedidos que passam por decisão: atribuições de cargo, férias, pagamentos, compras, salários."
        accao={paraMim || admin ? <Delegar escolheDelegante={admin} eu={eu} /> : undefined}
      />
      <VistasAprovacoes actual="delegacoes" />
      <p className="mb-4 max-w-prose text-sm text-muted-foreground">
        {admin
          ? "Todas as delegações em vigor ou por começar. Quem delega pode ser escolhido por quem administra as políticas."
          : "As suas delegações em vigor ou por começar: as que fez e as que lhe fizeram. Quem lhe delegou aparece na sua caixa, e decide em nome dele."}
      </p>
      {!paraMim && !admin && eu === null ? (
        <Alert tom="info" className="mb-4" titulo="A sua conta não está ligada a uma ficha de colaborador.">
          Só um colaborador delega ou recebe delegações.
        </Alert>
      ) : null}
      <Tabela
        rotulo="Delegações"
        colunas={colunas}
        linhas={delegacoes.data}
        chave={(d) => d.delegationId}
        aCarregar={delegacoes.isPending}
        erro={delegacoes.error ? <ErrorPanel erro={delegacoes.error} tentarDeNovo={() => void delegacoes.refetch()} /> : undefined}
        vazio="Não há delegações em vigor nem por começar."
      />
    </>
  );
}

