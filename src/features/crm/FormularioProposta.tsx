/** Os campos de uma proposta (nova ou a corrigir). */
import type { Dispatch, SetStateAction } from "react";
import { Select, Textarea } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { useOportunidades } from "./api";
import { useNomes } from "./comum";
import { useModelos, type CamposProposta, type Proposta } from "./propostas";
import { MOEDAS } from "./regras";

export const PROPOSTA_VAZIA: CamposProposta = { titulo: "", para: "cliente", cliente: "", lead: "", oportunidade: "", moeda: "AOA", validade: "", modelo: "", texto: "", notas: "" };

export const camposDaProposta = (p: Proposta): CamposProposta => ({
  titulo: p.title,
  para: p.customerId ? "cliente" : "lead",
  cliente: p.customerId ?? "",
  lead: p.leadId ?? "",
  oportunidade: p.opportunityId ?? "",
  moeda: p.currency,
  validade: p.validUntil ?? "",
  modelo: "",
  texto: p.body ?? "",
  notas: p.notes ?? "",
});

export function CamposDaProposta({
  v,
  setV,
  erros,
  nova,
}: {
  v: CamposProposta;
  setV: Dispatch<SetStateAction<CamposProposta>>;
  erros: Partial<Record<keyof CamposProposta, string | undefined>>;
  nova: boolean;
}) {
  const nomes = useNomes();
  const modelos = useModelos(false, nova);
  const oportunidades = useOportunidades({ etapa: null, cliente: null }, nova);
  const campo = (k: keyof CamposProposta) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const abertas = (oportunidades.data ?? []).filter(
    (o) => o.stage !== "Won" && o.stage !== "Lost" && (v.para === "cliente" ? v.cliente !== "" && o.customerId === v.cliente : v.lead !== "" && o.leadId === v.lead),
  );
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field rotulo="Título" erro={erros.titulo} className="sm:col-span-3">
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={campo("titulo")} />}
      </Field>
      {nova ? (
        <>
          <Field rotulo="Para">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.para} onChange={(e) => setV((x) => ({ ...x, para: e.target.value as "cliente" | "lead", oportunidade: "" }))}>
                <option value="cliente">Um cliente</option>
                <option value="lead">Um lead</option>
              </Select>
            )}
          </Field>
          {v.para === "cliente" ? (
            <Field rotulo="Cliente" erro={erros.cliente} className="sm:col-span-2">
              {({ id, descricao, invalido }) => (
                <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.cliente} onChange={(e) => setV((x) => ({ ...x, cliente: e.target.value, oportunidade: "" }))}>
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
                <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.lead} onChange={(e) => setV((x) => ({ ...x, lead: e.target.value, oportunidade: "" }))}>
                  <option value="">Escolha…</option>
                  {nomes.leads
                    .filter((l) => l.status !== "Converted" && l.status !== "Disqualified")
                    .map((l) => (
                      <option key={l.leadId} value={l.leadId}>
                        {l.company ? `${l.name} (${l.company})` : l.name}
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          )}
          <Field rotulo="Oportunidade (opcional)" className="sm:col-span-2">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.oportunidade} onChange={campo("oportunidade")}>
                <option value="">{abertas.length === 0 ? "Nenhuma oportunidade aberta" : "Nenhuma"}</option>
                {abertas.map((o) => (
                  <option key={o.opportunityId} value={o.opportunityId}>
                    {o.title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Moeda" ajuda="Não muda depois.">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.moeda} onChange={campo("moeda")}>
                {MOEDAS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            )}
          </Field>
        </>
      ) : null}
      <Field rotulo="Válida até (opcional)" erro={erros.validade}>
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.validade} onChange={campo("validade")} />}
      </Field>
      {nova ? (
        <Field rotulo="Modelo (opcional)" ajuda="Com modelo e sem texto, o texto vem do modelo, com o cliente, o título e a validade preenchidos." className="sm:col-span-2">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={v.modelo} onChange={campo("modelo")}>
              <option value="">Nenhum</option>
              {(modelos.data ?? []).map((m) => (
                <option key={m.templateId} value={m.templateId}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      <Field rotulo="Texto (opcional)" ajuda="Texto simples; aparece no PDF antes das linhas." className="sm:col-span-3">
        {({ id, descricao }) => <Textarea id={id} rows={6} aria-describedby={descricao} value={v.texto} onChange={campo("texto")} />}
      </Field>
      <Field rotulo="Notas (opcional)" ajuda="Aparecem no fim do PDF." erro={erros.notas} className="sm:col-span-3">
        {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={campo("notas")} />}
      </Field>
    </div>
  );
}
