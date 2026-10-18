/**
 * Tipos de serviço (§5.12, F11): o catálogo de serviços com preço, que as
 * propostas usam nas linhas. Registar, corrigir, desactivar e reactivar.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { moeda } from "@/features/facturacao";
import { Can, useUtilizador } from "@/features/identity";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useGuardarTipoServico, useTiposServico, type TipoServico } from "../api";
import { errosServico, MOEDAS, servicoParaApi, temErros, type CamposServico } from "../regras";

const campos = (t?: TipoServico): CamposServico => ({
  codigo: t?.code ?? "",
  nome: t?.name ?? "",
  descricao: t?.description ?? "",
  preco: t ? String(t.unitPrice).replace(".", ",") : "",
  moeda: t?.currency ?? "AOA",
  activo: t?.active ?? true,
});

function Formulario({ t }: { t?: TipoServico }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(() => campos(t));
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarTipoServico();
  const idForm = useId();
  const erros = errosServico(v, !t);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(campos(t));
    else {
      setTentou(false);
      guardar.reset();
    }
  };
  const campo = (k: keyof CamposServico) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <>
      {t ? (
        <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)} aria-label={`Corrigir ${t.name}`}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => fechar(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Novo tipo de serviço
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={t ? `Corrigir ${t.name}` : "Novo tipo de serviço"}
        rotuloConfirmar="Guardar"
        aCarregar={guardar.isPending}
        erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: t?.serviceTypeId ?? null, corpo: servicoParaApi(v) }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Código" ajuda={t ? "Não se altera." : "Único."} erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" disabled={!!t} aria-describedby={descricao} invalido={invalido} value={v.codigo} onChange={campo("codigo")} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={campo("nome")} />}
          </Field>
          <Field rotulo="Preço unitário" erro={tentou ? erros.preco : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.preco} onChange={campo("preco")} />}
          </Field>
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={v.moeda} onChange={campo("moeda")}>
                {MOEDAS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined} className="sm:col-span-3">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={1000} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={campo("descricao")} />}
          </Field>
          {t ? (
            <div className="sm:col-span-3">
              <Checkbox rotulo="Activo (aparece nas propostas novas)" checked={v.activo} onChange={(e) => setV((x) => ({ ...x, activo: e.target.checked }))} />
            </div>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

export default function TiposServico() {
  const { pode } = useUtilizador();
  const lista = useTiposServico(true);
  const escreve = pode("commercial.crm.write");
  const colunas: Coluna<TipoServico>[] = [
    { id: "codigo", cabecalho: "Código", celula: (t) => <span className="font-medium">{t.code}</span> },
    {
      id: "nome",
      cabecalho: "Serviço",
      className: "max-w-[20rem]",
      celula: (t) => (
        <span className="flex flex-col">
          <span className="truncate">{t.name}</span>
          {t.description ? <span className="truncate text-xs text-muted-foreground">{t.description}</span> : null}
        </span>
      ),
    },
    { id: "preco", cabecalho: "Preço", alinhar: "direita", celula: (t) => moeda(t.unitPrice, t.currency) },
    { id: "estado", cabecalho: "Estado", celula: (t) => (t.active ? <Badge tom="sucesso">Activo</Badge> : <Badge tom="neutro">Inactivo</Badge>) },
    ...(escreve ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (t: TipoServico) => <Formulario t={t} /> }] : []),
  ];
  const linhas = lista.data ? [...lista.data].sort((a, b) => Number(b.active) - Number(a.active) || a.code.localeCompare(b.code, "pt")) : undefined;
  return (
    <>
      <PageHeader
        titulo="Tipos de serviço"
        descricao="O catálogo de serviços com preço, usado nas linhas das propostas."
        accao={
          <Can requer="commercial.crm.write">
            <Formulario />
          </Can>
        }
      />
      <Tabela
        rotulo="Tipos de serviço"
        colunas={colunas}
        linhas={linhas}
        chave={(t) => t.serviceTypeId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há tipos de serviço."
      />
    </>
  );
}
