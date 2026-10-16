/**
 * Validades de imigração: passaporte, visto e autorização de trabalho dos
 * colaboradores com registo, pela validade mais próxima. Os números não
 * aparecem aqui; abrem-se na ficha, mascarados (§7.6).
 */
import { Link } from "react-router";
import { formatarData } from "@/lib/format/data";
import { Badge } from "@/ui/Badge";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { useValidades, type Imigracao as TipoImigracao } from "../gestao";

const VISTAS: readonly Vista<"90" | "30" | "todos">[] = [
  { valor: "90", texto: "Próximos 90 dias" },
  { valor: "30", texto: "Próximos 30 dias" },
  { valor: "todos", texto: "Todos" },
];

function Prazo({ dias }: { dias: number | string | null }) {
  if (dias === null) return <span className="text-muted-foreground">—</span>;
  const n = Number(dias);
  if (n < 0) return <Badge tom="erro">Caducado há {-n} {n === -1 ? "dia" : "dias"}</Badge>;
  if (n <= 30) return <Badge tom="aviso">{n === 0 ? "Caduca hoje" : `${n} ${n === 1 ? "dia" : "dias"}`}</Badge>;
  return <Badge>{n} dias</Badge>;
}

function documentoQueCaduca(r: TipoImigracao): string {
  const opcoes: [string, string | null][] = [
    ["Passaporte", r.passportExpiresOn],
    ["Visto", r.visaExpiresOn],
    ["Autorização de trabalho", r.workPermitExpiresOn],
  ];
  return opcoes.find(([, d]) => d !== null && d === r.nextExpiry)?.[0] ?? "—";
}

export default function Imigracao() {
  const vista = useVista(VISTAS);
  const validades = useValidades(vista === "todos" || vista === null ? null : Number(vista));
  const colunas: Coluna<TipoImigracao>[] = [
    {
      id: "colaborador",
      cabecalho: "Colaborador",
      celula: (r) => (
        <Link to={`/colaboradores/${r.employeeId}?vista=dados-pessoais`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {r.employeeName}
        </Link>
      ),
    },
    { id: "documento", cabecalho: "Documento", esconderAte: "sm", celula: documentoQueCaduca },
    { id: "validade", cabecalho: "Validade", celula: (r) => (r.nextExpiry ? formatarData(r.nextExpiry) : "—") },
    { id: "prazo", cabecalho: "Prazo", celula: (r) => <Prazo dias={r.daysToNextExpiry} /> },
    { id: "nacionalidade", cabecalho: "Nacionalidade", esconderAte: "md", celula: (r) => r.nationality ?? "—" },
  ];
  return (
    <>
      <PageHeader titulo="Validades de imigração" descricao="Passaportes, vistos e autorizações de trabalho, pela validade mais próxima." />
      <Vistas rotulo="Prazo" vistas={VISTAS} actual={vista} />
      <Tabela
        rotulo="Validades de imigração"
        colunas={colunas}
        linhas={validades.data}
        chave={(r) => r.employeeId}
        aCarregar={validades.isPending}
        erro={validades.error ? <ErrorPanel erro={validades.error} tentarDeNovo={() => void validades.refetch()} /> : undefined}
        vazio={vista === "todos" ? "Ainda não há registos de imigração." : "Nenhum documento caduca neste prazo."}
      />
    </>
  );
}
