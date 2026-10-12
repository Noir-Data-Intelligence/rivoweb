import { useAceitarConvite } from "../api";
import { DefinirPassword, useTestemunhoDoUrl } from "../components/DefinirPassword";
import { LayoutPublico } from "../components/LayoutPublico";

/** `/convite?u=…&t=…` — caminho fixado pelo backend (`InviteUser.cs`). */
export default function Convite() {
  const testemunho = useTestemunhoDoUrl();
  const aceitar = useAceitarConvite();
  return (
    <LayoutPublico titulo="Aceitar convite">
      <p className="mb-6 text-base text-muted-foreground">Defina a password da sua conta Rivo.</p>
      <DefinirPassword
        testemunho={testemunho}
        mutacao={aceitar}
        textoBotao="Definir password e activar conta"
        sucesso="Conta activada. Já pode entrar com o seu e-mail e a password que definiu."
        ligacaoInvalida="Peça a quem administra a Rivo que lhe envie um convite novo."
      />
    </LayoutPublico>
  );
}
