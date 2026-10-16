/**
 * Valor sensível mascarado (§7.6): «•••• 4821» (IBAN, NIF, BI, INSS). «Mostrar»
 * revela só este campo e volta a mascarar ao fim de 60 s ou ao sair do ecrã
 * (o componente desmonta e o estado perde-se).
 */
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { mascarar } from "@/lib/security/mascara";
import { Button } from "./Button";

const SEGUNDOS_A_MOSTRAR = 60;

export function Mascarado({ valor, rotulo }: { valor: string | null; rotulo: string }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!visivel) return;
    const t = setTimeout(() => setVisivel(false), SEGUNDOS_A_MOSTRAR * 1000);
    return () => clearTimeout(t);
  }, [visivel]);
  if (!valor) return <span>—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="font-mono tabular-nums">{visivel ? valor : mascarar(valor)}</span>
      <Button
        type="button"
        variante="ghost"
        tamanho="sm"
        className="h-7 px-2"
        aria-pressed={visivel}
        aria-label={visivel ? `Esconder ${rotulo}` : `Mostrar ${rotulo}`}
        onClick={() => setVisivel((v) => !v)}
      >
        {visivel ? <EyeOff strokeWidth={1.75} aria-hidden /> : <Eye strokeWidth={1.75} aria-hidden />}
        {visivel ? "Esconder" : "Mostrar"}
      </Button>
    </span>
  );
}
