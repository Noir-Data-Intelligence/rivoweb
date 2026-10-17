/**
 * Uma vaga e o seu funil: registar candidatos (só com a vaga aberta), avançar
 * um passo de cada vez, rejeitar em qualquer etapa e contratar da proposta.
 * Contratar cria o colaborador (sem conta) e oferece iniciar a entrada.
 */
import { ArrowLeft, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useTodosDepartamentos } from "../api";
import { useAvancarCandidato, useCandidatos, useContratarCandidato, useFecharVaga, useRegistarCandidato, useTodasVagas, type Candidato, type Vaga as TipoVaga } from "../ciclo";
import { ETAPA_CANDIDATO, EstadoCandidato, EstadoVaga, nome } from "../estados";
import { errosCandidato, proximaEtapa } from "../regras";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{rotulo}</dt>
      <dd className="whitespace-pre-line break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

function RegistarCandidato({ v }: { v: TipoVaga }) {
  const [aberto, setAberto] = useState(false);
  const [nomeC, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarCandidato(v.openingId);
  const idForm = useId();
  const erros = errosCandidato({ nome: nomeC, email, telefone, data });
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      registar.reset();
      setTentou(false);
      setNome("");
      setEmail("");
      setTelefone("");
      setData(hojeIso());
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar candidato
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Registar um candidato"
        descricao={`Entra no funil de «${v.title}» na etapa Candidatura. Um candidato não é colaborador até ser contratado.`}
        rotuloConfirmar="Registar"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || registar.isPending) return;
            const m = email.trim();
            const t = normalizarTexto(telefone);
            registar.mutate({ fullName: normalizarTexto(nomeC), email: m === "" ? null : m, phone: t === "" ? null : t, appliedOn: data === "" ? null : data }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Nome completo" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nomeC} onChange={(e) => setNome(e.target.value)} />}
          </Field>
          <Field rotulo="E-mail (opcional)" erro={tentou ? erros.email : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="email" maxLength={320} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <Field rotulo="Telefone (opcional)" erro={tentou ? erros.telefone : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="tel" maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={telefone} onChange={(e) => setTelefone(e.target.value)} />}
          </Field>
          <Field rotulo="Data da candidatura" erro={tentou ? erros.data : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Avancar({ c, para }: { c: Candidato; para: string }) {
  const [aberto, setAberto] = useState(false);
  const avancar = useAvancarCandidato();
  const rejeitar = para === "Rejected";
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={rejeitar ? `Rejeitar ${c.fullName}` : `Passar ${c.fullName} a ${nome(ETAPA_CANDIDATO, para)}`}>
        {rejeitar ? "Rejeitar" : `Passar a ${nome(ETAPA_CANDIDATO, para)}`}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) avancar.reset();
        }}
        titulo={rejeitar ? `Rejeitar ${c.fullName}?` : `Passar ${c.fullName} a ${nome(ETAPA_CANDIDATO, para)}?`}
        descricao={rejeitar ? "Sai do funil. Não se desfaz." : "O funil só avança: não se volta à etapa anterior."}
        rotuloConfirmar={rejeitar ? "Rejeitar" : "Avançar"}
        variante={rejeitar ? "destructive" : "primary"}
        aCarregar={avancar.isPending}
        erro={avancar.error ? <ErrorPanel erro={avancar.error} /> : undefined}
        aoConfirmar={() => (avancar.isPending ? undefined : avancar.mutate({ candidateId: c.candidateId, stage: para }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Contratar({ c, v }: { c: Candidato; v: TipoVaga }) {
  const [aberto, setAberto] = useState(false);
  const [departamento, setDepartamento] = useState(v.departmentId ?? "");
  const contratar = useContratarCandidato();
  const departamentos = useTodosDepartamentos(aberto);
  const idDep = useId();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Contratar ${c.fullName}`}>
        Contratar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) contratar.reset();
        }}
        titulo={`Contratar ${c.fullName}?`}
        descricao="Cria a ficha de colaborador com este nome, sem conta de acesso. Não se desfaz. Depois, a linha do candidato leva à ficha e à entrada."
        rotuloConfirmar="Contratar"
        aCarregar={contratar.isPending}
        erro={contratar.error ? <ErrorPanel erro={contratar.error} /> : undefined}
        aoConfirmar={() =>
          contratar.isPending ? undefined : contratar.mutate({ candidateId: c.candidateId, departmentId: departamento === "" ? null : departamento }, { onSuccess: () => setAberto(false) })
        }
      >
        <div className="flex flex-col gap-1.5">
            <label htmlFor={idDep} className="text-sm font-medium text-foreground">
              Departamento
            </label>
            <Select id={idDep} value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
              <option value="">Nenhum</option>
              {(departamentos.data?.items ?? []).map((x) => (
                <option key={x.departmentId} value={x.departmentId}>
                  {x.name}
                </option>
              ))}
            </Select>
        </div>
      </Confirmar>
    </>
  );
}

function Fechar({ v }: { v: TipoVaga }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useFecharVaga();
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        Fechar vaga
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) fechar.reset();
        }}
        titulo="Fechar esta vaga?"
        descricao="Deixa de aceitar candidaturas. Quem já está no funil continua e pode ser contratado. Não se reabre."
        rotuloConfirmar="Fechar vaga"
        variante="destructive"
        aCarregar={fechar.isPending}
        erro={fechar.error ? <ErrorPanel erro={fechar.error} /> : undefined}
        aoConfirmar={() => (fechar.isPending ? undefined : fechar.mutate(v.openingId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function Accoes({ c, v }: { c: Candidato; v: TipoVaga }) {
  const { pode } = useUtilizador();
  if (c.stage === "Hired" && c.hiredEmployeeId) {
    return (
      <div className="flex flex-wrap justify-end gap-1">
        <Button asChild variante="ghost" tamanho="sm">
          <Link to={`/colaboradores/${c.hiredEmployeeId}`} aria-label={`Abrir a ficha de ${c.fullName}`}>
            Abrir a ficha
          </Link>
        </Button>
        {pode("hr.lifecycle.write") ? (
          <Button asChild variante="ghost" tamanho="sm">
            <Link to={`/entradas-saidas?iniciar=${c.hiredEmployeeId}`} aria-label={`Iniciar a entrada de ${c.fullName}`}>
              Iniciar a entrada
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }
  if (!pode("hr.recruitment.write") || c.stage === "Hired" || c.stage === "Rejected") return null;
  const seguinte = proximaEtapa(c.stage);
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {seguinte ? <Avancar c={c} para={seguinte} /> : null}
      {c.stage === "Offer" && pode("hr.employees.write") ? <Contratar c={c} v={v} /> : null}
      <Avancar c={c} para="Rejected" />
    </div>
  );
}

function Candidatos({ v }: { v: TipoVaga }) {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useCandidatos({ vaga: v.openingId, pagina, tamanho });
  const colunas: Coluna<Candidato>[] = [
    {
      id: "nome",
      cabecalho: "Candidato",
      celula: (c) => (
        <div className="flex min-w-0 flex-col">
          {c.hiredEmployeeId ? (
            <Link to={`/colaboradores/${c.hiredEmployeeId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
              {c.fullName}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{c.fullName}</span>
          )}
          {c.email || c.phone ? <span className="truncate text-sm text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ")}</span> : null}
        </div>
      ),
      className: "max-w-[18rem]",
    },
    { id: "data", cabecalho: "Candidatura", esconderAte: "sm", celula: (c) => formatarData(c.appliedOn) },
    { id: "etapa", cabecalho: "Etapa", celula: (c) => <EstadoCandidato estado={c.stage} /> },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (c) => <Accoes c={c} v={v} /> },
  ];
  return (
    <Tabela
      rotulo="Candidatos"
      colunas={colunas}
      linhas={lista.data?.items}
      chave={(c) => c.candidateId}
      aCarregar={lista.isPending}
      erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
      vazio="Ainda não há candidatos."
      rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
    />
  );
}

