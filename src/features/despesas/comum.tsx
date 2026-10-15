/** Peças partilhadas pelas despesas do backoffice e do portal. */
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/mini";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { hojeIso } from "@/lib/format/data";
import { lerDinheiroDigitado, paraApi, type Dinheiro } from "@/lib/money/money";
import { IsoDate, texto } from "@/lib/validation/text";
import { Badge } from "@/ui/Badge";
import { Select } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { CATEGORIAS } from "./api";

export function EstadoDespesa({ estado }: { estado: string }) {
  if (estado === "Submitted") return <Badge tom="aviso">Por decidir</Badge>;
  if (estado === "Approved") return <Badge tom="info">Aprovada</Badge>;
  if (estado === "Rejected") return <Badge tom="erro">Rejeitada</Badge>;
  if (estado === "Reimbursed") return <Badge tom="sucesso">Reembolsada</Badge>;
  if (estado === "Withdrawn") return <Badge>Retirada</Badge>;
  return <Badge>{estado}</Badge>;
}

export const NOME_ESTADO: Readonly<Record<string, string>> = {
  Submitted: "Por decidir",
  Approved: "Aprovadas",
  Rejected: "Rejeitadas",
  Reimbursed: "Reembolsadas",
  Withdrawn: "Retiradas",
};

const MOEDAS = ["AOA", "USD", "EUR"] as const;

const esquema = z.object({
  spentOn: z.string().check(
    z.refine((v) => IsoDate.safeParse(v).success, "Indique a data."),
    z.refine((v) => v <= hojeIso(), "A data não pode ser futura."),
  ),
  description: texto({ max: 300, obrigatorio: "Descreva a despesa." }),
  category: texto({ max: 100, obrigatorio: "Indique a categoria." }),
  amount: z.string().check(z.refine((v) => (lerDinheiroDigitado(v, 2)?.gt(0) ?? false), "Indique um valor maior que zero.")),
  currency: z.enum(MOEDAS),
});
type Dados = z.infer<typeof esquema>;
const CAMPOS = ["spentOn", "description", "category", "amount", "currency"] as const;

export type DespesaPreenchida = { spentOn: string; description: string; category: string; amount: string; currency: string; receiptDocumentId: string | null };

/**
 * Formulário de uma despesa. `antes` aparece no topo (por exemplo, o
 * colaborador). Ao submeter válido chama `aoSubmeter`; os erros do servidor
 * voltam por `erroServidor` (devolve as mensagens soltas).
 */
export function useFormularioDespesa() {
  const form = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { spentOn: hojeIso(), description: "", category: "", amount: "", currency: "AOA" } });
  const [comprovativo, setComprovativo] = useState<Documento | null>(null);
  return {
    form,
    comprovativo,
    setComprovativo,
    limpar: () => {
      form.reset({ spentOn: hojeIso(), description: "", category: "", amount: "", currency: "AOA" });
      setComprovativo(null);
    },
    erroServidor: (e: unknown) => aplicarErrosDoServidor(e, form.setError, CAMPOS, { receiptDocumentId: "description" }),
  };
}

export function FormularioDespesa({
  id,
  estado,
  antes,
  aoSubmeter,
}: {
  id: string;
  estado: ReturnType<typeof useFormularioDespesa>;
  antes?: ReactNode;
  aoSubmeter: (d: DespesaPreenchida) => void;
}) {
  const { form, comprovativo, setComprovativo } = estado;
  const idLista = useId();
  const e = form.formState.errors;
  return (
    <form
      id={id}
      noValidate
      className="grid max-h-[60vh] gap-4 overflow-y-auto px-0.5 sm:grid-cols-2"
      onSubmit={form.handleSubmit((d) =>
        aoSubmeter({
          spentOn: d.spentOn,
          description: d.description,
          category: d.category,
          amount: paraApi(lerDinheiroDigitado(d.amount, 2) as Dinheiro),
          currency: d.currency,
          receiptDocumentId: comprovativo?.documentId ?? null,
        }),
      )}
    >
      {antes}
      <Field rotulo="Data" erro={e.spentOn?.message}>
        {({ id: i, descricao, invalido }) => <Input id={i} type="date" max={hojeIso()} aria-describedby={descricao} invalido={invalido} {...form.register("spentOn")} />}
      </Field>
      <Field rotulo="Categoria" erro={e.category?.message} ajuda="Escolha uma das sugestões ou escreva outra.">
        {({ id: i, descricao, invalido }) => (
          <>
            <Input id={i} list={idLista} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("category")} />
            <datalist id={idLista}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      <Field rotulo="Descrição" erro={e.description?.message} className="sm:col-span-2">
        {({ id: i, descricao, invalido }) => <Input id={i} maxLength={300} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("description")} />}
      </Field>
      <Field rotulo="Valor" erro={e.amount?.message}>
        {({ id: i, descricao, invalido }) => <Input id={i} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} {...form.register("amount")} />}
      </Field>
      <Field rotulo="Moeda" erro={e.currency?.message}>
        {({ id: i, descricao, invalido }) => (
          <Select id={i} aria-describedby={descricao} invalido={invalido} {...form.register("currency")}>
            {MOEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="sm:col-span-2">
        <CarregarFicheiro rotulo="Comprovativo (opcional)" categoria="Comprovativo de despesa" documento={comprovativo} aoMudar={setComprovativo} />
      </div>
    </form>
  );
}
