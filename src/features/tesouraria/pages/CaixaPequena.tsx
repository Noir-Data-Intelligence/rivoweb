/** Caixa pequena (§5.6): fundos fixos, o que falta repor, abrir e rever um fundo. */
import { Pencil, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { useTodosColaboradores } from "@/features/rh";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useCaixas, useGuardarCaixa, type FundoCaixa } from "../api";
import { MOEDAS } from "./Contas";

/** Abrir (sem `fundo`) ou rever um fundo. Quem não lê colaboradores mantém o responsável que estava. */
export function GuardarFundo({ fundo }: { fundo?: FundoCaixa }) {
  const { pode } = useUtilizador();
  const leColaboradores = pode("hr.employees.read");
  const [aberto, setAberto] = useState(false);
  const colaboradores = useTodosColaboradores(aberto && leColaboradores);
  const guardar = useGuardarCaixa();
  const [nome, setNome] = useState(fundo?.name ?? "");
  const [responsavel, setResponsavel] = useState(fundo?.custodianEmployeeId ?? "");
  const [moedaFundo, setMoedaFundo] = useState(fundo?.currency ?? "AOA");
  const [valor, setValor] = useState(fundo ? String(fundo.floatAmount).replace(".", ",") : "");
  const [activo, setActivo] = useState(fundo?.isActive ?? true);
  const [tentou, setTentou] = useState(false);
  const [soltas, setSoltas] = useState<string[]>([]);
  const idForm = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const erros = { nome: normalizarTexto(nome) === "" ? "Dê um nome ao fundo." : undefined, valor: !v || v.lte(0) ? "Indique o fundo fixo." : undefined };
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      guardar.reset();
      setTentou(false);
      setSoltas([]);
    }
  };
  return (
    <>
      {fundo ? (
        <Button variante="secondary" onClick={() => setAberto(true)}>
          <Pencil strokeWidth={1.75} aria-hidden />
          Rever fundo
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Abrir fundo
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={fundo ? `Rever ${fundo.name}` : "Abrir um fundo de caixa"}
        descricao={fundo ? "O saldo não muda: acerte-o com um movimento de ajuste." : "Começa com o fundo fixo como saldo (fica um movimento «Fundo inicial»)."}
        rotuloConfirmar={fundo ? "Guardar" : "Abrir fundo"}
        aCarregar={guardar.isPending}
        erro={soltas.length > 0 ? <Alert tom="erro" titulo="Não foi possível guardar.">{soltas.join(" ")}</Alert> : guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.nome || erros.valor || !v || guardar.isPending) return;
            setSoltas([]);
            guardar.mutate(
              {
                fundId: fundo?.fundId ?? null,
                corpo: { name: normalizarTexto(nome), custodianEmployeeId: responsavel === "" ? null : responsavel, currency: fundo ? null : moedaFundo, floatAmount: paraApi(v), active: activo },
              },
              {
                onSuccess: () => fechar(false),
                onError: (er) => {
                  const s = aplicarErrosDoServidor(er, () => undefined, []);
                  if (s.length > 0) setSoltas(s);
                },
              },
            );
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Field>
          {leColaboradores ? (
            <Field rotulo="Responsável (opcional)" className="sm:col-span-2">
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} aria-busy={colaboradores.isPending || undefined} value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
                  <option value="">Ninguém</option>
                  {(colaboradores.data?.items ?? []).map((c) => (
                    <option key={c.employeeId} value={c.employeeId}>
                      {c.fullName}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          {fundo ? null : (
            <Field rotulo="Moeda">
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={moedaFundo} onChange={(e) => setMoedaFundo(e.target.value)}>
                  {MOEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field rotulo="Fundo fixo" erro={tentou ? erros.valor : undefined} ajuda="O valor a que a caixa volta em cada reposição.">
            {({ id, descricao, invalido }) => (
              <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />
            )}
          </Field>
          {fundo ? <Checkbox className="sm:col-span-2" rotulo="Activo (aceita movimentos)" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> : null}
        </form>
      </Confirmar>
    </>
  );
}

export default function CaixaPequena() {
  const caixas = useCaixas();
  const colunas: Coluna<FundoCaixa>[] = [
    {
      id: "nome",
      cabecalho: "Fundo",
      celula: (f) => (
        <Link to={`/caixa-pequena/${f.fundId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {f.name}
        </Link>
      ),
    },
    { id: "fixo", cabecalho: "Fundo fixo", alinhar: "direita", esconderAte: "md", celula: (f) => moeda(f.floatAmount, f.currency) },
    { id: "saldo", cabecalho: "Saldo", alinhar: "direita", celula: (f) => moeda(f.balance, f.currency) },
    { id: "repor", cabecalho: "Por repor", alinhar: "direita", esconderAte: "sm", celula: (f) => moeda(f.replenishmentNeeded, f.currency) },
    { id: "estado", cabecalho: "Estado", esconderAte: "lg", celula: (f) => (f.isActive ? <Badge tom="sucesso">Activo</Badge> : <Badge>Desactivado</Badge>) },
  ];
  return (
    <>
      <PageHeader
        titulo="Caixa pequena"
        descricao="Fundos fixos de numerário: o que se gastou e o que falta repor."
        accao={
          <Can requer="finance.treasury.write">
            <GuardarFundo />
          </Can>
        }
      />
      <Tabela
        rotulo="Fundos de caixa"
        colunas={colunas}
        linhas={caixas.data}
        chave={(f) => f.fundId}
        aCarregar={caixas.isPending}
        erro={caixas.error ? <ErrorPanel erro={caixas.error} tentarDeNovo={() => void caixas.refetch()} /> : undefined}
        vazio="Ainda não há fundos de caixa."
      />
    </>
  );
}
