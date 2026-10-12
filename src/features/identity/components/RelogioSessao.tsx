/**
 * Prazos da sessão (§7.1): aviso de inactividade 2 min antes, aviso do prazo
 * absoluto 5 min antes, saída limpa nos dois casos. A interacção real (teclado,
 * rato, toque) mantém a sessão viva com um `GET /identity/me` no máximo a cada
 * 5 min; o polling automático nunca conta como actividade.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  AVISO_EXPIRACAO_MS,
  INTERVALO_MANTER_VIVA_MS,
  avaliarRelogio,
  interagiuDepoisDoUltimoPedido,
  msDesdeUltimoPedido,
  registarInteraccao,
  type EstadoRelogio,
} from "@/lib/auth/actividade";
import { obterSessao } from "@/lib/auth/session";
import { formatarHora } from "@/lib/format/data";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog, DialogContent } from "@/ui/Dialog";
import { chaves, sair } from "../api";

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function chave(e: EstadoRelogio): string {
  return e.fase === "aviso-inactividade" ? `${e.fase}:${Math.ceil(e.restanteMs / 1000)}` : e.fase;
}

export function RelogioSessao() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoRelogio>({ fase: "activa" });
  const [avisoExpiracao, setAvisoExpiracao] = useState<string | null>(null);
  const aManter = useRef(false);

  useEffect(() => {
    const interagir = () => registarInteraccao();
    const eventos = ["keydown", "pointerdown", "touchstart", "wheel"] as const;
    for (const e of eventos) window.addEventListener(e, interagir, { passive: true });
    return () => {
      for (const e of eventos) window.removeEventListener(e, interagir);
    };
  }, []);

  useEffect(() => {
    const manterViva = () => {
      if (aManter.current) return;
      aManter.current = true;
      void qc.refetchQueries({ queryKey: chaves.me, exact: true }).finally(() => {
        aManter.current = false;
      });
    };

    const tick = () => {
      const s = obterSessao();
      if (!s) return;
      const agora = Date.now();
      const e = avaliarRelogio({
        msDesdePedido: msDesdeUltimoPedido(),
        inactividadeSegundos: s.inactividadeSegundos,
        agoraEpoch: agora,
        expiraEm: s.expiraEm,
      });
      if (e.fase === "fim-inactividade") return sair("inactividade");
      if (e.fase === "fim-expirada") return sair("expirada");
      if (e.fase === "activa" && interagiuDepoisDoUltimoPedido() && msDesdeUltimoPedido() >= INTERVALO_MANTER_VIVA_MS) {
        manterViva();
      }
      setEstado((anterior) => (chave(anterior) === chave(e) ? anterior : e));
      setAvisoExpiracao(s.expiraEm - agora <= AVISO_EXPIRACAO_MS ? formatarHora(new Date(s.expiraEm)) : null);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [qc]);

  return (
    <>
      {avisoExpiracao ? (
        <Alert tom="aviso" className="rounded-none" titulo={`A sessão termina às ${avisoExpiracao}. Guarde o trabalho.`}>
          Depois disso terá de entrar de novo.
        </Alert>
      ) : null}
      <Dialog open={estado.fase === "aviso-inactividade"}>
        <DialogContent
          titulo="A sessão vai terminar por inactividade"
          descricao={
            estado.fase === "aviso-inactividade" ? (
              <span aria-live="polite">
                Termina dentro de <span className="font-mono">{mmss(estado.restanteMs)}</span>.
              </span>
            ) : null
          }
          fecharVisivel={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variante="secondary" onClick={() => sair()}>
              Sair
            </Button>
            <Button onClick={() => void qc.refetchQueries({ queryKey: chaves.me, exact: true })}>Continuar sessão</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
