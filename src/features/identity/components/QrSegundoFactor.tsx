/**
 * O QR do `otpauth://` para a app autenticadora, desenhado no browser (a
 * chave nunca sai para um serviço externo). Carrega-se à parte: só o ecrã de
 * ligar o segundo factor o pede. Fundo claro sempre, também no tema escuro,
 * porque há apps que não lêem QR invertidos.
 */
import { encode } from "uqr";

export default function QrSegundoFactor({ uri }: { uri: string }) {
  const { data, size } = encode(uri, { ecc: "M", border: 2 });
  let caminho = "";
  data.forEach((linha, y) =>
    linha.forEach((preto, x) => {
      if (preto) caminho += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return (
    <svg
      role="img"
      aria-label="QR para ler com a app autenticadora"
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="h-44 w-44 rounded-md border border-border bg-white text-black"
    >
      <path d={caminho} fill="currentColor" />
    </svg>
  );
}
