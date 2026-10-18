/** Os campos de um lead (novo ou a corrigir). */
import type { Dispatch, SetStateAction } from "react";
import { Textarea } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import type { Lead } from "./api";
import type { CamposLead } from "./regras";

export const LEAD_VAZIO: CamposLead = { nome: "", empresa: "", email: "", telefone: "", origem: "", notas: "" };

export const camposDoLead = (l: Lead): CamposLead => ({ nome: l.name, empresa: l.company ?? "", email: l.email ?? "", telefone: l.phone ?? "", origem: l.source ?? "", notas: l.notes ?? "" });

export function CamposDoLead({ v, setV, erros }: { v: CamposLead; setV: Dispatch<SetStateAction<CamposLead>>; erros: Partial<Record<keyof CamposLead, string | undefined>> }) {
  const campo = (k: keyof CamposLead) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field rotulo="Nome de quem contactar" erro={erros.nome}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={campo("nome")} />}
      </Field>
      <Field rotulo="Empresa (opcional)" erro={erros.empresa}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.empresa} onChange={campo("empresa")} />}
      </Field>
      <Field rotulo="E-mail (opcional)" erro={erros.email}>
        {({ id, descricao, invalido }) => <Input id={id} type="email" maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.email} onChange={campo("email")} />}
      </Field>
      <Field rotulo="Telefone (opcional)" erro={erros.telefone}>
        {({ id, descricao, invalido }) => <Input id={id} type="tel" maxLength={50} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.telefone} onChange={campo("telefone")} />}
      </Field>
      <Field rotulo="Origem (opcional)" ajuda="Por exemplo: feira, site, indicação." erro={erros.origem} className="sm:col-span-2">
        {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.origem} onChange={campo("origem")} />}
      </Field>
      <Field rotulo="Notas (opcional)" erro={erros.notas} className="sm:col-span-2">
        {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={2000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={campo("notas")} />}
      </Field>
    </div>
  );
}
