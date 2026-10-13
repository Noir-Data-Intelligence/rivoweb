import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Users } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod/mini";
import { Can, useUtilizador } from "@/features/identity";
import { aplicarErrosDoServidor } from "@/lib/api/formulario";
import { eApiError } from "@/lib/api/problem";
import { formatarDataDeInstante } from "@/lib/format/data";
import { texto } from "@/lib/validation/text";
import { Alert } from "@/ui/Alert";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Dialog, DialogContent } from "@/ui/Dialog";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Checkbox } from "@/ui/Controlos";
import { Field, Input } from "@/ui/Field";
import { PageHeader, Skeleton } from "@/ui/Layout";
import { Paginacao } from "@/ui/Paginacao";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { usePaginacaoUrl } from "@/ui/usePaginacaoUrl";
import { useCargos, useCorrigirCargo, useCriarCargo, useOcupacoes, useTodosCargos, useTodosColaboradores, type Cargo } from "../api";
import { EstadoOcupacao, nomeColaborador, nomeRepetido } from "../comum";

const esquema = z.object({
  name: texto({ max: 200, obrigatorio: "Escreva o nome do cargo." }),
  hierarchyLevel: z.string().check(
    z.overwrite((v) => v.trim()),
    z.regex(/^\d{1,3}$/, "Um número inteiro, de 0 a 999."),
  ),
  grantsApprovalAuthority: z.boolean(),
});
type Dados = z.infer<typeof esquema>;

function FormularioCargo({ cargo, aberto, aoMudar }: { cargo: Cargo | null; aberto: boolean; aoMudar: (a: boolean) => void }) {
  const criar = useCriarCargo();
  const corrigir = useCorrigirCargo();
  const accao = cargo ? corrigir : criar;
  const existentes = useTodosCargos(aberto);
  const idForm = useId();
  const [soltas, setSoltas] = useState<string[]>([]);
  const form = useForm<Dados>({
    resolver: zodResolver(esquema),
    values: { name: cargo?.name ?? "", hierarchyLevel: cargo ? String(cargo.hierarchyLevel) : "", grantsApprovalAuthority: cargo?.grantsApprovalAuthority ?? false },
  });
  const fechar = (a: boolean) => {
    aoMudar(a);
    if (!a) {
      form.reset();
      criar.reset();
      corrigir.reset();
      setSoltas([]);
    }
  };
  const submeter = form.handleSubmit((d) => {
    if (accao.isPending) return;
    setSoltas([]);
    // O nome é único (índice na base); hoje o duplicado volta como 500 (B15).
    if (nomeRepetido(existentes.data?.items.map((x) => ({ id: x.positionId, nome: x.name })), d.name, cargo?.positionId)) {
      form.setError("name", { message: "Já existe um cargo com este nome." }, { shouldFocus: true });
      return;
    }
    const aoErrar = (e: unknown) => setSoltas(aplicarErrosDoServidor(e, form.setError, ["name", "hierarchyLevel"]));
    const nivel = Number(d.hierarchyLevel);
    if (cargo) corrigir.mutate({ positionId: cargo.positionId, name: d.name, hierarchyLevel: nivel }, { onSuccess: () => fechar(false), onError: aoErrar });
    else criar.mutate({ name: d.name, hierarchyLevel: nivel, grantsApprovalAuthority: d.grantsApprovalAuthority }, { onSuccess: () => fechar(false), onError: aoErrar });
  });
  return (
    <Confirmar
      aberto={aberto}
      aoMudar={fechar}
      titulo={cargo ? "Corrigir cargo" : "Novo cargo"}
      rotuloConfirmar={cargo ? "Guardar" : "Criar cargo"}
      aCarregar={accao.isPending}
      erro={
        soltas.length > 0 ? (
          <Alert tom="erro" titulo="Não foi possível guardar.">
            {soltas.join(" ")}
          </Alert>
        ) : accao.error && !(eApiError(accao.error) && accao.error.status === 400) ? (
          <ErrorPanel erro={accao.error} />
        ) : undefined
      }
      formulario={idForm}
    >
      <form id={idForm} onSubmit={submeter} noValidate className="flex flex-col gap-4">
        <Field rotulo="Nome" erro={form.formState.errors.name?.message}>
          {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} {...form.register("name")} />}
        </Field>
        <Field rotulo="Nível hierárquico" erro={form.formState.errors.hierarchyLevel?.message} ajuda="Um número inteiro que ordena os cargos.">
          {({ id, descricao, invalido }) => (
            <Input id={id} inputMode="numeric" maxLength={3} autoComplete="off" aria-describedby={descricao} invalido={invalido} className="max-w-32" {...form.register("hierarchyLevel")} />
          )}
        </Field>
        {cargo ? (
          <p className="text-sm text-muted-foreground">
            {cargo.grantsApprovalAuthority ? "Este cargo dá autoridade para aprovar." : "Este cargo não dá autoridade para aprovar."} Isto fixa-se ao criar e não se corrige.
          </p>
        ) : (
          <Checkbox
            rotulo="Dá autoridade para aprovar"
            ajuda="Quem ocupar este cargo decide pedidos de aprovação. Atribuir este cargo passa, ele próprio, por aprovação. Não se corrige depois."
            {...form.register("grantsApprovalAuthority")}
          />
        )}
      </form>
    </Confirmar>
  );
}

