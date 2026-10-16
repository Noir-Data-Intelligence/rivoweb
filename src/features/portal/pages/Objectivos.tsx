/**
 * Portal › Objectivos e conquistas. O próprio regista o valor actual dos seus
 * resultados-chave enquanto o ciclo não fecha (`ManageTalent.cs`); depois são
 * só de leitura.
 */
import { Award } from "lucide-react";
import { useId, useState } from "react";
import { EstadoCiclo } from "@/features/rh";
import { formatarDataDeInstante } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useMeusObjectivos, useMinhasConquistas, useRegistarProgresso, type Objectivo, type ResultadoChave } from "../api";
import { BarraProgresso } from "../comum";
import { lerValorResultado } from "../regras";

/** Até 4 casas, sem zeros à direita: «12», «12,5», «0,125». */
function numero(v: number | string): string {
  const s = String(v);
  const casas = Math.min(4, s.split(".")[1]?.replace(/0+$/, "").length ?? 0);
  return formatarNumeroDecimal(s, casas);
}
const comUnidade = (v: number | string, unidade: string | null) => (unidade ? `${numero(v)} ${unidade}` : numero(v));

function RegistarValor({ k }: { k: ResultadoChave }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarProgresso();
  const idForm = useId();
  const valor = lerValorResultado(texto);
  const erro = texto.trim() === "" ? "Indique o valor actual." : valor === null ? "Número inválido (até 4 casas decimais)." : undefined;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      registar.reset();
      setTentou(false);
    } else setTexto(numero(k.currentValue));
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => mudar(true)} aria-label={`Registar o valor de ${k.title}`}>
        Registar valor
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={k.title}
        descricao={`De ${comUnidade(k.startValue, k.unit)} a ${comUnidade(k.targetValue, k.unit)}.`}
        rotuloConfirmar="Registar"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erro || valor === null || registar.isPending) return;
            registar.mutate({ keyResultId: k.keyResultId, currentValue: valor }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo={k.unit ? `Valor actual (${k.unit})` : "Valor actual"} erro={tentou ? erro : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function CartaoObjectivo({ o }: { o: Objectivo }) {
  const aberto = o.cycleStatus !== "Closed";
  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground">{o.title}</h3>
          <p className="text-sm text-muted-foreground">
            {o.cycleName} · peso {numero(o.weight)}
          </p>
        </div>
        <EstadoCiclo estado={o.cycleStatus} />
      </div>
      {o.description ? <p className="mb-3 whitespace-pre-line text-sm text-muted-foreground">{o.description}</p> : null}
      <BarraProgresso valor={o.progress} rotulo={`Progresso de ${o.title}`} />
      {o.keyResults.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-border border-t border-border">
          {o.keyResults.map((k) => (
            <li key={k.keyResultId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{k.title}</p>
                <p className="text-xs text-muted-foreground">
                  {comUnidade(k.currentValue, k.unit)} de {comUnidade(k.targetValue, k.unit)} (partida {comUnidade(k.startValue, k.unit)})
                </p>
              </div>
              <div className="sm:w-48">
                <BarraProgresso valor={k.progress} rotulo={`Progresso de ${k.title}`} />
              </div>
              {aberto ? <RegistarValor k={k} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export default function Objectivos() {
  const objectivos = useMeusObjectivos();
  const conquistas = useMinhasConquistas();
  return (
    <>
      <PageHeader titulo="Objectivos e conquistas" descricao="Os seus objectivos e resultados-chave, e o reconhecimento que recebeu." />
      {objectivos.isPending ? (
        <Skeleton className="h-48" />
      ) : objectivos.error ? (
        <ErrorPanel erro={objectivos.error} tentarDeNovo={() => void objectivos.refetch()} />
      ) : objectivos.data.length === 0 ? (
        <Alert tom="info" titulo="Ainda não tem objectivos definidos." />
      ) : (
        <div className="flex flex-col gap-4">
          {objectivos.data.map((o) => (
            <CartaoObjectivo key={o.objectiveId} o={o} />
          ))}
        </div>
      )}
      <h2 className="mb-3 mt-8 text-md font-semibold text-foreground">Conquistas</h2>
      {conquistas.isPending ? (
        <Skeleton className="h-20" />
      ) : conquistas.error ? (
        <ErrorPanel erro={conquistas.error} tentarDeNovo={() => void conquistas.refetch()} />
      ) : conquistas.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não recebeu conquistas.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {conquistas.data.length} {conquistas.data.length === 1 ? "conquista" : "conquistas"}, {numero(conquistas.data.reduce((a, c) => a + Number(c.points), 0))} pontos.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {conquistas.data.map((c) => (
              <li key={`${c.achievementId}-${c.awardedAt}`}>
                <Card className="flex gap-3">
                  <Award className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {numero(c.points)} pontos · {formatarDataDeInstante(c.awardedAt)}
                    </p>
                    {c.note ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">«{c.note}»</p> : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
