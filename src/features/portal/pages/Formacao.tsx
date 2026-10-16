/** Portal › Formação: as acções em que está inscrito ou que concluiu, com os certificados. */
import { EstadoInscricao } from "@/features/rh";
import { formatarData } from "@/lib/format/data";
import { formatarNumeroDecimal } from "@/lib/format/numero";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useMinhaFormacao, type Formacao as TipoFormacao } from "../api";

const decimal = (v: number | string) => formatarNumeroDecimal(String(v), Number.isInteger(Number(v)) ? 0 : 1);

export default function Formacao() {
  const formacao = useMinhaFormacao();
  const colunas: Coluna<TipoFormacao>[] = [
    {
      id: "curso",
      cabecalho: "Acção",
      celula: (f) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{f.title}</span>
          {f.provider ? <span className="text-sm text-muted-foreground">{f.provider}</span> : null}
        </div>
      ),
      className: "max-w-[20rem]",
    },
    { id: "datas", cabecalho: "Datas", esconderAte: "sm", celula: (f) => (f.endsOn && f.endsOn !== f.startsOn ? `${formatarData(f.startsOn)} a ${formatarData(f.endsOn)}` : formatarData(f.startsOn)) },
    { id: "horas", cabecalho: "Horas", alinhar: "direita", esconderAte: "md", celula: (f) => (f.hours === null ? "—" : decimal(f.hours)) },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (f) => (
        <div className="flex flex-col items-start gap-1">
          <EstadoInscricao estado={f.status} />
          {f.completedOn ? (
            <span className="text-xs text-muted-foreground">
              a {formatarData(f.completedOn)}
              {f.score !== null ? ` · nota ${decimal(f.score)}` : ""}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "certificado",
      cabecalho: "Certificado",
      esconderAte: "md",
      celula: (f) =>
        f.certificateNumber ? (
          <div className="flex flex-col">
            <span>{f.certificateNumber}</span>
            {f.certificateExpiresOn ? <span className="text-xs text-muted-foreground">válido até {formatarData(f.certificateExpiresOn)}</span> : null}
          </div>
        ) : (
          "—"
        ),
    },
  ];
  return (
    <>
      <PageHeader titulo="Formação" descricao="As acções de formação em que está inscrito ou que concluiu." />
      <Tabela
        rotulo="Formação"
        colunas={colunas}
        linhas={formacao.data}
        chave={(f) => f.enrolmentId}
        aCarregar={formacao.isPending}
        erro={formacao.error ? <ErrorPanel erro={formacao.error} tentarDeNovo={() => void formacao.refetch()} /> : undefined}
        vazio="Ainda não está inscrito em nenhuma acção de formação."
      />
    </>
  );
}
