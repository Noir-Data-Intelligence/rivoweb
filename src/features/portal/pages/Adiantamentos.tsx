/**
 * Portal › Adiantamentos de salário (ADR-123): o próprio pede uma parte do
 * salário antes do fim do mês. O pedido vai a Aprovações; aprovado, a
 * tesouraria paga-o, e a folha do mês indicado desconta-o.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { moeda } from "@/features/facturacao";
import { EstadoAdiantamento, errosAdiantamento, folhaDe, valorAdiantamento } from "@/features/tesouraria";
import { formatarDataHora, hojeIso } from "@/lib/format/data";
import { paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useMeusAdiantamentos, usePedirMeuAdiantamento, type MeuAdiantamento } from "../api";

function PedirAdiantamento() {
  const hoje = hojeIso();
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ valor: "", folha: hoje.slice(0, 7) });
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const pedir = usePedirMeuAdiantamento();
  const idForm = useId();
  const erros = errosAdiantamento(v, hoje);
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      pedir.reset();
      setV({ valor: "", folha: hojeIso().slice(0, 7) });
      setMotivo("");
      setTentou(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Pedir adiantamento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Pedir um adiantamento de salário"
        descricao="O pedido vai a Aprovações. Aprovado, a tesouraria paga-o, e a folha do mês que escolher desconta-o."
        rotuloConfirmar={pedir.data ? "Fechar" : "Pedir"}
        aCarregar={pedir.isPending}
        erro={pedir.error ? <ErrorPanel erro={pedir.error} /> : undefined}
        {...(pedir.data ? { aoConfirmar: () => mudar(false) } : { formulario: idForm })}
      >
        {pedir.data ? (
          <Alert tom="sucesso" titulo="Pedido enviado para aprovação.">
            Acompanhe o estado nesta página.
          </Alert>
        ) : (
          <form
            id={idForm}
            noValidate
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTentou(true);
              const valor = valorAdiantamento(v);
              if (erros.valor || erros.folha || !valor || pedir.isPending) return;
              const m = normalizarTexto(motivo);
              pedir.mutate({ amount: paraApi(valor), payrollYear: Number(v.folha.slice(0, 4)), payrollMonth: Number(v.folha.slice(5, 7)), reason: m === "" ? null : m });
            }}
          >
            <Field rotulo="Valor (Kz)" erro={tentou ? erros.valor : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} />}
            </Field>
            <Field rotulo="Desconta na folha de" erro={tentou ? erros.folha : undefined} ajuda="Por omissão, a do mês corrente.">
              {({ id, descricao, invalido }) => <Input id={id} type="month" min={hoje.slice(0, 7)} aria-describedby={descricao} invalido={invalido} value={v.folha} onChange={(e) => setV({ ...v, folha: e.target.value })} />}
            </Field>
            <Field rotulo="Motivo (opcional)" className="sm:col-span-2">
              {({ id, descricao }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
            </Field>
          </form>
        )}
      </Confirmar>
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
