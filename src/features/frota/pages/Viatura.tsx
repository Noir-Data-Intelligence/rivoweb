/**
 * Uma viatura: estado, quem a tem, quilómetros, custos e a próxima
 * manutenção; desactivar; vistas manutenção, atribuições, viagens, custos,
 * documentos e seguros (no URL).
 */
import Big from "big.js";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { GrelhaKpis, Kpi } from "@/ui/Kpi";
import { CarregandoPagina, PageHeader } from "@/ui/Layout";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useAcaoViatura, useApolices, useViatura, type Viatura as TipoViatura } from "../api";
import { EstadoViatura, ProximaManutencao, useMotoristas } from "../comum";
import { AtribuicoesDaViatura, CustosDaViatura, DocumentosDaViatura, ManutencaoDaViatura, ViagensDaViatura } from "../Operacao";
import { EditarApolice, TabelaApolices } from "../Seguros";

function Desactivar({ x }: { x: TipoViatura }) {
  const [aberto, setAberto] = useState(false);
  const accao = useAcaoViatura(x.vehicleId);
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        Desactivar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) accao.reset();
        }}
        titulo={`Desactivar ${x.plateNumber}?`}
        descricao="Deixa de receber manutenção, atribuições, planos, viagens e despesas. Os registos ficam. Não se desfaz."
        rotuloConfirmar="Desactivar"
        variante="destructive"
        aCarregar={accao.isPending}
        erro={accao.error ? <ErrorPanel erro={accao.error} /> : undefined}
        aoConfirmar={() => (accao.isPending ? undefined : accao.mutate({ acto: "desactivar" }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function SegurosDaViatura({ x }: { x: TipoViatura }) {
  const lista = useApolices({ viatura: x.vehicleId, dias: null });
  return (
    <div className="flex flex-col gap-4">
      <Can requer="fleet.vehicles.write">
        <div>
          <EditarApolice viatura={x.vehicleId} />
        </div>
      </Can>
      <TabelaApolices linhas={lista.data} aCarregar={lista.isPending} erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined} vazio="Sem apólices." />
    </div>
  );
}

type VistaViatura = "manutencao" | "atribuicoes" | "viagens" | "custos" | "documentos" | "seguros";
const VISTAS: readonly Vista<VistaViatura>[] = [
  { valor: "manutencao", texto: "Manutenção" },
  { valor: "atribuicoes", texto: "Atribuições" },
  { valor: "viagens", texto: "Viagens" },
  { valor: "custos", texto: "Custos" },
  { valor: "documentos", texto: "Documentos" },
  { valor: "seguros", texto: "Seguros" },
];

export default function Viatura() {
  const { vehicleId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useViatura(vehicleId);
  const vista = useVista(VISTAS);
  const motoristas = useMotoristas();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/frota">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Viaturas
      </Link>
    </Button>
  );
  if (q.isPending) return <CarregandoPagina />;
  if (q.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} />
      </>
    );
  }
  const x = q.data;
  const atribuicao = x.assignments.find((a) => !a.endedOn);
  const quilometros = x.trips.reduce((t, v) => t.plus(String(v.distance)), new Big(0));
  const custos = [...x.expenses.map((d) => d.amount), ...x.maintenances.map((m) => m.cost)].reduce<Big>((t, v) => (v === null ? t : t.plus(String(v))), new Big(0));
  return (
    <>
      {voltar}
      <PageHeader
        titulo={x.plateNumber}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoViatura estado={x.status} />
            <span>{x.model}</span>
          </span>
        }
        accao={x.status !== "Inactive" && pode("fleet.vehicles.write") ? <Desactivar x={x} /> : undefined}
      />
      {x.status === "Inactive" ? <Alert tom="info" className="mb-4" titulo="Inactiva: não recebe manutenção, atribuições, planos, viagens nem despesas. Os registos, os documentos e os seguros continuam." /> : null}
      {x.status === "InMaintenance" ? <Alert tom="aviso" className="mb-4" titulo="Em manutenção: feche o registo aberto para a viatura voltar a activa." /> : null}
      <div className="mb-6">
        <GrelhaKpis>
          <Kpi rotulo="Atribuída a" valor={atribuicao ? (motoristas.nome(atribuicao.employeeId) ?? "—") : "Ninguém"} />
          <Kpi rotulo="Quilómetros" valor={`${formatarNumeroDecimal(quilometros.toString(), 0)} km`} detalhe={`${String(x.trips.length)} viagens`} />
          <Kpi rotulo="Custos" valor={moeda(custos.toFixed(2))} detalhe="Despesas e manutenções." />
          <Kpi rotulo="Próxima manutenção" valor={<ProximaManutencao planos={x.plans} />} />
        </GrelhaKpis>
      </div>
      <Vistas rotulo="Viatura" vistas={VISTAS} actual={vista} />
      {vista === "atribuicoes" ? (
        <AtribuicoesDaViatura x={x} />
      ) : vista === "viagens" ? (
        <ViagensDaViatura x={x} />
      ) : vista === "custos" ? (
        <CustosDaViatura x={x} />
      ) : vista === "documentos" ? (
        <DocumentosDaViatura x={x} />
      ) : vista === "seguros" ? (
        <SegurosDaViatura x={x} />
      ) : (
        <ManutencaoDaViatura x={x} />
      )}
    </>
  );
}
