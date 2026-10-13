import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog, DialogClose, DialogContent } from "./Dialog";

/**
 * Confirmação de uma acção com efeito. O botão de confirmar fica bloqueado
 * enquanto o pedido corre (S21) e o erro aparece dentro do diálogo, sem o
 * fechar.
 */
export function Confirmar({
  aberto,
  aoMudar,
  titulo,
  descricao,
  children,
  rotuloConfirmar,
  variante = "primary",
  aCarregar = false,
  erro,
  aoConfirmar,
  formulario,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
  rotuloConfirmar: string;
  variante?: "primary" | "destructive";
  aCarregar?: boolean;
  erro?: ReactNode;
  /** Sem `formulario`, o clique chama isto. */
  aoConfirmar?: () => void;
  /** Id de um `<form>` dentro de `children`: o botão submete-o. */
  formulario?: string;
}) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => (aCarregar ? undefined : aoMudar(a))}>
      <DialogContent titulo={titulo} descricao={descricao}>
        {erro ? <div className="mb-4">{erro}</div> : null}
        {children}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button variante="secondary" disabled={aCarregar}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            variante={variante}
            aCarregar={aCarregar}
            {...(formulario ? { type: "submit" as const, form: formulario } : { onClick: aoConfirmar })}
          >
            {rotuloConfirmar}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