export default function Vaga() {
  const { openingId = "" } = useParams();
  const vagas = useTodasVagas();
  const departamentos = useTodosDepartamentos();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/recrutamento">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Recrutamento
      </Link>
    </Button>
  );
  if (vagas.isPending) return <CarregandoPagina />;
  if (vagas.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={vagas.error} tentarDeNovo={() => void vagas.refetch()} />
      </>
    );
  }
  const v = vagas.data.items.find((x) => x.openingId === openingId);
  if (!v) {
    return (
      <>
        {voltar}
        <Alert tom="aviso" titulo="Vaga não encontrada." />
      </>
    );
  }
  const aberta = v.status === "Open";
  const dep = v.departmentId ? (departamentos.data?.items.find((d) => d.departmentId === v.departmentId)?.name ?? "—") : "—";
  return (
    <>
      {voltar}
      <PageHeader
        titulo={v.title}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoVaga estado={v.status} />
            <span>
              {String(v.vacancies)} {Number(v.vacancies) === 1 ? "vaga" : "vagas"} · {dep}
            </span>
          </span>
        }
        accao={
          aberta ? (
            <Can requer="hr.recruitment.write">
              <div className="flex flex-wrap gap-2">
                <Fechar v={v} />
                <RegistarCandidato v={v} />
              </div>
            </Can>
          ) : undefined
        }
      />
      {v.description || v.requirements ? (
        <Card className="mb-6">
          <CardTitle>A vaga</CardTitle>
          <dl className="mt-3 flex flex-col gap-2">
            {v.description ? <Linha rotulo="Descrição">{v.description}</Linha> : null}
            {v.requirements ? <Linha rotulo="Requisitos">{v.requirements}</Linha> : null}
          </dl>
        </Card>
      ) : null}
      {!aberta ? (
        <Alert tom="info" className="mb-4" titulo="Vaga fechada: não aceita candidaturas novas.">
          Quem já está no funil continua e pode ser contratado.
        </Alert>
      ) : null}
      <h2 className="mb-3 text-md font-semibold text-foreground">Candidatos</h2>
      <Candidatos v={v} />
    </>
  );
}
