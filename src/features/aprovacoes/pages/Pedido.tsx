/**
 * Ficha de um pedido de aprovação: estado, passos, decisões e, para quem está
 * no passo em curso, decidir. 403 de segregação mostra o motivo do servidor;
 * 409 diz que outra pessoa decidiu primeiro e recarrega.
 */
import { ArrowLeft, Check, CircleQuestionMark, X } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { useUtilizador } from "@/features/identity";
import { eApiError } from "@/lib/api/problem";
import { formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { dinheiro } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { useCancelar, useDecidir, useHistorico, usePedido, type Accao, type Pedido } from "../api";
import { EstadoPedido, NOME_ACCAO, NOME_MODO, nomeModulo, nomeProcesso, useEuColaborador, useNomeColaborador } from "../comum";

const ACCOES: readonly { accao: Accao; rotulo: string; titulo: string; icone: typeof Check; variante: "primary" | "destructive" | "secondary"; notasObrigatorias: boolean }[] = [
  { accao: "Approved", rotulo: "Aprovar", titulo: "Aprovar o pedido?", icone: Check, variante: "primary", notasObrigatorias: false },
  { accao: "Rejected", rotulo: "Rejeitar", titulo: "Rejeitar o pedido?", icone: X, variante: "destructive", notasObrigatorias: true },
  { accao: "ClarificationRequested", rotulo: "Pedir esclarecimento", titulo: "Pedir esclarecimento?", icone: CircleQuestionMark, variante: "secondary", notasObrigatorias: true },
];

function Decidir({ p, aoDecidir, aoConflito }: { p: Pedido; aoDecidir: () => void; aoConflito: (detalhe: string | null) => void }) {
  const { pode } = useUtilizador();
  const decidir = useDecidir(pode("hr.positions.assign"));
  const [aberta, setAberta] = useState<(typeof ACCOES)[number] | null>(null);
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const id = useId();
  const outro = eApiError(decidir.error) && decidir.error.status === 409;
  const fechar = () => {
    setAberta(null);
    setNotas("");
    setTentou(false);
    decidir.reset();
  };
  const confirmar = () => {
    if (!aberta) return;
    setTentou(true);
    const n = normalizarTexto(notas, true);
    if (aberta.notasObrigatorias && n === "") return;
    decidir.mutate(
      { requestId: p.requestId, action: aberta.accao, notes: n || null },
      {
        onSuccess: () => {
          fechar();
          aoDecidir();
        },
        onError: (e) => {
          // A ficha recarrega com o estado actual; se o pedido fechou, este
          // cartão desaparece — por isso o aviso sobe para a página.
          if (eApiError(e) && e.status === 409) {
            aoConflito(e.detail);
            fechar();
            aoDecidir();
          }
        },
      },
    );
  };
  return (
    <Card>
      <CardTitle>A sua decisão</CardTitle>
      <p className="mt-1 text-sm text-muted-foreground">Está atribuído ao passo em curso. A decisão fica na trilha e não se desfaz.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {ACCOES.map((a) => (
          <Button key={a.accao} variante={a.variante} onClick={() => setAberta(a)}>
            <a.icone strokeWidth={1.75} aria-hidden />
            {a.rotulo}
          </Button>
        ))}
      </div>
      <Confirmar
        aberto={aberta !== null}
        aoMudar={(v) => (v ? undefined : fechar())}
        titulo={aberta?.titulo ?? ""}
        descricao={`${nomeProcesso(p.processType)} · passo ${String(p.currentStep)} de ${String(p.totalSteps)}.`}
        rotuloConfirmar={aberta?.rotulo ?? ""}
        variante={aberta?.variante === "destructive" ? "destructive" : "primary"}
        aCarregar={decidir.isPending}
        erro={
          outro ? (
            <Alert tom="aviso" titulo="Outra pessoa decidiu primeiro.">
              {(eApiError(decidir.error) ? decidir.error.detail : null) ?? "O pedido foi actualizado: reveja o estado antes de decidir."}
            </Alert>
          ) : decidir.error ? (
            <ErrorPanel erro={decidir.error} />
          ) : undefined
        }
        aoConfirmar={confirmar}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Notas{aberta?.notasObrigatorias ? "" : " (opcional)"}
          </label>
          <Textarea id={id} maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)} aria-invalid={tentou && aberta?.notasObrigatorias && !normalizarTexto(notas) ? true : undefined} />
          {tentou && aberta?.notasObrigatorias && !normalizarTexto(notas) ? (
            <p className="text-xs text-danger" role="alert">
              Explique o motivo: quem submeteu vai lê-lo.
            </p>
          ) : null}
        </div>
      </Confirmar>
    </Card>
  );
}

function Cancelar({ p, aoCancelar }: { p: Pedido; aoCancelar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const cancelar = useCancelar();
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        Cancelar o pedido
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) cancelar.reset();
        }}
        titulo="Cancelar o seu pedido?"
        descricao="O pedido fecha sem decisão e fica no registo."
        rotuloConfirmar="Cancelar pedido"
        variante="destructive"
        aCarregar={cancelar.isPending}
        erro={cancelar.error ? <ErrorPanel erro={cancelar.error} /> : undefined}
        aoConfirmar={() =>
          cancelar.mutate(p.requestId, {
            onSuccess: () => {
              setAberto(false);
              aoCancelar();
            },
          })
        }
      />
    </>
  );
}

