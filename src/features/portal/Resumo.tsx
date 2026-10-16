/**
 * Resumo do portal para a página inicial do colaborador: férias por gozar,
 * próximo turno, pedidos em aberto e os anúncios mais recentes. Cada cartão
 * só aparece com dados; um erro num deles não esconde os outros.
 */
import { Link } from "react-router";
import { formatarData, hojeIso } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { useMeusAnuncios, useMeusPedidos, useMeusSaldos, useMeusTurnos } from "./api";
import { CartaoAnuncio } from "./comum";
import { ordenarAnuncios } from "./regras";

const ligacao = "text-sm text-primary underline-offset-4 hover:underline";

export function ResumoPortal() {
  const hoje = hojeIso();
  const saldos = useMeusSaldos(Number(hoje.slice(0, 4)));
  const turnos = useMeusTurnos(null, null);
  const pedidos = useMeusPedidos();
  const anuncios = useMeusAnuncios();
  const ferias = saldos.data?.find((s) => s.type === "Annual" && s.configured);
  const proximo = turnos.data?.find((t) => t.day >= hoje);
  const abertos = pedidos.data?.filter((p) => p.status === "Open" || p.status === "InProgress").length;
  const recentes = anuncios.data ? ordenarAnuncios(anuncios.data).slice(0, 2) : [];
  return (
    <div className="flex flex-col gap-6">
      <GrelhaKpis>
        {ferias ? (
          <Kpi
            rotulo="Férias por gozar"
            valor={`${formatarNumeroDecimal(String(ferias.remaining), Number.isInteger(Number(ferias.remaining)) ? 0 : 1)} dias`}
            detalhe={
              <Link to="/eu/ferias" className={ligacao}>
                Ver férias
              </Link>
            }
          />
        ) : null}
        {turnos.data ? (
          <Kpi
            rotulo="Próximo turno"
            valor={proximo ? formatarData(proximo.day) : "Sem turnos"}
            detalhe={
              proximo ? (
                <Link to="/eu/turnos" className={ligacao}>
                  {proximo.shiftName}, {proximo.startsAt.slice(0, 5)}–{proximo.endsAt.slice(0, 5)}
                </Link>
              ) : (
                "nos próximos 30 dias"
              )
            }
          />
        ) : null}
        {abertos !== undefined ? (
          <Kpi
            rotulo="Pedidos em aberto"
            valor={String(abertos)}
            detalhe={
              <Link to="/eu/pedidos" className={ligacao}>
                Ver pedidos
              </Link>
            }
          />
        ) : null}
      </GrelhaKpis>
      {recentes.length > 0 ? (
        <section aria-label="Anúncios recentes" className="flex flex-col gap-3">
          {recentes.map((a) => (
            <CartaoAnuncio key={a.announcementId} a={a} />
          ))}
          <Link to="/eu/anuncios" className={`${ligacao} self-start`}>
            Todos os anúncios
          </Link>
        </section>
      ) : null}
    </div>
  );
}
