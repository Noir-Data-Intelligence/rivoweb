/**
 * Configuração da IA (§5.14, F13): o estado, os fornecedores com chave no
 * servidor e o activo; trocar de fornecedor e ligar o recurso ao outro quando
 * o activo falha. Não gasta saldo: não chama o modelo.
 */
import { useId, useState } from "react";
import { formatarDataHora } from "@/lib/format/data";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela } from "@/ui/Tabela";
import { useEstadoIa, useFornecedorIa, useMudarFornecedor } from "../api";

const NOMES: Readonly<Record<string, string>> = { anthropic: "Anthropic", openai: "OpenAI" };
const nome = (n: string) => NOMES[n] ?? n;

export default function Configuracao() {
  const estado = useEstadoIa();
  const f = useFornecedorIa();
  const mudar = useMudarFornecedor();
  const [escolha, setEscolha] = useState<{ activo: string; recurso: boolean } | null>(null);
  const id = useId();
  if (f.isPending || estado.isPending) return <Skeleton className="h-48" />;
  if (f.error) return <ErrorPanel erro={f.error} tentarDeNovo={() => void f.refetch()} />;
  const d = f.data;
  const v = escolha ?? { activo: d.activeProvider, recurso: d.fallbackEnabled };
  const igual = v.activo === d.activeProvider && v.recurso === d.fallbackEnabled;
  return (
    <>
      <PageHeader titulo="Inteligência artificial" descricao="O fornecedor que responde aos pedidos de IA. As chaves ficam no servidor e não se vêem aqui." />
      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle>Estado</CardTitle>
          <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
            <dt className="text-muted-foreground">Funcionalidades</dt>
            <dd>{estado.data?.enabled ? <Badge tom="sucesso">Ligadas</Badge> : <Badge>Desligadas</Badge>}</dd>
            <dt className="text-muted-foreground">A responder</dt>
            <dd>{estado.data?.provider ? `${nome(estado.data.provider)} · ${estado.data.model ?? "—"}` : "—"}</dd>
            <dt className="text-muted-foreground">Última alteração</dt>
            <dd>{d.updatedAt ? formatarDataHora(d.updatedAt) : "Configuração de origem"}</dd>
          </dl>
        </Card>
        <Card>
          <CardTitle className="mb-3">Fornecedores</CardTitle>
          <Tabela
            rotulo="Fornecedores de IA"
            colunas={[
              { id: "nome", cabecalho: "Fornecedor", celula: (p) => nome(p.name) },
              { id: "modelo", cabecalho: "Modelo", celula: (p) => p.model },
              { id: "chave", cabecalho: "Chave no servidor", celula: (p) => (p.configured ? <Badge tom="sucesso">Configurada</Badge> : <Badge>Sem chave</Badge>) },
              { id: "activo", cabecalho: "", celula: (p) => (p.name === d.activeProvider ? <Badge tom="info">Activo</Badge> : null) },
            ]}
            linhas={d.providers}
            chave={(p) => p.name}
            aCarregar={false}
            vazio="Sem fornecedores."
          />
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (igual || mudar.isPending) return;
              mudar.mutate({ provider: v.activo, fallbackEnabled: v.recurso }, { onSuccess: () => setEscolha(null) });
            }}
          >
            <div className="flex max-w-xs flex-col gap-1.5">
              <label htmlFor={id} className="text-sm font-medium text-foreground">
                Fornecedor activo
              </label>
              <Select id={id} value={v.activo} onChange={(e) => setEscolha({ ...v, activo: e.target.value })}>
                {d.providers.map((p) => (
                  <option key={p.name} value={p.name} disabled={!p.configured}>
                    {nome(p.name)}
                    {p.configured ? "" : " (sem chave)"}
                  </option>
                ))}
              </Select>
            </div>
            <Checkbox rotulo="Se o activo falhar, recorrer ao outro" checked={v.recurso} onChange={(e) => setEscolha({ ...v, recurso: e.target.checked })} />
            {mudar.error ? <ErrorPanel erro={mudar.error} /> : null}
            <div>
              <Button type="submit" aCarregar={mudar.isPending} disabled={igual}>
                Guardar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Vale a partir do pedido seguinte. Guardar não gasta saldo.</p>
          </form>
        </Card>
      </div>
    </>
  );
}
