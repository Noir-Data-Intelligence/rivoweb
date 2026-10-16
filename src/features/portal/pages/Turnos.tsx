/** Portal › Turnos: a escala do próprio, pedir para sair de um turno e acompanhar os pedidos. */
import { useId, useState } from "react";
import { usePortalColaborador, useUtilizador } from "@/features/identity";
import { EstadoTroca, useTodosColaboradores } from "@/features/rh";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useCancelarTroca, useMeusTurnos, useMinhasTrocas, usePedirTroca, type TrocaTurno, type Turno } from "../api";
import { FiltroJanela, useJanelaUrl } from "../comum";
import { erroJanelaTurnos, somarDias } from "../regras";

const MAXIMO_MOTIVO = 1000;
const hora = (h: string) => h.slice(0, 5);

function PedirTroca({ t }: { t: Turno }) {
  const { pode } = useUtilizador();
  const proprio = usePortalColaborador();
  const leColegas = pode("hr.employees.read");
  const colegas = useTodosColaboradores(leColegas);
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [colega, setColega] = useState("");
  const [tentou, setTentou] = useState(false);
  const pedir = usePedirTroca();
  const idForm = useId();
  const m = normalizarTexto(motivo, true);
  const erro = m === "" ? "Indique o motivo." : m.length > MAXIMO_MOTIVO ? `No máximo ${MAXIMO_MOTIVO} caracteres.` : undefined;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      pedir.reset();
      setTentou(false);
      setMotivo("");
      setColega("");
    }
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Pedir troca do turno de ${formatarData(t.day)}`}>
        Pedir troca
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Sair do turno de ${formatarData(t.day)}`}
        descricao={`${t.shiftName} (${hora(t.startsAt)}–${hora(t.endsAt)}). Os Recursos Humanos decidem.`}
        rotuloConfirmar="Enviar pedido"
        aCarregar={pedir.isPending}
        erro={pedir.error ? <ErrorPanel erro={pedir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erro || pedir.isPending) return;
            pedir.mutate({ assignmentId: t.assignmentId, reason: m, proposedEmployeeId: colega === "" ? null : colega }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Motivo" erro={tentou ? erro : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_MOTIVO} aria-describedby={descricao} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          </Field>
          {leColegas ? (
            <Field rotulo="Colega que fica com o turno (opcional)">
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={colega} onChange={(e) => setColega(e.target.value)}>
                  <option value="">Nenhum proposto</option>
                  {(colegas.data?.items ?? [])
                    .filter((c) => c.status === "Active" && c.employeeId !== proprio.data?.employeeId)
                    .map((c) => (
                      <option key={c.employeeId} value={c.employeeId}>
                        {c.fullName}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">Se já combinou com um colega, diga quem no motivo.</p>
          )}
        </form>
      </Confirmar>
    </>
  );
}

function CancelarTroca({ p }: { p: TrocaTurno }) {
  const [aberto, setAberto] = useState(false);
  const cancelar = useCancelarTroca();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Cancelar o pedido de troca de ${formatarData(p.day)}`}>
        Cancelar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) cancelar.reset();
        }}
        titulo="Cancelar este pedido de troca?"
        descricao={`Continua escalado no turno de ${formatarData(p.day)}.`}
        rotuloConfirmar="Cancelar pedido"
        variante="destructive"
        aCarregar={cancelar.isPending}
        erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
        aoConfirmar={() => (cancelar.isPending ? undefined : cancelar.mutate(p.requestId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export default function Turnos() {
  const hoje = hojeIso();
  const { de, ate, mudar } = useJanelaUrl({ de: hoje, ate: somarDias(hoje, 30) });
  const erroJanela = erroJanelaTurnos(de, ate);
  const turnos = useMeusTurnos(erroJanela ? null : de, erroJanela ? null : ate);
  const trocas = useMinhasTrocas();
  const pendentes = new Set((trocas.data ?? []).filter((p) => p.status === "Pending").map((p) => p.assignmentId));
  const colunas: Coluna<Turno>[] = [
    { id: "dia", cabecalho: "Dia", celula: (t) => <span className="font-medium">{formatarData(t.day)}</span> },
    {
      id: "turno",
      cabecalho: "Turno",
      celula: (t) => (
        <div className="flex flex-col">
          <span>
            {t.shiftName} <span className="text-muted-foreground">({t.shiftCode})</span>
          </span>
          {t.notes ? <span className="text-sm text-muted-foreground">{t.notes}</span> : null}
        </div>
      ),
    },
    { id: "horario", cabecalho: "Horário", celula: (t) => `${hora(t.startsAt)}–${hora(t.endsAt)}` },
    {
      id: "accao",
      cabecalho: "",
      alinhar: "direita",
      celula: (t) => (pendentes.has(t.assignmentId) ? <span className="text-sm text-muted-foreground">Troca pedida</span> : t.day >= hoje ? <PedirTroca t={t} /> : null),
    },
  ];
  const colunasTrocas: Coluna<TrocaTurno>[] = [
    { id: "dia", cabecalho: "Turno de", celula: (p) => <span className="font-medium">{formatarData(p.day)}</span> },
    {
      id: "motivo",
      cabecalho: "Motivo",
      celula: (p) => (
        <div className="flex min-w-0 flex-col">
          <span className="whitespace-pre-line">{p.reason}</span>
          {p.decisionNotes ? <span className="whitespace-pre-line text-sm text-muted-foreground">Decisão: «{p.decisionNotes}»</span> : null}
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { id: "pedido", cabecalho: "Pedido em", esconderAte: "md", celula: (p) => formatarDataHora(p.requestedAt) },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoTroca estado={p.status} /> },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (p) => (p.status === "Pending" ? <CancelarTroca p={p} /> : null) },
  ];
  return (
    <>
      <PageHeader titulo="Turnos" descricao="A sua escala. Por omissão, os próximos 30 dias." />
      <FiltroJanela de={de} ate={ate} mudar={mudar} erro={erroJanela} />
      {erroJanela ? null : (
        <Tabela
          rotulo="Turnos"
          colunas={colunas}
          linhas={turnos.data}
          chave={(t) => t.assignmentId}
          aCarregar={turnos.isPending}
          erro={turnos.error ? <ErrorPanel erro={turnos.error} tentarDeNovo={() => void turnos.refetch()} /> : undefined}
          vazio="Sem turnos neste período."
        />
      )}
      <h2 className="mb-3 mt-8 text-md font-semibold text-foreground">Pedidos de troca</h2>
      <Tabela
        rotulo="Pedidos de troca"
        colunas={colunasTrocas}
        linhas={trocas.data}
        chave={(p) => p.requestId}
        aCarregar={trocas.isPending}
        erro={trocas.error ? <ErrorPanel erro={trocas.error} tentarDeNovo={() => void trocas.refetch()} /> : undefined}
        vazio="Ainda não pediu trocas de turno."
      />
    </>
  );
}
