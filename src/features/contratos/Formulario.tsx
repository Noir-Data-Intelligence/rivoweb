/** Os campos de um contrato de cliente (novo ou a corrigir). */
import type { Dispatch, SetStateAction } from "react";
import { useEscolhasComerciais } from "@/features/crm";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { TIPOS_CONTRATO, type TipoContrato } from "./api";
import type { CamposContrato } from "./regras";

export const MOEDAS = ["AOA", "USD", "EUR"] as const;

export const CONTRATO_VAZIO = (hoje: string): CamposContrato => ({
  referencia: "",
  titulo: "",
  cliente: "",
  tipo: "Commercial",
  inicio: hoje,
  fim: "",
  valor: "",
  moeda: "AOA",
  slaResposta: "",
  slaResolucao: "",
  aviso: "",
  autoRenovar: false,
  notas: "",
});

export function CamposDoContrato({
  v,
  setV,
  erros,
  novo,
}: {
  v: CamposContrato;
  setV: Dispatch<SetStateAction<CamposContrato>>;
  erros: Partial<Record<keyof CamposContrato, string | undefined>>;
  novo: boolean;
}) {
  // Os clientes activos, sem precisar de ler clientes (B35).
  const clientes = useEscolhasComerciais(novo);
  const campo = (k: keyof CamposContrato) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {novo ? (
        <>
          <Field rotulo="Referência" ajuda="Única (por exemplo, o número do contrato em papel)." erro={erros.referencia}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={60} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.referencia} onChange={campo("referencia")} />}
          </Field>
          <Field rotulo="Cliente" erro={erros.cliente} className="sm:col-span-2">
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={v.cliente} onChange={campo("cliente")}>
                <option value="">{clientes.isPending ? "A carregar…" : "Escolha…"}</option>
                {(clientes.data?.customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </>
      ) : null}
      <Field rotulo="Título" erro={erros.titulo} className={novo ? "sm:col-span-2" : "sm:col-span-3"}>
        {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={campo("titulo")} />}
      </Field>
      {novo ? (
        <Field rotulo="Tipo">
          {({ id, descricao }) => (
            <Select id={id} aria-describedby={descricao} value={v.tipo} onChange={(e) => setV((x) => ({ ...x, tipo: e.target.value as TipoContrato }))}>
              {Object.entries(TIPOS_CONTRATO).map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
      <Field rotulo="Início" erro={erros.inicio}>
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.inicio} onChange={campo("inicio")} />}
      </Field>
      <Field rotulo="Fim (opcional)" erro={erros.fim}>
        {({ id, descricao, invalido }) => <Input id={id} type="date" aria-describedby={descricao} invalido={invalido} value={v.fim} onChange={campo("fim")} />}
      </Field>
      <Field rotulo="Aviso de renovação (dias, opcional)" erro={erros.aviso}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.aviso} onChange={campo("aviso")} />}
      </Field>
      <Field rotulo="Valor (opcional)" erro={erros.valor} className="sm:col-span-2">
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
      <Field rotulo="SLA de resposta (horas, opcional)" erro={erros.slaResposta}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.slaResposta} onChange={campo("slaResposta")} />}
      </Field>
      <Field rotulo="SLA de resolução (horas, opcional)" erro={erros.slaResolucao}>
        {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.slaResolucao} onChange={campo("slaResolucao")} />}
      </Field>
      <div className="flex items-end pb-2">
        <Checkbox rotulo="Renova automaticamente" checked={v.autoRenovar} onChange={(e) => setV((x) => ({ ...x, autoRenovar: e.target.checked }))} />
      </div>
      <Field rotulo="Notas (opcional)" erro={erros.notas} className="sm:col-span-3">
        {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={4000} aria-describedby={descricao} invalido={invalido} value={v.notas} onChange={campo("notas")} />}
      </Field>
    </div>
  );
}
