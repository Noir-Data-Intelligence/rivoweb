/** Iniciativas ESG: planear, corrigir (progresso), concluir e cancelar. */
import { useId, useState } from "react";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { formatarData } from "@/lib/format/data";
import { BarraProgresso } from "@/ui/BarraProgresso";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAcaoEsg, useEscolhasEsg, useIndicadores, useIniciativas, type Iniciativa } from "./api";
import { EstadoIniciativa, iniciativaEncerrada, pilarDe, PILARES } from "./comum";
import { nomeIndicador } from "./Indicadores";
import { errosIniciativa, iniciativaParaApi, temErros, type CamposIniciativa, type Pilar } from "./regras";

const camposDe = (x?: Iniciativa): CamposIniciativa => ({
  titulo: x?.title ?? "",
  pilar: (x?.pillar as Pilar | undefined) ?? "Environmental",
  descricao: x?.description ?? "",
  indicador: x?.indicatorId ?? "",
  responsavel: x?.ownerEmployeeId ?? "",
  inicio: x?.startsOn ?? "",
  fim: x?.endsOn ?? "",
  orcamento: x?.budget === null || x?.budget === undefined ? "" : String(x.budget).replace(".", ","),
  moeda: x?.currency ?? "AOA",
  progresso: String(x?.progress ?? 0),
});

/** O nome vem na vista (B41); sem nome, o colaborador já não existe. */
const nomeResponsavel = (x: Iniciativa) => (x.ownerEmployeeId ? (x.ownerName ?? "—") : "Ninguém");

