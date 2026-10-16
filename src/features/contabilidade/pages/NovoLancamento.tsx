/**
 * Novo lançamento manual (§5.7): diário, data, período e as linhas a débito e
 * a crédito. Os totais aparecem enquanto se escreve; só se envia equilibrado.
 * O servidor recusa contas que não aceitam movimento e períodos fechados.
 */
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useUtilizador } from "@/features/identity";
import { useTodosCentrosCusto } from "@/features/planeamento";
import { hojeIso } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { nomeMes } from "@/lib/format/periodo";
import { dinheiro, lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { useContasRazao, useDiarios, useLancar } from "../api";
import { TIPOS_LANCAMENTO } from "../comum";
import { problemaLancamento, totaisLancamento } from "../regras";

type Linha = { chave: number; conta: string; lado: "Debit" | "Credit"; valor: string; descricao: string; centro: string };

const nova = (chave: number, lado: "Debit" | "Credit"): Linha => ({ chave, conta: "", lado, valor: "", descricao: "", centro: "" });

export default function NovoLancamento() {
  const navigate = useNavigate();
  const { pode } = useUtilizador();
  const diarios = useDiarios(false);
  const contas = useContasRazao(false);
  const centros = useTodosCentrosCusto(pode("finance.planning.read"));
  const lancar = useLancar();
  const [diario, setDiario] = useState("");
  const [numero, setNumero] = useState("");
  const [data, setData] = useState(hojeIso());
  const [periodo, setPeriodo] = useState<string>("");
  const [tipo, setTipo] = useState("N");
  const [descricao, setDescricao] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([nova(1, "Debit"), nova(2, "Credit")]);
  const [tentou, setTentou] = useState(false);
  const idLista = useId();
  const dataValida = IsoDate.safeParse(data).success;
  const ano = dataValida ? Number(data.slice(0, 4)) : null;
  const mesDaData = dataValida ? Number(data.slice(5, 7)) : null;
  const periodoEfectivo = periodo === "" ? mesDaData : Number(periodo);
  const lidas = linhas.map((l) => ({ ...l, valor: lerDinheiroDigitado(l.valor, 2), conta: l.conta.trim().toUpperCase() }));
  const { debito, credito, diferenca } = totaisLancamento(lidas);
  const movimento = new Set((contas.data ?? []).filter((c) => c.isActive && c.acceptsPostings).map((c) => c.code));
  const contaDesconhecida = contas.data && lidas.find((l) => l.conta !== "" && !movimento.has(l.conta));
  const erros = {
    diario: diario === "" ? "Escolha o diário." : undefined,
    numero: normalizarTexto(numero) === "" ? "Indique o número do documento de arquivo." : undefined,
    data: !dataValida ? "Indique a data." : undefined,
    descricao: normalizarTexto(descricao) === "" ? "Indique a descrição." : undefined,
    linhas: problemaLancamento(lidas) ?? (contaDesconhecida ? `A conta ${contaDesconhecida.conta} não existe ou não aceita movimento.` : undefined),
  };
  const alterar = (chave: number, campo: keyof Omit<Linha, "chave">, valor: string) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  const proxima = () => Math.max(0, ...linhas.map((l) => l.chave)) + 1;

  return (
    <>
      <Button asChild variante="ghost" tamanho="sm" className="mb-2 -ml-2">
        <Link to="/lancamentos">
          <ArrowLeft strokeWidth={1.75} aria-hidden />
          Lançamentos
        </Link>
      </Button>
      <PageHeader titulo="Novo lançamento" descricao="Partida dobrada: o total a débito iguala o total a crédito." />
      {diarios.data && diarios.data.length === 0 ? (
        <Alert tom="aviso" className="mb-4" titulo="Ainda não há diários abertos.">
          <Link to="/lancamentos?vista=diarios" className="text-primary underline-offset-4 hover:underline">
            Abra um diário
          </Link>{" "}
          antes de lançar.
        </Alert>
      ) : null}
      {contas.data && movimento.size === 0 ? (
        <Alert tom="aviso" className="mb-4" titulo="O plano de contas ainda não tem contas de movimento.">
          <Link to="/plano-contas" className="text-primary underline-offset-4 hover:underline">
            Carregue o plano de contas
          </Link>{" "}
          antes de lançar.
        </Alert>
      ) : null}
      {lancar.error ? <ErrorPanel erro={lancar.error} className="mb-4" /> : null}
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          setTentou(true);
          if (Object.values(erros).some(Boolean) || ano === null || periodoEfectivo === null || lancar.isPending) return;
          const corpo = {
            journalCode: diarios.data?.find((d) => d.journalId === diario)?.code ?? "",
            archivalNumber: normalizarTexto(numero),
            transactionDate: data,
            fiscalYear: ano,
            period: periodoEfectivo,
            description: normalizarTexto(descricao),
            type: tipo,
            lines: lidas.flatMap((l) =>
              l.valor ? [{ accountCode: l.conta, side: l.lado, amount: paraApi(l.valor), description: normalizarTexto(l.descricao), costCentreId: l.centro === "" ? null : l.centro, sourceDocumentId: null }] : [],
            ),
          };
          lancar.mutate(corpo, {
            onSuccess: (r) => {
              const id = (r as { entryId?: string } | undefined)?.entryId;
              navigate(id ? `/lancamentos/${id}` : "/lancamentos", { replace: true });
            },
          });
        }}
      >
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field rotulo="Diário" erro={tentou ? erros.diario : undefined}>
              {({ id, descricao: d, invalido }) => (
                <Select id={id} aria-describedby={d} invalido={invalido} value={diario} onChange={(e) => setDiario(e.target.value)} aria-busy={diarios.isPending || undefined}>
                  <option value="">Escolha…</option>
                  {(diarios.data ?? []).map((x) => (
                    <option key={x.journalId} value={x.journalId}>
                      {x.code} · {x.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field rotulo="N.º de arquivo" erro={tentou ? erros.numero : undefined} ajuda="Como se encontra o documento que suporta o lançamento.">
              {({ id, descricao: d, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={d} invalido={invalido} value={numero} onChange={(e) => setNumero(e.target.value)} />}
            </Field>
            <Field rotulo="Data" erro={tentou ? erros.data : undefined}>
              {({ id, descricao: d, invalido }) => <Input id={id} type="date" aria-describedby={d} invalido={invalido} value={data} onChange={(e) => setData(e.target.value)} />}
            </Field>
            <Field rotulo="Período">
              {({ id, descricao: d }) => (
                <Select id={id} aria-describedby={d} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                  <option value="">{mesDaData ? `O da data (${mesDaData} · ${nomeMes(mesDaData)})` : "O da data"}</option>
                  {[13, 14, 15, 16].map((m) => (
                    <option key={m} value={m}>
                      {m} · Regularização
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field rotulo="Tipo">
              {({ id, descricao: d }) => (
                <Select id={id} aria-describedby={d} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS_LANCAMENTO.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.texto}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined}>
              {({ id, descricao: d, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={d} invalido={invalido} value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
            </Field>
          </div>
        </Card>

        <fieldset>
          <legend className="mb-3 text-md font-semibold text-foreground">Linhas</legend>
          <datalist id={idLista}>
            {(contas.data ?? [])
              .filter((c) => c.isActive && c.acceptsPostings)
              .map((c) => (
                <option key={c.accountId} value={c.code}>
                  {c.name}
                </option>
              ))}
          </datalist>
          <div className="flex flex-col gap-3">
            {linhas.map((l, i) => (
              <Card key={l.chave} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[8rem_8rem_10rem_1fr_12rem_auto] lg:items-end">
                <Field rotulo={`Conta · linha ${i + 1}`}>
                  {({ id, descricao: d }) => <Input id={id} list={idLista} maxLength={30} autoComplete="off" className="tabular-nums" aria-describedby={d} value={l.conta} onChange={(e) => alterar(l.chave, "conta", e.target.value)} />}
                </Field>
                <Field rotulo={`Lado · linha ${i + 1}`}>
                  {({ id, descricao: d }) => (
                    <Select id={id} aria-describedby={d} value={l.lado} onChange={(e) => alterar(l.chave, "lado", e.target.value)}>
                      <option value="Debit">Débito</option>
                      <option value="Credit">Crédito</option>
                    </Select>
                  )}
                </Field>
                <Field rotulo={`Valor · linha ${i + 1}`}>
                  {({ id, descricao: d }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={d} value={l.valor} onChange={(e) => alterar(l.chave, "valor", e.target.value)} />}
                </Field>
                <Field rotulo={`Descrição · linha ${i + 1}`}>
                  {({ id, descricao: d }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={d} value={l.descricao} onChange={(e) => alterar(l.chave, "descricao", e.target.value)} />}
                </Field>
                {centros.data ? (
                  <Field rotulo={`Centro de custo · linha ${i + 1}`}>
                    {({ id, descricao: d }) => (
                      <Select id={id} aria-describedby={d} value={l.centro} onChange={(e) => alterar(l.chave, "centro", e.target.value)}>
                        <option value="">Nenhum</option>
                        {centros.data.items
                          .filter((c) => c.isActive)
                          .map((c) => (
                            <option key={c.costCentreId} value={c.costCentreId}>
                              {c.code} · {c.name}
                            </option>
                          ))}
                      </Select>
                    )}
                  </Field>
                ) : (
                  <span className="hidden lg:block" />
                )}
                <Button type="button" variante="ghost" tamanho="icone" disabled={linhas.length <= 2} onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))} aria-label={`Tirar a linha ${i + 1}`}>
                  <Trash2 strokeWidth={1.75} aria-hidden />
                </Button>
              </Card>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variante="secondary" onClick={() => setLinhas((ls) => [...ls, nova(proxima(), diferenca.gt(0) ? "Credit" : "Debit")])}>
              <Plus strokeWidth={1.75} aria-hidden />
              Acrescentar linha
            </Button>
            <p className="flex flex-wrap gap-4 text-sm tabular-nums" aria-live="polite">
              <span>Débito: {formatarMoeda(dinheiro(debito.toFixed(2)))}</span>
              <span>Crédito: {formatarMoeda(dinheiro(credito.toFixed(2)))}</span>
              <span className={diferenca.eq(0) ? "text-success" : "text-danger"}>{diferenca.eq(0) ? "Equilibrado" : `Diferença: ${formatarMoeda(dinheiro(diferenca.abs().toFixed(2)))}`}</span>
            </p>
          </div>
          {tentou && erros.linhas ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {erros.linhas}
            </p>
          ) : null}
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button asChild variante="secondary">
            <Link to="/lancamentos">Cancelar</Link>
          </Button>
          <Button type="submit" aCarregar={lancar.isPending}>
            Lançar
          </Button>
        </div>
      </form>
    </>
  );
}
