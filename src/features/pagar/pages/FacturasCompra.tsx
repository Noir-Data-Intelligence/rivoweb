/** Facturas de compra (§5.6): lista e registo. */
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod/mini";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/numero";
import { lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { IsoDate, texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useFacturasCompra, useFornecedoresActivos, useRegistarFacturaCompra, type FacturaCompra } from "../api";

export const MOEDAS = ["AOA", "USD", "EUR"] as const;

const valor = (obrigatorio: string) => z.string().check(z.refine((v) => (lerDinheiroDigitado(v, 2)?.gte(0) ?? false), obrigatorio));

const esquema = z
  .object({
    supplierId: z.string(),
    supplierName: texto({ max: 200 }),
    supplierTaxId: texto({ max: 30 }),
    supplierInvoiceNumber: texto({ max: 60, obrigatorio: "Escreva o número da factura do fornecedor." }),
    issuedOn: z.string().check(z.refine((v) => IsoDate.safeParse(v).success, "Indique a data de emissão.")),
    dueOn: z.string().check(z.refine((v) => IsoDate.safeParse(v).success, "Indique a data de vencimento.")),
    currency: z.enum(MOEDAS),
    netTotal: valor("Valor sem IVA inválido."),
    taxTotal: valor("IVA inválido (escreva 0 se não tiver)."),
    description: texto({ max: 500 }),
  })
  .check(
    z.refine((d) => d.supplierId !== "" || d.supplierName.trim() !== "", { message: "Escolha o fornecedor ou escreva o nome.", path: ["supplierName"] }),
    z.refine((d) => d.supplierId !== "" || d.supplierTaxId.trim() !== "", { message: "Escreva o NIF do fornecedor.", path: ["supplierTaxId"] }),
    z.refine((d) => d.dueOn === "" || d.issuedOn === "" || d.dueOn >= d.issuedOn, { message: "O vencimento não pode ser antes da emissão.", path: ["dueOn"] }),
  );
type Dados = z.infer<typeof esquema>;
const CAMPOS = ["supplierId", "supplierName", "supplierTaxId", "supplierInvoiceNumber", "issuedOn", "dueOn", "currency", "netTotal", "taxTotal", "description"] as const;

function NovaFactura() {
  const navegar = useNavigate();
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const fornecedores = useFornecedoresActivos(aberto && pode("procurement.suppliers.read"));
  const registar = useRegistarFacturaCompra();
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const hoje = hojeIso();
  const inicial: Dados = { supplierId: "", supplierName: "", supplierTaxId: "", supplierInvoiceNumber: "", issuedOn: hoje, dueOn: hoje, currency: "AOA", netTotal: "", taxTotal: "0", description: "" };
  const form = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: inicial });
  const v = useWatch({ control: form.control });
  const escolhido = v.supplierId ?? "";
  const liq = lerDinheiroDigitado(v.netTotal ?? "", 2);
  const iva = lerDinheiroDigitado(v.taxTotal ?? "", 2);
  const total = liq && iva ? (liq.plus(iva) as Dinheiro) : null;
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      form.reset(inicial);
      registar.reset();
      setSoltas([]);
    }
  };
  const e = form.formState.errors;
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar factura
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo="Registar factura de compra"
        descricao="A factura que o fornecedor emitiu. Fica a pagar até haver um pedido de pagamento executado."
        rotuloConfirmar="Registar factura"
        aCarregar={registar.isPending}
        erro={
          soltas.length > 0 ? (
            <Alert tom="erro" titulo="Não foi possível registar.">
              {soltas.join(" ")}
            </Alert>
          ) : registar.error && !(eApiError(registar.error) && registar.error.status === 400) ? (
            <ErrorPanel erro={registar.error} />
          ) : undefined
        }
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid max-h-[60vh] gap-4 overflow-y-auto px-0.5 sm:grid-cols-2"
          onSubmit={form.handleSubmit((d) => {
            if (registar.isPending) return;
            setSoltas([]);
            const f = fornecedores.data?.items.find((x) => x.supplierId === d.supplierId);
            registar.mutate(
              {
                supplierInvoiceNumber: d.supplierInvoiceNumber,
                supplierId: f ? f.supplierId : null,
                purchaseOrderId: null,
                supplierName: f ? f.name : d.supplierName,
                supplierTaxId: f ? f.taxId : d.supplierTaxId,
                issuedOn: d.issuedOn,
                dueOn: d.dueOn,
                currency: d.currency,
                netTotal: paraApi(lerDinheiroDigitado(d.netTotal, 2) as Dinheiro),
                taxTotal: paraApi(lerDinheiroDigitado(d.taxTotal, 2) as Dinheiro),
                description: d.description === "" ? null : d.description,
              },
              { onSuccess: (r) => void navegar(`/facturas-compra/${r.purchaseInvoiceId}`), onError: (er) => setSoltas(aplicarErrosDoServidor(er, form.setError, CAMPOS)) },
            );
          })}
        >
          {pode("procurement.suppliers.read") ? (
            <Field rotulo="Fornecedor" erro={e.supplierId?.message} className="sm:col-span-2" ajuda={fornecedores.data && fornecedores.data.total > fornecedores.data.items.length ? `Só aparecem os primeiros ${String(fornecedores.data.items.length)} de ${String(fornecedores.data.total)}.` : undefined}>
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} aria-busy={fornecedores.isPending || undefined} {...form.register("supplierId")}>
                  <option value="">Não registado (escrever abaixo)</option>
                  {(fornecedores.data?.items ?? []).map((f) => (
                    <option key={f.supplierId} value={f.supplierId}>
                      {f.name} · {f.taxId}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          {escolhido === "" ? (
            <>
              <Field rotulo="Nome do fornecedor" erro={e.supplierName?.message}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("supplierName")} />}
              </Field>
              <Field rotulo="NIF do fornecedor" erro={e.supplierTaxId?.message}>
                {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("supplierTaxId")} />}
              </Field>
            </>
          ) : null}
          <Field rotulo="Número da factura" erro={e.supplierInvoiceNumber?.message} ajuda="Como vem na factura do fornecedor.">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("supplierInvoiceNumber")} />}
          </Field>
          <Field rotulo="Moeda" erro={e.currency?.message}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} {...form.register("currency")}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Emitida em" erro={e.issuedOn?.message}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} {...form.register("issuedOn")} />}
          </Field>
          <Field rotulo="Vence em" erro={e.dueOn?.message}>
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} {...form.register("dueOn")} />}
          </Field>
          <Field rotulo="Valor sem IVA" erro={e.netTotal?.message}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} {...form.register("netTotal")} />}
          </Field>
          <Field rotulo="IVA" erro={e.taxTotal?.message}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} {...form.register("taxTotal")} />}
          </Field>
          <p className="text-sm text-muted-foreground sm:col-span-2" aria-live="polite">
            Total: <span className="font-medium tabular-nums text-foreground">{total ? formatarMoeda(total, v.currency ?? "AOA") : "—"}</span>
          </p>
          <Field rotulo="Descrição" erro={e.description?.message} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("description")} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/** A factura só tem dois estados (Facto: `InvoiceStatus`); o pagamento vê-se nos pedidos. */
