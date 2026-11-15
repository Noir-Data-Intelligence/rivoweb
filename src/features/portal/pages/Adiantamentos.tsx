/**
 * Portal › Adiantamentos de salário (ADR-123): o próprio pede uma parte do
 * salário antes do fim do mês. O pedido vai a Aprovações; aprovado, a
 * tesouraria paga-o, e a folha do mês indicado desconta-o.
 */
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { moeda } from "@/features/facturacao";
import { EstadoAdiantamento, folhaDe } from "@/features/tesouraria";
import { formatarDataHora } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useMeusAdiantamentos, useRetirarMeuAdiantamento, type MeuAdiantamento } from "../api";
import { PedirAdiantamento } from "../components/PedirAdiantamento";

/** Retirar o próprio pedido, enquanto não foi pago nem recusado (ADR-131). */
function Retirar({ a }: { a: MeuAdiantamento }) {
  const [aberto, setAberto] = useState(false);
  const retirar = useRetirarMeuAdiantamento();
  const mudar = (v: boolean) => {
    setAberto(v);
    if (!v) retirar.reset();
  };
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Retirar o pedido de ${moeda(a.amount)}`}>
        <Undo2 strokeWidth={1.75} aria-hidden />
        Retirar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo={`Retirar o pedido de ${moeda(a.amount)}?`}
        descricao={
          a.status === "Approved"
            ? "Já foi aprovado, mas ainda não foi pago: retirado, a tesouraria já não o paga. Não se pode desfazer."
            : "Ainda está em Aprovações: retirado, o processo de aprovação cancela-se. Não se pode desfazer."
        }
        rotuloConfirmar="Retirar"
        variante="destructive"
        aCarregar={retirar.isPending}
        erro={retirar.error ? <ErrorPanel erro={retirar.error} /> : undefined}
        aoConfirmar={() => retirar.mutate(a.applicationId, { onSuccess: () => mudar(false) })}
      />
    </>
  );
}

export default function Adiantamentos() {
  const lista = useMeusAdiantamentos();
  const colunas: Coluna<MeuAdiantamento>[] = [
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (a) => <span className="font-medium">{moeda(a.amount)}</span> },
    { id: "folha", cabecalho: "Desconta na folha de", celula: (a) => folhaDe(a.payrollYear, a.payrollMonth) },
    { id: "motivo", cabecalho: "Motivo", esconderAte: "md", celula: (a) => a.reason ?? "—" },
    { id: "pedido", cabecalho: "Pedido em", esconderAte: "sm", celula: (a) => formatarDataHora(a.submittedAt) },
    { id: "estado", cabecalho: "Estado", celula: (a) => <EstadoAdiantamento estado={a.status} /> },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (a) => (a.status === "PendingApproval" || a.status === "Approved" ? <Retirar a={a} /> : null) },
  ];
  return (
    <>
      <PageHeader titulo="Adiantamentos de salário" descricao="Uma parte do salário paga antes do fim do mês. A folha do mês que escolher desconta-a." accao={<PedirAdiantamento />} />
      <Tabela
        rotulo="Os meus pedidos de adiantamento"
        colunas={colunas}
        linhas={lista.data}
        chave={(a) => a.applicationId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não pediu adiantamentos."
      />
    </>
  );
}
