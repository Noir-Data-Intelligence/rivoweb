/** Peças comuns da contabilidade: ano e período no URL, nomes dos valores do servidor. */
import { useId } from "react";
import { useSearchParams } from "react-router";
import { hojeIso } from "@/lib/format/data";
import { nomeMes } from "@/lib/format/periodo";
import { Select } from "@/ui/Controlos";

export const anoCorrente = () => Number(hojeIso().slice(0, 4));

/** Os últimos seis anos, do corrente para trás. */
export const anosEscolha = () => Array.from({ length: 6 }, (_, i) => anoCorrente() - i);

/** Ano (`?ano=`) e período (`?periodo=` de 1 a 12; vazio = ano inteiro) no URL. */
export function useAnoPeriodo() {
  const [params, setParams] = useSearchParams();
  const a = Number(params.get("ano"));
  const ano = Number.isInteger(a) && a >= 2000 && a <= anoCorrente() + 1 ? a : anoCorrente();
  const p = Number(params.get("periodo"));
  const periodo = params.get("periodo") !== null && Number.isInteger(p) && p >= 1 && p <= 12 ? p : null;
  const mudar = (chave: "ano" | "periodo", valor: string) =>
    setParams((actual) => {
      const n = new URLSearchParams(actual);
      if (valor === "") n.delete(chave);
      else n.set(chave, valor);
      return n;
    });
  return { ano, periodo, mudar };
}

export function EscolhaAnoPeriodo({ ano, periodo, mudar, comPeriodo = true }: { ano: number; periodo: number | null; mudar: (c: "ano" | "periodo", v: string) => void; comPeriodo?: boolean }) {
  const idAno = useId();
  const idPeriodo = useId();
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <div className="flex w-32 flex-col gap-1.5">
        <label htmlFor={idAno} className="text-sm font-medium text-foreground">
          Ano
        </label>
        <Select id={idAno} value={ano} onChange={(e) => mudar("ano", e.target.value)}>
          {anosEscolha().map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>
      </div>
      {comPeriodo ? (
        <div className="flex w-44 flex-col gap-1.5">
          <label htmlFor={idPeriodo} className="text-sm font-medium text-foreground">
            Período
          </label>
          <Select id={idPeriodo} value={periodo ?? ""} onChange={(e) => mudar("periodo", e.target.value)}>
            <option value="">Ano inteiro</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m} · {nomeMes(m)}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export const NOME_LADO: Readonly<Record<string, string>> = { Debit: "Débito", Credit: "Crédito" };

/** `TransactionType` do SAF-T AO. */
export const TIPOS_LANCAMENTO = [
  { valor: "N", texto: "Normal" },
  { valor: "R", texto: "Regularização do período de tributação" },
  { valor: "A", texto: "Apuramento de resultados" },
  { valor: "J", texto: "Ajustamento" },
] as const;

/** `GroupingCategory` do SAF-T AO. */
export const CATEGORIAS_CONTA = [
  { valor: "GR", texto: "Geral · 1.º grau" },
  { valor: "GA", texto: "Geral · agregadora" },
  { valor: "GM", texto: "Geral · movimento" },
  { valor: "AR", texto: "Analítica · 1.º grau" },
  { valor: "AA", texto: "Analítica · agregadora" },
  { valor: "AM", texto: "Analítica · movimento" },
] as const;

export const CLASSES_REPORTE = [
  { valor: "Asset", texto: "Activo" },
  { valor: "Liability", texto: "Passivo" },
  { valor: "Equity", texto: "Capital próprio" },
  { valor: "Revenue", texto: "Proveitos" },
  { valor: "Expense", texto: "Custos" },
] as const;

export const EVENTOS = [
  { valor: "SalesInvoiceIssued", texto: "Factura de venda emitida" },
  { valor: "CreditNoteIssued", texto: "Nota de crédito emitida" },
  { valor: "ReceiptRegistered", texto: "Recibo registado" },
  { valor: "CashReceiptRegistered", texto: "Recibo em numerário ou cheque" },
  { valor: "ReceiptWithholding", texto: "Retenção na fonte num recibo" },
  { valor: "PurchaseInvoiceRegistered", texto: "Factura de compra registada" },
  { valor: "PaymentExecuted", texto: "Pagamento executado" },
  { valor: "ForeignCurrencyReceiptRegistered", texto: "Recibo por banco em moeda estrangeira" },
  { valor: "ForeignCurrencyPaymentExecuted", texto: "Pagamento em moeda estrangeira" },
  { valor: "ExpenseClaimApproved", texto: "Despesa de colaborador aprovada" },
  { valor: "ExpenseReimbursed", texto: "Despesa de colaborador reembolsada" },
  { valor: "ReceiptExchangeGain", texto: "Diferença de câmbio favorável no recebimento" },
  { valor: "ReceiptExchangeLoss", texto: "Diferença de câmbio desfavorável no recebimento" },
  { valor: "PaymentExchangeGain", texto: "Diferença de câmbio favorável no pagamento" },
  { valor: "PaymentExchangeLoss", texto: "Diferença de câmbio desfavorável no pagamento" },
] as const;

export const PARCELAS = [
  { valor: "Net", texto: "Líquido (base)" },
  { valor: "Tax", texto: "Imposto" },
  { valor: "Gross", texto: "Total (líquido + imposto)" },
  { valor: "NetGoods", texto: "Líquido dos bens (61 Vendas)" },
  { valor: "NetServices", texto: "Líquido dos serviços (62 Prestações de serviços)" },
] as const;

/** Mercado da regra (ADR-106): o país do cliente ou do fornecedor, diferente de AO, é estrangeiro. Sem mercado, serve os dois. */
export const MERCADOS = [
  { valor: "Domestic", texto: "Nacional" },
  { valor: "Foreign", texto: "Estrangeiro" },
] as const;

export const textoMercado = (m: string | null | undefined) => (m ? textoDe(MERCADOS, m) : "Os dois");

export const textoDe = (lista: readonly { valor: string; texto: string }[], valor: string) => lista.find((x) => x.valor === valor)?.texto ?? valor;
