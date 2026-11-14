/**
 * Sessão restrita (ADR-127): o perfil é obrigado ao segundo factor e a conta
 * ainda não o tem. Até o ligar, a sessão só serve para isso (o resto da API
 * responde 401 com `mfa_enrolment_required`).
 */
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { libertarSessaoMfa, sair } from "../api";
import { LigarSegundoFactor } from "./SegundoFactor";

export default function SessaoRestrita() {
  return (
    <Card>
      <CardTitle>Ligue o segundo factor para continuar</CardTitle>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Quem decide ou movimenta fundos entra na Rivo com a password e o código de uma app autenticadora. Até o ligar, esta sessão só serve para isso.
      </p>
      <LigarSegundoFactor aoTerminar={libertarSessaoMfa} rotuloTerminar="Já os guardei: continuar" />
      <div className="mt-6 border-t border-border pt-4">
        <Button variante="ghost" tamanho="sm" onClick={() => sair()}>
          Sair
        </Button>
      </div>
    </Card>
  );
}
