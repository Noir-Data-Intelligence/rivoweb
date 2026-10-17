/**
 * Uma folha de pagamento: os totais e os itens (bruto, subsídios, IRT, INSS e
 * líquido, calculados pelo servidor). Em rascunho junta-se colaboradores e
 * submete-se para aprovação; por aprovar, «ver decisão» aplica a que foi
 * tomada em Aprovações; aprovada, anexa-se o recibo de cada colaborador.
 */
import { ArrowLeft, Download, Paperclip, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Link, useParams } from "react-router";
import { CarregarFicheiro, type Documento } from "@/features/documentos";
import { Can, useUtilizador } from "@/features/identity";
import { SelectColaborador, useContratos, useNomeColaborador } from "@/features/rh";
import { descarregar } from "@/lib/api/download";
import { formatarDataHora } from "@/lib/format/data";
import { paraApi, lerDinheiroDigitado, dinheiro } from "@/lib/money/money";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Confirmar } from "@/ui/Confirmar";
import { ErrorPanel } from "@/ui/ErrorPanel";
import { Field, Input } from "@/ui/Field";
import { CarregandoPagina, PageHeader, Skeleton } from "@/ui/Layout";
import { Tabela, type Coluna } from "@/ui/Tabela";
import { useAnexarRecibo, useAnexosItem, useFolha, useJuntarItem, useSubmeterFolha, useVerDecisaoFolha, type Folha as TipoFolha, type ItemFolha } from "../api";
import { EstadoFolha, kz, periodoFolha, subsidiosDe, totais } from "../comum";
import { errosItem, type CamposItem } from "../regras";

const VAZIO: CamposItem = { bruto: "", alimentacao: "", transporte: "", ferias: "", natal: "" };
const SUBSIDIOS: { k: keyof CamposItem; rotulo: string }[] = [
  { k: "alimentacao", rotulo: "Subsídio de alimentação" },
  { k: "transporte", rotulo: "Subsídio de transporte" },
  { k: "ferias", rotulo: "Subsídio de férias" },
  { k: "natal", rotulo: "Subsídio de Natal" },
];
const valor = (t: string) => (t.trim() === "" ? null : paraApi(lerDinheiroDigitado(t) ?? dinheiro(0)));

function JuntarColaborador({ f }: { f: TipoFolha }) {
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const [colaborador, setColaborador] = useState("");
  const [v, setV] = useState<CamposItem>(VAZIO);
  const [tentou, setTentou] = useState(false);
  const juntar = useJuntarItem(f.runId);
  const contratos = useContratos({ colaborador: aberto && colaborador !== "" && pode("hr.contracts.read") ? colaborador : null, pagina: 1, tamanho: 25 });
  const idForm = useId();
  const erros = errosItem({ ...v, colaborador });
  const repetido = colaborador !== "" && f.items.some((i) => i.employeeId === colaborador);
  const contrato = colaborador !== "" ? contratos.data?.items.find((c) => c.employeeId === colaborador && c.status === "Active" && c.currency === "AOA") : undefined;
  const mudar = (a: boolean) => {
    setAberto(a);
    if (!a) {
      juntar.reset();
      setTentou(false);
      setColaborador("");
      setV(VAZIO);
    }
  };
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus strokeWidth={1.75} aria-hidden />
        Juntar colaborador
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={mudar}
        largo
        titulo={`Juntar à folha de ${periodoFolha(f)}`}
        descricao="O servidor calcula o IRT, o INSS e o líquido com a configuração fiscal em vigor no fim do mês. Um colaborador juntado não se tira da folha: confirme os valores."
        rotuloConfirmar="Juntar"
        aCarregar={juntar.isPending}
        erro={juntar.error ? <ErrorPanel erro={juntar.error} /> : undefined}
        formulario={idForm}
      >
        <form
          id={idForm}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTentou(true);
            if (Object.keys(erros).length > 0 || juntar.isPending) return;
            const bruto = lerDinheiroDigitado(v.bruto);
            if (!bruto) return;
            juntar.mutate(
              {
                employeeId: colaborador,
                grossSalary: paraApi(bruto),
                foodAllowance: valor(v.alimentacao),
                transportAllowance: valor(v.transporte),
                vacationAllowance: valor(v.ferias),
                christmasAllowance: valor(v.natal),
              },
              { onSuccess: () => mudar(false) },
            );
          }}
        >
          <Field rotulo="Colaborador" erro={tentou ? erros.colaborador : undefined} className="sm:col-span-2">
            {({ id, descricao, invalido }) => <SelectColaborador id={id} aria-describedby={descricao} invalido={invalido} valor={colaborador} aoMudar={setColaborador} />}
          </Field>
          {repetido ? (
            <Alert tom="aviso" className="sm:col-span-2" titulo="Este colaborador já está nesta folha.">
              Juntá-lo outra vez paga-lhe duas vezes no mesmo mês.
            </Alert>
          ) : null}
          <Field
            rotulo="Salário bruto (Kz)"
            erro={tentou ? erros.bruto : undefined}
            ajuda={contrato ? `Contrato em vigor: ${kz(contrato.monthlySalary)} por mês. Os subsídios fazem parte do bruto.` : "Os subsídios fazem parte do bruto."}
            className="sm:col-span-2"
          >
            {({ id, descricao, invalido }) => (
              <div className="flex gap-2">
                <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v.bruto} onChange={(e) => setV((x) => ({ ...x, bruto: e.target.value }))} />
                {contrato ? (
                  <Button type="button" variante="secondary" onClick={() => setV((x) => ({ ...x, bruto: dinheiro(contrato.monthlySalary).toFixed(2).replace(".", ",") }))}>
                    Usar o do contrato
                  </Button>
                ) : null}
              </div>
            )}
          </Field>
          {SUBSIDIOS.map(({ k, rotulo }) => (
            <Field key={k} rotulo={`${rotulo} (opcional)`} erro={tentou ? erros[k] : undefined}>
              {({ id, descricao, invalido }) => <Input id={id} inputMode="decimal" autoComplete="off" className="text-right tabular-nums" aria-describedby={descricao} invalido={invalido} value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} />}
            </Field>
          ))}
          {tentou && erros.subsidios ? (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {erros.subsidios}
            </p>
          ) : null}
        </form>
      </Confirmar>
    </>
  );
}

