/** Peças partilhadas das compras: estados, editor de linhas e nomes de colaboradores (só a quem lê os RH). */
import { Plus, Trash2 } from "lucide-react";
import { moeda } from "@/features/facturacao";
import { useUtilizador } from "@/features/identity";
import { useNomeColaborador } from "@/features/rh";
import { Badge, type TomBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Field, Input } from "@/ui/Field";
import { linhaVazia, totalLinhas, type LinhaRascunho } from "./regras";

function estado(mapa: Record<string, { texto: string; tom: TomBadge }>) {
  return function Estado({ estado: e }: { estado: string }) {
    const x = mapa[e];
    return <Badge tom={x?.tom ?? "neutro"}>{x?.texto ?? e}</Badge>;
  };
}

export const EstadoRequisicao = estado({
  Draft: { texto: "Rascunho", tom: "neutro" },
  PendingApproval: { texto: "Por aprovar", tom: "aviso" },
  Approved: { texto: "Aprovada", tom: "sucesso" },
  Refused: { texto: "Recusada", tom: "erro" },
  Cancelled: { texto: "Cancelada", tom: "neutro" },
});

export const ESTADOS_REQUISICAO: Record<string, string> = { Draft: "Rascunho", PendingApproval: "Por aprovar", Approved: "Aprovada", Refused: "Recusada", Cancelled: "Cancelada" };

export function EstadoOrdem({ estado: e, recebida }: { estado: string; recebida: boolean }) {
  if (e === "Cancelled") return <Badge>Cancelada</Badge>;
  return recebida ? <Badge tom="sucesso">Recebida</Badge> : <Badge tom="info">Emitida</Badge>;
}

export const EstadoRecepcao = estado({
  Registered: { texto: "Registada", tom: "sucesso" },
  Cancelled: { texto: "Anulada", tom: "neutro" },
});

/** Nome do colaborador; quem não lê os RH vê «Colaborador» (nunca o id — B29). */
export function useNomePessoa() {
  const { pode } = useUtilizador();
  const le = pode("hr.employees.read");
  const nomeDe = useNomeColaborador();
  return (id: string) => (le ? nomeDe(id) : "Colaborador");
}

export const valor = (v: number | string, m: string) => moeda(v, m);

/** Linhas editáveis (descrição, quantidade, preço), com o total estimado. */
export function EditorLinhas({
  linhas,
  mudar,
  erros,
  rotuloPreco,
  moeda: m,
}: {
  linhas: LinhaRascunho[];
  mudar: (l: LinhaRascunho[]) => void;
  erros: Record<number, string>;
  rotuloPreco: string;
  moeda: string;
}) {
  const campo = (i: number, k: keyof LinhaRascunho, v: string) => mudar(linhas.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  return (
    <fieldset className="flex flex-col gap-3 sm:col-span-2">
      <legend className="mb-2 text-sm font-medium text-foreground">Linhas</legend>
      {linhas.map((l, i) => (
        <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_7rem_10rem_auto] sm:items-end">
          <Field rotulo={`Descrição da linha ${i + 1}`} erro={erros[i]}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={500} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={l.descricao} onChange={(e) => campo(i, "descricao", e.target.value)} />}
          </Field>
          <Field rotulo={`Quantidade da linha ${i + 1}`}>
            {({ id, descricao }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} value={l.quantidade} onChange={(e) => campo(i, "quantidade", e.target.value)} />}
          </Field>
          <Field rotulo={`${rotuloPreco} da linha ${i + 1}`}>
            {({ id, descricao }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} value={l.preco} onChange={(e) => campo(i, "preco", e.target.value)} />}
          </Field>
          <Button type="button" variante="ghost" tamanho="sm" disabled={linhas.length === 1} aria-label={`Tirar a linha ${i + 1}`} onClick={() => mudar(linhas.filter((_, j) => j !== i))}>
            <Trash2 strokeWidth={1.75} aria-hidden />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variante="secondary" tamanho="sm" disabled={linhas.length >= 100} onClick={() => mudar([...linhas, linhaVazia()])}>
          <Plus strokeWidth={1.75} aria-hidden />
          Juntar linha
        </Button>
        <p className="text-sm tabular-nums text-muted-foreground">
          Total estimado: <span className="font-medium text-foreground">{moeda(totalLinhas(linhas).toFixed(2), m)}</span>
        </p>
      </div>
    </fieldset>
  );
}
