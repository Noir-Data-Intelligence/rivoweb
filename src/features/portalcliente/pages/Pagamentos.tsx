/**
 * Portal do cliente › Pagamentos: os comprovativos enviados e o envio de um
 * novo. O ficheiro carrega-se primeiro (10 MB, 20 por dia) e o pedido leva-o;
 * a equipa financeira confirma (e emite o recibo) ou rejeita com o motivo.
 * `?factura=` abre o envio com essa factura escolhida (vem do Início).
 */
import { Upload } from "lucide-react";
import { useId, useState } from "react";
import { useSearchParams } from "react-router";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { moeda } from "@/features/facturacao";
import { usePortalCliente } from "@/features/identity/api";
import { formatarData, formatarDataHora, hojeIso } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useComprovativos, useEnviarComprovativo, type Comprovativo, type FacturaCliente } from "../api";
import { EstadoComprovativo } from "../comum";
import { comprovativoParaApi, errosComprovativo, MAXIMO_NOTAS, temErros } from "../regras";

function Enviar({ facturas, inicial, aoFechar }: { facturas: readonly FacturaCliente[]; inicial: string; aoFechar: () => void }) {
  const [aberto, setAberto] = useState(inicial !== "");
  const [factura, setFactura] = useState(facturas.some((f) => f.invoiceId === inicial) ? inicial : "");
  const [valor, setValor] = useState("");
  const [pagoA, setPagoA] = useState(hojeIso());
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [notas, setNotas] = useState("");
  const [tentou, setTentou] = useState(false);
  const enviar = useEnviarComprovativo();
  const idForm = useId();
  const campos = { factura, valor, pagoA, documento: documento?.documentId ?? null, notas };
  const erros = errosComprovativo(campos, hojeIso());
  const mostrar = (k: keyof typeof erros) => (tentou ? erros[k] : undefined);
  const mudar = (v: boolean) => {
    setAberto(v);
    if (!v) {
      enviar.reset();
      setTentou(false);
      setFactura("");
      setValor("");
      setPagoA(hojeIso());
      setDocumento(null);
      setNotas("");
      aoFechar();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)} disabled={facturas.length === 0}>
        <Upload strokeWidth={1.75} aria-hidden />
        Enviar comprovativo
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Enviar comprovativo de pagamento"
        descricao="Para uma transferência já feita. A equipa financeira confere e emite o recibo, ou diz porque não o pode aceitar."
        rotuloConfirmar="Enviar"
        aCarregar={enviar.isPending}
        erro={enviar.error ? <ErrorPanel erro={enviar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || enviar.isPending) return;
            enviar.mutate(comprovativoParaApi(campos), { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Factura" erro={mostrar("factura")}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={factura} onChange={(e) => setFactura(e.target.value)}>
                <option value="">Escolha…</option>
                {facturas.map((f) => (
                  <option key={f.invoiceId} value={f.invoiceId}>
                    {f.number} · {formatarData(f.issuedOn)} · {moeda(f.grossTotal, f.currency)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field rotulo="Valor pago" erro={mostrar("valor")} ajuda="Até ao que falta pagar da factura.">
              {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => setValor(e.target.value)} />}
            </Field>
            <Field rotulo="Pago a" erro={mostrar("pagoA")}>
              {({ id, descricao, invalido }) => <Input id={id} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} value={pagoA} onChange={(e) => setPagoA(e.target.value)} />}
            </Field>
          </div>
          <div className="flex flex-col gap-1">
            <CarregarFicheiro
              rotulo="Comprovativo"
              categoria="Comprovativo de pagamento"
              documento={documento}
              aoMudar={setDocumento}
              ajuda="PDF, imagem ou documento de escritório, até 10 MB. No máximo 20 ficheiros por dia."
            />
            {mostrar("documento") ? (
              <p className="text-xs text-danger" role="alert">
                {mostrar("documento")}
              </p>
            ) : null}
          </div>
          <Field rotulo="Notas (opcional)" erro={mostrar("notas")}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={MAXIMO_NOTAS} aria-describedby={descricao} invalido={invalido} value={notas} onChange={(e) => setNotas(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Pagamentos() {
  const [params, setParams] = useSearchParams();
  const portal = usePortalCliente();
  const lista = useComprovativos();
  const facturas = portal.data?.invoices ?? [];
  const daFactura = (id: string) => facturas.find((f) => f.invoiceId === id);
  const abertas = facturas.filter((f) => f.status === "Normal").sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
  const inicial = params.get("factura") ?? "";
  const ordenada = [...(lista.data ?? [])].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const colunas: Coluna<Comprovativo>[] = [
    { id: "factura", cabecalho: "Factura", celula: (c) => <span className="font-medium text-foreground">{daFactura(c.salesInvoiceId)?.number ?? "—"}</span> },
    { id: "pago", cabecalho: "Pago a", esconderAte: "sm", celula: (c) => formatarData(c.paidOn) },
    { id: "enviado", cabecalho: "Enviado a", esconderAte: "md", celula: (c) => formatarDataHora(c.submittedAt) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (c) => (
        <div className="flex min-w-0 flex-col items-start gap-1">
          <EstadoComprovativo estado={c.status} />
          {c.rejectionReason ? <span className="text-sm text-muted-foreground">{c.rejectionReason}</span> : null}
        </div>
      ),
    },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", celula: (c) => moeda(c.amount, c.currency ?? daFactura(c.salesInvoiceId)?.currency) },
  ];
  return (
    <>
      <PageHeader
        titulo="Pagamentos"
        descricao="Os comprovativos de transferência que enviou e o estado de cada um."
        accao={
          portal.data ? (
            <Enviar
              key={inicial}
              facturas={abertas}
              inicial={inicial}
              aoFechar={() => {
                if (new URLSearchParams(window.location.search).has("factura")) setParams({}, { replace: true });
              }}
            />
          ) : null
        }
      />
      {portal.data && abertas.length === 0 ? <Alert tom="info" className="mb-4" titulo="Não há facturas em vigor para pagar." /> : null}
      <Tabela
        rotulo="Comprovativos enviados"
        colunas={colunas}
        linhas={ordenada}
        chave={(c) => c.id}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não enviou comprovativos."
      />
    </>
  );
}
