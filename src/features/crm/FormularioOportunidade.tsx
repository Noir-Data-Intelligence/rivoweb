/** Os campos de uma oportunidade (nova ou a corrigir). */
import type { Dispatch, SetStateAction } from "react";
import { Select, Textarea } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import type { Oportunidade } from "./api";
import { useNomes } from "./comum";
import { MOEDAS, type CamposOportunidade } from "./regras";

export const OPORTUNIDADE_VAZIA: CamposOportunidade = { titulo: "", para: "cliente", cliente: "", lead: "", valor: "", moeda: "AOA", probabilidade: "", fecho: "", notas: "" };

export const camposDaOportunidade = (o: Oportunidade): CamposOportunidade => ({
  titulo: o.title,
  para: o.customerId ? "cliente" : "lead",
  cliente: o.customerId ?? "",
  lead: o.leadId ?? "",
  valor: String(o.estimatedValue).replace(".", ","),
  moeda: o.currency,
  probabilidade: String(o.probability),
  fecho: o.expectedCloseDate ?? "",
  notas: o.notes ?? "",
});

export function CamposDaOportunidade({
  v,
  setV,
  erros,
  nova,
}: {
  v: CamposOportunidade;
  setV: Dispatch<SetStateAction<CamposOportunidade>>;
  erros: Partial<Record<keyof CamposOportunidade, string | undefined>>;
  nova: boolean;
}) {
  const nomes = useNomes();
  const campo = (k: keyof CamposOportunidade) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const leadsAbertos = nomes.leads.filter((l) => l.status !== "Converted" && l.status !== "Disqualified");
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field rotulo="Título" erro={erros.titulo} className="sm:col-span-3">
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={campo("titulo")} />}
      </Field>
      {nova ? (
        <>
          <Field rotulo="De">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.para} onChange={(e) => setV((x) => ({ ...x, para: e.target.value as "cliente" | "lead" }))}>
                <option value="cliente">Um cliente</option>
                <option value="lead">Um lead</option>
              </Select>
            )}
          </Field>
          {v.para === "cliente" ? (
            <Field rotulo="Cliente" erro={erros.cliente} className="sm:col-span-2">
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.cliente} onChange={campo("cliente")}>
                  <option value="">Escolha…</option>
                  {nomes.clientes
                    .filter((c) => c.status === "Active")
                    .map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          ) : (
            <Field rotulo="Lead" erro={erros.lead} className="sm:col-span-2">
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.lead} onChange={campo("lead")}>
                  <option value="">Escolha…</option>
                  {leadsAbertos.map((l) => (
                    <option key={l.leadId} value={l.leadId}>
                      {l.company ? `${l.name} (${l.company})` : l.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </>
      ) : null}
      <Field rotulo="Valor estimado" erro={erros.valor}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.valor} onChange={campo("valor")} />}
      </Field>
      <Field rotulo="Moeda">
        {({ id, descricao }) => (
          <Select id={id} aria-describedby={descricao} value={v.moeda} onChange={campo("moeda")}>
            {MOEDAS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field rotulo="Probabilidade (%)" ajuda={nova ? "Vazio, fica 10%." : undefined} erro={erros.probabilidade}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" maxLength={3} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.probabilidade} onChange={campo("probabilidade")} />}
      </Field>
      <Field rotulo="Fecho previsto (opcional)" erro={erros.fecho}>
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.fecho} onChange={campo("fecho")} />}
      </Field>
      <Field rotulo="Notas (opcional)" erro={erros.notas} className="sm:col-span-3">
        {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={campo("notas")} />}
      </Field>
    </div>
  );
}
