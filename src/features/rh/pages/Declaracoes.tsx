/**
 * Declarações: emitir em nome de um colaborador (regista e descarrega o PDF,
 * só depois de confirmar), as emitidas (com o código de verificação), os
 * modelos (com os marcadores que o servidor substitui) e verificar um código.
 */
import { FileDown, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useVista, Vistas, type Vista } from "@/ui/Vistas";
import { FiltroColaborador, SelectColaborador, useFiltroColaborador, useNomeColaborador } from "../escolhas";
import { codigoVerificacaoValido, errosModelo, MARCADORES_DECLARACAO } from "../regras";
import { useCorrigirModelo, useCriarModelo, useEmitidas, useEmitirDeclaracao, useModelos, useVerificarCodigo, type DeclaracaoEmitida, type ModeloDeclaracao } from "../talento";

/** Emitir uma declaração: escolher o modelo (e o colaborador, se não vier fixo) e confirmar. */
export function EmitirDeclaracao({ colaboradorFixo }: { colaboradorFixo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? "");
  const [modelo, setModelo] = useState("");
  const [tentou, setTentou] = useState(false);
  const modelos = useModelos(false, aberto);
  const emitir = useEmitirDeclaracao();
  const nomeDe = useNomeColaborador();
  const idForm = useId();
  const erros = { colaborador: colaborador === "" ? "Escolha o colaborador." : undefined, modelo: modelo === "" ? "Escolha o modelo." : undefined };
  const escolhido = modelos.data?.find((m) => m.templateId === modelo);
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      emitir.reset();
      setTentou(false);
      setModelo("");
      if (!colaboradorFixo) setColaborador("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <FileDown strokeWidth={1.75} aria-hidden />
        Emitir declaração
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Emitir uma declaração"
        descricao="Fica registada com um código de verificação impresso, e o PDF descarrega-se. Não se desfaz."
        rotuloConfirmar="Emitir e descarregar"
        aCarregar={emitir.isPending}
        erro={emitir.error ? <ErrorPanel erro={emitir.error} /> : modelos.error ? <ErrorPanel erro={modelos.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.colaborador || erros.modelo || emitir.isPending) return;
            emitir.mutate({ employeeId: colaborador, templateId: modelo }, { onSuccess: () => mudar(false) });
          }}
        >
          {colaboradorFixo ? (
            <p className="text-sm text-foreground">Para {nomeDe(colaboradorFixo)}.</p>
          ) : (
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined}>
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Field rotulo="Modelo" erro={tentou ? erros.modelo : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={modelo} onChange={(e) => setModelo(e.target.value)}>
                <option value="">{modelos.isPending ? "A carregar…" : "Escolha…"}</option>
                {(modelos.data ?? []).map((m) => (
                  <option key={m.templateId} value={m.templateId}>
                    {m.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {escolhido ? <p className="text-sm text-muted-foreground">Título impresso: «{escolhido.title}».</p> : null}
        </form>
      </Confirmar>
    </>
  );
}

/** Declarações emitidas (de todos ou de um colaborador). */
export function ListaEmitidas({ colaborador, comNome }: { colaborador: string | null; comNome: boolean }) {
  const lista = useEmitidas(colaborador);
  const colunas: Coluna<DeclaracaoEmitida>[] = [
    { id: "titulo", cabecalho: "Declaração", celula: (d) => <span className="font-medium">{d.title}</span> },
    ...(comNome
      ? [
          {
            id: "colaborador",
            cabecalho: "Colaborador",
            celula: (d: DeclaracaoEmitida) => (
              <Link to={`/colaboradores/${d.employeeId}?vista=declaracoes`} className="text-foreground underline-offset-4 hover:underline">
                {d.employeeName}
              </Link>
            ),
          },
        ]
      : []),
    { id: "quando", cabecalho: "Emitida a", esconderAte: "sm", celula: (d) => formatarDataHora(d.issuedAt) },
    { id: "por", cabecalho: "Pedida por", esconderAte: "md", celula: (d) => (d.bySelf ? "O próprio (portal)" : "Recursos Humanos") },
    { id: "codigo", cabecalho: "Código", celula: (d) => <span className="font-mono text-sm">{d.verificationCode}</span> },
  ];
  return (
    <Tabela
      rotulo="Declarações emitidas"
      colunas={colunas}
      linhas={lista.data ? [...lista.data].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)) : undefined}
      chave={(d) => d.declarationId}
      aCarregar={lista.isPending}
      erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
      vazio="Ainda não há declarações emitidas."
    />
  );
}

function EditarModelo({ m }: { m?: ModeloDeclaracao }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({ nome: m?.name ?? "", titulo: m?.title ?? "DECLARAÇÃO", texto: m?.body ?? "", portal: m?.selfService ?? false, activo: m?.active ?? true });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const criar = useCriarModelo();
  const corrigir = useCorrigirModelo();
  const mut = m ? corrigir : criar;
  const idForm = useId();
  const erros = errosModelo(v);
  return (
    <>
      {m ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir o modelo ${m.name}`}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Novo modelo
        </Button>
      )}
      <Confirmar
        aberto={aberto}
        aoMudar={(x) => {
          setAberto(x);
          if (!x) {
            criar.reset();
            corrigir.reset();
            setTentou(false);
            setV(inicial());
          }
        }}
        largo
        titulo={m ? "Corrigir o modelo" : "Novo modelo de declaração"}
        descricao={`Ao emitir, o servidor substitui os marcadores: ${MARCADORES_DECLARACAO.map((x) => `{{${x}}}`).join(", ")}.`}
        rotuloConfirmar={m ? "Guardar" : "Criar"}
        aCarregar={mut.isPending}
        erro={mut.error ? <ErrorPanel erro={mut.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || mut.isPending) return;
            const corpo = { name: normalizarTexto(v.nome), title: normalizarTexto(v.titulo), body: normalizarTexto(v.texto, true), selfService: v.portal, active: v.activo };
            const fechar = { onSuccess: () => setAberto(false) };
            if (m) corrigir.mutate({ templateId: m.templateId, ...corpo }, fechar);
            else criar.mutate(corpo, fechar);
          }}
        >
          <Field rotulo="Nome do modelo" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
          <Field rotulo="Título impresso" erro={tentou ? erros.titulo : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.titulo} onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} />}
          </Field>
          <Field rotulo="Texto" erro={tentou ? erros.texto : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={8} maxLength={8000} aria-describedby={descricao} invalido={invalido} value={v.texto} onChange={(e) => setV((x) => ({ ...x, texto: e.target.value }))} />}
          </Field>
          <Checkbox rotulo="O próprio pode pedi-la no portal" checked={v.portal} onChange={(e) => setV((x) => ({ ...x, portal: e.target.checked }))} />
          <Checkbox rotulo="Activo" checked={v.activo} onChange={(e) => setV((x) => ({ ...x, activo: e.target.checked }))} />
        </form>
      </Confirmar>
    </>
  );
}

function Modelos() {
  const [inactivos, setInactivos] = useState(false);
  const lista = useModelos(inactivos);
  const colunas: Coluna<ModeloDeclaracao>[] = [
    {
      id: "nome",
      cabecalho: "Modelo",
      celula: (m) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{m.name}</span>
          <span className="truncate text-sm text-muted-foreground">{m.title}</span>
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { id: "portal", cabecalho: "No portal", esconderAte: "sm", celula: (m) => (m.selfService ? "Sim" : "Não") },
    { id: "estado", cabecalho: "Estado", celula: (m) => (m.active ? <Badge tom="sucesso">Activo</Badge> : <Badge>Inactivo</Badge>) },
    { id: "accao", cabecalho: "", alinhar: "direita", celula: (m) => <EditarModelo key={`${m.templateId}-${m.name}-${String(m.active)}-${m.body.length}`} m={m} /> },
  ];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Checkbox rotulo="Mostrar os inactivos" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} />
        <EditarModelo />
      </div>
      <Tabela
        rotulo="Modelos de declaração"
        colunas={colunas}
        linhas={lista.data}
        chave={(m) => m.templateId}
        aCarregar={lista.isPending}
        erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
        vazio="Ainda não há modelos."
      />
    </>
  );
}

function Verificar() {
  const [codigo, setCodigo] = useState("");
  const [tentou, setTentou] = useState(false);
  const verificar = useVerificarCodigo();
  const id = useId();
  const c = codigo.replace(/\s/g, "");
  const erro = c === "" ? "Indique o código impresso na declaração." : !codigoVerificacaoValido(c) ? "Código inválido: letras e algarismos, com ou sem hífenes." : undefined;
  const d = verificar.data;
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTentou(true);
          if (erro || verificar.isPending) return;
          verificar.mutate(c);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Código de verificação
          </label>
          <div className="flex gap-2">
            <Input id={id} autoComplete="off" className="font-mono uppercase" invalido={tentou && Boolean(erro)} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <Button type="submit" aCarregar={verificar.isPending}>
              Verificar
            </Button>
          </div>
          {tentou && erro ? (
            <p role="alert" className="text-xs text-danger">
              {erro}
            </p>
          ) : null}
        </div>
      </form>
      {verificar.error ? <ErrorPanel erro={verificar.error} /> : null}
      {d ? (
        <Card>
          <CardTitle>Declaração válida</CardTitle>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Declaração</dt>
            <dd>{d.title}</dd>
            <dt className="text-muted-foreground">Colaborador</dt>
            <dd>{d.employeeName}</dd>
            <dt className="text-muted-foreground">Emitida a</dt>
            <dd>{formatarDataHora(d.issuedAt)}</dd>
            <dt className="text-muted-foreground">Pedida por</dt>
            <dd>{d.bySelf ? "O próprio (portal)" : "Recursos Humanos"}</dd>
          </dl>
        </Card>
      ) : null}
    </div>
  );
}

type VistaDeclaracoes = "emitidas" | "modelos" | "verificar";

export default function Declaracoes() {
  const { pode } = useUtilizador();
  const { colaborador, mudar } = useFiltroColaborador();
  const escreve = pode("hr.declarations.write");
  const le = pode("hr.employees.read");
  const vistas: readonly Vista<VistaDeclaracoes>[] = [
    { valor: "emitidas", texto: "Emitidas", visivel: le },
    { valor: "modelos", texto: "Modelos", visivel: escreve },
    { valor: "verificar", texto: "Verificar um código", visivel: le },
  ];
  const vista = useVista(vistas);
  return (
    <>
      <PageHeader titulo="Declarações" descricao="Declarações emitidas a partir de modelos, cada uma com um código de verificação." accao={escreve && le ? <EmitirDeclaracao /> : undefined} />
      <Vistas rotulo="Declarações" vistas={vistas} actual={vista} />
      {vista === "modelos" ? (
        <Modelos />
      ) : vista === "verificar" ? (
        <Verificar />
      ) : vista === "emitidas" ? (
        <>
          <div className="mb-4">
            <FiltroColaborador colaborador={colaborador} mudar={mudar} />
          </div>
          <ListaEmitidas colaborador={colaborador} comNome />
        </>
      ) : (
        <Alert tom="info" titulo="Sem acesso a esta área." />
      )}
    </>
  );
}
