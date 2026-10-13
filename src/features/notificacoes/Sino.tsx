/** Sino do cabeçalho: a contagem por ler e a ligação para a página. */
import { Bell } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/ui/Button";
import { useContagemPorLer } from "./api";

export function Sino({ caminhoPagina }: { caminhoPagina: string }) {
  const contagem = useContagemPorLer();
  const n = contagem.data ?? 0;
  return (
    <Button asChild variante="ghost" tamanho="icone" className="relative">
      <Link to={caminhoPagina} aria-label={n === 0 ? "Notificações" : `Notificações, ${n} por ler`}>
        <Bell strokeWidth={1.75} aria-hidden />
        {n > 0 ? (
          <span
            className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground"
            aria-hidden
          >
            {n > 99 ? "99+" : n}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
