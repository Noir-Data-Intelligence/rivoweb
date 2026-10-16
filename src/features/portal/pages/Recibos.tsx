/** Portal › Recibos de vencimento: os meses processados e o PDF de cada um. */
import { Download } from "lucide-react";
import { useState } from "react";
import { moeda } from "@/features/facturacao";
import { nomeMes } from "@/lib/format/periodo";
import { Button } from "@/ui/Button";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useDescarregarRecibo, useMeusRecibos, type Recibo } from "../api";

const mes = (r: Recibo) => `${nomeMes(Number(r.month))} de ${String(r.year)}`;
const valor = (v: number | string | null) => (v === null ? "—" : moeda(v));

/** «alimentação 35 000,00 Kz · transporte 30 000,00 Kz»; vazio se não houver. */
function subsidios(r: Recibo): string {
  const partes: [string, number | string][] = [
    ["alimentação", r.foodAllowance],
    ["transporte", r.transportAllowance],
    ["férias", r.vacationAllowance],
    ["Natal", r.christmasAllowance],
  ];
  return partes
    .filter(([, v]) => Number(v) > 0)
    .map(([n, v]) => `${n} ${moeda(v)}`)
    .join(" · ");
}

function Descarregar({ r, aoFalhar }: { r: Recibo; aoFalhar: (e: unknown) => void }) {
  const pdf = useDescarregarRecibo();
  return (
    <Button variante="ghost" tamanho="sm" aCarregar={pdf.isPending} onClick={() => pdf.mutate(r, { onError: aoFalhar })} aria-label={`Descarregar o recibo de ${mes(r)}`}>
      <Download strokeWidth={1.75} aria-hidden />
      PDF
    </Button>
  );
}

export default function Recibos() {
  const recibos = useMeusRecibos();
  const [erro, setErro] = useState<unknown>(null);
  const colunas: Coluna<Recibo>[] = [
    {
      id: "mes",
      cabecalho: "Mês",
      celula: (r) => (
        <div className="flex flex-col">
          <span className="font-medium">{mes(r)}</span>
          {subsidios(r) ? <span className="text-sm text-muted-foreground">Inclui {subsidios(r)}</span> : null}
        </div>
      ),
    },
    { id: "bruto", cabecalho: "Bruto", alinhar: "direita", esconderAte: "md", celula: (r) => moeda(r.grossSalary) },
    { id: "irt", cabecalho: "IRT", alinhar: "direita", esconderAte: "lg", celula: (r) => valor(r.withholdingTax) },
    { id: "inss", cabecalho: "Segurança social", alinhar: "direita", esconderAte: "lg", celula: (r) => valor(r.socialSecurityContribution) },
    { id: "liquido", cabecalho: "Líquido", alinhar: "direita", celula: (r) => <span className="font-medium">{valor(r.netSalary)}</span> },
    { id: "pdf", cabecalho: "", alinhar: "direita", celula: (r) => <Descarregar r={r} aoFalhar={setErro} /> },
  ];
  return (
    <>
      <PageHeader titulo="Recibos de vencimento" descricao="Os meses processados. O PDF é o anexado pelos Recursos Humanos ou, sem anexo, o da folha aprovada." />
      {erro ? <ErrorPanel erro={erro} className="mb-4" /> : null}
      <Tabela
        rotulo="Recibos de vencimento"
        colunas={colunas}
        linhas={recibos.data}
        chave={(r) => r.itemId}
        aCarregar={recibos.isPending}
        erro={recibos.error ? <ErrorPanel erro={recibos.error} tentarDeNovo={() => void recibos.refetch()} /> : undefined}
        vazio="Ainda não há recibos."
      />
    </>
  );
}
