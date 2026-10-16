/** Centros de custo (§5.7): a quem se imputa a despesa e contra quem corre o orçamento. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Can } from "@/features/identity";
import { normalizarTexto } from "@/lib/validation/text";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useAbrirCentroCusto, useCentrosCusto, type CentroCusto } from "../api";
import { nomeOuTraco, useEscolhasOrganizacao } from "../comum";

function AbrirCentro() {
  const org = useEscolhasOrganizacao();
  const [aberto, setAberto] = useState(false);
  const abrir = useAbrirCentroCusto();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [tentou, setTentou] = useState(false);
  const idForm = useId();
  const c = normalizarTexto(codigo).toUpperCase();
  const erros = {
    codigo: c === "" ? "Indique o código." : c.length > 20 ? "No máximo 20 caracteres." : undefined,
    nome: normalizarTexto(nome) === "" ? "Indique o nome." : undefined,
    responsavel: responsavel === "" ? "Escolha o responsável." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      abrir.reset();
      setTentou(false);
      setCodigo("");
      setNome("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Abrir centro
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Abrir um centro de custo"
        descricao="O departamento é opcional; o responsável responde pelo orçamento do centro."
        rotuloConfirmar="Abrir centro"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : org.erro ? <ErrorPanel erro={org.erro} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.codigo || erros.nome || erros.responsavel || abrir.isPending) return;
            abrir.mutate({ code: c, name: normalizarTexto(nome), departmentId: departamento === "" ? null : departamento, responsibleEmployeeId: responsavel }, { onSuccess: () => mudar(false) });
          }}
        >
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={20} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={codigo} onChange={(e) => setCodigo(e.target.value)} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Field>
          <Field rotulo="Departamento (opcional)">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={departamento} onChange={(e) => setDepartamento(e.target.value)} disabled={org.aCarregar}>
                <option value="">Nenhum</option>
                {org.departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Responsável" erro={tentou ? erros.responsavel : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={responsavel} onChange={(e) => setResponsavel(e.target.value)} disabled={org.aCarregar}>
                <option value="">{org.aCarregar ? "A carregar…" : "Escolha…"}</option>
                {org.colaboradores.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function CentrosCusto() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const [inactivos, setInactivos] = useState(false);
  const lista = useCentrosCusto({ inactivos, pagina, tamanho });
  const colunas: Coluna<CentroCusto>[] = [
    { id: "codigo", cabecalho: "Código", celula: (c) => <span className="font-medium">{c.code}</span> },
    { id: "nome", cabecalho: "Nome", celula: (c) => c.name },
    { id: "departamento", cabecalho: "Departamento", esconderAte: "md", celula: (c) => nomeOuTraco(c.departmentId, c.departmentName) },
    { id: "responsavel", cabecalho: "Responsável", esconderAte: "sm", celula: (c) => nomeOuTraco(c.responsibleEmployeeId, c.responsibleName) },
    { id: "estado", cabecalho: "Estado", celula: (c) => (c.isActive ? <Badge tom="sucesso">Activo</Badge> : <Badge>Inactivo</Badge>) },
  ];
  return (
    <>
      <PageHeader
        titulo="Centros de custo"
        descricao="Onde se imputa a despesa e contra quem corre o orçamento."
        accao={
          <Can requer="finance.planning.write">
            <AbrirCentro />
          </Can>
        }
      />
      <div className="mb-4">
        <Checkbox rotulo="Mostrar os inactivos" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} />
      </div>
      <Tabela
        rotulo="Centros de custo"
        colunas={colunas}
        linhas={lista.data?.items}
        chave={(c) => c.costCentreId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há centros de custo."
        rodape={lista.data && lista.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={lista.data.total} aoMudar={mudar} /> : undefined}
      />
    </>
  );
}