export default function PedidoPagina() {
  const { requestId = "" } = useParams();
  const pedido = usePedido(requestId);
  const historico = useHistorico(requestId);
  const { pode } = useUtilizador();
  const eu = useEuColaborador();
  const nome = useNomeColaborador();
  const [conflito, setConflito] = useState<{ detalhe: string | null } | null>(null);
  const recarregar = () => {
    void pedido.refetch();
    void historico.refetch();
  };
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/aprovacoes">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Aprovações
      </Link>
    </Button>
  );
  if (pedido.isPending) return <CarregandoPagina />;
  if (pedido.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={pedido.error} tentarDeNovo={() => void pedido.refetch()} />
      </>
    );
  }
  const p = pedido.data;
  const aberto = p.status === "InProgress" || p.status === "ClarificationRequested";
  const souAprovador = eu !== null && p.pendingApprovers.includes(eu);
  const souRequerente = eu !== null && p.requestedByEmployeeId === eu;
  const h = historico.data;
  return (
    <>
      {voltar}
      <PageHeader
        titulo={nomeProcesso(p.processType)}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoPedido estado={p.status} />
            <span>
              De {nome(p.requestedByEmployeeId)} · {formatarDataHora(p.submittedAt)}
            </span>
          </span>
        }
        accao={aberto && souRequerente ? <Cancelar p={p} aoCancelar={recarregar} /> : undefined}
      />
      {conflito ? (
        <Alert tom="aviso" className="mb-6" titulo="Outra pessoa decidiu primeiro." accao={<Button variante="ghost" tamanho="sm" onClick={() => setConflito(null)}>Fechar</Button>}>
          {conflito.detalhe ?? "O pedido foi actualizado."} O estado abaixo já é o actual.
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Quem pediu nunca decide (BR-2), mesmo ocupando o cargo aprovador. */}
          {aberto && souAprovador && !souRequerente && pode("approval.requests.decide") ? <Decidir p={p} aoDecidir={recarregar} aoConflito={(detalhe) => setConflito({ detalhe })} /> : null}
          {aberto && souRequerente ? (
            <Alert tom="info" titulo="É o seu pedido.">
              Quem submete não decide (BR-2). Pode cancelá-lo enquanto estiver aberto.
            </Alert>
          ) : null}
          <Card>
            <CardTitle>Passos</CardTitle>
            {historico.isPending ? (
              <Skeleton className="mt-3 h-16" />
            ) : historico.error ? (
              <ErrorPanel erro={historico.error} tentarDeNovo={() => void historico.refetch()} className="mt-3" />
            ) : (
              <ol className="mt-3 flex flex-col gap-3">
                {Array.from({ length: Number(h?.totalSteps ?? p.totalSteps) }, (_, i) => i + 1).map((passo) => {
                  const atribuicoes = (h?.assignments ?? []).filter((a) => Number(a.step) === passo);
                  const decisoes = (h?.decisions ?? []).filter((d) => Number(d.step) === passo);
                  const actual = aberto && Number(p.currentStep) === passo;
                  return (
                    <li key={passo} className={`rounded-md border p-3 ${actual ? "border-primary" : "border-border"}`}>
                      <p className="text-sm font-medium text-foreground">
                        Passo {passo}
                        {actual ? " · em curso" : ""}
                        {atribuicoes[0] ? <span className="font-normal text-muted-foreground"> · {NOME_MODO[atribuicoes[0].mode] ?? atribuicoes[0].mode}</span> : null}
                        {atribuicoes[0]?.slaHours ? <span className="font-normal text-muted-foreground"> · prazo {String(atribuicoes[0].slaHours)} h</span> : null}
                      </p>
                      {atribuicoes.length > 0 ? <p className="mt-1 text-sm text-muted-foreground">Aprovadores: {atribuicoes.map((a) => nome(a.approverEmployeeId)).join(", ")}</p> : null}
                      {decisoes.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-1 text-sm">
                          {decisoes.map((d) => (
                            <li key={`${d.decidedByEmployeeId}-${d.decidedAt}`}>
                              <span className="font-medium">{nome(d.decidedByEmployeeId)}</span> {(NOME_ACCAO[d.action] ?? d.action).toLowerCase()} · {formatarDataHora(d.decidedAt)}
                              {d.notes ? <span className="block whitespace-pre-line text-muted-foreground">«{d.notes}»</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
        <Card>
          <CardTitle>Detalhes</CardTitle>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Módulo</dt>
              <dd className="text-foreground">{nomeModulo(p.sourceModule)}</dd>
            </div>
            {h?.amount !== null && h?.amount !== undefined ? (
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="tabular-nums text-foreground">{formatarMoeda(dinheiro(h.amount), h.currency ?? "AOA")}</dd>
              </div>
            ) : null}
            {h?.closedAt ? (
              <div>
                <dt className="text-muted-foreground">Fechado</dt>
                <dd className="text-foreground">{formatarDataHora(h.closedAt)}</dd>
              </div>
            ) : null}
            {p.processType === "hr.position_assignment" && pode("hr.employees.read") ? (
              <div>
                <dt className="text-muted-foreground">Colaborador</dt>
                <dd>
                  <Link to={`/colaboradores/${p.requestedByEmployeeId}`} className="underline-offset-4 hover:underline">
                    Ver a ficha
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>
    </>
  );
}
