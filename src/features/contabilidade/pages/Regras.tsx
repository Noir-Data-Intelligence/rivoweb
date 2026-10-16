/**
 * Regras (§5.7). As de lançamento dizem que contas movimenta cada
 * acontecimento (factura emitida, recibo, pagamento…) e geram os lançamentos
 * automáticos. As contabilísticas registam, com vigência e fonte, a regra que
 * a empresa segue. Definir e desactivar pedem `finance.ledger.close`.
 */
import { Plus, Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Can, useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { useVista, Vistas } from "@/ui/Vistas";
import {
  useContasRazao,
  useCriarRegraContabilistica,
  useDefinirRegraLancamento,
  useDesactivarRegraContabilistica,
  useDesactivarRegraLancamento,
  useDiarios,
  useRegrasContabilisticas,
  useRegrasLancamento,
} from "../api";
import { EVENTOS, NOME_LADO, PARCELAS, textoDe } from "../comum";
import { regraEquilibra } from "../regras";

type LinhaRegra = { chave: number; conta: string; lado: "Debit" | "Credit"; parcela: "Net" | "Tax" | "Gross"; descricao: string };
const linhaVazia = (chave: number, lado: "Debit" | "Credit", parcela: LinhaRegra["parcela"] = "Gross"): LinhaRegra => ({ chave, conta: "", lado, parcela, descricao: "" });

function problemaLinhas(linhas: readonly LinhaRegra[]): string | null {
  if (linhas.some((l) => l.conta.trim() === "")) return "Indique a conta de cada linha.";
  if (linhas.some((l) => normalizarTexto(l.descricao) === "")) return "Cada linha tem descrição.";
  if (!regraEquilibra(linhas.map((l) => ({ lado: l.lado, parcela: l.parcela })))) return "A regra não equilibra: a débito e a crédito tem de haver a mesma composição de líquido e imposto.";
  return null;
}

/** Editor das linhas de uma regra: conta, lado, parcela e descrição. */
function EditorLinhas({ linhas, setLinhas, erro }: { linhas: LinhaRegra[]; setLinhas: (f: (l: LinhaRegra[]) => LinhaRegra[]) => void; erro: string | null }) {
  const contas = useContasRazao(false);
  const idLista = useId();
  const alterar = (chave: number, campo: keyof Omit<LinhaRegra, "chave">, valor: string) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  return (
    <fieldset className="sm:col-span-2">
      <legend className="mb-2 text-sm font-medium text-foreground">Linhas</legend>
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
          <div key={l.chave} className="grid grid-cols-2 items-end gap-2 rounded-md border border-border p-2 sm:grid-cols-[7rem_7rem_10rem_1fr_auto]">
            <Field rotulo={`Conta · ${i + 1}`}>
              {({ id, descricao }) => <Input id={id} list={idLista} maxLength={30} autoComplete="off" className="tabular-nums" aria-describedby={descricao} value={l.conta} onChange={(e) => alterar(l.chave, "conta", e.target.value)} />}
            </Field>
            <Field rotulo={`Lado · ${i + 1}`}>
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={l.lado} onChange={(e) => alterar(l.chave, "lado", e.target.value)}>
                  <option value="Debit">Débito</option>
                  <option value="Credit">Crédito</option>
                </Select>
              )}
            </Field>
            <Field rotulo={`Valor · ${i + 1}`}>
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={l.parcela} onChange={(e) => alterar(l.chave, "parcela", e.target.value)}>
                  {PARCELAS.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.texto}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field rotulo={`Descrição · ${i + 1}`}>
              {({ id, descricao }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} value={l.descricao} onChange={(e) => alterar(l.chave, "descricao", e.target.value)} />}
            </Field>
            <Button type="button" variante="ghost" tamanho="icone" disabled={linhas.length <= 2} onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))} aria-label={`Tirar a linha ${i + 1}`}>
              <Trash2 strokeWidth={1.75} aria-hidden />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variante="secondary" tamanho="sm" className="mt-2" onClick={() => setLinhas((ls) => [...ls, linhaVazia(Math.max(0, ...ls.map((x) => x.chave)) + 1, "Credit", "Net")])}>
        Acrescentar linha
      </Button>
      {erro ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}