/** Planear (sem `x`) ou corrigir (com `x`) uma iniciativa. */
function EditarIniciativa({ x }: { x?: Iniciativa }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposIniciativa>(() => camposDe(x));
  const [tentou, setTentou] = useState(false);
  const accao = useAcaoEsg();
  const indicadores = useIndicadores(true);
  const escolhas = useEscolhasEsg(aberto).data?.employees ?? [];
  // Um responsável que já não está activo continua escolhido até se mudar.
  const pessoas = x?.ownerEmployeeId && !escolhas.some((c) => c.id === x.ownerEmployeeId) ? [{ id: x.ownerEmployeeId, name: nomeResponsavel(x) }, ...escolhas] : escolhas;
  const idForm = useId();
  const erros = errosIniciativa(v);
  const campo = <K extends keyof CamposIniciativa>(k: K, y: CamposIniciativa[K]) => setV((z) => ({ ...z, [k]: y }));
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV(camposDe(x));
      setTentou(false);
      accao.reset();
    }
  };
  return (
    <>
      {x ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir a iniciativa ${x.title}`}>
          Corrigir
        </Button>
      ) : (
        <Button tamanho="sm" onClick={() => setAberto(true)}>
          Nova iniciativa
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        largo
        titulo={x ? `Corrigir «${x.title}»` : "Nova iniciativa"}
        descricao="Com progresso acima de 0, passa a «em curso»."
        rotuloConfirmar={x ? "Guardar" : "Planear"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
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
            const corpo = iniciativaParaApi(v);
            if (x) accao.mutate({ acto: "corrigirIniciativa", iniciativa: x.initiativeId, corpo }, { onSuccess: () => setAberto(false) });
            else accao.mutate({ acto: "iniciativa", corpo }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Título" erro={tentou ? erros.titulo : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => campo("titulo", e.target.value)} />}
          </Field>
          <Field rotulo="Pilar">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.pilar} onChange={(e) => campo("pilar", e.target.value as Pilar)}>
                {Object.entries(PILARES).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Indicador (opcional)">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.indicador} onChange={(e) => campo("indicador", e.target.value)}>
                <option value="">Nenhum</option>
                {(indicadores.data ?? [])
                  .filter((i) => i.isActive || i.indicatorId === v.indicador)
                  .map((i) => (
                    <option key={i.indicatorId} value={i.indicatorId}>
                      {i.code} · {i.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Responsável (opcional)">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.responsavel} onChange={(e) => campo("responsavel", e.target.value)}>
                <option value="">Ninguém</option>
                {pessoas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Progresso (%)" erro={tentou ? erros.progresso : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" maxLength={3} autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.progresso} onChange={(e) => campo("progresso", e.target.value)} />}
          </Field>
          <Field rotulo="Início (opcional)">
            {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={v.inicio} onChange={(e) => campo("inicio", e.target.value)} />}
          </Field>
          <Field rotulo="Fim (opcional)" erro={tentou ? erros.fim : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" min={v.inicio || undefined} aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={(e) => campo("fim", e.target.value)} />}
          </Field>
          <Field rotulo="Orçamento (opcional)" erro={tentou ? erros.orcamento : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.orcamento} onChange={(e) => campo("orcamento", e.target.value)} />}
          </Field>
          <Field rotulo="Moeda" erro={tentou ? erros.moeda : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={3} autoComplete="off" className="uppercase" aria-describedby={descricao} invalido={invalido} value={v.moeda} onChange={(e) => campo("moeda", e.target.value)} />}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => campo("descricao", e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Encerrar({ x, concluir }: { x: Iniciativa; concluir: boolean }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoEsg();
  const verbo = concluir ? "Concluir" : "Cancelar";
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`${verbo} a iniciativa ${x.title}`}>
        {verbo}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo={`${verbo} «${x.title}»?`}
        descricao={concluir ? "Fica a 100 % e encerrada: não se altera mais." : "Fica encerrada: não se altera mais."}
        rotuloConfirmar={concluir ? "Concluir" : "Cancelar iniciativa"}
        variante={concluir ? "primary" : "destructive"}
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: concluir ? "concluir" : "cancelar", iniciativa: x.initiativeId }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export function IniciativasEsg() {
  const { pode } = useUtilizador();
  const escreve = pode("esg.esg.write");
  const lista = useIniciativas();
  const indicadores = useIndicadores(true);
  const colunas: Coluna<Iniciativa>[] = [
    {
      id: "titulo",
      cabecalho: "Iniciativa",
      className: "max-w-[18rem]",
      celula: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="break-words font-medium">{x.title}</span>
          {x.description ? <span className="line-clamp-2 whitespace-pre-line break-words text-xs text-muted-foreground">{x.description}</span> : null}
        </span>
      ),
    },
    { id: "pilar", cabecalho: "Pilar", esconderAte: "sm", celula: (x) => pilarDe(x.pillar) },
    { id: "indicador", cabecalho: "Indicador", esconderAte: "lg", className: "max-w-[12rem] truncate", celula: (x) => nomeIndicador(indicadores.data, x.indicatorId) },
    { id: "quem", cabecalho: "Responsável", esconderAte: "lg", className: "max-w-[12rem] truncate", celula: nomeResponsavel },
    { id: "periodo", cabecalho: "Período", esconderAte: "md", celula: (x) => (x.startsOn || x.endsOn ? `${x.startsOn ? formatarData(x.startsOn) : "…"} → ${x.endsOn ? formatarData(x.endsOn) : "…"}` : "—") },
    { id: "orc", cabecalho: "Orçamento", alinhar: "direita", esconderAte: "lg", celula: (x) => (x.budget === null ? "—" : moeda(x.budget, x.currency)) },
    { id: "prog", cabecalho: "Progresso", className: "min-w-[7rem]", celula: (x) => <BarraProgresso valor={Number(x.progress)} rotulo={`${x.title}: ${String(x.progress)}%`} /> },
    { id: "estado", cabecalho: "Estado", celula: (x) => <EstadoIniciativa estado={x.status} /> },
    ...(escreve
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (x: Iniciativa) =>
              iniciativaEncerrada(x.status) ? null : (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <EditarIniciativa key={`${x.initiativeId}-${String(x.progress)}-${x.title}`} x={x} />
                  <Encerrar x={x} concluir />
                  <Encerrar x={x} concluir={false} />
                </span>
              ),
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      {escreve ? (
        <div>
          <EditarIniciativa />
        </div>
      ) : null}
      <Tabela rotulo="Iniciativas" colunas={colunas} linhas={lista.data} chave={(x) => x.initiativeId} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined} vazio="Ainda não há iniciativas." />
    </div>
  );
}
