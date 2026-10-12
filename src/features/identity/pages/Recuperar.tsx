import { useConcluirRecuperacao } from "../api";
import { DefinirPassword, useTestemunhoDoUrl } from "../components/DefinirPassword";
import { LayoutPublico } from "../components/LayoutPublico";

/** `/recuperar?u=…&t=…` — caminho fixado pelo backend (`RecoverPassword.cs`). */
export default function Recuperar() {
  const testemunho = useTestemunhoDoUrl();
  const concluir = useConcluirRecuperacao();
  return (
    <LayoutPublico titulo="Definir nova password">
      <DefinirPassword
        testemunho={testemunho}
        mutacao={concluir}
        textoBotao="Definir nova password"
        sucesso="Password alterada. Todas as sessões abertas com a password antiga foram terminadas."
        ligacaoInvalida="Peça uma ligação nova em «Esqueceu-se da password?» no ecrã de entrada."
      />
    </LayoutPublico>
  );
}
