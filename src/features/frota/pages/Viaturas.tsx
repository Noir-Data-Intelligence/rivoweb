/**
 * Viaturas (§5.13, F12): lista paginada, com ou sem as inactivas (no URL),
 * quem tem cada viatura e a próxima manutenção prevista; registar uma viatura.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Can } from "@/features/identity";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useRegistarViatura, useViaturas, type Viatura } from "../api";
import { EstadoViatura, ProximaManutencao } from "../comum";
import { errosViatura, temErros, viaturaParaApi, type CamposViatura } from "../regras";

function NovaViatura() {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<CamposViatura>({ matricula: "", modelo: "" });
  const [tentou, setTentou] = useState(false);
  const registar = useRegistarViatura();
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosViatura(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV({ matricula: "", modelo: "" });
      setTentou(false);
      registar.reset();
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova viatura
      </Button>
      <Confirmar aberto={aberto} aoMudar={fechar} titulo="Nova viatura" descricao="A manutenção, as atribuições, as viagens, as despesas, os documentos e os seguros juntam-se na ficha." rotuloConfirmar="Registar" aCarregar={registar.isPending} erro={registar.error ? <ErrorPanel erro={registar.error} /> : undefined} formulario={idForm}>
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || registar.isPending) return;
            registar.mutate(viaturaParaApi(v), { onSuccess: (r) => void navegar(`/frota/${r.vehicleId}`) });
          }}
        >
          <Field rotulo="Matrícula" ajuda="Fica em maiúsculas." erro={tentou ? erros.matricula : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={20} autoComplete="off" className="uppercase" aria-describedby={descricao} invalido={invalido} value={v.matricula} onChange={(e) => setV((x) => ({ ...x, matricula: e.target.value }))} />}
          </Field>
          <Field rotulo="Modelo" erro={tentou ? erros.modelo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={100} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.modelo} onChange={(e) => setV((x) => ({ ...x, modelo: e.target.value }))} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Viaturas() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [params, setParams] = useSearchParams();
  const inactivas = params.get("inactivas") === "sim";
  const lista = useViaturas({ inactivas, pagina, tamanho });
  const alternar = (sim: boolean) => {
    const n = new URLSearchParams(window.location.search);
    if (sim) n.set("inactivas", "sim");
    else n.delete("inactivas");
    n.delete("pagina");
    setParams(n);
  };
  const colunas: Coluna<Viatura>[] = [
    {
      id: "matricula",
      cabecalho: "Matrícula",
      celula: (x) => (
        <Link to={`/frota/${x.vehicleId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {x.plateNumber}
        </Link>
      ),
    },
    { id: "modelo", cabecalho: "Modelo", className: "max-w-[14rem] truncate", celula: (x) => x.model },
    { id: "estado", cabecalho: "Estado", celula: (x) => <EstadoViatura estado={x.status} /> },
    {
      id: "quem",
      cabecalho: "Atribuída a",
      esconderAte: "md",
      className: "max-w-[12rem] truncate",
      celula: (x) => {
        const a = x.assignments.find((y) => !y.endedOn);
        return a ? (a.employeeName ?? "—") : "Ninguém";
      },
    },
    { id: "plano", cabecalho: "Próxima manutenção", esconderAte: "sm", celula: (x) => <ProximaManutencao planos={x.plans} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Viaturas"
        descricao="A frota: estado, quem tem cada viatura e a próxima manutenção."
        accao={
          <Can requer="fleet.vehicles.write">
            <NovaViatura />
          </Can>
        }
      />
      <div className="mb-4">
        <Checkbox rotulo="Mostrar também as inactivas" checked={inactivas} onChange={(e) => alternar(e.target.checked)} />
      </div>
      <Tabela
        rotulo="Viaturas"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(x) => x.vehicleId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={inactivas ? "Ainda não há viaturas." : "Nenhuma viatura activa."}
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