function Submeter({ f }: { f: TipoFolha }) {
  const [aberto, setAberto] = useState(false);
  const submeter = useSubmeterFolha(f.runId);
  const t = totais(f.items);
  return (
    <>
      <Button variante="secondary" disabled={f.items.length === 0} title={f.items.length === 0 ? "Uma folha sem colaboradores não tem o que aprovar." : undefined} onClick={() => setAberto(true)}>
        Submeter para aprovação
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) submeter.reset();
        }}
        titulo={`Submeter a folha de ${periodoFolha(f)}?`}
        descricao={`${f.items.length} ${f.items.length === 1 ? "colaborador" : "colaboradores"}, ${kz(t.bruto)} brutos e ${kz(t.liquido)} líquidos. Deixa de se poder juntar colaboradores.`}
        rotuloConfirmar="Submeter"
        aCarregar={submeter.isPending}
        erro={submeter.error ? <ErrorPanel erro={submeter.error} /> : undefined}
        aoConfirmar={() => (submeter.isPending ? undefined : submeter.mutate(undefined, { onSuccess: () => setAberto(false) }))}
      />
    </>
  );
}

function VerDecisao({ f }: { f: TipoFolha }) {
  const ver = useVerDecisaoFolha(f.runId);
  const aindaEspera = ver.data?.status === "PendingApproval";
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variante="secondary" aCarregar={ver.isPending} onClick={() => (ver.isPending ? undefined : ver.mutate())}>
        Ver decisão
      </Button>
      {aindaEspera ? <p className="text-sm text-muted-foreground">Ainda à espera de decisão em Aprovações.</p> : null}
      {ver.error ? <ErrorPanel erro={ver.error} /> : null}
    </div>
  );
}

