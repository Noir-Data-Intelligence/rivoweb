/** Armazéns: onde está o stock; registar, activar e desactivar (inactivo não recebe movimentos nem contagens). */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { useUtilizador } from "@/features/identity";
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
import { useArmazens, useEstadoArmazem, useRegistarArmazem, type Armazem } from "../api";
import { EstadoActivo } from "../comum";
import { errosArmazem } from "../regras";

function RegistarArmazem() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState({ codigo: "", nome: "" });
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarArmazem();
  const idForm = useId();
  const erros = errosArmazem(v);
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Registar armazém
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            registar.reset();
            setTentou(false);
            setV({ codigo: "", nome: "" });
          }
        }}
        titulo="Registar um armazém"
        rotuloConfirmar="Registar"
        aCarregar={registar.isPending}
        erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-[10rem_1fr]"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || registar.isPending) return;
            registar.mutate({ code: normalizarTexto(v.codigo).toUpperCase(), name: normalizarTexto(v.nome) }, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={20} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.codigo} onChange={(e) => setV((x) => ({ ...x, codigo: e.target.value }))} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function MudarEstado({ w }: { w: Armazem }) {
  const [aberto, setAberto] = useState(false);
  const mudar = useEstadoArmazem();
  const activo = w.status === "Active";
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`${activo ? "Desactivar" : "Activar"} o armazém ${w.name}`}>
        {activo ? "Desactivar" : "Activar"}
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) mudar.reset();
        }}
        titulo={activo ? `Desactivar ${w.name}?` : `Activar ${w.name}?`}
        descricao={activo ? "Deixa de receber movimentos e contagens. O stock que lá está fica registado." : "Volta a receber movimentos e contagens."}
        rotuloConfirmar={activo ? "Desactivar" : "Activar"}
        variante={activo ? "destructive" : "primary"}
        aCarregar={mudar.isPending}
        erro={mudar.error ? <ErrorPanel erro={mudar.error} /> : undefined}
        aoConfirmar={() => (mudar.isPending ? undefined : mudar.mutate({ id: w.warehouseId, active: !activo }, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

export default function Armazens() {
  const { pode } = useUtilizador();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [inactivos, setInactivos] = useState(false);
  const lista = useArmazens({ inactivos, pagina, tamanho });
  const colunas: Coluna<Armazem>[] = [
    { id: "codigo", cabecalho: "Código", celula: (w) => <span className="font-medium">{w.code}</span> },
    { id: "nome", cabecalho: "Nome", celula: (w) => w.name },
    { id: "estado", cabecalho: "Estado", celula: (w) => <EstadoActivo estado={w.status} /> },
    ...(pode("inventory.items.write") ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (w: Armazem) => <MudarEstado w={w} /> }] : []),
  ];
  return (
    <>
      <PageHeader titulo="Armazéns" descricao="Onde está o stock." accao={pode("inventory.items.write") ? <RegistarArmazem /> : undefined} />
      <div className="mb-4">
        <Checkbox rotulo="Mostrar os inactivos" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} />
      </div>
      <Tabela
        rotulo="Armazéns"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(w) => w.warehouseId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há armazéns."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