export function EstadoFacturaCompra({ f }: { f: Pick<FacturaCompra, "status"> }) {
  if (f.status === "Cancelled") return <Badge tom="erro">Anulada</Badge>;
  if (f.status === "Normal") return <Badge tom="sucesso">Registada</Badge>;
  return <Badge>{f.status}</Badge>;
}

export default function FacturasCompra() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const idAte = useId();
  const venceAte = IsoDate.safeParse(params.get("vence") ?? "").success ? (params.get("vence") as string) : null;
  const facturas = useFacturasCompra({ pagina, tamanho, venceAte });
  const colunas: Coluna<FacturaCompra>[] = [
    {
      id: "numero",
      cabecalho: "Número",
      celula: (f) => (
        <Link to={`/facturas-compra/${f.purchaseInvoiceId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {f.supplierInvoiceNumber}
        </Link>
      ),
    },
    { id: "fornecedor", cabecalho: "Fornecedor", esconderAte: "sm", celula: (f) => f.supplierName, className: "max-w-[14rem] truncate" },
    { id: "emitida", cabecalho: "Emitida", esconderAte: "lg", celula: (f) => formatarData(f.issuedOn) },
    { id: "vence", cabecalho: "Vence", esconderAte: "md", celula: (f) => formatarData(f.dueOn) },
    { id: "total", cabecalho: "Total", alinhar: "direita", celula: (f) => moeda(f.grossTotal, f.currency) },
    { id: "estado", cabecalho: "Estado", celula: (f) => <EstadoFacturaCompra f={f} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Facturas de compra"
        descricao="As facturas dos fornecedores. Pagam-se por pedido de pagamento, que passa por aprovação."
        accao={
          <Can requer="finance.payables.write">
            <NovaFactura />
          </Can>
        }
      />
      <div className="mb-4 flex flex-col gap-1.5 sm:w-60">
        <label htmlFor={idAte} className="text-sm font-medium text-foreground">
          Vencem até
        </label>
        <Input
          id={idAte}
          type="date"
          value={venceAte ?? ""}
          onChange={(e) =>
            setParams((a) => {
              const n = new URLSearchParams(a);
              if (e.target.value) n.set("vence", e.target.value);
              else n.delete("vence");
              n.delete("pagina");
              return n;
            })
          }
        />
      </div>
      <Tabela
        rotulo="Facturas de compra"
        colunas={colunas}
        linhas={facturas.data?.items}
        chave={(f) => f.purchaseInvoiceId}
        aCarregar={facturas.isPending}
        erro={facturas.error ? <ErrorPanel erro={facturas.error} tentarDeNovo={() => void facturas.refetch()} /> : undefined}
        vazio={venceAte ? "Nenhuma factura vence até essa data." : "Ainda não há facturas de compra."}
        rodape={facturas.data && facturas.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={facturas.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
