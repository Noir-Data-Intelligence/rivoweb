/** Contagens de inventário: por armazém; abrir uma nova num armazém activo. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarData, hojeIso } from "@/lib/format/data";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAbrirContagem, useContagens, useTodosArmazens, type Contagem } from "../api";
import { EstadoContagem } from "../comum";

function AbrirContagem() {
  const [aberto, setAberto] = useState(false);
  const [armazem, setArmazem] = useState("");
  const [data, setData] = useState(hojeIso());
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirContagem();
  const armazens = useTodosArmazens(aberto);
  const navegar = useNavigate();
  const idForm = useId();
  const erro = armazem === "" ? "Escolha o armazém." : undefined;
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir contagem
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            abrir.reset();
            setTentou(false);
            setArmazem("");
          }
        }}
        titulo="Abrir uma contagem"
        descricao="Conte artigo a artigo; o sistema diz o que esperava. Fechar com divergências pode ir a aprovação antes de mexer no stock."
        rotuloConfirmar="Abrir contagem"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erro || abrir.isPending) return;
            abrir.mutate({ warehouseId: armazem, occurredOn: data === "" ? null : data }, { onSuccess: (r) => void navegar(`/contagens/${r.countId}`) });
          }}
        >
          <Field rotulo="Armazém" erro={tentou ? erro : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={armazem} onChange={(e) => setArmazem(e.target.value)}>
                <option value="">{armazens.isPending ? "A carregar…" : "Escolha…"}</option>
                {(armazens.data?.items ?? [])
                  .filter((w) => w.status === "Active")
                  .map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.code} · {w.name}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Data da contagem">
            {({ id, descricao }) => <Input id={id} type="date" aria-describedby={descricao} value={data} onChange={(e) => setData(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Contagens() {
  const { pode } = useUtilizador();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const lista = useContagens({ armazem: null, pagina, tamanho });
  const armazens = useTodosArmazens();
  const nomeArm = (id: string) => {
    const w = armazens.data?.items.find((x) => x.warehouseId === id);
    return w ? `${w.code} · ${w.name}` : "Armazém";
  };
  const colunas: Coluna<Contagem>[] = [
    {
      id: "data",
      cabecalho: "Contagem",
      celula: (c) => (
        <Link to={`/contagens/${c.countId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {formatarData(c.occurredOn)}
        </Link>
      ),
    },
    { id: "armazem", cabecalho: "Armazém", celula: (c) => nomeArm(c.warehouseId) },
    { id: "linhas", cabecalho: "Artigos contados", alinhar: "direita", esconderAte: "sm", celula: (c) => String(c.lines.length) },
    { id: "divergencias", cabecalho: "Divergências", alinhar: "direita", esconderAte: "md", celula: (c) => String(c.lines.filter((l) => Number(l.variance) !== 0).length) },
    { id: "estado", cabecalho: "Estado", celula: (c) => <EstadoContagem estado={c.status} /> },
  ];
  return (
    <>
      <PageHeader titulo="Contagens" descricao="Inventário físico por armazém: o contado contra o esperado." accao={pode("inventory.items.write") ? <AbrirContagem /> : undefined} />
      <Tabela
        rotulo="Contagens"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(c) => c.countId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há contagens."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
