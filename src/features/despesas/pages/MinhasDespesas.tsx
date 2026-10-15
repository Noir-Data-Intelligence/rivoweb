/** Portal do colaborador › Despesas (ADR-071): submeter com comprovativo, acompanhar, retirar. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { moeda } from "@/features/facturacao";
import { eApiError } from "@/lib/api/problem";
import { formatarData } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useMinhasDespesas, useRetirarDespesa, useSubmeterDespesa, type MinhaDespesa } from "../api";
import { EstadoDespesa, FormularioDespesa, useFormularioDespesa } from "../comum";

function Submeter() {
  const [aberto, setAberto] = useState(false);
  const estado = useFormularioDespesa();
  const submeter = useSubmeterDespesa();
  const [soltas, setSoltas] = useState<string[]>([]);
  const idForm = useId();
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      estado.limpar();
      submeter.reset();
      setSoltas([]);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova despesa
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Submeter uma despesa"
        descricao="Vai para aprovação. Junte o comprovativo: ajuda quem decide."
        rotuloConfirmar="Submeter"
        aCarregar={submeter.isPending}
        erro={
          soltas.length > 0 ? (
            <Alert tom="erro" titulo="Não foi possível submeter.">
              {soltas.join(" ")}
            </Alert>
          ) : submeter.error && !(eApiError(submeter.error) && submeter.error.status === 400) ? (
            <ErrorPanel erro={submeter.error} />
          ) : undefined
        }
        formulario={idForm}
      >
        <FormularioDespesa
          id={idForm}
          estado={estado}
          aoSubmeter={(d) => {
            if (submeter.isPending) return;
            setSoltas([]);
            submeter.mutate(
              { spentOn: d.spentOn, description: d.description, category: d.category, amount: d.amount, currency: d.currency, projectId: null, billable: false, receiptDocumentId: d.receiptDocumentId },
              { onSuccess: () => fechar(false), onError: (e) => setSoltas(estado.erroServidor(e)) },
            );
          }}
        />
      </Confirmar>
    </>
  );
}

function Retirar({ d }: { d: MinhaDespesa }) {
  const [aberto, setAberto] = useState(false);
  const retirar = useRetirarDespesa();
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Retirar a despesa ${d.description}`}>
        Retirar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) retirar.reset();
        }}
        titulo="Retirar esta despesa?"
        descricao="Deixa de ir a decisão. Fica no histórico como retirada."
        rotuloConfirmar="Retirar"
        variante="destructive"
        aCarregar={retirar.isPending}
        erro={retirar.error ? <ErrorPanel erro={retirar.error} /> : undefined}
        aoConfirmar={() => (retirar.isPending ? undefined : retirar.mutate(d.expenseId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export default function MinhasDespesas() {
  const despesas = useMinhasDespesas();
  // O portal autoriza pelo vínculo à ficha: sem ficha ligada, 403.
  if (eApiError(despesas.error) && despesas.error.status === 403) {
    return (
      <>
        <PageHeader titulo="As minhas despesas" />
        <Alert tom="info" titulo="A sua conta não está ligada a uma ficha de colaborador.">
          As despesas submetem-se em nome da ficha. Peça aos Recursos Humanos que liguem a sua conta.
        </Alert>
      </>
    );
  }
  const colunas: Coluna<MinhaDespesa>[] = [
    {
      id: "descricao",
      cabecalho: "Despesa",
      celula: (d) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">{d.description}</span>
          <span className="text-sm text-muted-foreground">{d.category}</span>
          {d.decisionNotes ? <span className="whitespace-pre-line text-sm text-muted-foreground">«{d.decisionNotes}»</span> : null}
        </div>
      ),
      className: "max-w-[18rem]",
    },
    { id: "data", cabecalho: "Data", esconderAte: "sm", celula: (d) => formatarData(d.spentOn) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (d) => moeda(d.amount, d.currency) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (d) => (
        <div className="flex flex-col items-start gap-1">
          <EstadoDespesa estado={d.status} />
          {d.reimbursedOn ? <span className="text-xs text-muted-foreground">a {formatarData(d.reimbursedOn)}</span> : null}
        </div>
      ),
    },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (d) => (d.status === "Submitted" ? <Retirar d={d} /> : null) },
  ];
  return (
    <>
      <PageHeader titulo="As minhas despesas" descricao="O que gastou ao serviço e espera reembolso." accao={<Submeter />} />
      <Tabela
        rotulo="As minhas despesas"
        colunas={colunas}
        linhas={despesas.data}
        chave={(d) => d.expenseId}
        aCarregar={despesas.isPending}
        erro={despesas.error ? <ErrorPanel erro={despesas.error} tentarDeNovo={() => void despesas.refetch()} /> : undefined}
        vazio="Ainda não submeteu despesas."
      />
    </>
  );
}
