/**
 * Vender um bem do activo pela própria factura (ADR-107, PR #144): uma FT ou
 * FR com uma linha de bens, na moeda do activo. Na emissão o bem fica abatido
 * na data da factura, a dívida do cliente vai para a 37.2 e o líquido para a
 * 68.3 (ganho) ou 78.3 (perda). Anular a factura repõe o bem.
 */
import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { useClientesActivos } from "@/features/clientes";
import { useUtilizador } from "@/features/identity";
import { CampoContaOndeEntrou, useContaOndeEntrou } from "@/features/tesouraria";
import { hojeIso } from "@/lib/format/data";
import { lerDinheiroDigitado, paraApi } from "@/lib/money/money";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { IsoDate } from "@/lib/validation/text";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { usePautas, useSeries, useVenderActivo } from "./api";
import { AVISO_DEFINITIVO, MEIOS, moeda, NOME_TIPO } from "./comum";

export type ActivoAVender = { assetId: string; code: string; name: string; currency: string; netBookValue: number | string; acquiredOn: string };

/** Erros do formulário de venda (vazio: pode emitir). */
export function errosVenda(v: { tipo: string; data: string; meio: string; descricao: string; preco: string; imposto: string }, adquiridoEm: string) {
  const e: Partial<Record<"data" | "meio" | "descricao" | "preco" | "imposto", string>> = {};
  if (!IsoDate.safeParse(v.data).success) e.data = "Data inválida.";
  else if (v.data < adquiridoEm) e.data = "Não pode ser antes da aquisição.";
  if (v.tipo === "FR" && v.meio === "") e.meio = "Uma factura-recibo é paga no acto: indique o meio.";
  if (normalizarTexto(v.descricao) === "") e.descricao = "Escreva a descrição.";
  if (!(lerDinheiroDigitado(v.preco, 2)?.gt(0) ?? false)) e.preco = "Preço de venda maior que zero, até 2 casas.";
  if (v.imposto.trim() === "") e.imposto = "Escolha o imposto.";
  return e;
}

