/**
 * O portal do cliente visto da ficha (F10): a conta que entra no portal, os
 * documentos partilhados com o cliente e os comprovativos que ele enviou.
 */
import { Link2, Share2, Unlink } from "lucide-react";
import { useId, useState } from "react";
import { useUtilizadores } from "@/features/administracao";
import { FilaComprovativos, useFilaComprovativos } from "@/features/comprovativos";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { useUtilizador } from "@/features/identity";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { normalizarTexto } from "@/lib/validation/normalizar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card, CardTitle } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { Select } from "@/ui/Controlos";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import {
  contaLigada,
  useContasPorLigar,
  useDesligarContaCliente,
  useHistoricoContaCliente,
  useLigarContaCliente,
  usePartilhar,
  usePartilhas,
  useRevogarPartilha,
  CATEGORIA_PARTILHA,
  errosPartilha,
  MAXIMO_CATEGORIA,
  MAXIMO_TITULO,
  type Partilha,
} from "../api";

// --- Conta do portal

function LigarConta({ customerId, nome }: { customerId: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [escolhida, setEscolhida] = useState("");
  const [tentou, setTentou] = useState(false);
  const contas = useContasPorLigar(aberto);
  const ligar = useLigarContaCliente(customerId);
  const id = useId();
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setEscolhida("");
      setTentou(false);
      ligar.reset();
    }
  };
  const lista = contas.data ?? [];
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Link2 strokeWidth={1.75} aria-hidden />
        Ligar conta
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Ligar uma conta a ${nome}`}
        descricao="Quem entrar com esta conta vê o portal deste cliente: facturas, extracto, documentos partilhados, mensagens; e envia comprovativos de pagamento."
        rotuloConfirmar="Ligar"
        aCarregar={ligar.isPending}
        erro={ligar.error ? <ErrorPanel erro={ligar.error} /> : contas.error ? <ErrorPanel erro={contas.error} tentarDeNovo={() => void contas.refetch()} /> : undefined}
        aoConfirmar={() => {
          setTentou(true);
          if (escolhida === "" || ligar.isPending) return;
          ligar.mutate(escolhida, { onSuccess: () => fechar(false) });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Conta
          </label>
          <Select id={id} value={escolhida} invalido={tentou && escolhida === ""} aria-describedby={`${id}-ajuda`} onChange={(e) => setEscolhida(e.target.value)} disabled={contas.isPending}>
            <option value="">{contas.isPending ? "A carregar…" : lista.length === 0 ? "Nenhuma conta por ligar" : "Escolha…"}</option>
            {lista.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.email}
              </option>
            ))}
          </Select>
          <p id={`${id}-ajuda`} className="text-xs text-muted-foreground">
            {tentou && escolhida === "" ? "Escolha a conta. " : ""}Só contas com o perfil Cliente que ainda não estão ligadas a nenhum cliente. A conta cria-se em Utilizadores, com o perfil Cliente.
          </p>
        </div>
      </Confirmar>
    </>
  );
}

function DesligarConta({ customerId, nome, email }: { customerId: string; nome: string; email: string | null }) {
  const [aberto, setAberto] = useState(false);
  const desligar = useDesligarContaCliente(customerId);
  return (
    <>
      <Button variante="ghost" onClick={() => setAberto(true)}>
        <Unlink strokeWidth={1.75} aria-hidden />
        Desligar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) desligar.reset();
        }}
        titulo={`Desligar a conta de ${nome}?`}
        descricao={`${email ?? "A conta"} deixa de ver o portal deste cliente. A conta continua activa e pode ligar-se de novo.`}
        rotuloConfirmar="Desligar"
        variante="destructive"
        aCarregar={desligar.isPending}
        erro={desligar.error ? <ErrorPanel erro={desligar.error} /> : undefined}
        aoConfirmar={() => (desligar.isPending ? undefined : desligar.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function ContaDoPortal({ customerId, nome }: { customerId: string; nome: string }) {
  const { pode } = useUtilizador();
  const escreve = pode("commercial.customers.write");
  const podeLerContas = pode("identity.users.read");
  const utilizadores = useUtilizadores(podeLerContas);
  const historico = useHistoricoContaCliente(customerId);
  const emailDe = (id: string) => utilizadores.data?.find((u) => u.userId === id)?.email ?? null;
  const ligada = contaLigada(historico.data);
  return (
    <Card>
      <CardTitle>Conta do portal</CardTitle>
      {historico.isPending ? (
        <Skeleton className="mt-3 h-16" />
      ) : historico.error ? (
        <ErrorPanel erro={historico.error} tentarDeNovo={() => void historico.refetch()} className="mt-3" />
      ) : (
        <>
          {ligada ? (
            <p className="mt-2 text-base text-foreground">
              {podeLerContas ? (emailDe(ligada.userId) ?? "Conta ligada") : "Conta ligada"}
              <span className="block text-sm text-muted-foreground">Desde {formatarDataHora(ligada.linkedOn)}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sem conta ligada: o cliente não entra no portal.</p>
          )}
          {escreve ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {ligada ? <DesligarConta customerId={customerId} nome={nome} email={podeLerContas ? emailDe(ligada.userId) : null} /> : <LigarConta customerId={customerId} nome={nome} />}
            </div>
          ) : null}
          <h3 className="mt-5 text-sm font-medium text-foreground">Histórico</h3>
          {historico.data.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Nunca teve conta ligada.</p>
          ) : (
            <ul className="mt-1 divide-y divide-border text-sm" aria-label="Histórico da conta do portal">
              {historico.data.map((h) => (
                <li key={`${h.userId}-${h.linkedOn}`} className="py-2">
                  <p className="text-foreground">{podeLerContas ? (emailDe(h.userId) ?? "Conta") : "Conta"}</p>
                  <p className="text-muted-foreground">
                    Ligada {formatarDataHora(h.linkedOn)}
                    {h.unlinkedOn ? ` · desligada ${formatarDataHora(h.unlinkedOn)}` : " · em vigor"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

// --- Documentos partilhados

function Partilhar({ customerId, nome }: { customerId: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<{
    titulo: string;
    categoria: string;
    documento: Documento | null;
  }>({ titulo: "", categoria: "", documento: null });
  const [tentou, setTentou] = useState(false);
  const partilhar = usePartilhar(customerId);
  const idForm = useId();
  const erros = errosPartilha(v);
  const fechar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      setV({ titulo: "", categoria: "", documento: null });
      setTentou(false);
      partilhar.reset();
    }
  };
  return (
    <>
      <Button variante="secondary" onClick={() => setAberto(true)}>
        <Share2 strokeWidth={1.75} aria-hidden />
        Partilhar documento
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={fechar}
        titulo={`Partilhar um documento com ${nome}`}
        descricao="O cliente vê-o e descarrega-o no portal, em «Documentos». Pode revogar a partilha depois."
        rotuloConfirmar="Partilhar"
        aCarregar={partilhar.isPending}
        erro={partilhar.error ? <ErrorPanel erro={partilhar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (erros.documento || erros.titulo || erros.categoria || !v.documento || partilhar.isPending) return;
            const categoria = normalizarTexto(v.categoria);
            partilhar.mutate(
              {
                documentId: v.documento.documentId,
                title: normalizarTexto(v.titulo),
                category: categoria === "" ? null : categoria,
              },
              { onSuccess: () => fechar(false) },
            );
          }}
        >
          <CarregarFicheiro
            rotulo="Ficheiro"
            categoria={CATEGORIA_PARTILHA}
            documento={v.documento}
            aoMudar={(d) =>
              setV((x) => ({
                ...x,
                documento: d,
                titulo: x.titulo === "" && d ? d.fileName.replace(/\.[^.]+$/, "") : x.titulo,
              }))
            }
          />
          {tentou && erros.documento ? (
            <p role="alert" className="text-xs text-danger">
              {erros.documento}
            </p>
          ) : null}
          <Field rotulo="Título (o que o cliente vê)" erro={tentou ? erros.titulo : undefined}>
            {({ id, descricao, invalido }) => (
              <Input
                id={id}
                maxLength={MAXIMO_TITULO}
                autoComplete="off"
                aria-describedby={descricao}
                invalido={invalido}
                value={v.titulo}
                onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))}
              />
            )}
          </Field>
          <Field rotulo="Categoria (opcional)" erro={tentou ? erros.categoria : undefined}>
            {({ id, descricao, invalido }) => (
              <Input
                id={id}
                maxLength={MAXIMO_CATEGORIA}
                autoComplete="off"
                aria-describedby={descricao}
                invalido={invalido}
                value={v.categoria}
                onChange={(e) => setV((x) => ({ ...x, categoria: e.target.value }))}
              />
            )}
          </Field>
        </form>
      </Confirmar>
    </>
  );
}

function Revogar({ customerId, p }: { customerId: string; p: Partilha }) {
  const [aberto, setAberto] = useState(false);
  const revogar = useRevogarPartilha(customerId);
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Revogar a partilha de ${p.title}`}>
        Revogar
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) revogar.reset();
        }}
        titulo={`Revogar «${p.title}»?`}
        descricao="O cliente deixa de o ver no portal. A partilha fica no histórico; para voltar a partilhar, carregue o ficheiro de novo."
        rotuloConfirmar="Revogar"
        variante="destructive"
        aCarregar={revogar.isPending}
        erro={revogar.error ? <ErrorPanel erro={revogar.error} /> : undefined}
        aoConfirmar={() => (revogar.isPending ? undefined : revogar.mutate(p.shareId, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function DocumentosPartilhados({ customerId, nome }: { customerId: string; nome: string }) {
  const { pode } = useUtilizador();
  const escreve = pode("commercial.customers.write");
  const partilhas = usePartilhas(customerId);
  const colunas: Coluna<Partilha>[] = [
    {
      id: "titulo",
      cabecalho: "Documento",
      className: "max-w-[16rem]",
      celula: (p) => (
        <span className="flex flex-col">
          <span className="truncate font-medium">{p.title}</span>
          {p.fileName ? <span className="truncate text-xs text-muted-foreground">{p.fileName}</span> : null}
        </span>
      ),
    },
    {
      id: "categoria",
      cabecalho: "Categoria",
      esconderAte: "md",
      celula: (p) => p.category ?? "—",
    },
    {
      id: "data",
      cabecalho: "Partilhado a",
      esconderAte: "sm",
      celula: (p) => formatarData(p.sharedAt),
    },
    {
      id: "estado",
      cabecalho: "Estado",
      celula: (p) => (p.active ? <Badge tom="sucesso">Partilhado</Badge> : <Badge tom="neutro">Revogado</Badge>),
    },
    ...(escreve
      ? [
          {
            id: "accao",
            cabecalho: "",
            alinhar: "direita" as const,
            celula: (p: Partilha) => (p.active ? <Revogar customerId={customerId} p={p} /> : null),
          },
        ]
      : []),
  ];
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Documentos partilhados</CardTitle>
        {escreve && pode("documents.write") ? <Partilhar customerId={customerId} nome={nome} /> : null}
      </div>
      <Tabela
        rotulo="Documentos partilhados"
        colunas={colunas}
        linhas={partilhas.data}
        chave={(p) => p.shareId}
        aCarregar={partilhas.isPending}
        erro={partilhas.error ? <ErrorPanel erro={partilhas.error} tentarDeNovo={() => void partilhas.refetch()} /> : undefined}
        vazio="Nada partilhado com este cliente."
      />
    </Card>
  );
}

// --- Comprovativos

function ComprovativosDoCliente({ customerId }: { customerId: string }) {
  const fila = useFilaComprovativos({
    estado: null,
    cliente: customerId,
    pagina: 1,
    tamanho: 50,
  });
  return (
    <Card>
      <CardTitle className="mb-3">Comprovativos de pagamento</CardTitle>
      <FilaComprovativos
        rotulo="Comprovativos deste cliente"
        linhas={fila.data?.items}
        aCarregar={fila.isPending}
        erro={fila.error}
        vazio="Este cliente não enviou comprovativos."
        comCliente={false}
      />
    </Card>
  );
}

export function PortalDoCliente({ customerId, nome }: { customerId: string; nome: string }) {
  const { pode } = useUtilizador();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ContaDoPortal customerId={customerId} nome={nome} />
        <DocumentosPartilhados customerId={customerId} nome={nome} />
      </div>
      {pode("finance.receipts.read") ? <ComprovativosDoCliente customerId={customerId} /> : null}
    </div>
  );
}
