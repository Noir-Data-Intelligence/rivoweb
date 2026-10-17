/** Resultado de uma importação CSV (`CsvImportSummary`): totais e as linhas que não entraram, com o motivo. */
import type { components } from "@/lib/api/schema";
import { Alert } from "./Alert";

const DESFECHO = ["Importado", "Duplicado", "Recusado"] as const;

export function ResultadoImportacao({ r }: { r: components["schemas"]["CsvImportSummary"] }) {
  const problemas = r.rows.filter((x) => Number(x.outcome) !== 0);
  return (
    <div className="flex flex-col gap-3">
      <Alert
        tom={Number(r.rejected) > 0 ? "aviso" : "sucesso"}
        titulo={`${String(r.imported)} importados, ${String(r.duplicates)} duplicados, ${String(r.rejected)} recusados (de ${String(r.totalRows)}).`}
      />
      {problemas.length > 0 ? (
        <ul className="max-h-48 divide-y divide-border overflow-y-auto text-sm">
          {problemas.map((x) => (
            <li key={String(x.line)} className="py-1.5">
              Linha {String(x.line)}: {DESFECHO[Number(x.outcome)] ?? "—"}
              {x.detail ? ` · ${x.detail}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
