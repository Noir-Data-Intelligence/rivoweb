/** Artigos de inventário: quantidade em mão, custo médio e valor; registar um artigo. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Can } from "@/features/identity";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useArtigos, useRegistarArtigo, type Artigo } from "../api";
import { EstadoActivo, kz, qtd } from "../comum";
import { errosArtigo } from "../regras";

function RegistarArtigo() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ sku: "", nome: "", unidade: "un" });
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarArtigo();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosArtigo(v);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar artigo
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            registar.reset();
            setTentou(false);
            setV({ sku: "", nome: "", unidade: "un" });
          }
        }}
        titulo="Registar um artigo"
        descricao="Entra sem stock. A quantidade e o custo médio vêm das entradas."
        rotuloConfirmar="Registar"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || registar.isPending) return;
            registar.mutate({ sku: normalizarTexto(v.sku), name: normalizarTexto(v.nome), unit: normalizarTexto(v.unidade) }, { onSuccess: (r) => void navegar(`/artigos/${r.itemId}`) });
          }}
        >
          <Field rotulo="Referência (SKU)" erro={tentou ? erros.sku : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={50} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.sku} onChange={(e) => setV((x) => ({ ...x, sku: e.target.value }))} />}
          </Field>
          <Field rotulo="Unidade" erro={tentou ? erros.unidade : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={20} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.unidade} onChange={(e) => setV((x) => ({ ...x, unidade: e.target.value }))} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Artigos() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [inactivos, setInactivos] = useState(false);
  const lista = useArtigos({ inactivos, pagina, tamanho });
  const colunas: Coluna<Artigo>[] = [
    {
      id: "nome",
      cabecalho: "Artigo",
      celula: (a) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/artigos/${a.itemId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {a.name}
          </Link>
          <span className="text-sm text-muted-foreground">{a.sku}</span>
        </div>
      ),
      className: "max-w-[20rem]",
    },
    { id: "mao", cabecalho: "Em mão", alinhar: "direita", celula: (a) => `${qtd(a.quantityOnHand)} ${a.unit}` },
    { id: "custo", cabecalho: "Custo médio", alinhar: "direita", esconderAte: "md", celula: (a) => kz(a.averageCost) },
    { id: "valor", cabecalho: "Valor", alinhar: "direita", esconderAte: "sm", celula: (a) => kz(a.totalValue) },
    { id: "estado", cabecalho: "Estado", celula: (a) => <EstadoActivo estado={a.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Artigos"
        descricao="O que há em armazém, quanto custa em média e quanto vale."
        accao={
          <Can requer="inventory.items.write">
            <RegistarArtigo />
          </Can>
        }
      />
      <div className="mb-4">
        <Checkbox rotulo="Mostrar os inactivos" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} />
      </div>
      <Tabela
        rotulo="Artigos"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(a) => a.itemId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há artigos."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
