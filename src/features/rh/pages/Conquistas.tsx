/**
 * Conquistas: o catálogo (criar, corrigir, desactivar), a classificação por
 * pontos e atribuir uma conquista a um colaborador (uma vez por pessoa, só
 * conquistas activas). A ficha do colaborador mostra as suas.
 */
import { Award, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { Can, useUtilizador } from "@/features/identity";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { EmptyState, PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { SelectColaborador, useNomeColaborador } from "../escolhas";
import { errosConquista } from "../regras";
import { useAtribuirConquista, useClassificacao, useConquistas, useConquistasDe, useCorrigirConquista, useCriarConquista, type Conquista } from "../talento";

/** Atribuir uma conquista activa (o colaborador pode vir fixo, na ficha). */
export function AtribuirConquista({ colaboradorFixo }: { colaboradorFixo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState(colaboradorFixo ?? "");
  const [conquista, setConquista] = useState("");
  const [nota, setNota] = useState("");
  const [tentou, setTentou] = useState(false);
  const lista = useConquistas(false);
  const atribuir = useAtribuirConquista();
  const nomeDe = useNomeColaborador();
  const idForm = useId();
  const n = normalizarTexto(nota, true);
  const erros = {
    colaborador: colaborador === "" ? "Escolha o colaborador." : undefined,
    conquista: conquista === "" ? "Escolha a conquista." : undefined,
    nota: n.length > 500 ? "No máximo 500 caracteres." : undefined,
  };
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      atribuir.reset();
      setTentou(false);
      setConquista("");
      setNota("");
      if (!colaboradorFixo) setColaborador("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Award strokeWidth={1.75} aria-hidden />
        Atribuir conquista
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Atribuir uma conquista"
        descricao="O colaborador vê-a no portal e os pontos contam na classificação. Cada conquista atribui-se uma vez por pessoa."
        rotuloConfirmar="Atribuir"
        aCarregar={atribuir.isPending}
        erro={atribuir.error ? <ErrorPanel erro={atribuir.error} /> : lista.error ? <ErrorPanel erro={lista.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.colaborador || erros.conquista || erros.nota || atribuir.isPending) return;
            atribuir.mutate({ employeeId: colaborador, achievementId: conquista, note: n === "" ? null : n }, { onSuccess: () => mudar(false) });
          }}
        >
          {colaboradorFixo ? (
            <p className="text-sm text-foreground">Para {nomeDe(colaboradorFixo)}.</p>
          ) : (
            <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined}>
              {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
            </Field>
          )}
          <Field rotulo="Conquista" erro={tentou ? erros.conquista : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={conquista} onChange={(e) => setConquista(e.target.value)}>
                <option value="">{lista.isPending ? "A carregar…" : "Escolha…"}</option>
                {(lista.data ?? []).map((c) => (
                  <option key={c.achievementId} value={c.achievementId}>
                    {c.name} ({String(c.points)} pontos)
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Nota (opcional)" erro={tentou ? erros.nota : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={500} aria-describedby={descricao} invalido={invalido} value={nota} onChange={(e) => setNota(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

/** As conquistas de um colaborador (separador da ficha). */
export function ConquistasDoColaborador({ employeeId }: { employeeId: string }) {
  const lista = useConquistasDe(employeeId);
  const total = (lista.data ?? []).reduce((s, c) => s + Number(c.points), 0);
  return (
    <div className="flex flex-col gap-4">
      <Can requer="hr.achievements.write">
        <div>
          <AtribuirConquista colaboradorFixo={employeeId} />
        </div>
      </Can>
      {lista.isPending ? (
        <Skeleton className="h-32" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} />
      ) : lista.data.length === 0 ? (
        <EmptyState frase="Ainda sem conquistas." />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {lista.data.length} {lista.data.length === 1 ? "conquista" : "conquistas"} · {total} pontos
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {lista.data.map((c) => (
              <li key={c.awardId}>
                <Card>
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Award className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                    {c.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {String(c.points)} pontos · {formatarDataHora(c.awardedAt)}
                  </p>
                  {c.note ? <p className="mt-1 whitespace-pre-line text-sm text-foreground">«{c.note}»</p> : null}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function EditarConquista({ c }: { c?: Conquista }) {
  const [aberto, setAberto] = useState(false);
  const inicial = () => ({ codigo: c?.code ?? "", nome: c?.name ?? "", descricao: c?.description ?? "", icone: c?.icon ?? "", pontos: c ? String(c.points) : "", activa: c?.active ?? true });
  const [v, setV] = useState(inicial);
  const [tentou, setTentou] = useState(false);
  const criar = useCriarConquista();
  const corrigir = useCorrigirConquista();
  const m = c ? corrigir : criar;
  const idForm = useId();
  const erros = errosConquista({ ...v, nova: !c });
  return (
    <>
      {c ? (
        <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Corrigir a conquista ${c.name}`}>
          Corrigir
        </Button>
      ) : (
        <Button variante="secondary" onClick={() => setAberto(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Nova conquista
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
        titulo={c ? `Corrigir a conquista ${c.code}` : "Nova conquista"}
        descricao="Desactivada, deixa de se atribuir; quem já a tem mantém-na."
        rotuloConfirmar={c ? "Guardar" : "Criar"}
        aCarregar={m.isPending}
        erro={m.error ? <ErrorPanel erro={m.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || m.isPending) return;
            const d = normalizarTexto(v.descricao, true);
            const i = normalizarTexto(v.icone);
            const corpo = { code: c ? null : normalizarTexto(v.codigo).toUpperCase(), name: normalizarTexto(v.nome), description: d === "" ? null : d, icon: i === "" ? null : i, points: v.pontos.trim() === "" ? null : Number(v.pontos), active: v.activa };
            if (c) corrigir.mutate({ achievementId: c.achievementId, ...corpo }, { onSuccess: () => setAberto(false) });
            else criar.mutate(corpo, { onSuccess: () => setAberto(false) });
          }}
        >
          <Field rotulo="Código" erro={tentou ? erros.codigo : undefined} ajuda={c ? "Não muda depois de criado." : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={30} autoComplete="off" disabled={Boolean(c)} aria-describedby={descricao} invalido={invalido} value={v.codigo} onChange={(e) => setV((x) => ({ ...x, codigo: e.target.value }))} />}
          </Field>
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={150} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
          <Field rotulo="Pontos de 0 a 10 000 (opcional)" erro={tentou ? erros.pontos : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} inputMode="numeric" autoComplete="off" className="tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.pontos} onChange={(e) => setV((x) => ({ ...x, pontos: e.target.value }))} />}
          </Field>
          <Field rotulo="Ícone (opcional)" erro={tentou ? erros.icone : undefined} ajuda="Nome curto, por exemplo «star».">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={50} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.icone} onChange={(e) => setV((x) => ({ ...x, icone: e.target.value }))} />}
          </Field>
          <Field rotulo="Descrição (opcional)" erro={tentou ? erros.descricao : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={2} maxLength={1000} aria-describedby={descricao} invalido={invalido} value={v.descricao} onChange={(e) => setV((x) => ({ ...x, descricao: e.target.value }))} />}
          </Field>
          {c ? <Checkbox rotulo="Activa" checked={v.activa} onChange={(e) => setV((x) => ({ ...x, activa: e.target.checked }))} /> : null}
        </form>
      </Confirmar>
    </>
  );
}

function Classificacao() {
  const lista = useClassificacao(10);
  return (
    <Card>
      <CardTitle>Classificação</CardTitle>
      {lista.isPending ? (
        <Skeleton className="mt-3 h-32" />
      ) : lista.error ? (
        <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} className="mt-3" />
      ) : lista.data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Ainda ninguém tem pontos.</p>
      ) : (
        <ol className="mt-3 divide-y divide-border" aria-label="Classificação por pontos">
          {lista.data.map((e, i) => (
            <li key={e.employeeId} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-6 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
              <Link to={`/colaboradores/${e.employeeId}?vista=conquistas`} className="min-w-0 flex-1 truncate text-foreground underline-offset-4 hover:underline">
                {e.employeeName}
              </Link>
              <span className="tabular-nums text-muted-foreground">
                {String(e.points)} pontos · {String(e.achievements)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function Conquistas() {
  const { pode } = useUtilizador();
  const [inactivas, setInactivas] = useState(false);
  const lista = useConquistas(inactivas);
  const colunas: Coluna<Conquista>[] = [
    {
      id: "nome",
      cabecalho: "Conquista",
      celula: (c) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{c.name}</span>
          <span className="truncate text-sm text-muted-foreground">{c.description ?? c.code}</span>
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { id: "pontos", cabecalho: "Pontos", alinhar: "direita", celula: (c) => String(c.points) },
    { id: "atribuidas", cabecalho: "Atribuídas", alinhar: "direita", esconderAte: "sm", celula: (c) => String(c.awarded) },
    { id: "estado", cabecalho: "Estado", celula: (c) => (c.active ? <Badge tom="sucesso">Activa</Badge> : <Badge>Inactiva</Badge>) },
    ...(pode("hr.achievements.write")
      ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (c: Conquista) => <EditarConquista key={`${c.achievementId}-${c.name}-${String(c.points)}-${String(c.active)}`} c={c} /> }]
      : []),
  ];
  return (
    <>
      <PageHeader
        titulo="Conquistas"
        descricao="Reconhecimento dos colaboradores, com pontos."
        accao={
          <Can requer="hr.achievements.write">
            <div className="flex flex-wrap gap-2">
              <EditarConquista />
              <AtribuirConquista />
            </div>
          </Can>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <div className="mb-4">
            <Checkbox rotulo="Mostrar as inactivas" checked={inactivas} onChange={(e) => setInactivas(e.target.checked)} />
          </div>
          <Tabela
            rotulo="Conquistas"
            colunas={colunas}
            linhas={lista.data}
            chave={(c) => c.achievementId}
            aCarregar={lista.isPending}
            erro={lista.error ? <ErrorPanel erro={lista.error} tentarDeNovo={() => void lista.refetch()} /> : undefined}
            vazio="Ainda não há conquistas."
          />
        </div>
        <Classificacao />
      </div>
    </>
  );
}