function Ocupacoes({ cargo, aoFechar }: { cargo: Cargo; aoFechar: () => void }) {
  const ocupacoes = useOcupacoes(cargo.positionId);
  const { pode } = useUtilizador();
  const colaboradores = useTodosColaboradores(pode("hr.employees.read"));
  return (
    <Dialog open onOpenChange={(a) => (a ? undefined : aoFechar())}>
      <DialogContent titulo={`Ocupações: ${cargo.name}`} descricao="Quem ocupa ou ocupou este cargo, e atribuições pendentes." className="max-w-lg">
        {ocupacoes.isPending ? (
          <Skeleton className="h-16" />
        ) : ocupacoes.error ? (
          <ErrorPanel erro={ocupacoes.error} tentarDeNovo={() => void ocupacoes.refetch()} />
        ) : ocupacoes.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém ocupou ainda este cargo.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {ocupacoes.data.map((o) => (
              <li key={o.assignmentId} className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link to={`/colaboradores/${o.employeeId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {nomeColaborador(colaboradores.data?.items, o.employeeId)}
                  </Link>
                  <p className="text-muted-foreground">
                    Desde {formatarDataDeInstante(o.effectiveFrom)}
                    {o.effectiveTo ? ` até ${formatarDataDeInstante(o.effectiveTo)}` : ""}
                  </p>
                </div>
                <EstadoOcupacao estado={o.status} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Cargos() {
  const { pagina, tamanho, mudar } = usePaginacaoUrl();
  const cargos = useCargos({ pagina, tamanho });
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const [aEditar, setAEditar] = useState<Cargo | null>(null);
  const [verOcupacoes, setVerOcupacoes] = useState<Cargo | null>(null);
  const podeEscrever = pode("hr.positions.write");

  const colunas: Coluna<Cargo>[] = [
    { id: "nome", cabecalho: "Nome", celula: (c) => <span className="font-medium">{c.name}</span> },
    { id: "nivel", cabecalho: "Nível", alinhar: "direita", esconderAte: "sm", celula: (c) => String(c.hierarchyLevel) },
    {
      id: "autoridade",
      cabecalho: "Aprova",
      celula: (c) => (c.grantsApprovalAuthority ? <Badge tom="info">Com autoridade</Badge> : <span className="text-muted-foreground">Não</span>),
    },
    {
      id: "accoes",
      cabecalho: "",
      alinhar: "direita",
      celula: (c) => (
        <span className="inline-flex gap-1">
          <Button variante="ghost" tamanho="sm" aria-label={`Ocupações de ${c.name}`} onClick={() => setVerOcupacoes(c)}>
            <Users strokeWidth={1.75} aria-hidden />
            <span className="hidden md:inline">Ocupações</span>
          </Button>
          {podeEscrever ? (
            <Button
              variante="ghost"
              tamanho="sm"
              aria-label={`Corrigir ${c.name}`}
              onClick={() => {
                setAEditar(c);
                setAberto(true);
              }}
            >
              <Pencil strokeWidth={1.75} aria-hidden />
              <span className="hidden md:inline">Corrigir</span>
            </Button>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Cargos"
        descricao="Os cargos com autoridade decidem os pedidos de aprovação."
        accao={
          <Can requer="hr.positions.write">
            <Button
              onClick={() => {
                setAEditar(null);
                setAberto(true);
              }}
            >
              <Plus strokeWidth={1.75} aria-hidden />
              Novo cargo
            </Button>
          </Can>
        }
      />
      <Tabela
        rotulo="Cargos"
        colunas={colunas}
        linhas={cargos.data?.items}
        chave={(c) => c.positionId}
        aCarregar={cargos.isPending}
        erro={cargos.error ? <ErrorPanel erro={cargos.error} tentarDeNovo={() => void cargos.refetch()} /> : undefined}
        vazio="Ainda não há cargos."
        rodape={cargos.data && cargos.data.total > 0 ? <Paginacao pagina={pagina} tamanho={tamanho} total={cargos.data.total} aoMudar={mudar} /> : undefined}
      />
      {podeEscrever ? <FormularioCargo cargo={aEditar} aberto={aberto} aoMudar={setAberto} /> : null}
      {verOcupacoes ? <Ocupacoes cargo={verOcupacoes} aoFechar={() => setVerOcupacoes(null)} /> : null}
    </>
  );
}
