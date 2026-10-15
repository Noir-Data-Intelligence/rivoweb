import { useId, useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "./Button";
import { Confirmar } from "./Confirmar";
import { Textarea } from "./Controlos";
import { Field } from "./Field";

/**
 * Botão que abre uma confirmação com motivo (anular, cancelar, fechar,
 * rejeitar). O motivo é obrigatório salvo `opcional`; vai aparado.
 */
export function ConfirmarComMotivo({
  rotuloBotao,
  icone,
  varianteBotao = "ghost",
  titulo,
  descricao,
  rotuloConfirmar,
  variante = "destructive",
  rotuloCampo = "Motivo",
  ajuda,
  falta = "Indique o motivo.",
  opcional = false,
  maximo = 200,
  aCarregar,
  erro,
  aoConfirmar,
}: {
  rotuloBotao: string;
  icone?: ReactNode;
  varianteBotao?: ButtonProps["variante"];
  titulo: string;
  descricao?: ReactNode;
  rotuloConfirmar: string;
  variante?: "primary" | "destructive";
  rotuloCampo?: string;
  ajuda?: string;
  falta?: string;
  opcional?: boolean;
  maximo?: number;
  aCarregar: boolean;
  erro?: ReactNode;
  aoConfirmar: (motivo: string, fechar: () => void) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const emFalta = !opcional && motivo.trim() === "";
  const fechar = () => {
    setAberto(false);
    setMotivo("");
    setTentou(false);
  };
  return (
    <>
      <Button variante={varianteBotao} onClick={() => setAberto(true)}>
        {icone}
        {rotuloBotao}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => (a ? setAberto(true) : fechar())}
        titulo={titulo}
        descricao={descricao}
        rotuloConfirmar={rotuloConfirmar}
        variante={variante}
        aCarregar={aCarregar}
        erro={erro}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (emFalta || aCarregar) return;
            aoConfirmar(motivo.trim(), fechar);
          }}
        >
          <Field rotulo={rotuloCampo} erro={tentou && emFalta ? falta : undefined} ajuda={ajuda}>
            {({ id, descricao: d, invalido }) => (
              <Textarea id={id} maxLength={maximo} aria-describedby={d} invalido={invalido} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}
