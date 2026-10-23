/** Portal › Pedidos internos: abrir um pedido aos serviços (RH, informática, …) e acompanhar. */
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CATEGORIA_PEDIDO, EstadoPedido, nome, PRIORIDADE_PEDIDO } from "@/features/rh";
import { formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Button } from "@/ui/Button";
import { Confirmar } from "@/ui/Confirmar";
import { Select, Textarea } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { PageHeader } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAbrirPedido, useMeusPedidos, type CategoriaPedido, type PedidoInterno, type PrioridadePedido } from "../api";
import { MAXIMO_ASSUNTO, MAXIMO_MENSAGEM } from "../regras";

/** `?novo=<área>` abre o formulário já com a área (ex.: «Pedir correcção» nos dados pessoais). */
function areaDoUrl(v: string | null): CategoriaPedido | "" {
  return v !== null && Object.hasOwn(CATEGORIA_PEDIDO, v) ? (v as CategoriaPedido) : "";
}

function Abrir() {
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const areaInicial = areaDoUrl(params.get("novo"));
  const [aberto, setAberto] = useState(areaInicial !== "");
  const [assunto, setAssunto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaPedido | "">(areaInicial);
  const [prioridade, setPrioridade] = useState<PrioridadePedido>("Normal");
  const [texto, setTexto] = useState("");
  const [tentou, setTentou] = useState(false);
  const abrir = useAbrirPedido();
  const idForm = useId();
  const a = normalizarTexto(assunto);
  const t = normalizarTexto(texto, true);
  const erros = {
    assunto: a === "" ? "Indique o assunto." : a.length > MAXIMO_ASSUNTO ? `No máximo ${MAXIMO_ASSUNTO} caracteres.` : undefined,
    categoria: categoria === "" ? "Escolha a quem se dirige." : undefined,
    texto: t === "" ? "Descreva o pedido." : t.length > MAXIMO_MENSAGEM ? `No máximo ${MAXIMO_MENSAGEM} caracteres.` : undefined,
  };
  const mudar = (v: boolean) => {
    setAberto(v);
    if (!v) {
      if (params.has("novo")) {
        params.delete("novo");
        setParams(params, { replace: true });
      }
      abrir.reset();
      setTentou(false);
      setAssunto("");
      setCategoria("");
      setPrioridade("Normal");
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
        titulo="Novo pedido interno"
        descricao="Chega à equipa da área escolhida. A resposta aparece aqui."
        rotuloConfirmar="Enviar pedido"
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
            if (erros.assunto || erros.categoria || erros.texto || categoria === "" || abrir.isPending) return;
            abrir.mutate(
              { subject: a, category: categoria, priority: prioridade, body: t },
              {
                onSuccess: (r) => {
                  mudar(false);
                  void navegar(`/eu/pedidos/${r.ticketId}`);
                },
              },
            );
          }}
        >
          <Field rotulo="Assunto" erro={tentou ? erros.assunto : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Input id={id} maxLength={MAXIMO_ASSUNTO} autoComplete="off" aria-describedby={descricao} invalido={invalido} value={assunto} onChange={(e) => setAssunto(e.target.value)} />}
          </Field>
          <Field rotulo="Área" erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => (
              <Select id={id} aria-describedby={descricao} invalido={invalido} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaPedido | "")}>
                <option value="">Escolha…</option>
                {Object.entries(CATEGORIA_PEDIDO).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Prioridade">
            {({ id, descricao }) => (
              <Select id={id} aria-describedby={descricao} value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadePedido)}>
                {Object.entries(PRIORIDADE_PEDIDO).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field rotulo="Pedido" erro={tentou ? erros.texto : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <Textarea id={id} rows={5} maxLength={MAXIMO_MENSAGEM} aria-describedby={descricao} invalido={invalido} value={texto} onChange={(e) => setTexto(e.target.value)} />}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

export default function Pedidos() {
  const pedidos = useMeusPedidos();
  const colunas: Coluna<PedidoInterno>[] = [
    {
      id: "assunto",
      cabecalho: "Pedido",
      celula: (p) => (
        <div className="flex min-w-0 flex-col">
          <Link to={`/eu/pedidos/${p.ticketId}`} className="truncate font-medium text-foreground underline-offset-4 hover:underline">
            {p.subject}
          </Link>
          <span className="text-sm text-muted-foreground">
            {nome(CATEGORIA_PEDIDO, p.category)} · prioridade {nome(PRIORIDADE_PEDIDO, p.priority).toLowerCase()}
          </span>
        </div>
      ),
      className: "max-w-[22rem]",
    },
    { id: "aberto", cabecalho: "Aberto em", esconderAte: "sm", celula: (p) => formatarDataHora(p.openedAt) },
    { id: "mensagens", cabecalho: "Mensagens", alinhar: "direita", esconderAte: "md", celula: (p) => p.messages.length },
    { id: "estado", cabecalho: "Estado", celula: (p) => <EstadoPedido estado={p.status} /> },
  ];
  return (
    <>
      <PageHeader titulo="Pedidos internos" descricao="Pedidos aos Recursos Humanos, à informática, às instalações e às finanças." accao={<Abrir />} />
      <Tabela
        rotulo="Pedidos internos"
        colunas={colunas}
        linhas={pedidos.data}
        chave={(p) => p.ticketId}
        aCarregar={pedidos.isPending}
        erro={pedidos.error ? <ErrorPanel erro={pedidos.error} tentarDeNovo={() => void pedidos.refetch()} /> : undefined}
        vazio="Ainda não fez pedidos."
      />
    </>
  );
}
