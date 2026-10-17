/** Requisições de compra: lista (por estado), e abrir uma nova em rascunho. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { useTodosDepartamentos } from "@/features/rh";
import { formatarData } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAbrirRequisicao, useRequisicoes, type Requisicao } from "../api";
import { EditorLinhas, EstadoRequisicao, ESTADOS_REQUISICAO, useNomePessoa, valor } from "../comum";
import { errosRequisicao, linhasParaApi, linhaVazia, temErros, type LinhaRascunho } from "../regras";

const MOEDAS = ["AOA", "USD", "EUR"] as const;


function NovaRequisicao() {
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const [justificacao, setJustificacao] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [moeda, setMoeda] = useState("AOA");
  const [linhas, setLinhas] = useState<LinhaRascunho[]>([linhaVazia()]);
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirRequisicao();
  const leDepartamentos = pode("hr.departments.read");
  const departamentos = useTodosDepartamentos(aberto && leDepartamentos);
  const navegar = useNavigate();
  const idForm = useId();
  const erros = errosRequisicao({ justificacao, linhas });
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      abrir.reset();
      setTentou(false);
      setJustificacao("");
      setDepartamento("");
      setLinhas([linhaVazia()]);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Nova requisição
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo="Nova requisição de compra"
        descricao="Fica em rascunho, em seu nome (a conta tem de estar ligada a uma ficha). Preço estimado zero é aceite: há pedidos por cotar."
        rotuloConfirmar="Guardar rascunho"
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
            if (temErros(erros) || abrir.isPending) return;
            abrir.mutate(
              {
                justification: normalizarTexto(justificacao, true),
                departmentId: departamento === "" ? null : departamento,
                currency: moeda,
                requestedOn: null,
                lines: linhasParaApi(linhas).map((l) => ({ description: l.description, quantity: l.quantity, estimatedUnitPrice: l.preco })),
              },
              { onSuccess: (r) => void navegar(`/requisicoes/${r.requisitionId}`) },
            );
          }}
        >
          <Field rotulo="Justificação" erro={tentou ? erros.justificacao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={3} maxLength={1000} aria-describedby={descricao} invalido={invalido} value={justificacao} onChange={(e) => setJustificacao(e.target.value)} />}
          </Field>
          {leDepartamentos ? (
            <Field rotulo="Departamento (opcional)">
              {({ id, descricao }) => (
                <Select id={id} aria-describedby={descricao} value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
                  <option value="">Nenhum</option>
                  {(departamentos.data?.items ?? []).map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <Field rotulo="Moeda">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={moeda} onChange={(e) => setMoeda(e.target.value)}>
                {MOEDAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <EditorLinhas linhas={linhas} mudar={setLinhas} erros={tentou ? erros.porLinha : {}} rotuloPreco="Preço estimado" moeda={moeda} />
          {tentou && erros.linhas ? (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {erros.linhas}
            </p>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

export default function Requisicoes() {
  const [params, setParams] = useSearchParams();
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const e = params.get("estado");
  const estado = e && e in ESTADOS_REQUISICAO ? e : null;
  const lista = useRequisicoes({ estado, requisitante: null, pagina, tamanho });
  const nomeDe = useNomePessoa();
  const id = useId();
  const colunas: Coluna<Requisicao>[] = [
    {
      id: "justificacao",
      cabecalho: "Requisição",
      celula: (r) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/requisicoes/${r.requisitionId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {r.justification}
          </Link>
          <span className="truncate text-sm text-muted-foreground">
            {nomeDe(r.requestedByEmployeeId)} · {r.lines.length} {r.lines.length === 1 ? "linha" : "linhas"}
          </span>
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { id: "data", cabecalho: "Pedida a", esconderAte: "sm", celula: (r) => formatarData(r.requestedOn) },
    { id: "total", cabecalho: "Estimado", alinhar: "direita", celula: (r) => valor(r.estimatedTotal, r.currency) },
    { id: "estado", cabecalho: "Estado", celula: (r) => <EstadoRequisicao estado={r.status} /> },
  ];
  return (
    <>
      <PageHeader
        titulo="Requisições"
        descricao="Pedidos de compra: vão a aprovação e, aprovados, dão origem às ordens de compra."
        accao={
          <Can requer="procurement.requisitions.write">
            <NovaRequisicao />
          </Can>
        }
      />
      <div className="mb-4 flex w-48 flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Estado
        </label>
        <Select
          id={id}
          value={estado ?? ""}
          onChange={(ev) => {
            const n = new URLSearchParams(window.location.search);
            if (ev.target.value === "") n.delete("estado");
            else n.set("estado", ev.target.value);
            n.delete("pagina");
            setParams(n);
          }}
        >
          <option value="">Todos</option>
          {Object.entries(ESTADOS_REQUISICAO).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <Tabela
        rotulo="Requisições"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(r) => r.requisitionId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio={estado ? "Sem requisições neste estado." : "Ainda não há requisições."}
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
