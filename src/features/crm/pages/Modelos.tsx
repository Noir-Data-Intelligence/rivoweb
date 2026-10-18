/**
 * Modelos de proposta (§5.12, F11): o texto-base das propostas, com os
 * marcadores {{cliente}}, {{titulo}}, {{validade}} e {{data}}. Registar,
 * corrigir, desactivar e reactivar.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Can, useUtilizador } from "@/features/identity";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Checkbox, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { errosModelo, useGuardarModelo, useModelos, type Modelo } from "../propostas";
import { temErros } from "../regras";

const MARCADORES = "Marcadores: {{cliente}} (nome do cliente ou do lead), {{titulo}} (título da proposta), {{validade}} (válida até) e {{data}} (data de criação).";

function Formulario({ m }: { m?: Modelo }) {
  const vazio = () => ({ nome: m?.name ?? "", texto: m?.body ?? "", activo: m?.active ?? true });
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState(vazio);
  const [tentou, setTentou] = useState(false);
  const guardar = useGuardarModelo();
  const idForm = useId();
  const erros = errosModelo(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (a) setV(vazio());
    else {
      setTentou(false);
      guardar.reset();
    }
  };
  return (
    <>
      {m ? (
        <Button variante="ghost" tamanho="sm" onClick={() => fechar(true)} aria-label={`Corrigir ${m.name}`}>
          Corrigir
        </Button>
      ) : (
        <Button onClick={() => fechar(true)}>
          <Plus strokeWidth={1.75} aria-hidden />
          Novo modelo
        </Button>
      )}
      <Confirmar aberto={aberto} aoMudar={fechar} titulo={m ? `Corrigir ${m.name}` : "Novo modelo"} descricao={MARCADORES} rotuloConfirmar="Guardar" aCarregar={guardar.isPending} erro={guardar.error ? <ErrorPanel erro={guardar.error} /> : undefined} formulario={idForm} largo>
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || guardar.isPending) return;
            guardar.mutate({ id: m?.templateId ?? null, corpo: { name: normalizarTexto(v.nome), body: normalizarTexto(v.texto, true), active: v.activo } }, { onSuccess: () => fechar(false) });
          }}
        >
          <Field rotulo="Nome" erro={tentou ? erros.nome : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={200} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={v.nome} onChange={(e) => setV((x) => ({ ...x, nome: e.target.value }))} />}
          </Field>
          <Field rotulo="Texto" erro={tentou ? erros.texto : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={12} aria-describedby={descricao} invalido={invalido} value={v.texto} onChange={(e) => setV((x) => ({ ...x, texto: e.target.value }))} />}
          </Field>
          {m ? <Checkbox rotulo="Activo (aparece nas propostas novas)" checked={v.activo} onChange={(e) => setV((x) => ({ ...x, activo: e.target.checked }))} /> : null}
        </form>
      </Confirmar>
    </>
  );
}

export default function Modelos() {
  const { pode } = useUtilizador();
  const lista = useModelos(true);
  const colunas: Coluna<Modelo>[] = [
    {
      id: "nome",
      cabecalho: "Modelo",
      className: "max-w-[28rem]",
      celula: (m) => (
        <span className="flex flex-col">
          <span className="font-medium">{m.name}</span>
          <span className="truncate text-xs text-muted-foreground">{m.body}</span>
        </span>
      ),
    },
    { id: "estado", cabecalho: "Estado", celula: (m) => (m.active ? <Badge tom="sucesso">Activo</Badge> : <Badge tom="neutro">Inactivo</Badge>) },
    ...(pode("commercial.crm.write") ? [{ id: "accao", cabecalho: "", alinhar: "direita" as const, celula: (m: Modelo) => <Formulario m={m} /> }] : []),
  ];
  return (
    <>
      <PageHeader
        titulo="Modelos de proposta"
        descricao={MARCADORES}
        accao={
          <Can requer="commercial.crm.write">
            <Formulario />
          </Can>
        }
      />
      <Tabela
        rotulo="Modelos de proposta"
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
