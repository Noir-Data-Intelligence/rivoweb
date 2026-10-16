/**
 * Períodos contabilísticos (§5.7): 1 a 12 são os meses, 13 a 16 os de
 * regularização. Só um período aberto aceita lançamentos. Fechar e reabrir
 * pedem `finance.ledger.close`; quem fecha é a conta autenticada.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Can, useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { nomeMes } from "@/lib/format/periodo";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ConfirmarComMotivo } from "@/ui/ConfirmarComMotivo";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAbrirPeriodo, useFecharPeriodo, usePeriodos, useReabrirPeriodo, type Periodo } from "../api";
import { EscolhaAnoPeriodo, useAnoPeriodo } from "../comum";

const nomePeriodo = (n: number) => (n <= 12 ? `${n} · ${nomeMes(n)}` : `${n} · Regularização`);

function AbrirPeriodo({ ano, existentes }: { ano: number; existentes: readonly number[] }) {
  const [aberto, setAberto] = useState(false);
  const abrir = useAbrirPeriodo();
  const livres = Array.from({ length: 16 }, (_, i) => i + 1).filter((n) => !existentes.includes(n));
  const [numero, setNumero] = useState<string>("");
  const idForm = useId();
  const escolhido = numero === "" ? livres[0] : Number(numero);
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      abrir.reset();
      setNumero("");
    }
  };
  if (livres.length === 0) return null;
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir período
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Abrir um período de ${ano}`}
        descricao="O período passa a aceitar lançamentos."
        rotuloConfirmar="Abrir período"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (escolhido === undefined || abrir.isPending) return;
            abrir.mutate({ fiscalYear: ano, number: escolhido }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Período">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={escolhido ?? ""} onChange={(e) => setNumero(e.target.value)}>
                {livres.map((n) => (
                  <option key={n} value={n}>
                    {nomePeriodo(n)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function FecharPeriodo({ periodo }: { periodo: Periodo }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useFecharPeriodo();
  const n = Number(periodo.number);
  return (
    <>
      <Button variante="secondary" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Fechar o período ${nomePeriodo(n)}`}>
        Fechar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (setAberto(a), a ? undefined : fechar.reset())}
        titulo={`Fechar ${nomePeriodo(n)} de ${periodo.fiscalYear}`}
        descricao="Depois de fechado, o período deixa de aceitar lançamentos. Reabrir exige motivo e fica registado."
        rotuloConfirmar="Fechar período"
        aCarregar={fechar.isPending}
        erro={fechar.error ? <ErrorPanel erro={fechar.error} /> : undefined}
        aoConfirmar={() => fechar.mutate({ ano: Number(periodo.fiscalYear), numero: n }, { onSuccess: () => setAberto(false) })}
      />
    </>
  );
}

function ReabrirPeriodo({ periodo }: { periodo: Periodo }) {
  const reabrir = useReabrirPeriodo();
  const n = Number(periodo.number);
  return (
    <ConfirmarComMotivo
      rotuloBotao="Reabrir"
      varianteBotao="ghost"
      titulo={`Reabrir ${nomePeriodo(n)} de ${periodo.fiscalYear}`}
      descricao="O período volta a aceitar lançamentos. O motivo fica no registo."
      rotuloConfirmar="Reabrir"
      variante="primary"
      aCarregar={reabrir.isPending}
      erro={reabrir.error ? <ErrorPanel erro={reabrir.error} /> : undefined}
      aoConfirmar={(motivo, feito) => reabrir.mutate({ ano: Number(periodo.fiscalYear), numero: n, motivo }, { onSuccess: feito })}
    />
  );
}

export default function Periodos() {
  const { pode } = useUtilizador();
  const { ano, mudar } = useAnoPeriodo();
  const periodos = usePeriodos(ano);
  const fecha = pode("finance.ledger.close");
  const linhas = [...(periodos.data ?? [])].sort((a, b) => Number(a.number) - Number(b.number));
  const colunas: Coluna<Periodo>[] = [
    { id: "periodo", cabecalho: "Período", celula: (p) => <span className="font-medium">{nomePeriodo(Number(p.number))}</span> },
    { id: "estado", cabecalho: "Estado", celula: (p) => (p.status === "Open" ? <Badge tom="sucesso">Aberto</Badge> : <Badge>Fechado</Badge>) },
    { id: "fecho", cabecalho: "Fechado em", esconderAte: "sm", celula: (p) => (p.closedAt ? formatarDataHora(p.closedAt) : "—") },
    { id: "reabertura", cabecalho: "Última reabertura", esconderAte: "md", celula: (p) => (p.reopenedAt ? `${formatarDataHora(p.reopenedAt)}${p.reopenReason ? ` · ${p.reopenReason}` : ""}` : "—") },
    ...(fecha
      ? [
          {
            id: "accoes",
            cabecalho: "Acções",
            celula: (p: Periodo) => (p.status === "Open" ? <FecharPeriodo periodo={p} /> : <ReabrirPeriodo periodo={p} />),
          } satisfies Coluna<Periodo>,
        ]
      : []),
  ];
  return (
    <>
      <PageHeader
        titulo="Períodos"
        descricao="Que meses aceitam lançamentos. Fechar um período protege os números já reportados."
        accao={
          <Can requer="finance.ledger.write">
            <AbrirPeriodo ano={ano} existentes={linhas.map((p) => Number(p.number))} />
          </Can>
        }
      />
      <EscolhaAnoPeriodo ano={ano} periodo={null} mudar={mudar} comPeriodo={false} />
      <Tabela
        rotulo={`Períodos de ${ano}`}
        colunas={colunas}
        linhas={linhas}
        chave={(p) => p.periodId}
        aCarregar={periodos.isPending}
        erro={periodos.error ? <ErrorPanel erro={periodos.error} tentarDeNovo={() => void periodos.refetch()} /> : undefined}
        vazio={`Nenhum período aberto em ${ano}. Sem período aberto não se lança.`}
      />
    </>
  );
}
