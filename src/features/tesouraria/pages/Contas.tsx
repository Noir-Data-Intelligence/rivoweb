/** Contas bancárias (§5.6): lista, saldos e abertura. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { ibanValido, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAbrirConta, useContas, type Conta } from "../api";

export const MOEDAS = ["AOA", "USD", "EUR"] as const;

function AbrirConta() {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const abrir = useAbrirConta();
  const [nome, setNome] = useState("");
  const [banco, setBanco] = useState("");
  const [iban, setIban] = useState("");
  const [moedaConta, setMoedaConta] = useState<string>("AOA");
  const [tentou, setTentou] = useState(false);
  const [soltas, setSoltas] = useState<string[]>([]);
  const idForm = useId();
  const ibanLimpo = iban.replace(/\s+/g, "").toUpperCase();
  const erros = {
    nome: normalizarTexto(nome) === "" ? "Dê um nome à conta." : undefined,
    banco: normalizarTexto(banco) === "" ? "Indique o banco." : undefined,
    iban: ibanLimpo !== "" && !ibanValido(ibanLimpo) ? "Este IBAN não passa a verificação. Confirme os dígitos." : undefined,
  };
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      abrir.reset();
      setTentou(false);
      setSoltas([]);
      setNome("");
      setBanco("");
      setIban("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir conta
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Abrir uma conta bancária"
        descricao="Começa com saldo zero. O saldo muda com depósitos, levantamentos, recebimentos e pagamentos."
        rotuloConfirmar="Abrir conta"
        aCarregar={abrir.isPending}
        erro={
          soltas.length > 0 ? (
            <Alert tom="erro" titulo="Não foi possível abrir.">
              {soltas.join(" ")}
            </Alert>
          ) : abrir.error && !(eApiError(abrir.error) && abrir.error.status === 400) ? (
            <ErrorPanel erro={abrir.error} />
          ) : undefined
        }
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.nome || erros.banco || erros.iban || abrir.isPending) return;
            setSoltas([]);
            abrir.mutate(
              { name: normalizarTexto(nome), bank: normalizarTexto(banco), iban: ibanLimpo === "" ? null : ibanLimpo, currency: moedaConta },
              { onSuccess: (r) => void navegar(`/contas/${r.accountId}`), onError: (er) => setSoltas(aplicarErrosDoServidor(er, () => undefined, [])) },
            );
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2" ajuda="Como aparece nas listas, por exemplo «Conta à ordem BAI».">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Field>
          <Field rotulo="Banco" erro={tentou ? erros.banco : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={banco} onChange={(e) => setBanco(e.target.value)} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moedaConta} onChange={(e) => setMoedaConta(e.target.value)}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="IBAN (opcional)" erro={tentou ? erros.iban : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={42} autoComplete="off" spellCheck={false} aria-describedby={descricao} invalido={invalido} value={iban} onChange={(e) => setIban(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export function EstadoConta({ activa }: { activa: boolean }) {
  return activa ? <Badge tom="sucesso">Aberta</Badge> : <Badge>Fechada</Badge>;
}

export default function Contas() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const fechadas = params.get("fechadas") === "1";
  const contas = useContas({ pagina, tamanho, fechadas });
  const colunas: Coluna<Conta>[] = [
    {
      id: "nome",
      cabecalho: "Conta",
      celula: (c) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/contas/${c.accountId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {c.name}
          </Link>
          <span className="truncate text-sm text-muted-foreground">{c.bank}</span>
        </div>
      ),
      className: "max-w-[18rem]",
    },
    { id: "iban", cabecalho: "IBAN", esconderAte: "lg", celula: (c) => <span className="font-mono text-sm">{c.iban ?? "—"}</span> },
    { id: "moeda", cabecalho: "Moeda", esconderAte: "sm", celula: (c) => c.currency },
    { id: "saldo", cabecalho: "Saldo", alinhar: "direita", celula: (c) => moeda(c.balance, c.currency) },
    { id: "estado", cabecalho: "Estado", esconderAte: "md", celula: (c) => <EstadoConta activa={c.isActive} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Contas bancárias"
        accao={
          <Can requer="finance.payables.write">
            <AbrirConta />
          </Can>
        }
      />
      <Checkbox
        className="mb-4"
        rotulo="Mostrar fechadas"
        checked={fechadas}
        onChange={(e) =>
          setParams((a) => {
            const n = new URLSearchParams(a);
            if (e.target.checked) n.set("fechadas", "1");
            else n.delete("fechadas");
            n.delete("pagina");
            return n;
          })
        }
      />
      <Tabela
        rotulo="Contas bancárias"
        colunas={colunas}
        linhas={contas.data?.items}
        chave={(c) => c.accountId}
        aCarregar={contas.isPending}
        erro={contas.error ? <ErrorPanel erro={contas.error} tentarDeNovo={() => void contas.refetch()} /> : undefined}
        vazio="Ainda não há contas bancárias."
        rodape={contas.data && contas.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={contas.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
