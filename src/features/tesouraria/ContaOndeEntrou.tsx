/**
 * A conta onde entrou o dinheiro de um recebimento por banco (ADR-099): só
 * as contas abertas na moeda do documento, a quem lê as contas bancárias. Sem
 * essa permissão, ou sem contas da moeda, o campo não aparece e o documento
 * segue sem conta (o servidor aceita).
 */
import { useUtilizador } from "@/features/identity";
import { Select } from "@/ui/Controlos";
import { Field } from "@/ui/Field";
import { useContasAbertas, type Conta } from "./api";
import { MEIOS_POR_BANCO } from "./regras";

/** `pede`: o meio é por banco e há contas da moeda; `aCarregar`: ainda não se sabe (não enviar). */
export function useContaOndeEntrou(activo: boolean, moeda: string, meio: string) {
  const { pode } = useUtilizador();
  const porBanco = MEIOS_POR_BANCO.includes(meio);
  const le = pode("finance.payables.read");
  const q = useContasAbertas(activo && porBanco && le);
  const contas: Conta[] = (q.data?.items ?? []).filter((c) => c.currency === moeda);
  return { contas, pede: porBanco && contas.length > 0, aCarregar: activo && porBanco && le && q.isPending };
}

export function CampoContaOndeEntrou({ contas, valor, mudar, erro }: { contas: readonly Conta[]; valor: string; mudar: (v: string) => void; erro?: string | undefined }) {
  return (
    <Field rotulo="Conta onde entrou" erro={erro} ajuda="O valor entra no saldo desta conta e fica no extracto.">
      {({ id, descricao, invalido }) => (
        <Select id={id} aria-describedby={descricao} invalido={invalido} value={valor} onChange={(e) => mudar(e.target.value)}>
          <option value="">Escolha…</option>
          {contas.map((c) => (
            <option key={c.accountId} value={c.accountId}>
              {c.name}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