function Recibos({ f, i, quem }: { f: TipoFolha; i: ItemFolha; quem: string }) {
  const { pode } = useUtilizador();
  const [aberto, setAberto] = useState(false);
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [erroDescarga, setErroDescarga] = useState<unknown>(null);
  const anexos = useAnexosItem(f.runId, i.itemId, aberto);
  const anexar = useAnexarRecibo(f.runId, i.itemId);
  const categoria = "Recibo de vencimento";
  return (
    <>
      <Button variante="ghost" tamanho="sm" onClick={() => setAberto(true)} aria-label={`Recibos de ${quem}`}>
        <Paperclip strokeWidth={1.75} aria-hidden />
        Recibo
      </Button>
      <Confirmar
        aberto={aberto}
        aoMudar={(a) => {
          setAberto(a);
          if (!a) {
            anexar.reset();
            setDocumento(null);
            setErroDescarga(null);
          }
        }}
        titulo={`Recibo de ${quem} · ${periodoFolha(f)}`}
        descricao="O colaborador descarrega-o no portal. Sem anexo, o portal gera-o da folha aprovada."
        rotuloConfirmar="Anexar"
        aCarregar={anexar.isPending}
        erro={anexar.error ? <ErrorPanel erro={anexar.error} /> : erroDescarga ? <ErrorPanel erro={erroDescarga} /> : undefined}
        aoConfirmar={() => (!documento || anexar.isPending ? undefined : anexar.mutate({ documentId: documento.documentId, category: categoria }, { onSuccess: () => setDocumento(null) }))}
      >
        <div className="flex flex-col gap-4">
          {anexos.isPending ? (
            <Skeleton className="h-12" />
          ) : anexos.error ? (
            <ErrorPanel erro={anexos.error} tentarDeNovo={() => void anexos.refetch()} />
          ) : anexos.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem recibo anexado.</p>
          ) : (
            <ul className="divide-y divide-border" aria-label="Recibos anexados">
              {anexos.data.map((d) => (
                <li key={d.documentId} className="flex items-center gap-2 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{d.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.category} · {formatarDataHora(d.attachedAt)}
                    </p>
                  </div>
                  {pode("documents.read") ? (
                    <Button
                      variante="ghost"
                      tamanho="sm"
                      aria-label={`Descarregar ${d.fileName}`}
                      onClick={() => {
                        setErroDescarga(null);
                        descarregar(`/documents/${encodeURIComponent(d.documentId)}`, d.fileName).catch(setErroDescarga);
                      }}
                    >
                      <Download strokeWidth={1.75} aria-hidden />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {pode("payroll.runs.write") ? <CarregarFicheiro rotulo="Ficheiro do recibo" categoria={categoria} documento={documento} aoMudar={setDocumento} /> : null}
        </div>
      </Confirmar>
    </>
  );
}

export default function Folha() {
  const { runId = "" } = useParams();
  const { pode } = useUtilizador();
  const q = useFolha(runId);
  const nomeDe = useNomeColaborador();
  const voltar = (
    <Button asChild variante="ghost" tamanho="sm" className="-ml-2 mb-2">
      <Link to="/salarios">
        <ArrowLeft strokeWidth={1.75} aria-hidden />
        Salários
      </Link>
    </Button>
  );
  if (q.isPending) return <CarregandoPagina />;
  if (q.error) {
    return (
      <>
        {voltar}
        <ErrorPanel erro={q.error} tentarDeNovo={() => void q.refetch()} />
      </>
    );
  }
  const f = q.data;
  const t = totais(f.items);
  const escreve = pode("payroll.runs.write");
  const colunas: Coluna<ItemFolha>[] = [
    {
      id: "colaborador",
      cabecalho: "Colaborador",
      celula: (i) => (
        <Link to={`/colaboradores/${i.employeeId}`} className="font-medium text-foreground underline-offset-4 hover:underline">
          {nomeDe(i.employeeId)}
        </Link>
      ),
    },
    { id: "bruto", cabecalho: "Bruto", alinhar: "direita", celula: (i) => kz(i.grossSalary) },
    { id: "subsidios", cabecalho: "dos quais subsídios", alinhar: "direita", esconderAte: "lg", celula: (i) => kz(subsidiosDe(i)) },
    { id: "irt", cabecalho: "IRT", alinhar: "direita", esconderAte: "md", celula: (i) => kz(i.withholdingTax) },
    { id: "inss", cabecalho: "INSS", alinhar: "direita", esconderAte: "md", celula: (i) => kz(i.socialSecurityContribution) },
    { id: "liquido", cabecalho: "Líquido", alinhar: "direita", celula: (i) => <span className="font-medium">{kz(i.netSalary)}</span> },
    ...(f.status === "Approved" ? [{ id: "recibo", cabecalho: "", alinhar: "direita" as const, celula: (i: ItemFolha) => <Recibos f={f} i={i} quem={nomeDe(i.employeeId)} /> }] : []),
  ];
  return (
    <>
      {voltar}
      <PageHeader
        titulo={`Folha de ${periodoFolha(f)}`}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <EstadoFolha estado={f.status} />
            {f.submittedAt ? <span>submetida a {formatarDataHora(f.submittedAt)}</span> : null}
            {f.closedAt ? <span>· fechada a {formatarDataHora(f.closedAt)}</span> : null}
          </span>
        }
        accao={
          f.status === "Draft" && escreve ? (
            <div className="flex flex-wrap gap-2">
              <Submeter f={f} />
              <JuntarColaborador f={f} />
            </div>
          ) : f.status === "PendingApproval" && escreve ? (
            <VerDecisao f={f} />
          ) : undefined
        }
      />
      {f.status === "PendingApproval" && f.approvalRequestId ? (
        <Alert tom="info" className="mb-4" titulo="À espera de decisão em Aprovações.">
          <Can requer="approval.requests.read">
            <Link to={`/aprovacoes/${f.approvalRequestId}`} className="underline underline-offset-4">
              Abrir o pedido de aprovação
            </Link>
          </Can>
        </Alert>
      ) : null}
      {f.status === "Refused" ? <Alert tom="erro" className="mb-4" titulo="Folha recusada em Aprovações: não se paga nem se altera. Abra outra para o mesmo mês." /> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Bruto", t.bruto],
            ["IRT retido", t.irt],
            ["INSS (trabalhador)", t.inss],
            ["Líquido a pagar", t.liquido],
          ] as const
        ).map(([r, v]) => (
          <Card key={r}>
            <p className="text-sm text-muted-foreground">{r}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{kz(v)}</p>
          </Card>
        ))}
      </div>
      <Tabela
        rotulo="Colaboradores da folha"
        colunas={colunas}
        linhas={f.items}
        chave={(i) => i.itemId}
        aCarregar={false}
        vazio={f.status === "Draft" ? "Ainda sem colaboradores. Junte-os um a um." : "Folha sem colaboradores."}
      />
    </>
  );
}
