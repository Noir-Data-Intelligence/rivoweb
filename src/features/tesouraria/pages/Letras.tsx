/** Letras e livranças (§5.6): carteira a receber e a pagar, vencidas, sacar. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { formatarData, hojeIso } from "@/lib/format/data";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { IsoDate, normalizarTexto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useLetras, useSacarLetra, type Letra } from "../api";
import { MOEDAS } from "./Contas";

export const INSTRUMENTOS = { BillOfExchange: "Letra", PromissoryNote: "Livrança" } as const;
export const SENTIDOS = { Receivable: "A receber", Payable: "A pagar" } as const;
export const ESTADOS_LETRA = {
  Pending: "Pendente",
  Accepted: "Aceite",
  Discounted: "Descontada",
  Paid: "Paga",
  Protested: "Protestada",
  Cancelled: "Anulada",
  Endorsed: "Endossada",
} as const;
type Sentido = keyof typeof SENTIDOS;
type EstadoFiltro = "Pending" | "Accepted" | "Discounted" | "Paid" | "Protested" | "Cancelled";
const FILTRAVEIS: readonly EstadoFiltro[] = ["Pending", "Accepted", "Discounted", "Paid", "Protested", "Cancelled"];

export function EstadoLetra({ l }: { l: Pick<Letra, "status" | "overdue"> }) {
  const nome = ESTADOS_LETRA[l.status as keyof typeof ESTADOS_LETRA] ?? l.status;
  if (l.overdue && (l.status === "Pending" || l.status === "Accepted")) return <Badge tom="erro">Vencida · {nome}</Badge>;
  if (l.status === "Paid") return <Badge tom="sucesso">{nome}</Badge>;
  if (l.status === "Protested") return <Badge tom="erro">{nome}</Badge>;
  if (l.status === "Pending" || l.status === "Accepted") return <Badge tom="aviso">{nome}</Badge>;
  return <Badge>{nome}</Badge>;
}

function Sacar() {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const sacar = useSacarLetra();
  const [instrumento, setInstrumento] = useState<keyof typeof INSTRUMENTOS>("BillOfExchange");
  const [sentido, setSentido] = useState<Sentido>("Receivable");
  const [numero, setNumero] = useState("");
  const [contraparte, setContraparte] = useState("");
  const [emissao, setEmissao] = useState(hojeIso());
  const [vencimento, setVencimento] = useState("");
  const [valor, setValor] = useState("");
  const [moedaLetra, setMoedaLetra] = useState<string>("AOA");
  const [banco, setBanco] = useState("");
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const [soltas, setSoltas] = useState<string[]>([]);
  const idForm = useId();
  const v = lerDinheiroDigitado(valor, 2);
  const erros = {
    numero: normalizarTexto(numero) === "" ? "Indique o número." : undefined,
    contraparte: normalizarTexto(contraparte) === "" ? "Indique quem paga ou a quem se paga." : undefined,
    emissao: !IsoDate.safeParse(emissao).success ? "Indique a data de emissão." : undefined,
    vencimento: !IsoDate.safeParse(vencimento).success ? "Indique o vencimento." : vencimento < emissao ? "O vencimento não pode ser antes da emissão." : undefined,
    valor: !v || v.lte(0) ? "Indique um valor maior que zero." : undefined,
  };
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      sacar.reset();
      setTentou(false);
      setSoltas([]);
    }
  };
  const t = (s: string) => (normalizarTexto(s) === "" ? null : normalizarTexto(s));
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar letra
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Registar uma letra ou livrança"
        rotuloConfirmar="Registar"
        aCarregar={sacar.isPending}
        erro={soltas.length > 0 ? <Alert tom="erro" titulo="Não foi possível registar.">{soltas.join(" ")}</Alert> : sacar.error ? <ErrorPanel erro={sacar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid max-h-[60vh] gap-4 overflow-y-auto px-0.5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.values(erros).some(Boolean) || !v || sacar.isPending) return;
            setSoltas([]);
            sacar.mutate(
              {
                instrument: instrumento,
                direction: sentido,
                number: normalizarTexto(numero),
                counterpartyName: normalizarTexto(contraparte),
                customerId: null,
                supplierId: null,
                salesInvoiceId: null,
                purchaseInvoiceId: null,
                issuedOn: emissao,
                dueOn: vencimento,
                amount: paraApi(v),
                currency: moedaLetra,
                bank: t(banco),
                notes: t(notas),
              },
              {
                onSuccess: (r) => void navegar(`/letras/${r.id}`),
                onError: (er) => {
                  const s = aplicarErrosDoServidor(er, () => undefined, []);
                  if (s.length > 0) setSoltas(s);
                },
              },
            );
          }}
        >
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={instrumento} onChange={(e) => setInstrumento(e.target.value as keyof typeof INSTRUMENTOS)}>
                {Object.entries(INSTRUMENTOS).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Sentido">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={sentido} onChange={(e) => setSentido(e.target.value as Sentido)}>
                {Object.entries(SENTIDOS).map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Número" erro={tentou ? erros.numero : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={numero} onChange={(e) => setNumero(e.target.value)} />}
          </Field>
          <Field rotulo={sentido === "Receivable" ? "Sacado (quem paga)" : "Tomador (a quem se paga)"} erro={tentou ? erros.contraparte : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={contraparte} onChange={(e) => setContraparte(e.target.value)} />}
          </Field>
          <Field rotulo="Emissão" erro={tentou ? erros.emissao : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={emissao} onChange={(e) => setEmissao(e.target.value)} />}
          </Field>
          <Field rotulo="Vencimento" erro={tentou ? erros.vencimento : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={vencimento} onChange={(e) => setVencimento(e.target.value)} />}
          </Field>
          <Field rotulo="Valor" erro={tentou ? erros.valor : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moedaLetra} onChange={(e) => setMoedaLetra(e.target.value)}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Banco (opcional)">
            {({ id, descricao }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} value={banco} onChange={(e) => setBanco(e.target.value)} />}
          </Field>
          <Field rotulo="Notas (opcional)">
            {({ id, descricao }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Letras() {
  const [params, setParams] = useSearchParams();
  const idSentido = useId();
  const idEstado = useId();
  const sentido = (Object.keys(SENTIDOS) as Sentido[]).includes(params.get("sentido") as Sentido) ? (params.get("sentido") as Sentido) : null;
  const estado = FILTRAVEIS.includes(params.get("estado") as EstadoFiltro) ? (params.get("estado") as EstadoFiltro) : null;
  const letras = useLetras({ sentido, estado });
  const filtrar = (k: string, v: string) =>
    setParams((a) => {
      const n = new URLSearchParams(a);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    });
  const colunas: Coluna<Letra>[] = [
    {
      id: "numero",
      cabecalho: "Número",
      celula: (l) => (
        <div className="flex flex-col">
          <Link to={`/letras/${l.billId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {l.number}
          </Link>
          <span className="text-sm text-muted-foreground">
            {INSTRUMENTOS[l.instrument as keyof typeof INSTRUMENTOS] ?? l.instrument} {(SENTIDOS[l.direction as Sentido] ?? l.direction).toLowerCase()}
          </span>
        </div>
      ),
    },
    { id: "contraparte", cabecalho: "Contraparte", esconderAte: "sm", celula: (l) => l.counterpartyName, className: "max-w-[14rem] truncate" },
    { id: "vence", cabecalho: "Vence", esconderAte: "md", celula: (l) => formatarData(l.dueOn) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (l) => moeda(l.amount, l.currency) },
    { id: "estado", cabecalho: "Estado", celula: (l) => <EstadoLetra l={l} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Letras e livranças"
        descricao="Títulos a receber e a pagar: aceite, desconto, endosso, pagamento e protesto."
        accao={
          <Can requer="finance.treasury.write">
            <Sacar />
          </Can>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idSentido} className="text-sm font-medium text-foreground">
            Sentido
          </label>
          <Select id={idSentido} value={sentido ?? ""} onChange={(e) => filtrar("sentido", e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(SENTIDOS).map(([k, n]) => (
              <option key={k} value={k}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idEstado} className="text-sm font-medium text-foreground">
            Estado
          </label>
          <Select id={idEstado} value={estado ?? ""} onChange={(e) => filtrar("estado", e.target.value)}>
            <option value="">Todos</option>
            {FILTRAVEIS.map((k) => (
              <option key={k} value={k}>
                {ESTADOS_LETRA[k]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Tabela
        rotulo="Letras e livranças"
        colunas={colunas}
        linhas={letras.data}
        chave={(l) => l.billId}
        aCarregar={letras.isPending}
        erro={letras.error ? <ErrorPanel erro={letras.error} tentarDeNovo={() => void letras.refetch()} /> : undefined}
        vazio={sentido || estado ? "Nenhuma letra com estes filtros." : "Ainda não há letras nem livranças."}
      />
    </>
  );
}
