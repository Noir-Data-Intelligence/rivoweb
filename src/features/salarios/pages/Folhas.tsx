/** Salários: as folhas de pagamento por mês, com os totais, e abrir a de um mês. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Can } from "@/features/identity";
import { formatarDataHora, hojeIso } from "@/lib/format/data";
import { nomeMes } from "@/lib/format/periodo";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAbrirFolha, useFolhas, useTodasFolhas, type Folha } from "../api";
import { EstadoFolha, kz, libertaOMes, periodoFolha, totais } from "../comum";
import { errosAbrir } from "../regras";

function AbrirFolha() {
  const [aberto, setAberto] = useState(false);
  const [ano, setAno] = useState(hojeIso().slice(0, 4));
  const [mes, setMes] = useState(String(Number(hojeIso().slice(5, 7))));
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirFolha();
  const todas = useTodasFolhas();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosAbrir({ ano, mes });
  const repetidas = (todas.data?.items ?? []).filter((f) => String(f.year) === ano.trim() && Number(f.month) === Number(mes) && !libertaOMes(f.status));
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir folha
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            abrir.reset();
            setTentou(false);
          }
        }}
        titulo="Abrir a folha de um mês"
        descricao="Fica em rascunho para juntar os colaboradores. Abre-a a sua conta, que tem de estar ligada a uma ficha de colaborador."
        rotuloConfirmar="Abrir folha"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.ano || erros.mes || abrir.isPending) return;
            abrir.mutate({ year: Number(ano), month: Number(mes) }, { onSuccess: (r) => void navegar(`/salarios/${r.runId}`) });
          }}
        >
          <Field rotulo="Mês" erro={tentou ? erros.mes : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={mes} onChange={(e) => setMes(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {nomeMes(m)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Ano" erro={tentou ? erros.ano : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={ano} onChange={(e) => setAno(e.target.value)} />}
          </Field>
          {repetidas.length > 0 ? (
            <Alert tom="aviso" className="sm:col-span-2" titulo={`Já existe uma folha de ${nomeMes(Number(mes))} ${ano}.`}>
              Só se abre outra se essa for recusada ou anulada. Para corrigir um rascunho, abra-o: os colaboradores tiram-se e juntam-se de novo.
            </Alert>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

export default function Folhas() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useFolhas({ pagina, tamanho });
  const colunas: Coluna<Folha>[] = [
    {
      id: "periodo",
      cabecalho: "Folha",
      celula: (f) => (
        <Link to={`/salarios/${f.runId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {periodoFolha(f)}
        </Link>
      ),
    },
    { id: "pessoas", cabecalho: "Colaboradores", alinhar: "direita", esconderAte: "sm", celula: (f) => String(f.items.length) },
    { id: "bruto", cabecalho: "Bruto", alinhar: "direita", esconderAte: "md", celula: (f) => kz(totais(f.items).bruto) },
    { id: "liquido", cabecalho: "Líquido", alinhar: "direita", celula: (f) => kz(totais(f.items).liquido) },
    { id: "estado", cabecalho: "Estado", celula: (f) => <EstadoFolha estado={f.status} /> },
    { id: "quando", cabecalho: "Fechada a", esconderAte: "lg", celula: (f) => (f.closedAt ? formatarDataHora(f.closedAt) : f.submittedAt ? `submetida a ${formatarDataHora(f.submittedAt)}` : "—") },
  ];
  return (
    <>
      <PageHeader
        titulo="Salários"
        descricao="Folhas de pagamento mensais. O IRT, o INSS e o líquido calculam-se no servidor."
        accao={
          <Can requer="payroll.runs.write">
            <AbrirFolha />
          </Can>
        }
      />
      <Tabela
        rotulo="Folhas de pagamento"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(f) => f.runId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há folhas de pagamento."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