export function VenderActivo({ activo }: { activo: ActivoAVender }) {
  const navegar = useNavigate();
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const inicial = { cliente: "", tipo: "FT" as "FT" | "FR", serie: "", data: hojeIso(), vencimento: "", meio: "", descricao: `Venda de ${activo.name} (${activo.code})`, preco: "", imposto: "NOR" };
  const [v, setV] = useState(inicial);
  const [conta, setConta] = useState("");
  const [tentou, setTentou] = useState(false);
  const clientes = useClientesActivos(aberto);
  const series = useSeries(aberto);
  const leTaxas = pode("fiscal.rates.read");
  const pautas = usePautas(aberto && leTaxas);
  const vender = useVenderActivo();
  const contaFr = useContaOndeEntrou(aberto && v.tipo === "FR", activo.currency, v.meio);
  const idForm = useId();
  const erros = errosVenda(v, activo.acquiredOn);
  const erroConta = contaFr.pede && conta === "" ? "Escolha a conta bancária." : undefined;
  const codigosIva = leTaxas ? (pautas.data ?? []).filter((p) => (p.kind === 0 || String(p.kind) === "ValueAdded") && !p.requiresExemptionCode).map((p) => p.code) : ["NOR"];
  const mudar = <K extends keyof typeof inicial>(k: K, x: (typeof inicial)[K]) => setV((y) => ({ ...y, [k]: x }));
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        Vender pela factura
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            vender.reset();
            setTentou(false);
            setV(inicial);
            setConta("");
          }
        }}
        largo
        titulo={`Vender ${activo.code} · ${activo.name}`}
        descricao={`Emite uma factura de bens em ${activo.currency} com uma linha. O bem fica abatido na data da factura; a dívida vai para a 37.2 e o resultado para a 68.3 (ganho) ou 78.3 (perda), contra o valor líquido de ${moeda(activo.netBookValue, activo.currency)}. ${AVISO_DEFINITIVO} Anular a factura repõe o bem.`}
        rotuloConfirmar="Emitir factura"
        aCarregar={vender.isPending}
        erro={vender.error ? <ErrorPanel erro={vender.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            const preco = lerDinheiroDigitado(v.preco, 2);
            if (Object.keys(erros).length > 0 || !preco || erroConta || contaFr.aCarregar || vender.isPending) return;
            vender.mutate(
              {
                customerId: v.cliente || null,
                series: v.serie || null,
                issuedOn: v.data,
                taxPointDate: null,
                currency: activo.currency,
                documentType: v.tipo,
                dueDate: v.tipo === "FT" && v.vencimento ? v.vencimento : null,
                paymentTerms: null,
                withholdingRate: null,
                paymentMethod: v.tipo === "FR" ? v.meio : null,
                referencedInvoiceId: null,
                bankAccountId: v.tipo === "FR" && contaFr.pede ? conta : null,
                fixedAssetId: activo.assetId,
                lines: [{ description: normalizarTexto(v.descricao), quantity: "1", unitPrice: paraApi(preco), taxCode: v.imposto.trim().toUpperCase(), kind: "Goods" }],
              },
              { onSuccess: (r) => void navegar(`/facturas/${r.invoiceId}`) },
            );
          }}
        >
          <Field rotulo="Cliente" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.cliente} onChange={(e) => mudar("cliente", e.target.value)}>
                <option value="">Consumidor final</option>
                {(clientes.data?.items ?? []).map((c) => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.name} · NIF {c.taxId}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Tipo">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => (mudar("tipo", e.target.value as "FT" | "FR"), mudar("serie", ""))}>
                {(["FT", "FR"] as const).map((t) => (
                  <option key={t} value={t}>
                    {t} · {NOME_TIPO[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Série" ajuda="Sem escolha, usa a série por omissão do tipo.">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.serie} onChange={(e) => mudar("serie", e.target.value)}>
                <option value="">Série por omissão</option>
                {(series.data ?? [])
                  .filter((s) => s.type === v.tipo && s.isActive)
                  .map((s) => (
                    <option key={s.seriesId} value={s.code}>
                      {s.type} {s.code}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Data da factura" erro={tentou ? erros.data : undefined} ajuda="O bem fica abatido nesta data.">
            {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.data} onChange={(e) => mudar("data", e.target.value)} />}
          </Field>
          {v.tipo === "FR" ? (
            <Field rotulo="Meio de pagamento" erro={tentou ? erros.meio : undefined}>
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.meio} onChange={(e) => (mudar("meio", e.target.value), setConta(""))}>
                  <option value="">Escolha…</option>
                  {Object.entries(MEIOS).map(([k, n]) => (
                    <option key={k} value={k}>
                      {n}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <Field rotulo="Vencimento" ajuda="Opcional. Sem data, vence no dia da emissão.">
              {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={v.vencimento} onChange={(e) => mudar("vencimento", e.target.value)} />}
            </Field>
          )}
          {v.tipo === "FR" && contaFr.pede ? (
            <div className="sm:col-span-2">
              <CampoContaOndeEntrou contas={contaFr.contas} valor={conta} mudar={setConta} erro={tentou ? erroConta : undefined} />
            </div>
          ) : null}
          <Field rotulo="Descrição" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2" ajuda="A linha da factura, de bens (61).">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => mudar("descricao", e.target.value)} />}
          </Field>
          <Field rotulo={`Preço de venda sem IVA (${activo.currency})`} erro={tentou ? erros.preco : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.preco} onChange={(e) => mudar("preco", e.target.value)} />}
          </Field>
          <Field rotulo="Imposto" erro={tentou ? erros.imposto : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.imposto} onChange={(e) => mudar("imposto", e.target.value)}>
                {(codigosIva.includes(v.imposto) ? codigosIva : [v.imposto, ...codigosIva]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}
