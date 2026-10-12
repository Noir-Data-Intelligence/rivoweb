import { mensagemErro } from "@/lib/api/mensagens";
import { Alert } from "./Alert";
import { Button } from "./Button";

/** Erro de um pedido, com «Tentar de novo» e o código para o suporte quando existe. */
export function ErrorPanel({ erro, tentarDeNovo, className }: { erro: unknown; tentarDeNovo?: () => void; className?: string }) {
  const m = mensagemErro(erro);
  return (
    <Alert
      tom="erro"
      titulo={m.titulo}
      className={className}
      accao={
        tentarDeNovo ? (
          <Button variante="secondary" tamanho="sm" onClick={tentarDeNovo}>
            Tentar de novo
          </Button>
        ) : undefined
      }
    >
      {m.detalhe || m.codigoSuporte ? (
        <>
          {m.detalhe ? <span>{m.detalhe}</span> : null}
          {m.codigoSuporte ? (
            <span className="block text-xs">
              Código para o suporte: <span className="font-mono">{m.codigoSuporte}</span>
            </span>
          ) : null}
        </>
      ) : null}
    </Alert>
  );
}