const paraPedido = (linhas: readonly LinhaRegra[]) =>
  linhas.map((l) => ({ accountCode: l.conta.trim().toUpperCase(), side: l.lado, amount: l.parcela, description: normalizarTexto(l.descricao) }));

function LinhasDaRegra({ linhas }: { linhas: readonly { accountCode: string; side: string; amount: string; description: string }[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {linhas.map((l, i) => (
        <li key={i} className="flex flex-wrap gap-x-2">
          <span className="w-16 text-muted-foreground">{NOME_LADO[l.side] ?? l.side}</span>
          <span className="tabular-nums font-medium">{l.accountCode}</span>
          <span className="text-muted-foreground">{textoDe(PARCELAS, l.amount)}</span>
          <span>· {l.description}</span>
        </li>
      ))}
    </ul>
  );
}

// Regras de lançamento automático

function NovaRegraLancamento() {
  const [aberto, setAberto] = useState(false);
  const definir = useDefinirRegraLancamento();
  const diarios = useDiarios(false, aberto);
  const [evento, setEvento] = useState<string>(EVENTOS[0].valor);
  const [diario, setDiario] = useState("");
  const [descricao, setDescricao] = useState("");
  const [linhas, setLinhas] = useState<LinhaRegra[]>([linhaVazia(1, "Debit", "Gross"), linhaVazia(2, "Credit", "Net"), linhaVazia(3, "Credit", "Tax")]);
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const erros = {
    diario: diario === "" ? "Escolha o diário." : undefined,
    descricao: normalizarTexto(descricao) === "" ? "Indique a descrição." : undefined,
    linhas: problemaLinhas(linhas),
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      definir.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova regra
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Nova regra de lançamento"
        descricao="Quando o acontecimento se dá, o servidor lança estas linhas com os valores do documento."
        rotuloConfirmar="Definir regra"
        aCarregar={definir.isPending}
        erro={definir.error ? <ErrorPanel erro={definir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.diario || erros.descricao || erros.linhas || definir.isPending) return;
            definir.mutate({ event: evento, journalCode: diario, description: normalizarTexto(descricao), lines: paraPedido(linhas) }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Acontecimento">
            {({ id, descricao: d }) => (
              <Select id={id} aria-describedby={d} value={evento} onChange={(e) => setEvento(e.target.value)}>
                {EVENTOS.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.texto}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Diário" erro={tentou ? erros.diario : undefined}>
            {({ id, descricao: d, invalido }) => (
              <Select id={id} aria-describedby={d} invalido={invalido} value={diario} onChange={(e) => setDiario(e.target.value)} aria-busy={diarios.isPending || undefined}>
                <option value="">Escolha…</option>
                {(diarios.data ?? []).map((x) => (
                  <option key={x.journalId} value={x.code}>
                    {x.code} · {x.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao: d, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={d} invalido={invalido} value={descricao} onChange={(e) => setDescricao(e.target.value)} />}
          </Field>
          <EditorLinhas linhas={linhas} setLinhas={setLinhas} erro={tentou ? erros.linhas : null} />
        </form>
      </Confirmar>
    </>
  );
}

function Desactivar({ titulo, aCarregar, erro, aoConfirmar, aoReiniciar, rotulo }: { titulo: string; aCarregar: boolean; erro: unknown; aoConfirmar: (feito: () => void) => void; aoReiniciar: () => void; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={rotulo}>
        Desactivar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (setAberto(a), a ? undefined : aoReiniciar())}
        titulo={titulo}
        descricao="A regra deixa de se aplicar daqui em diante. O que já foi lançado fica."
        rotuloConfirmar="Desactivar"
        variante="destructive"
        aCarregar={aCarregar}
        erro={erro ? <ErrorPanel erro={erro} /> : undefined}
        aoConfirmar={() => aoConfirmar(() => setAberto(false))}
      />
    </>
  );
}

function RegrasLancamento() {
  const { pode } = useUtilizador();
  const regras = useRegrasLancamento(true);
  const desactivar = useDesactivarRegraLancamento();
  const fecha = pode("finance.ledger.close");
  if (regras.isPending) return <Skeleton className="h-40" />;
  if (regras.error) return <ErrorPanel erro={regras.error} tentarDeNovo={() => void regras.refetch()} />;
  const porEvento = EVENTOS.map((ev) => ({ ...ev, regras: regras.data.filter((r) => r.event === ev.valor) }));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">Sem regra activa para um acontecimento, esse documento não gera lançamento: fica por contabilizar.</p>
        <Can requer="finance.ledger.close">
          <NovaRegraLancamento />
        </Can>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {porEvento.map((ev) => (
          <Card key={ev.valor}>
            <CardTitle>{ev.texto}</CardTitle>
            {ev.regras.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Sem regra: não gera lançamento.</p>
            ) : (
              ev.regras.map((r) => (
                <div key={r.ruleId} className="mt-3 border-t border-border pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {r.description} <span className="text-muted-foreground">· diário {r.journalCode}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      {r.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>}
                      {fecha && r.isActive ? (
                        <Desactivar
                          rotulo={`Desactivar a regra ${r.description}`}
                          titulo={`Desactivar «${r.description}»`}
                          aCarregar={desactivar.isPending}
                          erro={desactivar.error}
                          aoReiniciar={() => desactivar.reset()}
                          aoConfirmar={(feito) => desactivar.mutate(r.ruleId, { onSuccess: feito })}
                        />
                      ) : null}
                    </div>
                  </div>
                  <LinhasDaRegra linhas={[...r.lines].sort((a, b) => Number(a.lineNumber) - Number(b.lineNumber))} />
                </div>
              ))
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

// Regras contabilísticas

function NovaRegraContabilistica() {
  const [aberto, setAberto] = useState(false);
  const criar = useCriarRegraContabilistica();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [tipoOrigem, setTipoOrigem] = useState("");
  const [origem, setOrigem] = useState("");
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState("");
  const [linhas, setLinhas] = useState<LinhaRegra[]>([linhaVazia(1, "Debit", "Gross"), linhaVazia(2, "Credit", "Net"), linhaVazia(3, "Credit", "Tax")]);
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const idTipos = useId();
  const erros = {
    codigo: normalizarTexto(codigo) === "" ? "Indique o código." : undefined,
    nome: normalizarTexto(nome) === "" ? "Indique a descrição." : undefined,
    tipoOrigem: normalizarTexto(tipoOrigem) === "" ? "Indique o tipo de origem." : normalizarTexto(tipoOrigem).length > 40 ? "No máximo 40 caracteres." : undefined,
    origem: normalizarTexto(origem) === "" ? "Indique a referência legal ou documental." : undefined,
    de: IsoDate.safeParse(de).success ? undefined : "Indique a data de início.",
    ate: ate !== "" && (!IsoDate.safeParse(ate).success || ate < de) ? "O fim não pode ser antes do início." : undefined,
    linhas: problemaLinhas(linhas),
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      criar.reset();
      setTentou(false);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova regra
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Nova regra contabilística"
        descricao="Regista a regra que a empresa segue para um tipo de operação, com vigência e a fonte que a fundamenta."
        rotuloConfirmar="Criar regra"
        aCarregar={criar.isPending}
        erro={criar.error ? <ErrorPanel erro={criar.error} /> : undefined}
        formulario={idForm}
      >
        <datalist id={idTipos}>
          {EVENTOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.texto}
            </option>
          ))}
        </datalist>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.values(erros).some(Boolean) || criar.isPending) return;
            criar.mutate(
              {
                code: normalizarTexto(codigo).toUpperCase(),
                name: normalizarTexto(nome),
                sourceType: normalizarTexto(tipoOrigem),
                source: normalizarTexto(origem),
                effectiveFrom: de,
                effectiveTo: ate === "" ? null : ate,
                lines: paraPedido(linhas),
              },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={40} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={codigo} onChange={(e) => setCodigo(e.target.value)} />}
          </Field>
          <Field rotulo="Descrição" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Field>
          <Field rotulo="Tipo de origem" erro={tentou ? erros.tipoOrigem : undefined} ajuda="A operação a que se aplica.">
            {({ id, descricao, invalido }) => <Input id={id} list={idTipos} maxLength={40} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={tipoOrigem} onChange={(e) => setTipoOrigem(e.target.value)} />}
          </Field>
          <Field rotulo="Fonte" erro={tentou ? erros.origem : undefined} ajuda="Diploma, norma ou parecer.">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={origem} onChange={(e) => setOrigem(e.target.value)} />}
          </Field>
          <Field rotulo="Em vigor desde" erro={tentou ? erros.de : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={de} onChange={(e) => setDe(e.target.value)} />}
          </Field>
          <Field rotulo="Até (opcional)" erro={tentou ? erros.ate : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={ate} onChange={(e) => setAte(e.target.value)} />}
          </Field>
          <EditorLinhas linhas={linhas} setLinhas={setLinhas} erro={tentou ? erros.linhas : null} />
        </form>
      </Confirmar>
    </>
  );
}

function RegrasContabilisticas() {
  const { pode } = useUtilizador();
  const regras = useRegrasContabilisticas(true);
  const desactivar = useDesactivarRegraContabilistica();
  const fecha = pode("finance.ledger.close");
  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">Registo versionado das regras da empresa, com fonte. Os lançamentos automáticos seguem as regras de lançamento.</p>
        <Can requer="finance.ledger.close">
          <NovaRegraContabilistica />
        </Can>
      </div>
      {regras.isPending ? (
        <Skeleton className="h-40" />
      ) : regras.error ? (
        <ErrorPanel erro={regras.error} tentarDeNovo={() => void regras.refetch()} />
      ) : regras.data.length === 0 ? (
        <Alert tom="info" titulo="Ainda não há regras contabilísticas registadas." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {regras.data.map((r) => (
            <Card key={r.ruleId}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>
                    {r.code} · {r.name}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {textoDe(EVENTOS, r.sourceType)} · {r.effectiveTo ? `${formatarData(r.effectiveFrom)} a ${formatarData(r.effectiveTo)}` : `desde ${formatarData(r.effectiveFrom)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">Fonte: {r.source}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.isActive ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>}
                  {fecha && r.isActive ? (
                    <Desactivar
                      rotulo={`Desactivar a regra ${r.code}`}
                      titulo={`Desactivar ${r.code}`}
                      aCarregar={desactivar.isPending}
                      erro={desactivar.error}
                      aoReiniciar={() => desactivar.reset()}
                      aoConfirmar={(feito) => desactivar.mutate(r.ruleId, { onSuccess: feito })}
                    />
                  ) : null}
                </div>
              </div>
              <LinhasDaRegra linhas={r.lines} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

const VISTAS = [
  { valor: "lancamento", texto: "Lançamento automático" },
  { valor: "contabilisticas", texto: "Contabilísticas" },
] as const;

export default function Regras() {
  const vista = useVista(VISTAS);
  const conteudo: Record<(typeof VISTAS)[number]["valor"], ReactNode> = { lancamento: <RegrasLancamento />, contabilisticas: <RegrasContabilisticas /> };
  return (
    <>
      <PageHeader titulo="Regras contabilísticas" descricao="Que contas cada acontecimento movimenta, e as regras que a empresa segue." />
      <Vistas rotulo="Regras" vistas={VISTAS} actual={vista} />
      {vista ? conteudo[vista] : null}
    </>
  );
}
