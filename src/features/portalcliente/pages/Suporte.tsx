/**
 * Portal do cliente › Suporte: pedidos com assunto, vários abertos ao mesmo
 * tempo (ADR-046). A equipa responde e fecha; depois de fechado, o cliente
 * pode avaliar o atendimento uma vez.
 */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAbrirTicket, useTickets, type Conversa } from "../api";
import { EstadoConversa, ultima } from "../comum";
import { errosTicket, MAXIMO_ASSUNTO, MAXIMO_MENSAGEM, temErros } from "../regras";

function Abrir() {
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirTicket();
  const idForm = useId();
  const erros = errosTicket({ assunto, texto });
  const mudar = (v: boolean) => {
    setAberto(v);
    if (!v) {
      abrir.reset();
      setTentou(false);
      setAssunto("");
      setTexto("");
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Novo pedido
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        titulo="Novo pedido de suporte"
        descricao="Chega à equipa comercial. A resposta aparece no pedido."
        rotuloConfirmar="Enviar pedido"
        aCarregar={abrir.isPending}
        erro={abrir.error ? <ErrorPanel erro={abrir.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (temErros(erros) || abrir.isPending) return;
            abrir.mutate(
              { subject: normalizarTexto(assunto), body: normalizarTexto(texto, true) },
              {
                onSuccess: (r) => {
                  mudar(false);
                  void navegar(`/cliente/suporte/${r.conversationId}`);
                },
              },
            );
          }}
        >
          <Field rotulo="Assunto" erro={tentou ? erros.assunto : undefined}>
            {({ id, descricao, invalido }) => <Input id={id} maxLength={MAXIMO_ASSUNTO} aria-describedby={descricao} invalido={invalido} value={assunto} onChange={(e) => setAssunto(e.target.value)} />}
          </Field>
          <Field rotulo="Descrição" erro={tentou ? erros.texto : undefined}>
            {({ id, descricao, invalido }) => <Textarea id={id} rows={5} maxLength={MAXIMO_MENSAGEM} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Suporte() {
  const tickets = useTickets();
  const linhas = tickets.data ? [...tickets.data].sort((a, b) => (a.status === b.status ? b.openedAt.localeCompare(a.openedAt) : a.status === "Open" ? -1 : 1)) : undefined;
  const colunas: Coluna<Conversa>[] = [
    {
      id: "assunto",
      cabecalho: "Assunto",
      className: "max-w-[24rem]",
      celula: (c) => (
        <Link to={`/cliente/suporte/${c.conversationId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
          {c.subject ?? "Sem assunto"}
        </Link>
      ),
    },
    { id: "estado", cabecalho: "Estado", celula: (c) => <EstadoConversa estado={c.status} /> },
    { id: "aberto", cabecalho: "Aberto a", esconderAte: "sm", celula: (c) => formatarDataHora(c.openedAt) },
    {
      id: "ultima",
      cabecalho: "Última mensagem",
      esconderAte: "md",
      celula: (c) => {
        const m = ultima(c.messages);
        return m ? `${m.sender === "Customer" ? "Eu" : "Equipa"} · ${formatarDataHora(m.sentAt)}` : "—";
      },
    },
  ];
  return (
    <>
      <PageHeader titulo="Suporte" descricao="Pedidos à equipa comercial, cada um com o seu assunto." accao={<Abrir />} />
      <Tabela
        rotulo="Pedidos de suporte"
        colunas={colunas}
        linhas={linhas}
        chave={(c) => c.conversationId}
        aCarregar={tickets.isPending}
        erro={tickets.error ? <ErrorPanel erro={tickets.error} tentarDeNovo={() => void tickets.refetch()} /> : undefined}
        vazio="Ainda não abriu pedidos de suporte."
      />
    </>
  );
}
